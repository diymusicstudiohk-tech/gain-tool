import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PRESETS_DATA } from '../utils/constants';
import { loadParamsFromStorage } from '../utils/storage';
import {
    calculateRatioFromControl, calculateControlFromRatio,
    dryGainControlToDb, dryGainDbToControl,
    wetGainControlToDb, wetGainDbToControl,
} from '../utils/gainConversion';

/**
 * Uses ref-based callbacks to break circular dependency with usePlayback.
 * onModeSwitchRef.current and lastPlayedTypeRef.current are populated after usePlayback initializes.
 */
const useCompressorParams = ({ onModeSwitchRef, lastPlayedTypeRef, logAction, meterStateRef }) => {
    const [threshold, setThreshold] = useState(0);
    const [ratioControl, setRatioControl] = useState(0);
    const [ratio, setRatio] = useState(4);
    const [attack, setAttack] = useState(15);
    const [release, setRelease] = useState(150);
    const [knee, setKnee] = useState(5);
    const [lookahead, setLookahead] = useState(0);
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
        threshold, ratio, attack, release, knee, lookahead, makeupGain,
        isCompBypass
    }), [threshold, ratio, attack, release, knee, lookahead, makeupGain, isCompBypass]);

    const paramsRef = useRef({ ...currentParams, dryGain, isDeltaMode: false });
    useEffect(() => {
        paramsRef.current = { ...currentParams, dryGain, isDeltaMode: paramsRef.current?.isDeltaMode ?? false };
    }, [currentParams, dryGain]);

    // Load from localStorage on mount
    useEffect(() => {
        setRatioControl(calculateControlFromRatio(4));
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setThreshold(savedParams.threshold); setRatio(savedParams.ratio);
            setRatioControl(calculateControlFromRatio(savedParams.ratio));
            setAttack(savedParams.attack); setRelease(savedParams.release);
            setKnee(savedParams.knee); setLookahead(savedParams.lookahead);
            // Always start wet gain at 0dB on load
            setMakeupGain(0);
            setWetGainControl(50);
            setDryGain(savedParams.dryGain);
            setDryGainControl(dryGainDbToControl(savedParams.dryGain));
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
        const setters = { attack: setAttack, release: setRelease, knee: setKnee, lookahead: setLookahead };
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

    const updateRatio = useCallback((v) => {
        setRatioControl(v); setRatio(calculateRatioFromControl(v));
        logAction(`SET_RATIO: ${calculateRatioFromControl(v).toFixed(1)}`);
        setIsCustomSettings(true); setIsProcessing(true);
        ensureProcessedMode();
    }, [logAction, ensureProcessedMode]);

    const handleThresholdChange = useCallback((v) => {
        updateParamGeneric(setThreshold, v);
        setHasThresholdBeenAdjusted(true);
    }, [updateParamGeneric]);

    const applyPreset = useCallback((idx) => {
        const p = PRESETS_DATA[idx]; if (!p) return;
        logAction(`LOAD_PRESET: ${p.name}`);
        setSelectedPresetIdx(idx); setIsCustomSettings(false); setIsProcessing(true);
        setThreshold(p.params.threshold); setRatio(p.params.ratio);
        setRatioControl(calculateControlFromRatio(p.params.ratio));
        setAttack(p.params.attack); setRelease(p.params.release);
        setKnee(p.params.knee); setLookahead(p.params.lookahead);
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
        threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, wetGainControl, dryGain, dryGainControl,
        selectedPresetIdx, isCustomSettings, isCompBypass
    }), [threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, wetGainControl, dryGain, dryGainControl,
        selectedPresetIdx, isCustomSettings, isCompBypass]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setThreshold(snap.threshold); setRatio(snap.ratio); setRatioControl(snap.ratioControl);
        setAttack(snap.attack); setRelease(snap.release); setKnee(snap.knee); setLookahead(snap.lookahead);
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
            ratioControl: calculateControlFromRatio(def.ratio),
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
        threshold, ratio, ratioControl, attack, release, knee, lookahead,
        makeupGain, wetGainControl, dryGain, setDryGain, dryGainControl,
        isCompBypass, setIsCompBypass,
        selectedPresetIdx, isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted,
        gainAdjustedRef, currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange,
        handleGainChange, updateRatio, handleThresholdChange,
        applyPreset, resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
        handleModeDryGainSync,
        setThreshold,
    };
};

export { calculateRatioFromControl, calculateControlFromRatio, dryGainControlToDb, dryGainDbToControl, wetGainControlToDb, wetGainDbToControl };
export default useCompressorParams;
