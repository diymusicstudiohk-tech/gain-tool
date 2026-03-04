import { useState, useRef, useCallback } from 'react';
import { AUDIO_SOURCES } from '../utils/constants';
import { stopCurrentSource } from '../utils/audioHelper';
import { saveParamsForSource, loadParamsForSource } from '../utils/storage';

const useSessionManager = ({
    audioContext,
    handleDecodedBuffer, loadAudio,
    applyStateSnapshot, getCurrentStateSnapshot,
    sourceNodeRef, isPlayingRef, startOffsetRef, setPlayingType,
    currentSourceId, currentSourceIdRef, getSnapshotRef,
    setCurrentSourceId, setFileName,
}) => {
    // Consolidated session state: user upload, practice session, upload session
    const sessionRef = useRef({
        user: { buffer: null, fileName: '' },
        practice: null,
        upload: null,
    });
    // Stable ref-like proxies for backward-compatible public API
    const [userBufferRef] = useState(() => ({
        get current() { return sessionRef.current.user.buffer; },
        set current(v) { sessionRef.current.user.buffer = v; },
    }));
    const [userFileNameRef] = useState(() => ({
        get current() { return sessionRef.current.user.fileName; },
        set current(v) { sessionRef.current.user.fileName = v; },
    }));

    const saveSessionState = useCallback((mode) => {
        const snapshot = getCurrentStateSnapshot();
        if (mode === 'practice') sessionRef.current.practice = { ...snapshot, sourceId: currentSourceId, fileName: '' };
        else if (mode === 'upload') sessionRef.current.upload = { ...snapshot, fileName: userFileNameRef.current };
    }, [getCurrentStateSnapshot, currentSourceId]);

    const restoreUserUpload = useCallback(() => {
        if (!userBufferRef.current || !audioContext) return;
        stopCurrentSource(sourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;
        startOffsetRef.current = 0;
        setCurrentSourceId('upload');
        setFileName(userFileNameRef.current);
        handleDecodedBuffer(userBufferRef.current);
    }, [audioContext, handleDecodedBuffer, sourceNodeRef, isPlayingRef,
        startOffsetRef, setPlayingType]);

    const switchToPractice = useCallback(() => {
        stopCurrentSource(sourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;

        // Save current source params to localStorage
        if (currentSourceIdRef.current) {
            saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
        }

        if (currentSourceId === 'upload') saveSessionState('upload');

        if (sessionRef.current.practice) {
            const snap = sessionRef.current.practice;
            setCurrentSourceId(snap.sourceId);
            setFileName(snap.fileName);
            const source = AUDIO_SOURCES.find(s => s.id === snap.sourceId);
            if (source) loadAudio(source, { paramsSnapshot: snap, skipSavePrev: true });
        } else {
            const defaultSource = AUDIO_SOURCES[0];
            loadAudio(defaultSource, { skipSavePrev: true });
        }
    }, [sourceNodeRef, isPlayingRef, currentSourceId, saveSessionState,
        loadAudio, setPlayingType]);

    const switchToUpload = useCallback(() => {
        stopCurrentSource(sourceNodeRef);
        setPlayingType('none'); isPlayingRef.current = false;

        // Save current source params to localStorage
        if (currentSourceIdRef.current) {
            saveParamsForSource(currentSourceIdRef.current, getSnapshotRef.current());
        }

        if (currentSourceId !== 'upload') saveSessionState('practice');

        if (sessionRef.current.upload) {
            const snap = sessionRef.current.upload;
            applyStateSnapshot(snap);
            setCurrentSourceId('upload');
            setFileName(snap.fileName);
            if (userBufferRef.current) handleDecodedBuffer(userBufferRef.current);
        } else {
            // No session ref — try per-source localStorage for 'upload'
            const savedUploadParams = loadParamsForSource('upload');
            if (savedUploadParams) {
                applyStateSnapshot(savedUploadParams);
            }
            restoreUserUpload();
        }
    }, [sourceNodeRef, isPlayingRef, currentSourceId, saveSessionState,
        applyStateSnapshot, handleDecodedBuffer, restoreUserUpload, setPlayingType]);

    const clearUserUpload = useCallback(() => {
        userBufferRef.current = null;
        userFileNameRef.current = "";
        sessionRef.current.upload = null;
        if (currentSourceId === 'upload') switchToPractice();
    }, [currentSourceId, switchToPractice]);

    return {
        userBufferRef, userFileNameRef,
        restoreUserUpload, switchToPractice, switchToUpload, clearUserUpload,
    };
};

export default useSessionManager;
