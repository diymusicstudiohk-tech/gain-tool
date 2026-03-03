import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, FolderOpen, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { AUDIO_SOURCES } from '../../utils/constants';

const AudioSourceDropdown = ({
    currentSourceId, lastPracticeSourceId, isLoading,
    loadPreset, loadCustomAudio,
    customAudioFiles, handleCustomAudioFilesSelected, handleRemoveCustomFile,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const customPracticeInputRef = useRef(null);
    const listRef = useRef(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const updateScrollIndicators = useCallback(() => {
        if (listRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = listRef.current;
            setCanScrollUp(scrollTop > 5);
            setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
        }
    }, []);

    useEffect(() => {
        if (isOpen) setTimeout(updateScrollIndicators, 50);
    }, [isOpen, updateScrollIndicators]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOpen]);

    // Derive display name for the dropdown trigger
    const dropdownDisplayName = (() => {
        const sid = currentSourceId === 'upload' ? lastPracticeSourceId : currentSourceId;
        if (sid?.startsWith('custom_')) {
            const id = sid.replace('custom_', '');
            const f = customAudioFiles.find(f => f.id === id);
            return f ? (f.name.length > 14 ? f.name.substring(0, 12) + '…' : f.name) : '自訂音檔';
        }
        const src = AUDIO_SOURCES.find(s => s.id === sid);
        return src ? src.name : '選擇音檔';
    })();

    // Build flat list of all selectable sources for prev/next navigation
    const allSources = [
        ...customAudioFiles.map(f => ({ type: 'custom', id: `custom_${f.id}`, file: f })),
        ...AUDIO_SOURCES.map(s => ({ type: 'builtin', id: s.id, source: s })),
    ];

    const currentIndex = allSources.findIndex(item => item.id === currentSourceId);

    const handlePrev = () => {
        if (!allSources.length || currentSourceId === 'upload' || !currentSourceId) return;
        const idx = currentIndex <= 0 ? allSources.length - 1 : currentIndex - 1;
        const item = allSources[idx];
        if (item.type === 'custom') loadCustomAudio(item.file.id, item.file.name);
        else loadPreset(item.source);
    };

    const handleNext = () => {
        if (!allSources.length || currentSourceId === 'upload' || !currentSourceId) return;
        const idx = currentIndex >= allSources.length - 1 ? 0 : currentIndex + 1;
        const item = allSources[idx];
        if (item.type === 'custom') loadCustomAudio(item.file.id, item.file.name);
        else loadPreset(item.source);
    };

    const handleSelectRegularSource = (source) => {
        setIsOpen(false);
        if (source.id === currentSourceId) return;
        loadPreset(source);
    };

    const handleSelectCustomSource = (file) => {
        setIsOpen(false);
        if (currentSourceId === `custom_${file.id}`) return;
        loadCustomAudio(file.id, file.name);
    };

    return (
        <>
            {/* Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => !currentSourceId || currentSourceId === 'upload' ? null : setIsOpen(o => !o)}
                    data-tooltip={!isOpen ? "選擇練習音檔" : undefined}
                    className={`tooltip-below flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all duration-300 border-2 max-w-[126px] min-[550px]:max-w-[180px]
                        ${currentSourceId === 'upload' || !currentSourceId
                            ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                            : isOpen
                                ? 'bg-brick-red border-brick-red text-black animate-[breathe-mixcheck_2s_ease-in-out_infinite] z-10'
                                : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 min-[550px]:hover:scale-105'
                        }`}
                >
                    <span className="truncate">{dropdownDisplayName}</span>
                    <ChevronDown size={14} className="flex-shrink-0 hidden min-[550px]:block" />
                </button>

                {isOpen && (
                    <div
                        className="absolute top-full right-0 mt-1 w-64 max-w-[calc(100vw-1rem)] bg-black/70 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-[200] overflow-hidden glass-scrollbar"
                        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                    >
                        <div
                            ref={listRef}
                            className="max-h-[400px] overflow-y-auto glass-scrollbar"
                            onScroll={updateScrollIndicators}
                        >
                            <button
                                onClick={() => { customPracticeInputRef.current?.click(); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gold hover:bg-white/10 hover:text-white transition-colors duration-150 rounded-md"
                            >
                                <FolderOpen size={14} className="flex-shrink-0" />
                                載入自訂音檔
                            </button>

                            <div className="border-t border-white/10" />

                            {customAudioFiles.length > 0 && (
                                <>
                                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gold">
                                        自訂音檔
                                    </div>
                                    {customAudioFiles.map(f => {
                                        const isActive = currentSourceId === `custom_${f.id}`;
                                        return (
                                            <div
                                                key={f.id}
                                                className={`flex items-center gap-1 rounded-md mx-0.5 transition-colors duration-150 ${isActive ? 'bg-brick-red text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <button
                                                    className="flex-1 text-left px-3 py-2 text-sm truncate"
                                                    onClick={() => handleSelectCustomSource(f)}
                                                    title={f.name}
                                                >
                                                    {f.name}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveCustomFile(f.id); }}
                                                    className={`flex-shrink-0 p-1.5 transition-colors ${isActive ? 'text-white/70 hover:text-white' : 'text-white/30 hover:text-red-400'}`}
                                                    title="移除"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <div className="border-t border-white/10 mt-1" />
                                </>
                            )}

                            {Object.entries(
                                AUDIO_SOURCES.reduce((acc, s) => {
                                    if (!acc[s.category]) acc[s.category] = [];
                                    acc[s.category].push(s);
                                    return acc;
                                }, {})
                            ).map(([category, sources]) => (
                                <div key={category}>
                                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gold">
                                        {category}
                                    </div>
                                    {sources.map(source => {
                                        const isActive = currentSourceId === source.id;
                                        return (
                                            <button
                                                key={source.id}
                                                onClick={() => handleSelectRegularSource(source)}
                                                className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors duration-150 ${isActive ? 'bg-gold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                {source.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {canScrollUp && (
                            <div className="absolute top-0 right-2 pointer-events-none">
                                <div className="bg-gray-700/90 rounded-full p-0.5 mt-1">
                                    <ChevronUp size={12} className="text-gold" />
                                </div>
                            </div>
                        )}
                        {canScrollDown && (
                            <div className="absolute bottom-0 right-2 pointer-events-none">
                                <div className="bg-gray-700/90 rounded-full p-0.5 mb-1">
                                    <ChevronDown size={12} className="text-gold" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <input
                    ref={customPracticeInputRef}
                    type="file"
                    multiple
                    accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/x-m4a,audio/webm,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleCustomAudioFilesSelected}
                />
            </div>

            {/* Prev/Next source navigation buttons */}
            <div className="hidden min-[550px]:flex self-stretch">
                <button
                    onClick={handlePrev}
                    disabled={isLoading || !currentSourceId || currentSourceId === 'upload'}
                    className={`tooltip-below w-8 self-stretch flex items-center justify-center rounded-md text-sm font-bold transition-all duration-300 border-2
                        ${!currentSourceId || currentSourceId === 'upload' || isLoading
                            ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                            : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 hover:scale-105'
                        }`}
                    data-tooltip="上一首"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={handleNext}
                    disabled={isLoading || !currentSourceId || currentSourceId === 'upload'}
                    className={`tooltip-below w-8 self-stretch flex items-center justify-center rounded-md text-sm font-bold transition-all duration-300 border-2
                        ${!currentSourceId || currentSourceId === 'upload' || isLoading
                            ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                            : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 hover:scale-105'
                        }`}
                    data-tooltip="下一首"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </>
    );
};

export default React.memo(AudioSourceDropdown);
