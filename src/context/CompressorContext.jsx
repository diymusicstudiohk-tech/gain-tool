import React, { createContext, useContext } from 'react';
import { useParameterManagement } from '../hooks/useParameterManagement';

const CompressorContextInstance = createContext(null);

export const useCompressorContext = () => {
    const context = useContext(CompressorContextInstance);
    if (!context) {
        throw new Error('useCompressorContext must be used within CompressorProvider');
    }
    return context;
};

export const CompressorProvider = ({ children }) => {
    const parameterState = useParameterManagement();

    return (
        <CompressorContextInstance.Provider value={parameterState}>
            {children}
        </CompressorContextInstance.Provider>
    );
};
