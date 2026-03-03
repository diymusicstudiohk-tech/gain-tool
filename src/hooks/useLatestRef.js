import { useRef } from 'react';

const useLatestRef = (value) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
};

export default useLatestRef;
