import React from 'react';

const PlayBtn = ({ label, active, selected, onClick, color, isPlayButton }) => {
    let bg = "bg-slate-800 border-slate-700 text-slate-400 hover:text-white";
    if (isPlayButton) { 
        if (active) bg = "bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]"; 
    } else { 
        if (color === 'yellow' && selected) bg = "bg-yellow-500 border-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)] animate-pulse"; 
        if (color === 'red' && selected) bg = "bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"; 
    }
    return (
        <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={(e) => { e.stopPropagation(); onClick(); }} 
            className={`h-8 px-3 rounded text-xs font-bold border transition-all active:scale-95 ${bg} min-w-[50px] whitespace-nowrap`}
        >
            {label}
        </button>
    );
};

export default PlayBtn;