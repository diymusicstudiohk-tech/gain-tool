import React from 'react';
import { ArrowRight } from 'lucide-react';

const SignalFlow = ({ mode, setMode }) => {
    const Button = ({ label, id }) => {
        const isActive = mode === id;
        return (
            <div
                onClick={() => setMode(id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition-all cursor-pointer select-none border
                ${isActive
                        ? 'bg-red-500/80 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                        : 'bg-slate-900/60 backdrop-blur-md border-slate-700/50 text-slate-200 hover:bg-slate-800/60'
                    }`}
            >
                {label}
            </div>
        );
    };

    const Arrow = () => (
        <div className="text-slate-500">
            <ArrowRight size={20} strokeWidth={1.5} />
        </div>
    );

    return (
        <div className="absolute bottom-56 left-4 z-50 flex items-center gap-3">
            <Button label="Clip Gain" id="clip" />
            <Arrow />
            <Button label="Comp" id="comp1" />
        </div>
    );
};

export default SignalFlow;
