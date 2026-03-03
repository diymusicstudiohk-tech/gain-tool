import React, { useCallback, useRef } from 'react';
import { OVERLAY_BG } from '../../utils/colors';

// --- Non-linear dB ↔ position mapping ---
export function dbToPosition(db) {
    if (db >= 0) {
        if (db <= 5) return 0.5 - (db / 5) * 0.25;
        return 0.25 - ((db - 5) / 15) * 0.25;
    } else {
        const adb = -db;
        if (adb <= 5) return 0.5 + (adb / 5) * 0.25;
        return 0.75 + ((adb - 5) / 15) * 0.25;
    }
}

export function positionToDb(pos) {
    if (pos <= 0.25) {
        return 20 - ((pos / 0.25) * 15);
    } else if (pos <= 0.5) {
        return 5 - ((pos - 0.25) / 0.25) * 5;
    } else if (pos <= 0.75) {
        return -((pos - 0.5) / 0.25) * 5;
    } else {
        return -5 - ((pos - 0.75) / 0.25) * 15;
    }
}

const GainButton = ({ gainDb, onGainChange, containerHeight }) => {
    const dragging = useRef(false);
    const startY = useRef(0);
    const startPos = useRef(0);

    const pos = dbToPosition(gainDb);
    const topPx = pos * containerHeight;
    const btnHeight = 28;

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        dragging.current = true;
        startY.current = e.clientY;
        startPos.current = dbToPosition(gainDb);
    }, [gainDb]);

    const handlePointerMove = useCallback((e) => {
        if (!dragging.current || containerHeight <= 0) return;
        const deltaY = e.clientY - startY.current;
        const deltaPos = deltaY / containerHeight;
        const newPos = Math.max(0, Math.min(1, startPos.current + deltaPos));
        const newDb = positionToDb(newPos);
        const rounded = Math.round(newDb * 10) / 10;
        onGainChange(Math.max(-20, Math.min(20, rounded)));
    }, [containerHeight, onGainChange]);

    const handlePointerUp = useCallback((e) => {
        dragging.current = false;
        try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }, []);

    const handleDoubleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        onGainChange(0);
    }, [onGainChange]);

    const isZero = Math.abs(gainDb) < 0.05;
    const label = isZero ? null : (gainDb > 0 ? `+${gainDb.toFixed(1)}` : gainDb.toFixed(1));

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: topPx - btnHeight / 2,
                height: btnHeight,
                display: 'flex',
                flexDirection: isZero ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                background: OVERLAY_BG,
                border: '1.5px solid rgba(255,255,255,0.8)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 9,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'ns-resize',
                touchAction: 'none',
                userSelect: 'none',
                zIndex: 10,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                padding: 0,
                width: 34,
            }}
        >
            {isZero ? <><span>&#9650;</span><span>&#9660;</span></> : label}
        </div>
    );
};

export default React.memo(GainButton);
