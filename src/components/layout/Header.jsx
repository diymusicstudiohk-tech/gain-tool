import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ToggleLeft, ToggleRight, Settings, X, Sliders, Play,
    Settings2, Upload, User, Download, Ban, RotateCcw, FolderOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { AUDIO_SOURCES, APP_VERSION, PRESETS_DATA } from '../../utils/constants';
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

const Header = ({
    fileName,
    resolutionPct,
    setResolutionPct,
    currentSourceId,
    lastPracticeSourceId,
    handleFileUpload,


    clearUserUpload,
    restoreUserUpload,
    switchToPractice,
    userBufferRef,
    userFileNameRef,
    handleDownload,
    isLoading,
    loadPreset,
    isInfoPanelEnabled,
    setIsInfoPanelEnabled,
    fileInputRef,
    resetAllParams,

    handleFactoryReset,
    stopAudio,
    loadCustomAudio,

    // Presets
    selectedPresetIdx,
    isCustomSettings,
    applyPreset
}) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const optionsRef = useRef(null);
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
        if (!customListRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = customListRef.current;
        setCanScrollUp(scrollTop > 5);
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
    }, []);

    useEffect(() => {
        if (isCustomDropdownOpen) setTimeout(updateScrollIndicators, 50);
    }, [isCustomDropdownOpen, updateScrollIndicators]);

    // Load custom audio index from DB on mount
    useEffect(() => {
        loadCustomAudioIndexFromDB().then(setCustomAudioFiles);
    }, []);

    // Click outside to close options panel
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOptionsOpen && optionsRef.current && !optionsRef.current.contains(event.target)) {
                setIsOptionsOpen(false);
            }
        };
        if (isOptionsOpen) window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOptionsOpen]);

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
    };

    // Remove a custom file from DB and state
    const handleRemoveCustomFile = async (id) => {
        await deleteCustomAudioBlobFromDB(id);
        const updated = customAudioFiles.filter(f => f.id !== id);
        await saveCustomAudioIndexToDB(updated);
        setCustomAudioFiles(updated);
        // If the removed file is currently active, fall back to default practice track
        if (currentSourceId === `custom_${id}`) {
            resetAllParams();
            loadPreset(AUDIO_SOURCES[0]);
        }
    };

    // Select a regular (built-in) source from dropdown
    const handleSelectRegularSource = (source) => {
        setIsCustomDropdownOpen(false);
        if (source.id === currentSourceId) return;
        setPendingSource(source);
        setPendingAction('sourceChange');
        setShowConfirmModal(true);
    };

    // Select a custom source from dropdown
    const handleSelectCustomSource = (file) => {
        setIsCustomDropdownOpen(false);
        if (currentSourceId === `custom_${file.id}`) return;
        setPendingCustomFile(file);
        setPendingAction('customSourceChange');
        setShowConfirmModal(true);
    };

    const confirmChange = () => {
        if (pendingAction === 'sourceChange' && pendingSource) {
            resetAllParams();
            loadPreset(pendingSource);
            setPendingSource(null);
        } else if (pendingAction === 'customSourceChange' && pendingCustomFile) {
            resetAllParams();
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
        <div className="flex-none flex flex-wrap items-center justify-between gap-4 mb-4">

            <ConfirmationModal
                isOpen={showConfirmModal}
                title={pendingAction === 'factoryReset' ? "確定還原所有設定？" : "確定轉換音檔？"}
                message={pendingAction === 'factoryReset' ? "這將會重置所有參數與畫面設定，但保留您目前的音檔選擇。" : "之前音檔的所有設定將會失去。"}
                onConfirm={confirmChange}
                onCancel={cancelChange}
            />
            {/* About modal */}
            {showAbout && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowAbout(false)}
                >
                    <div
                        className="bg-[#202020] border border-white/10 rounded-xl shadow-2xl p-6 min-w-[260px] max-w-sm mx-4 flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#C0A374' }}>
                                <path d="M6 8c0-3 3-5 6-5s6 2 6 6c0 5-3 8-5 10-1 1-1 3-1 3" />
                                <path d="M9 10c0-1 1-2 2-2s2 2 2 4-1 3-2 4" />
                            </svg>
                            <span className="text-white font-medium text-sm">金耳朵壓縮顯示器</span>
                        </div>
                        <div className="border-t border-white/10" />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-400 uppercase tracking-wider">最新更新</span>
                            <span className="text-sm text-white font-mono">
                                {(() => {
                                    try {
                                        return new Date(__GIT_COMMIT_TIME__).toLocaleString('zh-HK', {
                                            timeZone: 'Asia/Hong_Kong',
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                                            hour12: false,
                                        });
                                    } catch (_) {
                                        return __GIT_COMMIT_TIME__;
                                    }
                                })()}
                            </span>
                        </div>
                        <div className="border-t border-white/10" />
                        <button
                            onClick={() => {
                                setShowAbout(false);
                                stopAudio();
                                setPendingAction('factoryReset');
                                setShowConfirmModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-green-500 bg-green-600 text-white hover:bg-green-500"
                        >
                            <RotateCcw size={16} />
                            還原所有設定
                        </button>
                        <button
                            onClick={() => setShowAbout(false)}
                            className="self-end text-xs text-slate-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-white/10"
                        >
                            關閉
                        </button>
                    </div>
                </div>
            )}

            <div>
                <h1
                    className="text-sm font-medium flex items-center gap-2 text-white cursor-pointer hover:opacity-75 transition-opacity select-none"
                    onClick={() => setShowAbout(true)}
                    title="點擊查看版本資訊"
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
                    金耳朵壓縮顯示器
                </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 relative">
                {/* Clear Upload Button */}
                <button
                    onClick={clearUserUpload}
                    disabled={!userBufferRef.current}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all border ${!userBufferRef.current ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' : 'bg-red-600 text-white border-red-500 hover:bg-red-500'}`}
                    title="清除上載音檔"
                >
                    <X size={16} />
                </button>

                {/* Merged Upload / My Audio Button */}
                <button
                    onClick={() => {
                        if (!userBufferRef.current) {
                            fileInputRef.current?.click();
                        } else {
                            if (currentSourceId === 'upload') {
                                fileInputRef.current?.click();
                            } else {
                                restoreUserUpload();
                            }
                        }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-slate-700 ${currentSourceId === 'upload' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}
                    title={!userBufferRef.current ? "上載音檔" : "切換至我的音檔 (點擊再次上載)"}
                >
                    {!userBufferRef.current ? <Upload size={16} /> : <User size={16} />}
                    {!userBufferRef.current ? "上載音檔" : (userFileNameRef.current.length > 10 ? userFileNameRef.current.substring(0, 8) + '...' : userFileNameRef.current)}
                </button>
                <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/x-m4a,audio/webm,video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleFileUpload} />

                <button onClick={handleDownload} disabled={currentSourceId !== 'upload'} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === 'upload' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`} title={currentSourceId === 'upload' ? "下載處理後的音檔" : "僅支援下載自行上載的音檔"}>
                    {currentSourceId === 'upload' ? <Download size={16} /> : <Ban size={16} />} 下載壓縮後音檔
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                <button
                    onClick={switchToPractice}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-slate-700 ${currentSourceId !== 'upload' ? 'bg-[#B54C35] text-white border-[#B54C35] animate-pulse' : 'bg-slate-800 text-[#B54C35] hover:bg-slate-700'}`}
                >
                    {currentSourceId !== 'upload' && <Play size={16} fill="currentColor" />}
                    練習音檔
                </button>

                {/* Custom practice audio dropdown — EqPresetDropdown style */}
                <div className="relative" ref={customDropdownRef}>
                    {/* Trigger button */}
                    <button
                        onClick={() => !currentSourceId || currentSourceId === 'upload' ? null : setIsCustomDropdownOpen(o => !o)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all duration-300 border-2 max-w-[180px]
                            ${currentSourceId === 'upload' || !currentSourceId
                                ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                                : isCustomDropdownOpen
                                    ? 'bg-[#C2A475] border-[#C2A475] text-black z-10'
                                    : 'bg-[#202020] border-white/30 text-gray-300 opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 hover:scale-105'
                            }`}
                    >
                        <span className="truncate">{dropdownDisplayName}</span>
                        <ChevronDown size={14} className="flex-shrink-0" />
                    </button>

                    {/* Dropdown panel */}
                    {isCustomDropdownOpen && (
                        <div
                            className="absolute top-full left-0 mt-1 w-64 bg-black/70 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-[200] overflow-hidden glass-scrollbar"
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
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[#C2A475] hover:bg-white/10 hover:text-white transition-colors duration-150 rounded-md"
                                >
                                    <FolderOpen size={14} className="flex-shrink-0" />
                                    載入自訂音檔
                                </button>

                                <div className="border-t border-white/10" />

                                {/* Custom files */}
                                {customAudioFiles.length > 0 && (
                                    <>
                                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#C2A475]">
                                            自訂音檔
                                        </div>
                                        {customAudioFiles.map(f => {
                                            const isActive = currentSourceId === `custom_${f.id}`;
                                            return (
                                                <div
                                                    key={f.id}
                                                    className={`flex items-center gap-1 rounded-md mx-0.5 transition-colors duration-150 ${isActive ? 'bg-[#B54C35] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
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
                                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#C2A475]">
                                            {category}
                                        </div>
                                        {sources.map(source => {
                                            const isActive = currentSourceId === source.id;
                                            return (
                                                <button
                                                    key={source.id}
                                                    onClick={() => handleSelectRegularSource(source)}
                                                    className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors duration-150 ${isActive ? 'bg-[#C2A475] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
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
                                        <ChevronUp size={12} className="text-[#C2A475]" />
                                    </div>
                                </div>
                            )}
                            {canScrollDown && (
                                <div className="absolute bottom-0 right-2 pointer-events-none">
                                    <div className="bg-gray-700/90 rounded-full p-0.5 mb-1">
                                        <ChevronDown size={12} className="text-[#C2A475]" />
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
                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                {/* PRESET SELECTOR [FILTERED, STICKY & CATEGORIZED] */}
                <div className="relative">
                    <select
                        value={selectedPresetIdx}
                        onChange={(e) => applyPreset(parseInt(e.target.value))}
                        className={`appearance-none bg-slate-800 text-slate-200 text-sm font-bold px-3 py-2 pr-8 rounded-md border border-slate-700 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer ${isCustomSettings ? 'text-cyan-400 border-cyan-500/50' : ''}`}
                    >
                        {/* Group Presets by Category */}
                        {Object.entries(PRESETS_DATA.reduce((acc, p, idx) => {
                            if (!acc[p.category]) acc[p.category] = [];
                            acc[p.category].push({ ...p, originalIdx: idx });
                            return acc;
                        }, {})).map(([category, presets]) => {
                            // Filter logic for this group
                            const visiblePresets = presets.filter(p => {
                                // Always show active
                                if (p.originalIdx === selectedPresetIdx) return true;

                                // Source filter
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
                                <optgroup key={category} label={category} className="bg-slate-900 text-slate-400 font-bold">
                                    {visiblePresets.map(p => (
                                        <option key={p.originalIdx} value={p.originalIdx} className="text-white font-normal">
                                            {p.name} {p.originalIdx === selectedPresetIdx && isCustomSettings ? '*' : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                </div>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                {/* OPTIONS BUTTON */}
                <div className="relative" ref={optionsRef}>
                    <button
                        onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${isOptionsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                        title="設定 / 解析度"
                    >
                        <Settings size={16} />
                    </button>

                    {/* OPTIONS POPUP */}
                    {isOptionsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2"><Sliders size={12} /> 效能與解析度</span>
                                <button onClick={() => setIsOptionsOpen(false)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                            </div>
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>流暢 (Low Res)</span>
                                    <span>精細 (High Res)</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={resolutionPct}
                                    onChange={(e) => setResolutionPct(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="text-center text-xs font-mono mt-1 text-cyan-400 font-bold">{resolutionPct}% Resolution</div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight mb-4">
                                調低解析度可提升操作流暢度，但可能丟失極短暫的峰值細節。預設為 100% 以確保準確性。
                            </p>

                        </div>
                    )}
                </div>


            </div>
        </div >
    );
};

export default Header;