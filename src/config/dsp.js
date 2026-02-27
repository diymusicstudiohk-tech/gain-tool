/**
 * DSP Processing Configuration
 * All magic numbers and constants for audio processing
 */

export const DSP_CONFIG = {
    CHUNK_SIZE: 50000,
    SCRIPT_PROCESSOR_BUFFER_SIZE: 512,
    EPSILON: 1e-6,

    RATIO: {
        MIN: 1,
        MAX_STAGE1: 5,
        MAX_STAGE2: 10,
        MAX_STAGE3: 100,
        CONTROL_BREAKPOINT_1: 50,
        CONTROL_BREAKPOINT_2: 75,
        DEFAULT: 4
    },

    THRESHOLD: {
        MIN: -60,
        MAX: 0,
        DEFAULT: 0
    },

    ATTACK: {
        MIN: 0.1,
        MAX: 100,
        DEFAULT: 15,
        UNIT: 'ms'
    },

    RELEASE: {
        MIN: 10,
        MAX: 500,
        DEFAULT: 150,
        UNIT: 'ms'
    },

    KNEE: {
        MIN: 0,
        MAX: 30,
        DEFAULT: 5,
        UNIT: 'dB'
    },

    LOOKAHEAD: {
        MIN: 0,
        MAX: 100,
        DEFAULT: 3,
        UNIT: 'ms'
    },

    MAKEUP_GAIN: {
        MIN: 0,
        MAX: 20,
        DEFAULT: 0,
        UNIT: 'dB'
    },

    INFLATE: {
        MIN: 0,
        MAX: 100,
        DEFAULT: 0,
        UNIT: '%'
    },

    DRY_GAIN: {
        MIN: -60,
        MAX: 6,
        DEFAULT: 0,
        UNIT: 'dB'
    },

    GATE: {
        THRESHOLD: {
            MIN: -80,
            MAX: 0,
            DEFAULT: -80
        },
        RATIO: {
            MIN: 1,
            MAX: 8,
            DEFAULT: 4
        },
        ATTACK: {
            MIN: 0.1,
            MAX: 50,
            DEFAULT: 2
        },
        RELEASE: {
            MIN: 10,
            MAX: 500,
            DEFAULT: 100
        }
    },

    CLIP_GAIN: {
        MIN: -20,
        MAX: 20,
        DEFAULT: 0
    }
};

export const PROCESSING_CONFIG = {
    ASYNC_CHUNK_DELAY: 0,
    INITIAL_PROCESSING_DELAY: 150,
    AUTO_SAVE_DELAY: 1000,
    MODE_SWITCH_DELAY: 50,
    LOOP_RESTART_DELAY: 10
};
