/**
 * UI Configuration
 * Constants for UI rendering and interaction
 */

export const UI_CONFIG = {
    CANVAS: {
        DEFAULT_WIDTH: 1000,
        DEFAULT_HEIGHT: 400,
        PADDING: 24,
        HIT_TOLERANCE: 8
    },

    ZOOM: {
        X: {
            MIN: 1,
            MAX: 50,
            DEFAULT: 1
        },
        Y: {
            MIN: 0.1,
            MAX: 5,
            DEFAULT: 0.8
        }
    },

    LOOP: {
        MIN_DURATION: 0.01,
        AUTO_ZOOM_FACTOR: 0.8,
        DRAG_THRESHOLD: 5
    },

    METER: {
        HOLD_TIME: 30,
        SMOOTHING_FACTOR: 0.95,
        RMS_WINDOW: 512
    },

    RESOLUTION: {
        MIN: 1,
        MAX: 100,
        DEFAULT: 100,
        MIN_POINTS: 3000,
        MAX_SMOOTH_POINTS: 250000
    },

    ANIMATION: {
        FADE_DURATION: 200,
        SLIDE_DURATION: 200
    },

    COLORS: {
        INPUT: '#3b82f6',
        OUTPUT: '#f97316',
        GR_CURVE: '#22c55e',
        GATE_LINE: '#f59e0b',
        COMP_LINE: '#06b6d4',
        LOOP: '#10b981',
        PLAYHEAD: '#ef4444'
    },

    INFO_PANEL: {
        WIDTH: 270,
        MIN_MARGIN: 10
    },

    ACTION_LOG: {
        MAX_ENTRIES: 15
    }
};

export const COPY_STATUS = {
    IDLE: 'idle',
    COPYING: 'copying',
    SUCCESS: 'success',
    ERROR: 'error',
    SUCCESS_DURATION: 2000,
    ERROR_DURATION: 3000
};
