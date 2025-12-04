import React from 'react';
import { Power } from 'lucide-react';

const PowerButton = ({ isOn, onClick, color = 'green', className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                ${isOn
                    ? `bg-slate-900 text-${color}-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-${color}-500/50`
                    : 'bg-slate-800 text-slate-600 border border-slate-700 shadow-none'
                }
                ${className}
            `}
            title={isOn ? "Bypass (Click to Disable)" : "Enable (Click to Activate)"}
        >
            <Power size={16} strokeWidth={3} className={`transition-all duration-300 ${isOn ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : ''}`} />

            {/* Inner Ring Glow for extra "juice" */}
            {isOn && (
                <div className={`absolute inset-0 rounded-full border-2 border-${color}-400/20 animate-pulse`}></div>
            )}
        </button>
    );
};

export default PowerButton;
