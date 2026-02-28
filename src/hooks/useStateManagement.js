/**
 * useStateManagement.js
 * 狀態管理自定義 Hook
 * 負責處理應用程式狀態的快照、恢復、會話管理
 */

import { useCallback } from 'react';
import { calculateControlFromRatio } from '../utils/paramHelpers';

export const useStateManagement = ({
    threshold,
    ratio,
    ratioControl,
    attack,
    release,
    knee,
    lookahead,
    makeupGain,
    dryGain,
    gateThreshold,
    gateRatio,
    gateAttack,
    gateRelease,
    zoomX,
    zoomY,
    panOffset,
    panOffsetY,
    cuePoint,
    loopStart,
    loopEnd,
    isGateBypass,
    isCompBypass,
    currentSourceId,
    fileName,
    userFileNameRef,
    practiceSessionRef,
    uploadSessionRef,
    setThreshold,
    setRatio,
    setRatioControl,
    setAttack,
    setRelease,
    setKnee,
    setLookahead,
    setMakeupGain,
    setDryGain,
    setGateThreshold,
    setGateRatio,
    setGateAttack,
    setGateRelease,
    setZoomX,
    setZoomY,
    setPanOffset,
    setPanOffsetY,
    setCuePoint,
    setLoopStart,
    setLoopEnd,
    setIsGateBypass,
    setIsCompBypass,
    setIsProcessing,
    playingType,
    startOffsetRef,
    handleModeChange
}) => {
    /**
     * 獲取當前狀態快照
     * 用於會話管理和 A/B 對比
     */
    const getCurrentStateSnapshot = useCallback(() => ({
        threshold,
        ratio,
        ratioControl,
        attack,
        release,
        knee,
        lookahead,
        makeupGain,
        dryGain,
        gateThreshold,
        gateRatio,
        gateAttack,
        gateRelease,
        zoomX,
        zoomY,
        panOffset,
        panOffsetY,
        cuePoint,
        loopStart,
        loopEnd,
        isGateBypass,
        isCompBypass
    }), [threshold, ratio, ratioControl, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, zoomX, zoomY, panOffset, panOffsetY,
        cuePoint, loopStart, loopEnd, isGateBypass, isCompBypass]);

    /**
     * 套用狀態快照
     * 恢復所有參數和視圖設定
     */
    const applyStateSnapshot = useCallback((snap) => {
        if (!snap) return;
        setThreshold(snap.threshold);
        setRatio(snap.ratio);
        setRatioControl(snap.ratioControl);
        setAttack(snap.attack);
        setRelease(snap.release);
        setKnee(snap.knee);
        setLookahead(snap.lookahead);
        setMakeupGain(snap.makeupGain);
        setDryGain(snap.dryGain);
        setGateThreshold(snap.gateThreshold);
        setGateRatio(snap.gateRatio);
        setGateAttack(snap.gateAttack);
        setGateRelease(snap.gateRelease);
        setZoomX(snap.zoomX);
        setZoomY(snap.zoomY);
        setPanOffset(snap.panOffset);
        setPanOffsetY(snap.panOffsetY);
        setCuePoint(snap.cuePoint);
        setLoopStart(snap.loopStart || null);
        setLoopEnd(snap.loopEnd || null);
        setIsGateBypass(snap.isGateBypass || false);
        setIsCompBypass(snap.isCompBypass || false);

        if (playingType === 'none') startOffsetRef.current = snap.cuePoint;
        handleModeChange('processed');
        setIsProcessing(true);
    }, [setThreshold, setRatio, setRatioControl, setAttack, setRelease, setKnee, setLookahead,
        setMakeupGain, setDryGain, setGateThreshold, setGateRatio, setGateAttack, setGateRelease,
        setZoomX, setZoomY, setPanOffset, setPanOffsetY, setCuePoint, setLoopStart, setLoopEnd,
        setIsGateBypass, setIsCompBypass,
        playingType, startOffsetRef, handleModeChange, setIsProcessing]);

    /**
     * 獲取預設狀態快照
     * 用於重置所有參數
     */
    const getDefaultSnapshot = useCallback(() => ({
        inflate: 0, threshold: -18, lookahead: 3, makeupGain: 0, dryGain: -200,
        ratioControl: calculateControlFromRatio(undefined),
        gateRatio: 4,
        gateAttack: 2,
        gateRelease: 100,
        zoomX: 1,
        zoomY: 0.8,
        panOffset: 0,
        panOffsetY: 0,
        cuePoint: 0,
        loopStart: null,
        loopEnd: null,
        isGateBypass: true,
        isCompBypass: false
    }), []);

    /**
     * 保存會話狀態
     * 用於練習模式和上傳模式之間的切換
     */
    const saveSessionState = useCallback((mode) => {
        const snapshot = getCurrentStateSnapshot();
        if (mode === 'practice') {
            practiceSessionRef.current = { ...snapshot, sourceId: currentSourceId, fileName };
        } else if (mode === 'upload') {
            uploadSessionRef.current = { ...snapshot, fileName: userFileNameRef.current };
        }
    }, [getCurrentStateSnapshot, currentSourceId, fileName, userFileNameRef, practiceSessionRef, uploadSessionRef]);

    return {
        getCurrentStateSnapshot,
        applyStateSnapshot,
        getDefaultSnapshot,
        saveSessionState
    };
};
