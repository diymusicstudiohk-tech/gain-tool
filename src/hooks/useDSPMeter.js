import { useState, useRef, useEffect } from 'react';

const POLL_MS = 100;       // 10 Hz polling
const ALPHA = 0.15;        // slower smoothing (worklet reports at ~2 Hz)
const STALE_MS = 800;      // longer stale window to match 2 Hz reports

const useDSPMeter = () => {
    const dspLoadRef = useRef({ loadMs: 0, budgetMs: 1, timestamp: 0 });
    const [dspLoad, setDspLoad] = useState(0);
    const smoothedRef = useRef(0);

    useEffect(() => {
        const id = setInterval(() => {
            const { loadMs, budgetMs, timestamp } = dspLoadRef.current;
            const age = performance.now() - timestamp;

            if (age > STALE_MS || budgetMs === 0) {
                smoothedRef.current *= 0.8;
                if (smoothedRef.current < 0.3) smoothedRef.current = 0;
            } else {
                const raw = (loadMs / budgetMs) * 100;
                smoothedRef.current += ALPHA * (raw - smoothedRef.current);
            }

            const val = smoothedRef.current;
            // Show 1 as minimum when there's any measurable load
            setDspLoad(val > 0.2 ? Math.max(1, Math.round(Math.min(val, 100))) : 0);
        }, POLL_MS);

        return () => clearInterval(id);
    }, []);

    return { dspLoadRef, dspLoad };
};

export default useDSPMeter;
