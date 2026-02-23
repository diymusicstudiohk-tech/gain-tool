import React from 'react';
import { Power } from 'lucide-react';

const PowerButton = ({ isOn, onClick, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative flex items-center justify-center transition-all duration-300
                ${isOn
                    ? 'text-white'
                    : 'text-slate-600'
                }
                ${className}
            `}
            title={isOn ? "Bypass (Click to Disable)" : "Enable (Click to Activate)"}
        >
            <Power size={14} strokeWidth={3} className="transition-all duration-300" />
        </button>
    );
};

export default PowerButton;
