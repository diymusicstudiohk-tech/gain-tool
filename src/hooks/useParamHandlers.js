/**
 * useParamHandlers.js
 * 參數處理自定義 Hook
 * 負責處理壓縮器、閘門、增益等參數的更新邏輯
 */

import { useCallback } from 'react';

export const useParamHandlers = ({
    setAttack,
    setRelease,
    setKnee,
    setLookahead,
    setGateRatio,
    setGateAttack,
    setGateRelease,
    setMakeupGain,
    setDryGain,
    setIsCustomSettings,
    setIsProcessing,
    lastPlayedType,
    handleModeChange,
    gainAdjustedRef,
    logAction
}) => {
    /**
     * 通用參數更新函數
     * 當參數改變時自動切換到 processed 模式
     */
    const updateParamGeneric = useCallback((setter, value, name = 'PARAM') => {
        setter(value);
        setIsCustomSettings(true);
        setIsProcessing(true);
        if (lastPlayedType !== 'processed') handleModeChange('processed');
    }, [setIsCustomSettings, setIsProcessing, lastPlayedType, handleModeChange]);

    /**
     * 處理壓縮器旋鈕變化
     */
    const handleCompKnobChange = useCallback((key, value) => {
        switch (key) {
            case 'attack':
                updateParamGeneric(setAttack, value, 'Attack');
                break;
            case 'release':
                updateParamGeneric(setRelease, value, 'Release');
                break;
            case 'knee':
                updateParamGeneric(setKnee, value, 'Knee');
                break;
            case 'lookahead':
                updateParamGeneric(setLookahead, value, 'Lookahead');
                break;
        }
    }, [updateParamGeneric, setAttack, setRelease, setKnee, setLookahead]);

    /**
     * 更新閘門參數
     */
    const updateGateParam = useCallback((key, value) => {
        switch (key) {
            case 'gateRatio':
                updateParamGeneric(setGateRatio, value, 'GateRatio');
                break;
            case 'gateAttack':
                updateParamGeneric(setGateAttack, value, 'GateAttack');
                break;
            case 'gateRelease':
                updateParamGeneric(setGateRelease, value, 'GateRelease');
                break;
        }
    }, [updateParamGeneric, setGateRatio, setGateAttack, setGateRelease]);

    /**
     * 處理增益變化（Makeup Gain 和 Dry Gain）
     */
    const handleGainChange = useCallback((key, value) => {
        if (key === 'makeupGain') {
            setMakeupGain(value);
            logAction(`SET_GAIN: Makeup -> ${value}`);
        }
        if (key === 'dryGain') {
            setDryGain(value);
            logAction(`SET_GAIN: Dry -> ${value}`);
        }
        gainAdjustedRef.current = true;
        setIsProcessing(true);
        if (lastPlayedType !== 'processed') handleModeChange('processed');
    }, [setMakeupGain, setDryGain, gainAdjustedRef, setIsProcessing, lastPlayedType, handleModeChange, logAction]);

    return {
        updateParamGeneric,
        handleCompKnobChange,
        updateGateParam,
        handleGainChange
    };
};
