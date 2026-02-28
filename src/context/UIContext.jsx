import React, { createContext, useContext, useState } from 'react';

const UIContextInstance = createContext(null);

export const useUIContext = () => {
    const context = useContext(UIContextInstance);
    if (!context) {
        throw new Error('useUIContext must be used within UIProvider');
    }
    return context;
};

export const UIProvider = ({ children }) => {
    const [hoveredKnob, setHoveredKnob] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [isInfoPanelEnabled, setIsInfoPanelEnabled] = useState(false);
    const [hoveredKnobPos, setHoveredKnobPos] = useState({ x: 0, y: 0 });
    const [signalFlowMode, setSignalFlowMode] = useState('comp1');
    const [copyStatus, setCopyStatus] = useState('idle');
    const [lastPracticeSourceId, setLastPracticeSourceId] = useState('Bass-01');

    const value = {
        hoveredKnob, setHoveredKnob,
        showInfoPanel, setShowInfoPanel,
        isInfoPanelEnabled, setIsInfoPanelEnabled,
        hoveredKnobPos, setHoveredKnobPos,
        signalFlowMode, setSignalFlowMode,
        copyStatus, setCopyStatus,
        lastPracticeSourceId, setLastPracticeSourceId
    };

    return (
        <UIContextInstance.Provider value={value}>
            {children}
        </UIContextInstance.Provider>
    );
};
