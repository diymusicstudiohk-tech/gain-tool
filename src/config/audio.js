/**
 * Audio Configuration
 * Constants for audio loading and processing
 */

export const AUDIO_CONFIG = {
    NORMALIZATION: {
        TARGET_PEAK_DB: -0.1,
        MIN_LEVEL: 0.0001
    },

    BUFFER: {
        CHANNELS: 1,
        DEFAULT_SAMPLE_RATE: 44100
    },

    PLAYBACK: {
        RESUME_TIMEOUT: 0,
        FADE_TIME: 0.01
    },

    EXPORT: {
        FORMAT: 'wav',
        BITS_PER_SAMPLE: 16,
        SUFFIX: ' 壓縮後結果'
    },

    INDEXEDDB: {
        DATABASE_NAME: 'AudioCompressorDB',
        DATABASE_VERSION: 1,
        STORE_NAME: 'audioFiles',
        KEY_PATH: 'id',
        INDEXES: [
            { name: 'name', keyPath: 'name', unique: false },
            { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
    },

    LOCALSTORAGE: {
        PARAMS_KEY: 'audio-comp-params',
        STATE_KEY: 'audio-comp-app-state'
    },

    CORS_PROXY: 'https://api.allorigins.win/raw?url='
};

export const AUDIO_FORMATS = {
    WAV: 'audio/wav',
    MP3: 'audio/mpeg',
    OGG: 'audio/ogg',
    WEBM: 'audio/webm'
};

export const SUPPORTED_FORMATS = [
    AUDIO_FORMATS.WAV,
    AUDIO_FORMATS.MP3,
    AUDIO_FORMATS.OGG,
    AUDIO_FORMATS.WEBM
];
