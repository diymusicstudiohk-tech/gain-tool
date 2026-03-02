import React from 'react';
import PlaybackControls from './PlaybackControls';

const ControlHud = ({ compressor, playback, ui, tooltipsOff }) => {
    const { lastPlayedType, isDryMode, handleModeChange } = playback;
    const { isDraggingKnobRef, handleKnobEnter, handleKnobLeave, resetAllParams } = ui;

    return (
        <div className="relative flex-none">
            {/* MAIN HUD */}
            <div className="z-30 transition-all select-none flex h-[140px] flex-none" onMouseDown={e => e.stopPropagation()}>

                {/* Main Controls Area */}
                <div className="flex-1 flex items-end justify-center gap-2 px-4 md:px-8 pb-4 pt-4">
                    {/* PLAYBACK CONTROLS */}
                    <PlaybackControls playback={playback} />
                </div>

            </div>
        </div>
    );
};

export default React.memo(ControlHud);
