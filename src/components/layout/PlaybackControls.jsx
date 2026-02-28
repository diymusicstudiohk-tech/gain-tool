import React from 'react';
import { Triangle, Power, Play, Pause } from 'lucide-react';

const PlaybackControls = ({ playback, onTouchLegend }) => {
    const { playingType, isDryMode, isDeltaMode, togglePlayback, handleModeChange, toggleDeltaMode } = playback;

    return (
        <div className="flex gap-2 flex-none items-stretch relative z-50 self-stretch">
            {/* Play/Pause Button */}
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
                onTouchStart={() => onTouchLegend && onTouchLegend(playingType !== 'none' ? '暫停' : '播放')}
                data-tooltip={playingType !== 'none' ? '暫停' : '播放'}
                className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border border-gold/30 shadow-inner shadow-xl ${
                    playingType !== 'none'
                        ? 'breathe-free-mode'
                        : 'bg-gold hover:bg-gold-light shadow-gold/30'
                }`}
            >
                {playingType !== 'none'
                    ? <Pause size={20} fill="white" className="relative z-10 text-white" />
                    : <Play size={20} fill="white" className="relative z-10 text-white" />
                }
            </button>
            {/* Bypass Button */}
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => !isDeltaMode && handleModeChange(isDryMode ? 'processed' : 'original')}
                onTouchStart={() => !isDeltaMode && onTouchLegend && onTouchLegend(isDryMode ? "關閉旁通模式(Bypass)" : "旁通(Bypass)：聆聽音訊未經處理前的聲音")}
                disabled={isDeltaMode}
                data-tooltip={isDryMode ? "關閉旁通模式(Bypass)" : "旁通(Bypass)：聆聽音訊未經處理前的聲音"}
                className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                    isDeltaMode
                        ? 'bg-disabled border-gray-600 cursor-not-allowed opacity-50'
                        : isDryMode
                            ? 'breathe-brick-red border-brick-red'
                            : 'bg-panel hover:bg-brick-red border-gold/30'
                }`}
            >
                <Power size={18} className="relative z-10 text-white" strokeWidth={2.5} />
            </button>
            {/* Delta Button */}
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={toggleDeltaMode}
                onTouchStart={() => !isDryMode && onTouchLegend && onTouchLegend(isDeltaMode ? "關閉差異監聽(Delta)" : "差異監聽(Delta)：只聽被壓縮器移除的部分")}
                disabled={isDryMode}
                data-tooltip={isDeltaMode ? "關閉差異監聽(Delta)" : "差異監聽(Delta)：只聽被壓縮器移除的部分"}
                className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                    isDryMode
                        ? 'bg-disabled border-gray-600 cursor-not-allowed opacity-50'
                        : isDeltaMode
                            ? 'breathe-delta border-green'
                            : 'bg-panel hover:bg-green border-gold/30'
                }`}
            >
                <Triangle size={14} fill={isDeltaMode ? "white" : "none"} className="relative z-10 text-white" />
            </button>
        </div>
    );
};

export default PlaybackControls;
