import React, { useState, useRef, useEffect } from 'react';
import { 
    Settings2, Upload, User, Download, Ban, 
    ToggleLeft, ToggleRight, Settings, X, Sliders 
} from 'lucide-react';
import { AUDIO_SOURCES } from '../../utils/constants';

const Header = ({ 
    fileName, 
    resolutionPct, 
    setResolutionPct, 
    currentSourceId, 
    handleFileUpload, 
    restoreUserUpload, 
    userBufferRef, 
    userFileNameRef, 
    handleDownload, 
    isLoading, 
    loadPreset, 
    isInfoPanelEnabled, 
    setIsInfoPanelEnabled,
    fileInputRef
}) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const optionsRef = useRef(null);

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

    return (
        <div className="flex-none flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <Settings2 className="w-8 h-8 text-cyan-400"/> 壓縮器波形顯示器 Compressor Visualizer v2.2.1
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                    {fileName || 'NO FILE'} 
                    {resolutionPct < 100 && (
                        <span className="text-yellow-500 ml-2 font-bold text-[10px] tracking-wide border border-yellow-500/30 px-1.5 py-0.5 rounded bg-yellow-950/30">
                            (Reduced Resolution Mode: {resolutionPct}%)
                        </span>
                    )}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 relative">
                <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === 'upload' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Upload size={16}/> 上載音檔
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload}/>
                
                {/* Restore User Upload Button */}
                {userBufferRef.current && (
                    <button 
                        onClick={restoreUserUpload} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border border-slate-700 ${currentSourceId === 'upload' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}
                    >
                        <User size={16}/> 我的音檔 ({userFileNameRef.current.length > 10 ? userFileNameRef.current.substring(0,8)+'...' : userFileNameRef.current})
                    </button>
                )}

                <button onClick={handleDownload} disabled={currentSourceId !== 'upload'} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === 'upload' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`} title={currentSourceId === 'upload' ? "下載處理後的音檔" : "僅支援下載自行上載的音檔"}>
                    {currentSourceId === 'upload' ? <Download size={16}/> : <Ban size={16}/>} 下載壓縮後音檔
                </button>
                
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                {AUDIO_SOURCES.map(p => { 
                    const Icon = p.Icon; 
                    return (
                        <button key={p.id} onClick={() => loadPreset(p)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${currentSourceId === p.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                            <Icon size={16}/> {p.id.toUpperCase()}
                        </button>
                    ); 
                })}
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button onClick={() => setIsInfoPanelEnabled(!isInfoPanelEnabled)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all shadow-lg ${isInfoPanelEnabled ? 'bg-green-500 text-white border border-green-400 shadow-green-500/30 hover:bg-green-400 animate-pulse' : 'bg-slate-800 text-slate-500 border border-transparent hover:bg-slate-700'}`} title={isInfoPanelEnabled ? "關閉說明視窗" : "開啟說明視窗"}>
                    {isInfoPanelEnabled ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>} 彈出說明視窗
                </button>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                
                {/* OPTIONS BUTTON */}
                <div className="relative" ref={optionsRef}>
                    <button 
                        onClick={() => setIsOptionsOpen(!isOptionsOpen)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${isOptionsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                        title="設定 / 解析度"
                    >
                        <Settings size={16}/>
                    </button>
                    
                    {/* OPTIONS POPUP */}
                    {isOptionsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white flex items-center gap-2"><Sliders size={12}/> 效能與解析度</span>
                                <button onClick={() => setIsOptionsOpen(false)}><X size={14} className="text-slate-500 hover:text-white"/></button>
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
                            <p className="text-[10px] text-slate-500 leading-tight">
                                調低解析度可提升操作流暢度，但可能丟失極短暫的峰值細節。預設為 100% 以確保準確性。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Header;