import { useState, useRef, useCallback } from 'react';
import { generateDebugReport, copyToClipboard } from '../utils/debugHelper';
import { VERSION } from '../utils/version';

const useDebug = () => {
    const [copyStatus, setCopyStatus] = useState('idle');
    const actionLogRef = useRef([]);

    const logAction = useCallback((action) => {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        actionLogRef.current.push(`[${timestamp}] ${action}`);
        if (actionLogRef.current.length > 15) actionLogRef.current.shift();
    }, []);

    const handleCopyDebug = useCallback(async ({
        audioContext, originalBuffer, getCurrentStateSnapshot,
        fileName, currentSourceId, playingType, isPlayingRef,
        canvasDims, waveformCanvasRef
    }) => {
        setCopyStatus('copying');
        try {
            const currentParams = getCurrentStateSnapshot();
            const actionTrace = actionLogRef.current || [];

            const appState = {
                fileName,
                currentSourceId,
                playingType,
                isPlaying: isPlayingRef.current,
                canvasDims
            };

            const report = await generateDebugReport({
                audioContext,
                originalBuffer,
                currentParams,
                actionLog: actionTrace,
                waveformCanvas: waveformCanvasRef.current,
                appVersion: VERSION,
                appState
            });

            const success = await copyToClipboard(report);
            if (success) {
                setCopyStatus('success');
                setTimeout(() => setCopyStatus('idle'), 2000);
            } else {
                throw new Error("Copy failed");
            }
        } catch (e) {
            console.error('Dump State Failed:', e);
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 3000);
        }
    }, []);

    return {
        copyStatus,
        logAction,
        handleCopyDebug,
        actionLogRef,
    };
};

export default useDebug;
