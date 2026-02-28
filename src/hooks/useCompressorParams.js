import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadParamsFromStorage } from '../utils/storage';
import {
    dryGainControlToDb, dryGainDbToControl,
    wetGainControlToDb, wetGainDbToControl,
    lookaheadControlToMs, lookaheadMsToControl,
} from '../utils/gainConversion';

/**
 * Uses ref-based callbacks to break circular dependency with usePlayback.
 * onModeSwitchRef.current and lastPlayedTypeRef.current are populated after usePlayback initializes.
 */
const useCompressorParams = ({ onModeSwitchRef, lastPlayedTypeRef, logAction, meterStateRef }) => {
    const [threshold, setThreshold] = useState(0);
    const [inflate, setInflate] = useState(0);
    const [lookahead, setLookahead] = useState(3);
    const [lookaheadControl, setLookaheadControl] = useState(() => lookaheadMsToControl(3));
    const [makeupGain, setMakeupGain] = useState(0);
    const [wetGainControl, setWetGainControl] = useState(50);
    const [dryGain, setDryGain] = useState(-200);
    const [dryGainControl, setDryGainControl] = useState(0);

    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);

    const gainAdjustedRef = useRef(false);

    const currentParams = useMemo(() => ({
        threshold, inflate, lookahead, makeupGain,
        isCompBypass: false
    }), [threshold, inflate, lookahead, makeupGain]);

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
            setLookaheadControl(lookaheadMsToControl(savedParams.lookahead));
            // Always start wet gain at 0dB on load
            setMakeupGain(0);
            setWetGainControl(50);
            setDryGain(savedParams.dryGain);
            setDryGainControl(dryGainDbToControl(savedParams.dryGain));
            setInflate(savedParams.inflate ?? 0);
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
        if (key === 'lookahead') {
            setLookaheadControl(value);
            const ms = lookaheadControlToMs(value);
            updateParamGeneric(setLookahead, ms);
            return;
        }
        const setters = { inflate: setInflate };
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

    const resetAllParams = useCallback(() => {
        setThreshold(0);
        setInflate(0);
        setLookahead(3);
        setLookaheadControl(lookaheadMsToControl(3));
        setMakeupGain(0);
        setWetGainControl(50);
        setDryGain(-200);
        setDryGainControl(0);
        setIsCustomSettings(false);
        setIsProcessing(true);
        gainAdjustedRef.current = false;
        setHasThresholdBeenAdjusted(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getCurrentStateSnapshot = useCallback(() => ({
        threshold, inflate, lookahead, lookaheadControl, makeupGain, wetGainControl, dryGain, dryGainControl,
        isCustomSettings
    }), [threshold, inflate, lookahead, lookaheadControl, makeupGain, wetGainControl, dryGain, dryGainControl,
        isCustomSettings]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setThreshold(snap.threshold);
        setInflate(snap.inflate ?? 0);
        setLookahead(snap.lookahead);
        setLookaheadControl(snap.lookaheadControl !== undefined ? snap.lookaheadControl : lookaheadMsToControl(snap.lookahead));
        setMakeupGain(snap.makeupGain);
        setWetGainControl(snap.wetGainControl !== undefined ? snap.wetGainControl : wetGainDbToControl(snap.makeupGain));
        setDryGain(snap.dryGain);
        setDryGainControl(snap.dryGainControl !== undefined ? snap.dryGainControl : dryGainDbToControl(snap.dryGain));
        setIsCustomSettings(snap.isCustomSettings);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getDefaultSnapshot = useCallback(() => ({
        threshold: 0, inflate: 0, lookahead: 3,
        lookaheadControl: lookaheadMsToControl(3),
        makeupGain: 0, wetGainControl: 50,
        dryGain: -200, dryGainControl: 0,
        isCustomSettings: false
    }), []);

    const handleModeDryGainSync = useCallback((type) => {
        if (!gainAdjustedRef.current) {
            setDryGain(-200);
            setDryGainControl(0);
        }
    }, []);

    return {
        threshold, inflate, lookahead, lookaheadControl,
        makeupGain, wetGainControl, dryGain, setDryGain, dryGainControl,
        isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted,
        gainAdjustedRef, currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange,
        handleGainChange, handleThresholdChange,
        resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
        handleModeDryGainSync,
        setThreshold,
    };
};

export { dryGainControlToDb, dryGainDbToControl, wetGainControlToDb, wetGainDbToControl, lookaheadControlToMs, lookaheadMsToControl };
export default useCompressorParams;
