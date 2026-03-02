import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadParamsFromStorage } from '../utils/storage';

const useCompressorParams = ({ onModeSwitchRef, lastPlayedTypeRef, logAction, meterStateRef }) => {
    const [inputGain, setInputGain] = useState(0);
    const [outputGain, setOutputGain] = useState(0);

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
        isCustomSettings,
    }), [inputGain, outputGain, isCustomSettings]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setInputGain(snap.inputGain ?? 0);
        setOutputGain(snap.outputGain ?? 0);
        setIsCustomSettings(snap.isCustomSettings);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getDefaultSnapshot = useCallback(() => ({
        inputGain: 0, outputGain: 0,
        isCustomSettings: false,
    }), []);

    return {
        inputGain, outputGain,
        isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange,
        resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
    };
};

export default useCompressorParams;
