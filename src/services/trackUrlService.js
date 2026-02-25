import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'audio-tracks';
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
const REFRESH_THRESHOLD = 600;  // Regenerate when < 10 minutes remaining

// In-memory cache: stores { url, cacheKey, expiresAt? }
const cache = new Map();

/**
 * Resolve a track's audio URL from Supabase.
 *
 * Queries the `track_urls` table for the given track_name + track_type.
 * - If the stored URL is a full HTTP URL (legacy CDN), returns it directly.
 * - If the stored URL is a Supabase Storage path, generates a signed URL.
 *
 * Results are cached in memory. Signed URLs are regenerated
 * when less than 10 minutes remain before expiry.
 *
 * @param {string} trackName - The track name (e.g. "Kick-01", "Female-vocal-1")
 * @param {string} trackType - Either 'practice' or 'reference'
 * @returns {Promise<{url: string, cacheKey: string}>}
 */
export async function resolveTrackUrl(trackName, trackType = 'practice') {
    const cacheKey = `track:${trackType}:${trackName}`;
    const memKey = `${trackType}:${trackName}`;

    // Check in-memory cache
    if (cache.has(memKey)) {
        const cached = cache.get(memKey);
        if (cached.expiresAt) {
            const now = Date.now();
            if (now < cached.expiresAt - REFRESH_THRESHOLD * 1000) {
                return { url: cached.url, cacheKey };
            }
            // Expired or close to expiry -- fall through to regenerate
        } else {
            // Legacy CDN URL, no expiry
            return { url: cached.url, cacheKey };
        }
    }

    if (!supabase) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    // Query the track_urls table
    const { data, error } = await supabase
        .from('track_urls')
        .select('url')
        .eq('track_name', trackName)
        .eq('track_type', trackType)
        .single();

    if (error) {
        console.error(`[trackUrlService] Failed to resolve "${trackName}" (${trackType}):`, error);
        throw new Error(`Failed to resolve track URL for "${trackName}"`);
    }

    const storedUrl = data.url;

    // Check if it's a legacy CDN URL or a Supabase Storage path
    if (storedUrl.startsWith('http')) {
        cache.set(memKey, { url: storedUrl });
        return { url: storedUrl, cacheKey };
    }

    // Supabase Storage path -- generate signed URL
    const { data: signedData, error: signedError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(storedUrl, SIGNED_URL_EXPIRY);

    if (signedError) {
        console.error(`[trackUrlService] Failed to create signed URL for "${trackName}":`, signedError);
        throw new Error(`Failed to create signed URL for "${trackName}"`);
    }

    const expiresAt = Date.now() + SIGNED_URL_EXPIRY * 1000;
    cache.set(memKey, { url: signedData.signedUrl, expiresAt });

    return { url: signedData.signedUrl, cacheKey };
}
