import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadParamsFromStorage } from '../utils/storage';
import {
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

    const isCompBypass = false;
    const setIsCompBypass = useCallback(() => {}, []);
    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);

    const currentParams = useMemo(() => ({
        threshold, inflate, lookahead, makeupGain: 0,
        isCompBypass
    }), [threshold, inflate, lookahead, isCompBypass]);

    const paramsRef = useRef({ ...currentParams, dryGain: -200, isDeltaMode: false });
    useEffect(() => {
        paramsRef.current = { ...currentParams, dryGain: -200, isDeltaMode: paramsRef.current?.isDeltaMode ?? false };
    }, [currentParams]);

    // Load from localStorage on mount
    useEffect(() => {
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setThreshold(savedParams.threshold);
            setLookahead(savedParams.lookahead);
            setLookaheadControl(lookaheadMsToControl(savedParams.lookahead));
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

    const handleThresholdChange = useCallback((v) => {
        updateParamGeneric(setThreshold, v);
        setHasThresholdBeenAdjusted(true);
    }, [updateParamGeneric]);

    const resetAllParams = useCallback(() => {
        setThreshold(0);
        setInflate(0);
        setLookahead(3);
        setLookaheadControl(lookaheadMsToControl(3));
        setIsCustomSettings(false);
        setIsProcessing(true);
        setHasThresholdBeenAdjusted(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getCurrentStateSnapshot = useCallback(() => ({
        threshold, inflate, lookahead, lookaheadControl,
        isCustomSettings,
    }), [threshold, inflate, lookahead, lookaheadControl,
        isCustomSettings]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setThreshold(snap.threshold);
        setInflate(snap.inflate ?? 0);
        setLookahead(snap.lookahead);
        setLookaheadControl(snap.lookaheadControl !== undefined ? snap.lookaheadControl : lookaheadMsToControl(snap.lookahead));
        setIsCustomSettings(snap.isCustomSettings);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getDefaultSnapshot = useCallback(() => ({
        threshold: 0, inflate: 0, lookahead: 3,
        lookaheadControl: lookaheadMsToControl(3),
        isCustomSettings: false,
    }), []);

    return {
        threshold, inflate, lookahead, lookaheadControl,
        isCompBypass, setIsCompBypass,
        isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted,
        currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange,
        handleThresholdChange,
        resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
        setThreshold,
    };
};

export { lookaheadControlToMs, lookaheadMsToControl };
export default useCompressorParams;
