import { useState, useRef, useEffect } from 'react';

const POLL_MS = 100;       // 10 Hz
const ALPHA = 0.3;         // exponential smoothing
const STALE_MS = 500;      // decay to 0 after 500 ms with no data

const useDSPMeter = () => {
    const dspLoadRef = useRef({ loadMs: 0, budgetMs: 1, timestamp: 0 });
    const [dspLoad, setDspLoad] = useState(0);
    const smoothedRef = useRef(0);

    useEffect(() => {
        const id = setInterval(() => {
            const { loadMs, budgetMs, timestamp } = dspLoadRef.current;
            const age = performance.now() - timestamp;

            if (age > STALE_MS || budgetMs === 0) {
                smoothedRef.current *= 0.8; // decay
                if (smoothedRef.current < 0.5) smoothedRef.current = 0;
            } else {
                const raw = (loadMs / budgetMs) * 100;
                smoothedRef.current += ALPHA * (raw - smoothedRef.current);
            }

            setDspLoad(Math.round(Math.min(smoothedRef.current, 100)));
        }, POLL_MS);

        return () => clearInterval(id);
    }, []);

    return { dspLoadRef, dspLoad };
};

export default useDSPMeter;
