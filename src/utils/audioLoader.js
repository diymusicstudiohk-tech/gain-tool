
import { loadFileFromDB, saveFileToDB } from './storage';
import { resolveTrackUrl } from '../services/trackUrlService';

/**
 * Fetch audio for a track, using Supabase URL resolution + IndexedDB cache.
 *
 * @param {string} trackName - The track name matching track_urls.track_name
 * @returns {Promise<ArrayBuffer>} The audio data as an ArrayBuffer
 */
export const fetchAudioBuffer = async (trackName) => {
    try {
        // Step 1: Resolve the URL and get a stable cache key
        const { url, cacheKey } = await resolveTrackUrl(trackName, 'practice');

        // Step 2: Check IndexedDB cache using stable cache key
        const cachedBlob = await loadFileFromDB(cacheKey);
        if (cachedBlob) {
            console.log(`[Cache] Loaded from DB: ${trackName}`);
            return await cachedBlob.arrayBuffer();
        }

        // Step 3: Fetch from resolved URL
        console.log(`[Cache] Fetching from network: ${trackName}`);
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

        // Step 4: Cache with stable key and return
        const blob = await res.blob();
        await saveFileToDB(cacheKey, blob);
        return await blob.arrayBuffer();
    } catch (e) {
        console.error("Audio Load Error:", e);
        throw new Error("Failed to load audio");
    }
};
