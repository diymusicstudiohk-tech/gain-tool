import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Triangle, Power, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { PRESETS_DATA, AUDIO_SOURCES } from '../../utils/constants';

const CATEGORY_ZH = {
    General: '通用', Bass: '貝斯', 'Acoustic Guitar': '木吉他', 'Electric Guitar': '電吉他',
    Kick: '大鼓', Snare: '小鼓', 'Other Drums': '其他鼓件', Keys: '鍵盤',
    'Female Vocal': '女聲', 'Male Vocal': '男聲', Other: '其他',
};

const PlaybackControls = ({ playback, preset }) => {
    const { playingType, isDryMode, isDeltaMode, togglePlayback, handleModeChange, toggleDeltaMode } = playback;
    const { selectedPresetIdx, isCustomSettings, applyPreset, currentSourceId } = preset;

    // Preset dropdown state
    const [isPresetOpen, setIsPresetOpen] = useState(false);
    const presetDropdownRef = useRef(null);
    const presetListRef = useRef(null);
    const [presetCanScrollUp, setPresetCanScrollUp] = useState(false);
    const [presetCanScrollDown, setPresetCanScrollDown] = useState(false);

    const updatePresetScroll = useCallback(() => {
        if (presetListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = presetListRef.current;
            setPresetCanScrollUp(scrollTop > 5);
            setPresetCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
        }
    }, []);

    useEffect(() => {
        if (isPresetOpen) setTimeout(updatePresetScroll, 50);
    }, [isPresetOpen, updatePresetScroll]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isPresetOpen && presetDropdownRef.current && !presetDropdownRef.current.contains(event.target)) {
                setIsPresetOpen(false);
            }
        };
        if (isPresetOpen) window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isPresetOpen]);

    return (
        <div className="grid grid-cols-2 min-[740px]:flex gap-1.5 min-[740px]:gap-2 flex-none items-stretch relative z-50 self-stretch pl-4 min-[740px]:pl-0">
            {/* Play/Pause Button */}
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
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
            {/* Comp Preset Button */}
            <div className="relative" ref={presetDropdownRef}>
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsPresetOpen(o => !o)}
                    data-tooltip={!isPresetOpen ? "選擇壓縮器預設" : undefined}
                    className={`w-8 h-full rounded-lg flex items-center justify-center transition-transform active:scale-95 border shadow-inner shadow-xl ${
                        isPresetOpen
                            ? 'bg-gold border-gold'
                            : 'bg-panel hover:bg-gold border-gold/30'
                    }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-10 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                </button>
                {isPresetOpen && (
                    <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-black/90 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-[9999] overflow-hidden glass-scrollbar"
                        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                    >
                        <div ref={presetListRef} className="max-h-[400px] overflow-y-auto glass-scrollbar" onScroll={updatePresetScroll}>
                            {Object.entries(PRESETS_DATA.reduce((acc, p, idx) => {
                                if (!acc[p.category]) acc[p.category] = [];
                                acc[p.category].push({ ...p, originalIdx: idx });
                                return acc;
                            }, {})).map(([category, presets]) => {
                                const visiblePresets = presets.filter(p => {
                                    if (p.originalIdx === selectedPresetIdx) return true;
                                    if (p.category === 'General') return true;
                                    if (currentSourceId && currentSourceId !== 'upload') {
                                        const activeSource = AUDIO_SOURCES.find(s => s.id === currentSourceId);
                                        if (activeSource) {
                                            if (!activeSource.category.startsWith(p.category)) {
                                                if (p.category === 'Other' && activeSource.category.includes('Other Drums')) return false;
                                                if (!activeSource.category.includes(p.category)) return false;
                                            }
                                        }
                                    }
                                    return true;
                                });
                                if (visiblePresets.length === 0) return null;
                                return (
                                    <div key={category}>
                                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gold">
                                            {CATEGORY_ZH[category] || category}
                                        </div>
                                        {visiblePresets.map(p => {
                                            const isActive = p.originalIdx === selectedPresetIdx;
                                            return (
                                                <button
                                                    key={p.originalIdx}
                                                    onClick={() => { applyPreset(p.originalIdx); setIsPresetOpen(false); }}
                                                    className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors duration-150 ${isActive ? 'bg-gold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    {p.name}{isActive && isCustomSettings ? ' *' : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                        {presetCanScrollUp && (
                            <div className="absolute top-0 right-2 pointer-events-none">
                                <div className="bg-gray-700/90 rounded-full p-0.5 mt-1"><ChevronUp size={12} className="text-gold" /></div>
                            </div>
                        )}
                        {presetCanScrollDown && (
                            <div className="absolute bottom-0 right-2 pointer-events-none">
                                <div className="bg-gray-700/90 rounded-full p-0.5 mb-1"><ChevronDown size={12} className="text-gold" /></div>
                            </div>
                        )}
                        <div className="px-3 py-2 border-t border-white/10 text-center text-xs font-semibold text-white tracking-wider">壓縮器預設集</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaybackControls;
