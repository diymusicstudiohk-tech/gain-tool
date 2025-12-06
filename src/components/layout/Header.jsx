import React, { useState, useRef, useEffect } from 'react';
import {
    ToggleLeft, ToggleRight, Settings, X, Sliders, Play,
    Settings2, Upload, User, Download, Ban, RotateCcw
} from 'lucide-react';
import { AUDIO_SOURCES, APP_VERSION } from '../../utils/constants';
import ConfirmationModal from '../ui/ConfirmationModal';

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
    stopAudio // [NEW]
}) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const optionsRef = useRef(null);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingSource, setPendingSource] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // 'sourceChange' | 'factoryReset'

    // Click Outside to Close Options
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOptionsOpen && optionsRef.current && !optionsRef.current.contains(event.target)) {
                setIsOptionsOpen(false);
            }
        };
        if (isOptionsOpen) window.addEventListener('mousedown', handleClickOutside, true);
        return () => window.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOptionsOpen]);

    const handleSourceChange = (e) => {
        const newId = e.target.value;
        if (newId === currentSourceId) return;

        const selected = AUDIO_SOURCES.find(s => s.id === newId);
        if (selected) {
            setPendingSource(selected);
            setPendingAction('sourceChange');
            setShowConfirmModal(true);
        }
    };

    const confirmChange = () => {
        if (pendingAction === 'sourceChange' && pendingSource) {
            resetAllParams();
            loadPreset(pendingSource);
            setPendingSource(null);
        } else if (pendingAction === 'factoryReset') {
            handleFactoryReset();
        }
        setPendingAction(null);
        setShowConfirmModal(false);
    };

    const cancelChange = () => {
        setPendingSource(null);
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
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                    看得見的壓縮器 {APP_VERSION}
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
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />

                <button onClick={handleDownload} disabled={currentSourceId !== 'upload'} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === 'upload' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`} title={currentSourceId === 'upload' ? "下載處理後的音檔" : "僅支援下載自行上載的音檔"}>
                    {currentSourceId === 'upload' ? <Download size={16} /> : <Ban size={16} />} 下載壓縮後音檔
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                <button
                    onClick={switchToPractice}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-slate-700 ${currentSourceId !== 'upload' ? 'bg-orange-600 text-white border-orange-500 animate-pulse' : 'bg-slate-800 text-orange-400 hover:bg-slate-700'}`}
                >
                    {currentSourceId !== 'upload' && <Play size={16} fill="currentColor" />}
                    練習音檔
                </button>

                <div className="relative">
                    <select
                        value={currentSourceId === 'upload' ? lastPracticeSourceId : (currentSourceId || '')}
                        onChange={handleSourceChange}
                        className={`appearance-none bg-slate-800 text-slate-200 text-sm font-bold px-3 py-2 pr-8 rounded-md border border-slate-700 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer ${currentSourceId === 'upload' ? 'opacity-50' : ''}`}
                    >
                        <option value="" disabled>Select Audio Source</option>
                        {Object.entries(AUDIO_SOURCES.reduce((acc, source) => {
                            if (!acc[source.category]) acc[source.category] = [];
                            acc[source.category].push(source);
                            return acc;
                        }, {})).map(([category, sources]) => (
                            <optgroup key={category} label={category} className="bg-slate-900 text-slate-400 font-bold">
                                {sources.map(source => (
                                    <option key={source.id} value={source.id} className="text-white font-normal">
                                        {source.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
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


                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                <button
                    onClick={() => {
                        stopAudio();
                        setPendingAction('factoryReset');
                        setShowConfirmModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-green-500 bg-green-600 text-white hover:bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    title="還原所有設定"
                >
                    <RotateCcw size={16} />
                    還原所有設定
                </button>
            </div>
        </div >
    );
};

export default Header;