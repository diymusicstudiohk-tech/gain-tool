import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Download, FolderOpen, ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from 'lucide-react';
import { AUDIO_SOURCES } from '../../utils/constants';
import { getVersionDisplay } from '../../utils/version';
import ConfirmationModal from '../ui/ConfirmationModal';
import {
    loadCustomAudioIndexFromDB, saveCustomAudioIndexToDB,
    saveCustomAudioBlobToDB, deleteCustomAudioBlobFromDB,
} from '../../utils/storage';

const MAX_CUSTOM_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB
const CUSTOM_ALLOWED_MIME_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac',
    'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/x-wav',
    'audio/webm', 'audio/mp3',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
];

const Header = ({ engine: engineProps, handleFactoryReset, stopAudio, tooltipsOff, setTooltipsOff }) => {
    const {
        fileName, currentSourceId, lastPracticeSourceId,
        handleFileUpload, clearUserUpload, restoreUserUpload, switchToPractice,
        userBufferRef, userFileNameRef, handleDownload, isLoading,
        loadPreset, fileInputRef, loadCustomAudio,
    } = engineProps;
    const [showAbout, setShowAbout] = useState(false);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingSource, setPendingSource] = useState(null);
    const [pendingCustomFile, setPendingCustomFile] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // 'sourceChange' | 'customSourceChange' | 'factoryReset'

    // Custom practice audio files
    const [customAudioFiles, setCustomAudioFiles] = useState([]); // [{ id, name }]
    const [isCustomDropdownOpen, setIsCustomDropdownOpen] = useState(false);
    const customDropdownRef = useRef(null);
    const customPracticeInputRef = useRef(null);
    const customListRef = useRef(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const updateScrollIndicators = useCallback(() => {
        if (customListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = customListRef.current;
            setCanScrollUp(scrollTop > 5);
            setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
        }
    }, []);

    useEffect(() => {
        if (isCustomDropdownOpen) setTimeout(updateScrollIndicators, 50);
    }, [isCustomDropdownOpen, updateScrollIndicators]);

    // Load custom audio index from DB on mount
    useEffect(() => {
        loadCustomAudioIndexFromDB().then(setCustomAudioFiles);
    }, []);

    // Click outside to close custom dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isCustomDropdownOpen && customDropdownRef.current && !customDropdownRef.current.contains(event.target)) {
                setIsCustomDropdownOpen(false);
            }
        };
        if (isCustomDropdownOpen) window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isCustomDropdownOpen]);

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

    // Custom practice file picker handler
    const handleCustomAudioFilesSelected = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const newEntries = [];
        for (const file of files) {
            if (file.size > MAX_CUSTOM_FILE_SIZE) continue;
            if (file.type && !CUSTOM_ALLOWED_MIME_TYPES.includes(file.type)) continue;
            const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await saveCustomAudioBlobToDB(id, file);
            newEntries.push({ id, name: file.name });
        }
        if (!newEntries.length) return;
        const updated = [...newEntries, ...customAudioFiles];
        await saveCustomAudioIndexToDB(updated);
        setCustomAudioFiles(updated);
        if (e.target) e.target.value = '';
        // Immediately load the first uploaded file as current audio
        loadCustomAudio(newEntries[0].id, newEntries[0].name);
    };

    // Remove a custom file from DB and state
    const handleRemoveCustomFile = async (id) => {
        await deleteCustomAudioBlobFromDB(id);
        const updated = customAudioFiles.filter(f => f.id !== id);
        await saveCustomAudioIndexToDB(updated);
        setCustomAudioFiles(updated);
        // If the removed file is currently active, fall back to default practice track
        if (currentSourceId === `custom_${id}`) {
            loadPreset(AUDIO_SOURCES[0]);
        }
    };

    // Select a regular (built-in) source from dropdown — switch directly, no confirmation
    const handleSelectRegularSource = (source) => {
        setIsCustomDropdownOpen(false);
        if (source.id === currentSourceId) return;
        loadPreset(source);
    };

    // Select a custom source from dropdown — switch directly, no confirmation
    const handleSelectCustomSource = (file) => {
        setIsCustomDropdownOpen(false);
        if (currentSourceId === `custom_${file.id}`) return;
        loadCustomAudio(file.id, file.name);
    };

    const confirmChange = () => {
        if (pendingAction === 'sourceChange' && pendingSource) {
            loadPreset(pendingSource);
            setPendingSource(null);
        } else if (pendingAction === 'customSourceChange' && pendingCustomFile) {
            loadCustomAudio(pendingCustomFile.id, pendingCustomFile.name);
            setPendingCustomFile(null);
        } else if (pendingAction === 'factoryReset') {
            handleFactoryReset();
        }
        setPendingAction(null);
        setShowConfirmModal(false);
    };

    const cancelChange = () => {
        setPendingSource(null);
        setPendingCustomFile(null);
        setPendingAction(null);
        setShowConfirmModal(false);
    };

    return (
        <div className="flex-none flex flex-wrap items-center justify-between gap-4 mb-4 bg-app px-2 min-[740px]:px-4 py-3 -mx-2 min-[740px]:-mx-4 -mt-4 relative z-10">

            <ConfirmationModal
                isOpen={showConfirmModal}
                title={pendingAction === 'factoryReset' ? "確定還原所有設定？" : "確定轉換音檔？"}
                message={pendingAction === 'factoryReset' ? "這將會重置所有參數與畫面設定，但保留您目前的音檔選擇。" : "之前音檔的所有設定將會失去。"}
                onConfirm={confirmChange}
                onCancel={cancelChange}
            />
            {/* About modal - rendered via portal to escape Header's stacking context */}
            {showAbout && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowAbout(false)}
                >
                    <div
                        className="bg-app rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform scale-100 animate-in zoom-in-95 duration-200 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowAbout(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Content */}
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">金耳朵Gain Tool</h3>
                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                {getVersionDisplay()}
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    onClick={() => {
                                        setTooltipsOff(!tooltipsOff);
                                        setShowAbout(false);
                                    }}
                                    className={`w-full max-w-[240px] px-6 py-2.5 rounded-lg text-white transition-colors font-medium text-sm shadow-lg ${
                                        tooltipsOff
                                            ? 'bg-green hover:brightness-110 shadow-green/30'
                                            : 'bg-brick-red hover:brightness-110 shadow-brick-red/30'
                                    }`}
                                >
                                    {tooltipsOff ? '開啟按鈕說明' : '關閉按鈕說明'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAbout(false);
                                        stopAudio();
                                        handleFactoryReset();
                                    }}
                                    className="w-full max-w-[240px] px-6 py-2.5 rounded-lg bg-gold text-black hover:bg-gold-light transition-colors font-medium text-sm shadow-lg shadow-gold/30"
                                >
                                    還原本程式所有設定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div>
                <h1
                    className="tooltip-below tooltip-always text-xl font-bold flex items-center gap-2 text-white tracking-tight cursor-pointer hover:opacity-75 transition-opacity select-none"
                    onClick={() => setShowAbout(true)}
                    data-tooltip="點擊彈窗能關閉按鈕說明或還原程式設定"
                >
                    <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: '#C0A374' }}
                    >
                        <path d="M6 8c0-3 3-5 6-5s6 2 6 6c0 5-3 8-5 10-1 1-1 3-1 3" />
                        <path d="M9 10c0-1 1-2 2-2s2 2 2 4-1 3-2 4" />
                    </svg>
                    <span className="hidden min-[740px]:inline">金耳朵Gain Tool</span>
                    <span className="inline min-[740px]:hidden text-[15px]">Gain Tool</span>
                </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 min-[740px]:gap-2 relative scale-[0.7] min-[740px]:scale-100 origin-right">
                {/* Custom practice audio dropdown — EqPresetDropdown style */}
                <div className="relative" ref={customDropdownRef}>
                    {/* Trigger button */}
                    <button
                        onClick={() => !currentSourceId || currentSourceId === 'upload' ? null : setIsCustomDropdownOpen(o => !o)}
                        data-tooltip={!isCustomDropdownOpen ? "選擇練習音檔" : undefined}
                        className={`tooltip-below flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all duration-300 border-2 max-w-[180px]
                            ${currentSourceId === 'upload' || !currentSourceId
                                ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                                : isCustomDropdownOpen
                                    ? 'bg-brick-red border-brick-red text-black animate-[breathe-mixcheck_2s_ease-in-out_infinite] z-10'
                                    : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 min-[740px]:hover:scale-105'
                            }`}
                    >
                        <span className="truncate">{dropdownDisplayName}</span>
                        <ChevronDown size={14} className="flex-shrink-0 hidden min-[740px]:block" />
                    </button>

                    {/* Dropdown panel */}
                    {isCustomDropdownOpen && (
                        <div
                            className="absolute top-full right-0 mt-1 w-64 max-w-[calc(100vw-1rem)] bg-black/70 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-[200] overflow-hidden glass-scrollbar"
                            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                        >
                            {/* Scrollable list */}
                            <div
                                ref={customListRef}
                                className="max-h-[400px] overflow-y-auto glass-scrollbar"
                                onScroll={updateScrollIndicators}
                            >
                                {/* Load custom file */}
                                <button
                                    onClick={() => { customPracticeInputRef.current?.click(); setIsCustomDropdownOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gold hover:bg-white/10 hover:text-white transition-colors duration-150 rounded-md"
                                >
                                    <FolderOpen size={14} className="flex-shrink-0" />
                                    載入自訂音檔
                                </button>

                                <div className="border-t border-white/10" />

                                {/* Custom files */}
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

                                {/* Built-in sources grouped by category */}
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

                            {/* Scroll indicators */}
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

                    {/* Hidden file input for custom practice audio */}
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
                <div className="hidden min-[740px]:flex self-stretch">
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

                {/* Download processed audio button */}
                <button
                    onClick={handleDownload}
                    disabled={isLoading || !currentSourceId}
                    className={`tooltip-below w-8 self-stretch flex items-center justify-center rounded-md text-sm font-bold transition-all duration-300 border-2
                        ${!currentSourceId || isLoading
                            ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                            : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 hover:scale-105'
                        }`}
                    data-tooltip="下載增益後音檔"
                >
                    <Download size={16} />
                </button>

            </div>
        </div >
    );
};

export default Header;