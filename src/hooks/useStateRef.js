import { useState, useRef, useCallback } from 'react';

const useStateRef = (initialValue) => {
    const [value, _setValue] = useState(initialValue);
    const ref = useRef(initialValue);
    const setValue = useCallback((next) => {
        const resolved = typeof next === 'function' ? next(ref.current) : next;
        ref.current = resolved;
        _setValue(resolved);
    }, []);
    return [value, setValue, ref];
};

export default useStateRef;
