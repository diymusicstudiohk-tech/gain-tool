import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Download,
    Play, Pause, Power,
} from 'lucide-react';
import { getVersionDisplay } from '../../utils/version';
import ConfirmationModal from '../ui/ConfirmationModal';
import { GOLD_LOGO } from '../../utils/colors';
import useCustomAudioFiles from '../../hooks/useCustomAudioFiles';
import AudioSourceDropdown from './AudioSourceDropdown';

const Header = ({ engine: engineProps, playback, handleFactoryReset, stopAudio, tooltipsOff, setTooltipsOff }) => {
    const {
        fileName, currentSourceId, lastPracticeSourceId,
        handleFileUpload, clearUserUpload, restoreUserUpload, switchToPractice,
        userBufferRef, userFileNameRef, handleDownload, isLoading,
        loadPreset, fileInputRef, loadCustomAudio,
    } = engineProps;
    const [showAbout, setShowAbout] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingSource, setPendingSource] = useState(null);
    const [pendingCustomFile, setPendingCustomFile] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // 'sourceChange' | 'customSourceChange' | 'factoryReset'

    // Custom practice audio files (IndexedDB-backed)
    const { customAudioFiles, handleCustomAudioFilesSelected, handleRemoveCustomFile } = useCustomAudioFiles({
        currentSourceId, loadPreset, loadCustomAudio,
    });

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
        <div className="flex-none flex flex-nowrap items-center gap-2 mb-4 bg-app px-2 min-[740px]:px-4 py-3 -mx-2 min-[740px]:-mx-4 -mt-4 relative z-10">

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
                            <h3 className="text-xl font-bold text-white mb-2">Gain 增益</h3>
                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                {getVersionDisplay()}
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col items-center gap-3">
                                {document.fullscreenEnabled && (
                                    <button
                                        onClick={() => {
                                            toggleFullscreen();
                                            setShowAbout(false);
                                        }}
                                        className={`w-full max-w-[240px] px-6 py-2.5 rounded-lg text-white transition-colors font-medium text-sm shadow-lg ${
                                            isFullscreen
                                                ? 'bg-brick-red hover:brightness-110 shadow-brick-red/30'
                                                : 'bg-green hover:brightness-110 shadow-green/30'
                                        }`}
                                    >
                                        {isFullscreen ? '關閉全螢幕' : '開啟全螢幕'}
                                    </button>
                                )}
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

            <div className="[zoom:0.7] min-[550px]:[zoom:1]">
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
                        style={{ color: GOLD_LOGO }}
                    >
                        <path d="M6 8c0-3 3-5 6-5s6 2 6 6c0 5-3 8-5 10-1 1-1 3-1 3" />
                        <path d="M9 10c0-1 1-2 2-2s2 2 2 4-1 3-2 4" />
                    </svg>
                    <span>Gain 增益</span>
                </h1>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3 min-[550px]:gap-2 relative [zoom:0.7] min-[550px]:[zoom:1]">
                {/* Play Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); playback.togglePlayback(); }}
                    disabled={isLoading || !currentSourceId}
                    className={`tooltip-below w-8 self-stretch flex items-center justify-center rounded-md text-sm font-bold transition-all duration-300 border-2
                        ${!currentSourceId || isLoading
                            ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                            : playback.playingType !== 'none'
                                ? 'breathe-free-mode border-gold text-white opacity-100'
                                : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 hover:scale-105'
                        }`}
                    data-tooltip={playback.playingType !== 'none' ? '暫停' : '播放'}
                >
                    {playback.playingType !== 'none'
                        ? <Pause size={16} fill="white" className="relative z-10 text-white" />
                        : <Play size={16} fill="white" className="relative z-10 text-white" />
                    }
                </button>

                {/* Bypass Button */}
                <button
                    onClick={() => playback.handleModeChange(playback.isDryMode ? 'processed' : 'original')}
                    disabled={isLoading || !currentSourceId}
                    className={`tooltip-below w-8 self-stretch flex items-center justify-center rounded-md text-sm font-bold transition-all duration-300 border-2
                        ${!currentSourceId || isLoading
                            ? 'bg-transparent border-transparent text-gray-600 opacity-30 cursor-not-allowed'
                            : playback.isDryMode
                                ? 'breathe-brick-red border-brick-red text-white opacity-100'
                                : 'bg-panel border-white text-white opacity-80 hover:bg-white/20 hover:border-white hover:text-white hover:opacity-100 hover:scale-105'
                        }`}
                    data-tooltip={playback.isDryMode ? "關閉旁通模式(Bypass)" : "旁通(Bypass)：聆聽音訊未經增益處理前的聲音"}
                >
                    <Power size={16} className="relative z-10 text-white" strokeWidth={2.5} />
                </button>

                {/* Audio source dropdown + prev/next navigation */}
                <AudioSourceDropdown
                    currentSourceId={currentSourceId}
                    lastPracticeSourceId={lastPracticeSourceId}
                    isLoading={isLoading}
                    loadPreset={loadPreset}
                    loadCustomAudio={loadCustomAudio}
                    customAudioFiles={customAudioFiles}
                    handleCustomAudioFilesSelected={handleCustomAudioFilesSelected}
                    handleRemoveCustomFile={handleRemoveCustomFile}
                />

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
