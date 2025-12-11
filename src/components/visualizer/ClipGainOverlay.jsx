import React, { useState, useRef, useEffect, useCallback } from 'react';

const ClipGainOverlay = ({
    gainDB,
    setGainDB,
    containerHeight,
    panOffsetY = 0,
    zoomY = 1
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartYRef = useRef(0);
    const startGainRef = useRef(0);

    // Calculate Y position from Gain (dB)
    // Formula from Waveform: 
    // const ampScale = ((height / 2) - PADDING) * zoomY;
    // const pixelHeight = Math.pow(10, db / 20) * ampScale;
    // But this is for amplitude from center.
    // User wants "Default 1/3 from top".
    // 1/3 from top = height * 0.33. Center = height * 0.5.
    // So default 0dB should probably align with the signal's 0dB or similar?
    // Wait, "Clip Gain" usually scales the input BEFORE processing.
    // Visually, moving the line UP = More Gain? Or adjusting the "Ceiling"?
    // "Clip Gain" in DAWs usually: Drag line UP = Increase Gain. Line represents the +0dB reference relative to waveform?
    // Let's assume:
    // Visual Line Y = CenterY - (Gain_Linear * Reference_Height) ? 
    // OR simply: The line represents an arbitrary "Gain" offset.
    // Let's stick to the visual requirement first: "Default at 1/3 position".
    // Let's map 0dB to 1/3 height (approx 33%).
    // If height is 400, 1/3 is ~133px. Center is 200px.
    // If I drag DOWN, gain decreases? Usually yes.
    // Let's map pixels to dB linearly for control feel: 1px = 0.1dB?

    // Actually, let's look at the requirement: "click and drag ... move horizontal line up and down".
    // Let's store the pure dB value in parent.
    // Convert dB to Y position:
    // Let's anchor 0dB at 33% height.
    // Y = (height * 0.33) - (gainDB * scaleFactor).
    // If Gain increases (positive dB), Y decreases (moves up).
    // If Gain decreases (negative dB), Y increases (moves down).

    // User Requirement:
    // Top of container (0px) = +20dB
    // Center axis (containerHeight / 2) = -20dB
    // NEW: 0dB = 15% of Height

    // We need Piecewise Linear Scaling to satisfy all 3 points:
    // Segment 1 (Positive): 0dB (15% H) -> +20dB (0% H)
    // Segment 2 (Negative): 0dB (15% H) -> -20dB (50% H)

    const maxDb = 20;
    const minDb = -20;

    // Y Positions
    const yTop = 0;                     // +20dB
    const yZero = containerHeight * 0.15; // 0dB
    const yCenter = containerHeight * 0.5; // -20dB
    const yBottom = containerHeight;       // Limit

    // Pixels per dB (Different for pos/neg)
    const pxPerDbPos = (yZero - yTop) / 20;    // Range 15% height for 20dB
    const pxPerDbNeg = (yCenter - yZero) / 20; // Range 35% height for 20dB

    // Calculate Y from dB
    let currentY;
    if (gainDB >= 0) {
        // Positive: Map [0, 20] -> [yZero, yTop]
        currentY = yZero - (gainDB * pxPerDbPos);
    } else {
        // Negative: Map [0, -20] -> [yZero, yCenter]
        // gainDB is negative, so we ADD pixels to go down
        currentY = yZero + (Math.abs(gainDB) * pxPerDbNeg);
    }

    // Clamp Y
    if (currentY < 0) currentY = 0;
    if (currentY > containerHeight) currentY = containerHeight;

    const handleMouseDown = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        dragStartYRef.current = e.clientY;
        startGainRef.current = gainDB;
        document.body.style.cursor = 'ns-resize';

        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    };

    const handleGlobalMove = useCallback((e) => {
        const deltaY = dragStartYRef.current - e.clientY; // positive = moved UP (mouse went up)

        // We need to calculate new gain based on delta from *start gain's Y position*?
        // Or just map deltaY to deltaDB based on *current zone*?
        // Simpler: Calculate "Target Y" then convert back to dB.

        // 1. Get Start Y from Start Gain
        let startY;
        if (startGainRef.current >= 0) {
            startY = yZero - (startGainRef.current * pxPerDbPos);
        } else {
            startY = yZero + (Math.abs(startGainRef.current) * pxPerDbNeg);
        }

        // 2. Apply Delta to get New Y
        // deltaY is (Start - Current). If mouse moved UP, deltaY is positive.
        // NewY should be StartY - deltaY
        let newY = startY - deltaY;

        // 3. Convert New Y to dB
        let newGain;
        if (newY < yZero) {
            // Positive Zone (Above 15%)
            let distFromZero = yZero - newY;
            newGain = distFromZero / pxPerDbPos;
        } else {
            // Negative Zone (Below 15%)
            let distFromZero = newY - yZero;
            newGain = -(distFromZero / pxPerDbNeg);
        }

        // Clamp
        if (newGain > maxDb) newGain = maxDb;
        if (newGain < minDb) newGain = minDb; // Clamps at -20dB (Center)




        setGainDB(newGain);
    }, [setGainDB, yZero, pxPerDbPos, pxPerDbNeg, yCenter, maxDb, minDb]);

    const handleGlobalUp = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    }, [handleGlobalMove]);

    // Cleanup
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
            document.body.style.cursor = 'default';
        };
    }, [handleGlobalMove, handleGlobalUp]);

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 overflow-hidden">
            {/* Horizontal Line */}
            <div
                className="absolute left-0 w-full h-[1px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{ top: currentY }}
            />

            {/* Handle Button */}
            <div
                className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 
                            bg-slate-100/10 backdrop-blur-md border border-white/30 rounded-lg 
                            shadow-lg flex flex-col items-center justify-center gap-0 
                            cursor-ns-resize pointer-events-auto transition-colors duration-200
                            ${isDragging ? 'bg-slate-100/20 border-white/50' : 'hover:bg-slate-100/15 hover:border-white/40'}`}
                style={{ top: currentY }}
                onMouseDown={handleMouseDown}
            >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-white mb-0.5 opacity-80" />
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white mt-0.5 opacity-80" />
            </div>

            {/* Tooltip (visible while dragging or hovering handle) */}
            <div
                className={`absolute left-1/2 -translate-x-1/2 mt-6 px-2 py-1 bg-black/60 text-white text-xs rounded font-mono pointer-events-none 
                             transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0'}`}
                style={{ top: currentY }}
            >
                {gainDB > 0 ? '+' : ''}{gainDB.toFixed(1)} dB
            </div>
        </div>
    );
};

export default ClipGainOverlay;
