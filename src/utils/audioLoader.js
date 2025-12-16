
import { loadFileFromDB, saveFileToDB } from './storage';

export const fetchAudioBuffer = async (url) => {
    try {
        // Check DB
        const cachedBlob = await loadFileFromDB(url);
        if (cachedBlob) {
            console.log(`[Cache] Loaded from DB: ${url}`);
            return await cachedBlob.arrayBuffer();
        }

        // Network Fetch
        console.log(`[Cache] Fetching from network: ${url}`);
        let res;
        try {
            res = await fetch(url);
            if (!res.ok) throw new Error('Direct fetch failed');
        } catch (e) {
            console.warn('Direct fetch failed, trying proxy...', e);
            const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            res = await fetch(pUrl);
            if (!res.ok) throw new Error('Failed to fetch audio');
        }

        const blob = await res.blob();
        await saveFileToDB(url, blob); // Cache it
        return await blob.arrayBuffer();
    } catch (e) {
        console.error("Audio Load Error:", e);
        throw new Error("Failed to load audio");
    }
};
