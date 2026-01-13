import React, { createContext, useContext, useState, useEffect } from 'react';

const AudioContextInstance = createContext(null);

export const useAudioContext = () => {
    const context = useContext(AudioContextInstance);
    if (!context) {
        throw new Error('useAudioContext must be used within AudioProvider');
    }
    return context;
};

export const AudioProvider = ({ children }) => {
    const [audioContext, setAudioContext] = useState(null);
    const [originalBuffer, setOriginalBuffer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [currentSourceId, setCurrentSourceId] = useState(null);
    const [fileName, setFileName] = useState('');
    const [resolutionPct, setResolutionPct] = useState(100);

    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        return () => {
            ctx.close();
        };
    }, []);

    const value = {
        audioContext,
        originalBuffer, setOriginalBuffer,
        isLoading, setIsLoading,
        errorMsg, setErrorMsg,
        currentSourceId, setCurrentSourceId,
        fileName, setFileName,
        resolutionPct, setResolutionPct
    };

    return (
        <AudioContextInstance.Provider value={value}>
            {children}
        </AudioContextInstance.Provider>
    );
};
