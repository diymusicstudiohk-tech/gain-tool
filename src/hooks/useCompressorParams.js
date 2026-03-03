import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadParamsFromStorage } from '../utils/storage';

const useCompressorParams = ({ onModeSwitchRef, lastPlayedTypeRef, logAction, meterStateRef }) => {
    const [inputGain, setInputGain] = useState(0);
    const [outputGain, setOutputGain] = useState(0);
    const [exportBitDepth, setExportBitDepth] = useState(32);
    const [normalizeOnLoad, setNormalizeOnLoad] = useState(true);

    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const currentParams = useMemo(() => ({
        inputGain, outputGain,
    }), [inputGain, outputGain]);

    const paramsRef = useRef({ ...currentParams });
    useEffect(() => {
        paramsRef.current = { ...currentParams };
    }, [currentParams]);

    // Load from localStorage on mount
    useEffect(() => {
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setInputGain(savedParams.inputGain ?? 0);
            setOutputGain(savedParams.outputGain ?? 0);
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
        const setters = { inputGain: setInputGain, outputGain: setOutputGain };
        if (setters[key]) updateParamGeneric(setters[key], value);
    }, [updateParamGeneric]);

    const resetAllParams = useCallback(() => {
        setInputGain(0);
        setOutputGain(0);
        setIsCustomSettings(false);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getCurrentStateSnapshot = useCallback(() => ({
        inputGain, outputGain,
        exportBitDepth, normalizeOnLoad,
        isCustomSettings,
    }), [inputGain, outputGain, exportBitDepth, normalizeOnLoad, isCustomSettings]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setInputGain(snap.inputGain ?? 0);
        setOutputGain(snap.outputGain ?? 0);
        if (snap.exportBitDepth != null) setExportBitDepth(snap.exportBitDepth);
        if (snap.normalizeOnLoad != null) setNormalizeOnLoad(snap.normalizeOnLoad);
        setIsCustomSettings(snap.isCustomSettings);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getDefaultSnapshot = useCallback(() => ({
        inputGain: 0, outputGain: 0,
        exportBitDepth: 32, normalizeOnLoad: true,
        isCustomSettings: false,
    }), []);

    return {
        inputGain, outputGain,
        exportBitDepth, setExportBitDepth,
        normalizeOnLoad, setNormalizeOnLoad,
        isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange,
        resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
    };
};

export default useCompressorParams;
