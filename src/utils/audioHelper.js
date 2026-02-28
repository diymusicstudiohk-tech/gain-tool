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

export const writeWavFile = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate); setUint32(audioBuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

    for(i = 0; i < audioBuffer.numberOfChannels; i++) channels.push(audioBuffer.getChannelData(i));
    while(pos < audioBuffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }
    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
    return new Blob([buffer], { type: "audio/wav" });
};