/**
 * Stop and disconnect source nodes safely.
 */
export const stopCurrentSource = (sourceNodeRef) => {
    if (sourceNodeRef.current) {
        try {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            if (sourceNodeRef.current._scriptNode) {
                sourceNodeRef.current._scriptNode.disconnect();
            }
            if (sourceNodeRef.current._workletNode) {
                sourceNodeRef.current._workletNode.disconnect();
            }
        } catch (e) { }
        sourceNodeRef.current = null;
    }
};

/**
 * Convert an AudioBuffer to mono Float32Array, optionally normalizing.
 */
export const toMono = (audioBuffer) => {
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);
    const ch0 = audioBuffer.getChannelData(0);
    if (audioBuffer.numberOfChannels > 1) {
        const ch1 = audioBuffer.getChannelData(1);
        for (let i = 0; i < length; i++) monoData[i] = (ch0[i] + ch1[i]) / 2;
    } else {
        monoData.set(ch0);
    }
    return monoData;
};

export const writeWavFile = (audioBuffer, { bitDepth = 32 } = {}) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const bytesPerSample = bitDepth / 8;
    const isFloat = bitDepth === 32;
    const formatTag = isFloat ? 3 : 1; // 3 = IEEE_FLOAT, 1 = PCM
    const dataLength = audioBuffer.length * numOfChan * bytesPerSample;
    const length = 44 + dataLength;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    // RIFF header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    // fmt chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(formatTag);
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * bytesPerSample * numOfChan);
    setUint16(numOfChan * bytesPerSample);
    setUint16(bitDepth);
    // data chunk
    setUint32(0x61746164); // "data"
    setUint32(dataLength);

    for (let i = 0; i < numOfChan; i++) channels.push(audioBuffer.getChannelData(i));

    let offset = 44;
    for (let s = 0; s < audioBuffer.length; s++) {
        for (let ch = 0; ch < numOfChan; ch++) {
            const val = channels[ch][s];
            if (bitDepth === 32) {
                view.setFloat32(offset, val, true);
                offset += 4;
            } else if (bitDepth === 24) {
                const clamped = Math.max(-1, Math.min(1, val));
                const intVal = (clamped < 0 ? clamped * 8388608 : clamped * 8388607) | 0;
                view.setUint8(offset, intVal & 0xFF);
                view.setUint8(offset + 1, (intVal >> 8) & 0xFF);
                view.setUint8(offset + 2, (intVal >> 16) & 0xFF);
                offset += 3;
            } else {
                // 16-bit
                const clamped = Math.max(-1, Math.min(1, val));
                const intVal = (0.5 + (clamped < 0 ? clamped * 32768 : clamped * 32767)) | 0;
                view.setInt16(offset, intVal, true);
                offset += 2;
            }
        }
    }
    return new Blob([buffer], { type: "audio/wav" });
};