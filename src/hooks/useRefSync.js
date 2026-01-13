import { useRef, useCallback } from 'react';

/**
 * Hook for managing session state and action logging
 * @returns {Object} Session refs and logging utilities
 */
export const useRefSync = () => {
    const userBufferRef = useRef(null);
    const userFileNameRef = useRef("");
    const practiceSessionRef = useRef(null);
    const uploadSessionRef = useRef(null);
    const actionLogRef = useRef([]);

    const logAction = useCallback((action) => {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        actionLogRef.current.push(`[${timestamp}] ${action}`);
        if (actionLogRef.current.length > 15) actionLogRef.current.shift();
    }, []);

    return {
        userBufferRef,
        userFileNameRef,
        practiceSessionRef,
        uploadSessionRef,
        actionLogRef,
        logAction
    };
};
