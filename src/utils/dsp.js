import { processCompressor as processBatch, createRealTimeCompressor as createRealTime } from '../dsp/DspProcessor';

export const processCompressor = processBatch;
export const createRealTimeCompressor = createRealTime;