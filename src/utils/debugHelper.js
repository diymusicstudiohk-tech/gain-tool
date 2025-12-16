
import { processCompressor } from './dsp';

export const generateDebugReport = async ({
    audioContext,
    originalBuffer,
    currentParams,
    actionLog,
    waveformCanvas,
    appVersion,
    appState // { fileName, currentSourceId, playingType, isPlaying, resolutionPct, canvasDims }
}) => {
    const now = new Date();
    const actionTrace = actionLog || [];

    // 1. Audio Health Check
    let audioHealth = { status: 'Unknown', latency: 0, time: 0, bufferCheck: 'N/A' };
    if (audioContext) {
        audioHealth.status = audioContext.state;
        audioHealth.latency = audioContext.baseLatency;
        audioHealth.time = audioContext.currentTime;

        if (originalBuffer) {
            const data = originalBuffer.getChannelData(0);
            let sumSq = 0;
            const checkLen = Math.min(1000, data.length);
            for (let i = 0; i < checkLen; i++) sumSq += data[i] * data[i];
            const rms = Math.sqrt(sumSq / checkLen);
            audioHealth.bufferCheck = rms === 0 ? 'WARNING: Silent Buffer (RMS=0)' : `OK (RMS=${rms.toFixed(4)})`;
        } else {
            audioHealth.bufferCheck = 'No Buffer Loaded';
        }
    }

    // 2. DSP Sanity Check
    let dspStatus = '✅ Passed';
    try {
        const testInput = new Float32Array(100).fill(0.5);
        const res = processCompressor(testInput, 44100, currentParams, 1);
        let hasNaN = false, hasInf = false;
        for (let i = 0; i < res.outputData.length; i++) {
            if (Number.isNaN(res.outputData[i])) hasNaN = true;
            if (!Number.isFinite(res.outputData[i])) hasInf = true;
        }
        if (hasNaN) dspStatus = 'CRITICAL: NaN Detected';
        else if (hasInf) dspStatus = 'CRITICAL: Infinity Detected';
    } catch (e) {
        dspStatus = `CRITICAL: Crash (${e.message})`;
    }

    // 3. Visual Snapshot
    let visualSnapshot = 'N/A';
    if (waveformCanvas) {
        try {
            visualSnapshot = waveformCanvas.toDataURL('image/png', 0.5);
        } catch (e) {
            visualSnapshot = `Error: ${e.message}`;
        }
    }

    // 4. Construct Report
    const report = `
# 🐛 Bug Report Context
* **App Version:** ${appVersion}
* **Timestamp:** ${now.toISOString()}

## 🔍 1. Diagnosis
* **AudioContext:** ${audioHealth.status} (Time: ${audioHealth.time.toFixed(2)}s)
* **DSP Check:** ${dspStatus}
* **Buffer:** ${originalBuffer ? `${originalBuffer.sampleRate}Hz / ${originalBuffer.numberOfChannels}ch / ${originalBuffer.duration.toFixed(2)}s` : 'None'}
* **Buffer Health:** ${audioHealth.bufferCheck}

## 🛠 2. Last User Actions
${actionTrace.length > 0 ? actionTrace.map((a, i) => `${i + 1}. ${a}`).join('\n') : '(No actions recorded)'}

## 📸 3. Visual Snapshot (Base64)
*(Paste this into an LLM to "see" the waveform state)*
\`\`\`
${visualSnapshot}
\`\`\`

## 📊 4. Full State Dump
\`\`\`json
${JSON.stringify({
        snapshot: currentParams, // snapshot passed as currentParams
        audioState: {
            fileName: appState.fileName,
            currentSourceId: appState.currentSourceId,
            playingType: appState.playingType,
            isPlaying: appState.isPlaying
        },
        viewState: {
            resolutionPct: appState.resolutionPct,
            canvasDims: appState.canvasDims
        }
    }, null, 2)}
\`\`\`
    `.trim();

    return report;
};

export const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); return true; }
        catch (err) { console.error('Navigator clipboard failed', err); }
    }
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; textArea.style.left = "-9999px"; textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error('Fallback copy failed', err);
        return false;
    }
};
