
import { loadFileFromDB, saveFileToDB } from './storage';
import { resolveTrackUrl } from '../services/trackUrlService';

/**
 * Fetch audio for a track, using Supabase URL resolution + IndexedDB cache.
 *
 * @param {string} trackName - The track name matching track_urls.track_name
 * @param {Function} [setLoadingMessage] - Optional callback to update loading progress message
 * @returns {Promise<ArrayBuffer>} The audio data as an ArrayBuffer
 */
export const fetchAudioBuffer = async (trackName, setLoadingMessage) => {
    try {
        // Step 1: Resolve the URL and get a stable cache key
        const { url, cacheKey } = await resolveTrackUrl(trackName, 'practice');

        // Step 2: Check IndexedDB cache using stable cache key
        const cachedBlob = await loadFileFromDB(cacheKey);
        if (cachedBlob) {
            console.log(`[Cache] Loaded from DB: ${trackName}`);
            return await cachedBlob.arrayBuffer();
        }

        // Step 3: Fetch from resolved URL with progress tracking
        console.log(`[Cache] Fetching from network: ${trackName}`);
        if (setLoadingMessage) setLoadingMessage("載入音檔中...");

        let res;
        try {
            res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (e) {
            console.warn('Direct fetch failed, trying proxy...', e);
            const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            res = await fetch(pUrl);
            if (!res.ok) throw new Error('Failed to fetch audio');
        }

        // Stream the response to track download progress
        const contentLength = res.headers.get('Content-Length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
        let arrayBuffer;

        if (totalBytes && res.body) {
            const reader = res.body.getReader();
            const chunks = [];
            let receivedBytes = 0;

            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            if (setLoadingMessage) setLoadingMessage(`載入音檔中... (0 MB / ${totalMB} MB)`);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;

                if (setLoadingMessage) {
                    const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(1);
                    setLoadingMessage(`載入音檔中... (${receivedMB} MB / ${totalMB} MB)`);
                }
            }

            const combined = new Uint8Array(receivedBytes);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
            arrayBuffer = combined.buffer;
        } else {
            arrayBuffer = await res.arrayBuffer();
        }

        // Step 4: Cache with stable key and return
        const blob = new Blob([arrayBuffer]);
        await saveFileToDB(cacheKey, blob);
        return arrayBuffer;
    } catch (e) {
        console.error("Audio Load Error:", e);
        if (setLoadingMessage) setLoadingMessage("音檔未能載入。請檢查網絡連線和重新整理頁面。");
        throw new Error("Failed to load audio");
    }
};
