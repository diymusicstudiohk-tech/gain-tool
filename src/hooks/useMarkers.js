import { useState, useRef, useCallback } from 'react';
import { DEFAULT_HALF_WIDTH_PX } from '../utils/canvasMarkers';

let markerIdCounter = 0;

const useMarkers = () => {
    const [markers, setMarkers] = useState([]);
    const markersRef = useRef([]);

    const syncRef = (next) => {
        markersRef.current = next;
        setMarkers(next);
    };

    /**
     * Add a marker centred at clickFrac.
     * Default width: ±DEFAULT_HALF_WIDTH_PX converted to fraction of audio via canvasWidth * zoomX.
     * Rejects if either edge overlaps an existing marker.
     */
    const addMarker = useCallback((clickFrac, zoomX, canvasWidth) => {
        const totalPx = canvasWidth * zoomX;
        if (totalPx <= 0) return;
        const halfFrac = DEFAULT_HALF_WIDTH_PX / totalPx;
        let startFrac = Math.max(0, clickFrac - halfFrac);
        let endFrac = Math.min(1, clickFrac + halfFrac);

        // Validate no overlap with existing markers
        const existing = markersRef.current;
        for (const m of existing) {
            // New marker's start or end falls inside existing
            if (startFrac < m.endFrac && endFrac > m.startFrac) return;
        }

        const id = `marker_${++markerIdCounter}`;
        const next = [...existing, { id, startFrac, endFrac, peakAmp: null, clipGainDb: 0 }].sort((a, b) => a.startFrac - b.startFrac);
        syncRef(next);
    }, []);

    /**
     * Remove a marker by ID.
     */
    const removeMarker = useCallback((id) => {
        const next = markersRef.current.filter(m => m.id !== id);
        syncRef(next);
    }, []);

    /**
     * Update one edge of a marker. Clamps to [0,1], prevents overlap with neighbors,
     * and enforces minimum width (~10px equivalent).
     */
    const updateMarkerEdge = useCallback((id, edge, newFrac, zoomX, canvasWidth) => {
        const all = markersRef.current;
        const idx = all.findIndex(m => m.id === id);
        if (idx === -1) return;

        const marker = all[idx];
        const totalPx = canvasWidth * zoomX;
        const minFrac = totalPx > 0 ? 10 / totalPx : 0.001;

        let updated;
        if (edge === 'left') {
            let clamped = Math.max(0, Math.min(newFrac, marker.endFrac - minFrac));
            // Cannot cross into previous marker
            if (idx > 0) clamped = Math.max(clamped, all[idx - 1].endFrac);
            updated = { ...marker, startFrac: clamped, peakAmp: null, clipGainDb: 0 };
        } else {
            let clamped = Math.min(1, Math.max(newFrac, marker.startFrac + minFrac));
            // Cannot cross into next marker
            if (idx < all.length - 1) clamped = Math.min(clamped, all[idx + 1].startFrac);
            updated = { ...marker, endFrac: clamped, peakAmp: null, clipGainDb: 0 };
        }

        const next = [...all];
        next[idx] = updated;
        syncRef(next);
    }, []);

    /**
     * Set the custom peak amplitude for a marker (0–1). Both lines move symmetrically.
     * Pass null to reset to auto-snap.
     */
    const updateMarkerPeakAmp = useCallback((id, amp) => {
        const all = markersRef.current;
        const idx = all.findIndex(m => m.id === id);
        if (idx === -1) return;
        const next = [...all];
        next[idx] = { ...all[idx], peakAmp: amp };
        syncRef(next);
    }, []);

    /**
     * Set the clip gain in dB for a marker.
     */
    const updateMarkerClipGain = useCallback((id, clipGainDb) => {
        const all = markersRef.current;
        const idx = all.findIndex(m => m.id === id);
        if (idx === -1) return;
        const next = [...all];
        next[idx] = { ...all[idx], clipGainDb };
        syncRef(next);
    }, []);

    /**
     * Reset a marker's gain back to 0 dB (undo clip gain adjustment).
     */
    const resetMarkerGain = useCallback((id) => {
        const all = markersRef.current;
        const idx = all.findIndex(m => m.id === id);
        if (idx === -1) return;
        const next = [...all];
        next[idx] = { ...all[idx], peakAmp: null, clipGainDb: 0 };
        syncRef(next);
    }, []);

    /**
     * Clear all markers (called on audio file change).
     */
    const clearAll = useCallback(() => {
        syncRef([]);
    }, []);

    return {
        markers,
        markersRef,
        addMarker,
        removeMarker,
        updateMarkerEdge,
        updateMarkerPeakAmp,
        updateMarkerClipGain,
        resetMarkerGain,
        clearAll,
    };
};

export default useMarkers;
