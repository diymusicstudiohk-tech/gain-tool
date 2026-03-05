import { useEffect, useRef, useCallback } from 'react';

const useVisibilityRecovery = ({ audioContext }) => {
    const needsResumeRef = useRef(false);
    const wasInterruptedRef = useRef(false);

    // Listen for visibilitychange and AudioContext statechange
    useEffect(() => {
        if (!audioContext) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Backgrounded — flag if context was running
                if (audioContext.state === 'running') {
                    needsResumeRef.current = true;
                }
            } else {
                // Foregrounded — set flags based on state, but do NOT call resume()
                // (not a user gesture on iOS, will silently fail)
                const state = audioContext.state;
                if (state === 'suspended' || state === 'interrupted') {
                    needsResumeRef.current = true;
                    if (state === 'interrupted') {
                        wasInterruptedRef.current = true;
                    }
                }
            }
        };

        const handleStateChange = () => {
            const state = audioContext.state;
            if (state === 'interrupted') {
                needsResumeRef.current = true;
                wasInterruptedRef.current = true;
            } else if (state === 'suspended') {
                needsResumeRef.current = true;
            } else if (state === 'running') {
                needsResumeRef.current = false;
                wasInterruptedRef.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        audioContext.addEventListener('statechange', handleStateChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            audioContext.removeEventListener('statechange', handleStateChange);
        };
    }, [audioContext]);

    // Force-resume with iOS double-resume pattern
    // Must be called from a user gesture handler (e.g. play button tap)
    const forceResumeAudioContext = useCallback(async () => {
        if (!audioContext) return false;

        if (audioContext.state === 'running') {
            needsResumeRef.current = false;
            wasInterruptedRef.current = false;
            return true;
        }

        try {
            await audioContext.resume();

            // iOS double-resume pattern: first resume() may not actually work
            if (audioContext.state !== 'running') {
                await audioContext.resume();
            }

            const success = audioContext.state === 'running';
            if (success) {
                needsResumeRef.current = false;
                wasInterruptedRef.current = false;
            }
            return success;
        } catch (err) {
            console.error('forceResumeAudioContext failed:', err);
            return false;
        }
    }, [audioContext]);

    return { forceResumeAudioContext, needsResumeRef, wasInterruptedRef };
};

export default useVisibilityRecovery;
