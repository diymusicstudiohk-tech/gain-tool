import React from 'react';
import { Power, Play, Pause } from 'lucide-react';

const PlaybackControls = ({ playback, onTouchLegend }) => {
    const { playingType, isDryMode, togglePlayback, handleModeChange } = playback;

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
                onClick={() => handleModeChange(isDryMode ? 'processed' : 'original')}
                onTouchStart={() => onTouchLegend && onTouchLegend(isDryMode ? "關閉旁通模式(Bypass)" : "旁通(Bypass)：聆聽音訊未經增益處理前的聲音")}
                data-tooltip={isDryMode ? "關閉旁通模式(Bypass)" : "旁通(Bypass)：聆聽音訊未經增益處理前的聲音"}
                className={`w-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                    isDryMode
                        ? 'breathe-brick-red border-brick-red'
                        : 'bg-panel hover:bg-brick-red border-gold/30'
                }`}
            >
                <Power size={18} className="relative z-10 text-white" strokeWidth={2.5} />
            </button>
        </div>
    );
};

export default React.memo(PlaybackControls);
