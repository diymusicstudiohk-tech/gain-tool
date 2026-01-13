import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { saveParamsToStorage, loadParamsFromStorage } from '../utils/storage';

/**
 * Hook for managing all compressor and gate parameters
 * @returns {Object} Parameter state and update functions
 */
export const useParameterManagement = () => {
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
    const [hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted] = useState(true);
    const [hasGateBeenAdjusted, setHasGateBeenAdjusted] = useState(false);

    const gainAdjustedRef = useRef(false);

    const calculateRatioFromControl = useCallback((ctrl) =>
        ctrl <= 50 ? 1 + (ctrl / 50) * 4 :
        (ctrl <= 75 ? 5 + ((ctrl - 50) / 25) * 5 : 10 + ((ctrl - 75) / 25) * 90)
    , []);

    const calculateControlFromRatio = useCallback((r) =>
        r <= 5 ? (r - 1) / 4 * 50 :
        (r <= 10 ? 50 + (r - 5) / 5 * 25 : 75 + (r - 10) / 90 * 25)
    , []);

    const currentParams = useMemo(() => ({
        threshold, ratio, attack, release, knee, lookahead, makeupGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass, dryGain
    }), [threshold, ratio, attack, release, knee, lookahead, makeupGain,
        gateThreshold, gateRatio, gateAttack, gateRelease,
        isGateBypass, isCompBypass, dryGain]);

    const paramsRef = useRef(currentParams);
    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            saveParamsToStorage({
                threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
                gateThreshold, gateRatio, gateAttack, gateRelease,
                isGateBypass, isCompBypass
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [threshold, ratio, attack, release, knee, lookahead, makeupGain, dryGain,
        gateThreshold, gateRatio, gateAttack, gateRelease, isGateBypass, isCompBypass]);

    const loadParams = useCallback(() => {
        const savedParams = loadParamsFromStorage();
        if (savedParams) {
            setThreshold(savedParams.threshold);
            setRatio(savedParams.ratio);
            setRatioControl(calculateControlFromRatio(savedParams.ratio));
            setAttack(savedParams.attack);
            setRelease(savedParams.release);
            setKnee(savedParams.knee);
            setLookahead(savedParams.lookahead);
            setMakeupGain(savedParams.makeupGain);
            setDryGain(savedParams.dryGain);
            setGateThreshold(savedParams.gateThreshold);
            setGateRatio(savedParams.gateRatio);
            setGateAttack(savedParams.gateAttack);
            setGateRelease(savedParams.gateRelease);
            setIsGateBypass(savedParams.isGateBypass);
            setIsCompBypass(savedParams.isCompBypass);
        }
    }, [calculateControlFromRatio]);

    return {
        threshold, setThreshold,
        ratioControl, setRatioControl,
        ratio, setRatio,
        attack, setAttack,
        release, setRelease,
        knee, setKnee,
        lookahead, setLookahead,
        makeupGain, setMakeupGain,
        dryGain, setDryGain,
        gateThreshold, setGateThreshold,
        gateRatio, setGateRatio,
        gateAttack, setGateAttack,
        gateRelease, setGateRelease,
        clipGain, setClipGain,
        isGateBypass, setIsGateBypass,
        isCompBypass, setIsCompBypass,
        hasThresholdBeenAdjusted, setHasThresholdBeenAdjusted,
        hasGateBeenAdjusted, setHasGateBeenAdjusted,
        gainAdjustedRef,
        currentParams,
        paramsRef,
        calculateRatioFromControl,
        calculateControlFromRatio,
        loadParams
    };
};
