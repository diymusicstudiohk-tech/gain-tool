import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PRESETS_DATA } from '../utils/constants';
import { loadParamsFromStorage } from '../utils/storage';
import {
    dryGainControlToDb, dryGainDbToControl,
    wetGainControlToDb, wetGainDbToControl,
} from '../utils/gainConversion';

/**
 * Uses ref-based callbacks to break circular dependency with usePlayback.
 * onModeSwitchRef.current and lastPlayedTypeRef.current are populated after usePlayback initializes.
 */
const useCompressorParams = ({ onModeSwitchRef, lastPlayedTypeRef, logAction, meterStateRef }) => {
    const [threshold, setThreshold] = useState(0);
    const [inflate, setInflate] = useState(0);
    const [lookahead, setLookahead] = useState(3);
    const [makeupGain, setMakeupGain] = useState(0);
    const [wetGainControl, setWetGainControl] = useState(50);
    const [dryGain, setDryGain] = useState(-200);
    const [dryGainControl, setDryGainControl] = useState(0);

    const [isCompBypass, setIsCompBypass] = useState(false);
    const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);

    const gainAdjustedRef = useRef(false);

    const currentParams = useMemo(() => ({
        threshold, inflate, lookahead, makeupGain,
        isCompBypass
    }), [threshold, inflate, lookahead, makeupGain, isCompBypass]);

    const paramsRef = useRef({ ...currentParams, dryGain, isDeltaMode: false });
    useEffect(() => {
        paramsRef.current = { ...currentParams, dryGain, isDeltaMode: paramsRef.current?.isDeltaMode ?? false };
    }, [currentParams, dryGain]);

    // Load from localStorage on mount
    useEffect(() => {
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setThreshold(savedParams.threshold);
            setLookahead(savedParams.lookahead);
            // Always start wet gain at 0dB on load
            setMakeupGain(0);
            setWetGainControl(50);
            setDryGain(savedParams.dryGain);
            setDryGainControl(dryGainDbToControl(savedParams.dryGain));
            setInflate(savedParams.inflate ?? 0);
            setIsCompBypass(savedParams.isCompBypass ?? false);
        }
    }, []);

    const ensureProcessedMode = useCallback(() => {
        if (lastPlayedTypeRef.current !== 'processed') {
            onModeSwitchRef.current?.('processed');
        }
    }, [lastPlayedTypeRef, onModeSwitchRef]);

    const updateParamGeneric = useCallback((setter, value) => {
        setter(value);
        setIsCustomSettings(true);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const handleCompKnobChange = useCallback((key, value) => {
        const setters = { inflate: setInflate, lookahead: setLookahead };
        if (setters[key]) updateParamGeneric(setters[key], value);
    }, [updateParamGeneric]);

    const handleGainChange = useCallback((key, value) => {
        if (key === 'makeupGain') {
            setWetGainControl(value);
            const dB = wetGainControlToDb(value);
            setMakeupGain(dB);
            logAction(`SET_GAIN: Wet -> ${dB <= -200 ? '-∞' : dB.toFixed(1)}dB`);
        }
        if (key === 'dryGainControl') {
            setDryGainControl(value);
            const dB = dryGainControlToDb(value);
            setDryGain(dB);
            logAction(`SET_GAIN: Dry -> ${dB <= -200 ? '-∞' : dB.toFixed(1)}dB`);
        }
        gainAdjustedRef.current = true; setIsProcessing(true);
        if (meterStateRef?.current) meterStateRef.current.outClipping = false;
        ensureProcessedMode();
    }, [logAction, ensureProcessedMode, meterStateRef]);

    const handleThresholdChange = useCallback((v) => {
        updateParamGeneric(setThreshold, v);
        setHasThresholdBeenAdjusted(true);
    }, [updateParamGeneric]);

    const applyPreset = useCallback((idx) => {
        const p = PRESETS_DATA[idx]; if (!p) return;
        logAction(`LOAD_PRESET: ${p.name}`);
        setSelectedPresetIdx(idx); setIsCustomSettings(false); setIsProcessing(true);
        setThreshold(p.params.threshold);
        setInflate(p.params.inflate ?? 0);
        setLookahead(p.params.lookahead);
        const clampedMakeup = Math.max(-200, Math.min(15, p.params.makeupGain));
        setMakeupGain(clampedMakeup);
        setWetGainControl(wetGainDbToControl(clampedMakeup));
        setDryGain(p.params.dryGain);
        setDryGainControl(dryGainDbToControl(p.params.dryGain));
        setIsCompBypass(false);
        ensureProcessedMode();
    }, [logAction, ensureProcessedMode]);

    const resetAllParams = useCallback(() => {
        applyPreset(0);
        gainAdjustedRef.current = false;
        setHasThresholdBeenAdjusted(true);
        setIsCompBypass(false);
    }, [applyPreset]);

    const getCurrentStateSnapshot = useCallback(() => ({
        threshold, inflate, lookahead, makeupGain, wetGainControl, dryGain, dryGainControl,
        selectedPresetIdx, isCustomSettings, isCompBypass
    }), [threshold, inflate, lookahead, makeupGain, wetGainControl, dryGain, dryGainControl,
        selectedPresetIdx, isCustomSettings, isCompBypass]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setThreshold(snap.threshold);
        setInflate(snap.inflate ?? 0);
        setLookahead(snap.lookahead);
        setMakeupGain(snap.makeupGain);
        setWetGainControl(snap.wetGainControl !== undefined ? snap.wetGainControl : wetGainDbToControl(snap.makeupGain));
        setDryGain(snap.dryGain);
        setDryGainControl(snap.dryGainControl !== undefined ? snap.dryGainControl : dryGainDbToControl(snap.dryGain));
        setSelectedPresetIdx(snap.selectedPresetIdx); setIsCustomSettings(snap.isCustomSettings);
        setIsCompBypass(snap.isCompBypass || false);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getDefaultSnapshot = useCallback(() => {
        const def = PRESETS_DATA[0].params;
        const clampedMakeup = Math.max(-200, Math.min(15, def.makeupGain));
        return {
            ...def, makeupGain: clampedMakeup,
            wetGainControl: wetGainDbToControl(clampedMakeup),
            dryGainControl: dryGainDbToControl(def.dryGain),
            selectedPresetIdx: 0, isCustomSettings: false,
            isCompBypass: false
        };
    }, []);

    const handleModeDryGainSync = useCallback((type) => {
        if (!gainAdjustedRef.current) {
            setDryGain(-200);
            setDryGainControl(0);
        }
    }, []);

    return {
        threshold, inflate, lookahead,
        makeupGain, wetGainControl, dryGain, setDryGain, dryGainControl,
        isCompBypass, setIsCompBypass,
        selectedPresetIdx, isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted,
        gainAdjustedRef, currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange,
        handleGainChange, handleThresholdChange,
        applyPreset, resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
        handleModeDryGainSync,
        setThreshold,
    };
};

export { dryGainControlToDb, dryGainDbToControl, wetGainControlToDb, wetGainDbToControl };
export default useCompressorParams;
