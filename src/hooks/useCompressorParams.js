import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PRESETS_DATA } from '../utils/constants';
import { saveParamsToStorage, loadParamsFromStorage } from '../utils/storage';

const calculateRatioFromControl = (ctrl) =>
    ctrl <= 50 ? 1 + (ctrl / 50) * 4 : (ctrl <= 75 ? 5 + ((ctrl - 50) / 25) * 5 : 10 + ((ctrl - 75) / 25) * 90);

const calculateControlFromRatio = (r) =>
    r <= 5 ? (r - 1) / 4 * 50 : (r <= 10 ? 50 + (r - 5) / 5 * 25 : 75 + (r - 10) / 90 * 25);

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
    const [dryGain, setDryGain] = useState(0);

    const [gateThreshold, setGateThreshold] = useState(-80);
    const [gateRatio, setGateRatio] = useState(4);
    const [gateAttack, setGateAttack] = useState(2);
    const [gateRelease, setGateRelease] = useState(100);

    const [clipGain, setClipGain] = useState(0);
    const [isGateBypass, setIsGateBypass] = useState(true);
    const [isCompBypass, setIsCompBypass] = useState(false);
    const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
    const [isCustomSettings, setIsCustomSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);
    const [hasGateBeenAdjusted, setHasGateBeenAdjusted] = useState(false);

    const gainAdjustedRef = useRef(false);

    const currentParams = useMemo(() => ({
        threshold, ratio, attack, release, knee, lookahead, makeupGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass, dryGain, isDeltaMode: false
    }), [threshold, ratio, attack, release, knee, lookahead, makeupGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass, dryGain]);

    const paramsRef = useRef(currentParams);
    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);

    // Load from localStorage on mount
    useEffect(() => {
        setRatioControl(calculateControlFromRatio(4));
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setThreshold(savedParams.threshold); setRatio(savedParams.ratio);
            setRatioControl(calculateControlFromRatio(savedParams.ratio));
            setAttack(savedParams.attack); setRelease(savedParams.release);
            setKnee(savedParams.knee); setLookahead(savedParams.lookahead);
            setMakeupGain(savedParams.makeupGain); setDryGain(savedParams.dryGain);
            setGateThreshold(savedParams.gateThreshold); setGateRatio(savedParams.gateRatio);
            setGateAttack(savedParams.gateAttack); setGateRelease(savedParams.gateRelease);
            setIsGateBypass(savedParams.isGateBypass); setIsCompBypass(savedParams.isCompBypass);
        }
    }, []);

    // Auto-save params (debounced 1s)
    useEffect(() => {
        const timer = setTimeout(() => {
            saveParamsToStorage({
                threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
                gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass]);

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

    const updateGateParam = useCallback((key, value) => {
        const setters = { gateRatio: setGateRatio, gateAttack: setGateAttack, gateRelease: setGateRelease };
        if (setters[key]) updateParamGeneric(setters[key], value);
    }, [updateParamGeneric]);

    const handleGainChange = useCallback((key, value) => {
        if (key === 'makeupGain') { setMakeupGain(value); logAction(`SET_GAIN: Makeup -> ${value}`); }
        if (key === 'dryGain') { setDryGain(value); logAction(`SET_GAIN: Dry -> ${value}`); }
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

    const handleGateThresholdChange = useCallback((v) => {
        updateParamGeneric(setGateThreshold, v);
        if (!hasGateBeenAdjusted) setHasGateBeenAdjusted(true);
    }, [updateParamGeneric, hasGateBeenAdjusted]);

    const applyPreset = useCallback((idx) => {
        const p = PRESETS_DATA[idx]; if (!p) return;
        logAction(`LOAD_PRESET: ${p.name}`);
        setSelectedPresetIdx(idx); setIsCustomSettings(false); setIsProcessing(true);
        setThreshold(p.params.threshold); setRatio(p.params.ratio);
        setRatioControl(calculateControlFromRatio(p.params.ratio));
        setAttack(p.params.attack); setRelease(p.params.release);
        setKnee(p.params.knee); setLookahead(p.params.lookahead);
        setMakeupGain(p.params.makeupGain); setDryGain(p.params.dryGain);
        setGateThreshold(p.params.gateThreshold);
        setIsGateBypass(false); setIsCompBypass(false);
        if (idx === 0) setGateRatio(4);
        ensureProcessedMode();
    }, [logAction, ensureProcessedMode]);

    const resetAllParams = useCallback(() => {
        applyPreset(0);
        gainAdjustedRef.current = false;
        setHasThresholdBeenAdjusted(true);
        setHasGateBeenAdjusted(false);
        setIsGateBypass(true); setIsCompBypass(false);
    }, [applyPreset]);

    const getCurrentStateSnapshot = useCallback(() => ({
        threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        selectedPresetIdx, isCustomSettings, isGateBypass, isCompBypass
    }), [threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, selectedPresetIdx, isCustomSettings,
        isGateBypass, isCompBypass]);

    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setThreshold(snap.threshold); setRatio(snap.ratio); setRatioControl(snap.ratioControl);
        setAttack(snap.attack); setRelease(snap.release); setKnee(snap.knee); setLookahead(snap.lookahead);
        setMakeupGain(snap.makeupGain); setDryGain(snap.dryGain);
        setGateThreshold(snap.gateThreshold); setGateRatio(snap.gateRatio);
        setGateAttack(snap.gateAttack); setGateRelease(snap.gateRelease);
        setSelectedPresetIdx(snap.selectedPresetIdx); setIsCustomSettings(snap.isCustomSettings);
        setIsGateBypass(snap.isGateBypass || false); setIsCompBypass(snap.isCompBypass || false);
        setIsProcessing(true);
        ensureProcessedMode();
    }, [ensureProcessedMode]);

    const getDefaultSnapshot = useCallback(() => {
        const def = PRESETS_DATA[0].params;
        return {
            ...def, ratioControl: calculateControlFromRatio(def.ratio),
            gateRatio: 4, gateAttack: 2, gateRelease: 100,
            selectedPresetIdx: 0, isCustomSettings: false,
            isGateBypass: true, isCompBypass: false
        };
    }, []);

    const handleModeDryGainSync = useCallback((type) => {
        if (!gainAdjustedRef.current) {
            if (type === 'original') setDryGain(0);
            else setDryGain(-60);
        }
    }, []);

    return {
        threshold, ratio, ratioControl, attack, release, knee, lookahead,
        makeupGain, dryGain, setDryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        clipGain, setClipGain,
        isGateBypass, setIsGateBypass,
        isCompBypass, setIsCompBypass,
        selectedPresetIdx, isCustomSettings, setIsCustomSettings,
        isProcessing, setIsProcessing,
        hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted,
        hasGateBeenAdjusted, setHasGateBeenAdjusted,
        gainAdjustedRef, currentParams, paramsRef,
        updateParamGeneric, handleCompKnobChange, updateGateParam,
        handleGainChange, updateRatio, handleThresholdChange, handleGateThresholdChange,
        applyPreset, resetAllParams,
        getCurrentStateSnapshot, applyStateSnapshot, getDefaultSnapshot,
        handleModeDryGainSync,
        setThreshold, setGateThreshold,
    };
};

export { calculateRatioFromControl, calculateControlFromRatio };
export default useCompressorParams;
