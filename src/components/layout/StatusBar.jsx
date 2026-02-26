import React from 'react';

const StatusBar = ({ dspLoad }) => {
    const barColor =
        dspLoad > 85 ? 'bg-brick-red'
        : dspLoad > 60 ? 'bg-gold'
        : 'bg-green';

    return (
        <div className="flex-none h-5 bg-app -mx-4 -mb-4 px-4 flex items-center justify-end gap-2">
            <span className="text-[10px] text-slate-500 font-mono">DSP</span>
            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-100 ${barColor}`}
                    style={{ width: `${dspLoad}%` }}
                />
            </div>
            {dspLoad > 0 && (
                <span className="text-[10px] text-slate-500 font-mono w-7 text-right">
                    {dspLoad}%
                </span>
            )}
        </div>
    );
};

export default StatusBar;
