# Plan: Migrate comp-v-2 Audio Loading to Supabase (Plan A)

## Context

comp-v-2 and claude-eq-tool share the same practice audio files. Currently comp-v-2 hardcodes Bunny CDN URLs in `AUDIO_SOURCES`, while claude-eq-tool resolves URLs dynamically via a shared Supabase `track_urls` table. This migration makes comp-v-2 use the same Supabase-based URL resolution, with anon-level RLS policies (no auth required).

---

## Pre-requisite: Supabase SQL (Manual - Run in Supabase SQL Editor BEFORE code changes)

### SQL 1: Add anon RLS policies

```sql
-- Allow anon users to read track_urls table
CREATE POLICY "Anon users can read track URLs"
  ON track_urls FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read audio-tracks storage bucket
CREATE POLICY "Anon users can read audio tracks"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'audio-tracks');
```

### SQL 2: Seed 7 missing tracks (exist in comp-v-2 but not in track_urls)

```sql
INSERT INTO track_urls (track_name, track_type, url) VALUES
  ('Viola', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/VIOLA-MP3.mp3'),
  ('Cello', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Cello-MP3.mp3'),
  ('Other-marimba', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/OTHER-MARIMBA-MP3.mp3'),
  ('Perc-bombo', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PERC-BOMBO-MP3.mp3'),
  ('Perc-cunono', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PERC-CUNONO-MP3.mp3'),
  ('Saxophone', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/SAXOPHONE-MP3.mp3'),
  ('Organ', 'practice', 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Organ-MP3.mp3')
ON CONFLICT (track_name, track_type) DO NOTHING;
```

**Impact on claude-eq-tool:** None. Adding anon SELECT policies does not affect authenticated users. The extra 7 tracks are additive only.

---

## Step 1: Install Supabase SDK

```bash
npm install @supabase/supabase-js
```

---

## Step 2: Create `.env`

**Create file:** `comp-v-2/.env`

```
VITE_SUPABASE_URL=https://zmlhlbesarsugkziypkz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_2-MZR9Nh3euv15wCJIVNEQ_K2FVJ6Cb
```

---

## Step 3: Update `.gitignore`

**Modify:** `comp-v-2/.gitignore`

Append these lines at the end:

```
# Environment variables
.env
.env.local
.env.*.local
```

---

## Step 4: Create `.env.example`

**Create file:** `comp-v-2/.env.example`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 5: Create Supabase client

**Create file:** `comp-v-2/src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '[Supabase] Missing environment variables. ' +
        'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Step 6: Create trackUrlService

**Create file:** `comp-v-2/src/services/trackUrlService.js`

```javascript
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
```

---

## Step 7: Rewrite audioLoader.js

**Replace entire file:** `comp-v-2/src/utils/audioLoader.js`

```javascript
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
```

---

## Step 8: Update AUDIO_SOURCES in constants.js

**Modify:** `comp-v-2/src/utils/constants.js`

Replace the entire `AUDIO_SOURCES` array (lines 6-475). Remove all `url` fields, add `trackName` field. Keep `id` and `name` unchanged for backward compatibility with localStorage saved state.

**Replace lines 6-475 with:**

```javascript
export const AUDIO_SOURCES = [
    // === Bass (貝斯) ===
    { id: 'Bass-01', name: 'Bass-01', category: 'Bass (貝斯)', trackName: 'Bass-01' },
    { id: 'Bass-02', name: 'Bass-02', category: 'Bass (貝斯)', trackName: 'Bass-02' },
    { id: 'Bass-03', name: 'Bass-03', category: 'Bass (貝斯)', trackName: 'Bass-03' },
    { id: 'Bass-04', name: 'Bass-04', category: 'Bass (貝斯)', trackName: 'Bass-04' },
    { id: 'Bass-05', name: 'Bass-05', category: 'Bass (貝斯)', trackName: 'Bass-05' },
    { id: 'Bass-06', name: 'Bass-06', category: 'Bass (貝斯)', trackName: 'Bass-06' },
    { id: 'Bass-07', name: 'Bass-07', category: 'Bass (貝斯)', trackName: 'Bass-07' },
    { id: 'Bass-08', name: 'Bass-08', category: 'Bass (貝斯)', trackName: 'Bass-08' },
    { id: 'Bass-09', name: 'Bass-09', category: 'Bass (貝斯)', trackName: 'Bass-09' },
    { id: 'Bass-10', name: 'Bass-10', category: 'Bass (貝斯)', trackName: 'Bass-10' },
    { id: 'Bass-11', name: 'Bass-11', category: 'Bass (貝斯)', trackName: 'Bass-11' },
    { id: 'Bass-12', name: 'Bass-12', category: 'Bass (貝斯)', trackName: 'Bass-12' },
    // === Acoustic Guitar (木吉他) ===
    { id: 'AG-03', name: 'AG-03', category: 'Acoustic Guitar (木吉他)', trackName: 'Ag-03' },
    { id: 'AG-04', name: 'AG-04', category: 'Acoustic Guitar (木吉他)', trackName: 'Ag-04' },
    // === Electric Guitar (電吉他) ===
    { id: 'EG-01', name: 'EG-01', category: 'Electric Guitar (電吉他)', trackName: 'Eg-01' },
    { id: 'EG-02', name: 'EG-02', category: 'Electric Guitar (電吉他)', trackName: 'Eg-02' },
    { id: 'EG-03', name: 'EG-03', category: 'Electric Guitar (電吉他)', trackName: 'Eg-03' },
    { id: 'EG-04', name: 'EG-04', category: 'Electric Guitar (電吉他)', trackName: 'Eg-04' },
    { id: 'EG-05', name: 'EG-05', category: 'Electric Guitar (電吉他)', trackName: 'Eg-05' },
    { id: 'EG-06', name: 'EG-06', category: 'Electric Guitar (電吉他)', trackName: 'Eg-06' },
    { id: 'EG-07', name: 'EG-07', category: 'Electric Guitar (電吉他)', trackName: 'Eg-07' },
    { id: 'EG-08', name: 'EG-08', category: 'Electric Guitar (電吉他)', trackName: 'Eg-08' },
    { id: 'EG-09', name: 'EG-09', category: 'Electric Guitar (電吉他)', trackName: 'Eg-09' },
    // === Kick (大鼓) ===
    { id: 'KICK-01', name: 'KICK-01', category: 'Kick (大鼓)', trackName: 'Kick-01' },
    { id: 'KICK-02', name: 'KICK-02', category: 'Kick (大鼓)', trackName: 'Kick-02' },
    { id: 'KICK-03', name: 'KICK-03', category: 'Kick (大鼓)', trackName: 'Kick-03' },
    { id: 'KICK-04', name: 'KICK-04', category: 'Kick (大鼓)', trackName: 'Kick-04' },
    { id: 'KICK-05', name: 'KICK-05', category: 'Kick (大鼓)', trackName: 'Kick-05' },
    { id: 'KICK-06', name: 'KICK-06', category: 'Kick (大鼓)', trackName: 'Kick-06' },
    { id: 'KICK-07', name: 'KICK-07', category: 'Kick (大鼓)', trackName: 'Kick-07' },
    { id: 'KICK-08', name: 'KICK-08', category: 'Kick (大鼓)', trackName: 'Kick-08' },
    { id: 'KICK-09', name: 'KICK-09', category: 'Kick (大鼓)', trackName: 'Kick-09' },
    { id: 'KICK-10', name: 'KICK-10', category: 'Kick (大鼓)', trackName: 'Kick-10' },
    // === Snare (小鼓) ===
    { id: 'Snare-01', name: 'Snare-01', category: 'Snare (小鼓)', trackName: 'Snare-01' },
    { id: 'Snare-02', name: 'Snare-02', category: 'Snare (小鼓)', trackName: 'Snare-02' },
    { id: 'Snare-03', name: 'Snare-03', category: 'Snare (小鼓)', trackName: 'Snare-03' },
    { id: 'Snare-04', name: 'Snare-04', category: 'Snare (小鼓)', trackName: 'Snare-04' },
    { id: 'Snare-05', name: 'Snare-05', category: 'Snare (小鼓)', trackName: 'Snare-05' },
    { id: 'Snare-06', name: 'Snare-06', category: 'Snare (小鼓)', trackName: 'Snare-06' },
    { id: 'Snare-07', name: 'Snare-07', category: 'Snare (小鼓)', trackName: 'Snare-07' },
    // === Other Drums (其他鼓件) ===
    { id: 'HIHAT-01', name: 'HIHAT-01', category: 'Other Drums (其他鼓件)', trackName: 'Hihat-01' },
    { id: 'HIHAT-02', name: 'HIHAT-02', category: 'Other Drums (其他鼓件)', trackName: 'Hihat-02' },
    { id: 'HIHAT-03', name: 'HIHAT-03', category: 'Other Drums (其他鼓件)', trackName: 'Hihat-03' },
    { id: 'Tom', name: 'Tom', category: 'Other Drums (其他鼓件)', trackName: 'Tom' },
    // === Other (其他) ===
    { id: 'VIOLA', name: 'VIOLA', category: 'Other (其他)', trackName: 'Viola' },
    { id: 'Cello', name: 'Cello', category: 'Other (其他)', trackName: 'Cello' },
    { id: 'OTHER-DOBRO', name: 'OTHER-DOBRO', category: 'Other (其他)', trackName: 'Other-dobro' },
    { id: 'OTHER-MARIMBA', name: 'OTHER-MARIMBA', category: 'Other (其他)', trackName: 'Other-marimba' },
    { id: 'PERC-BOMBO', name: 'PERC-BOMBO', category: 'Other (其他)', trackName: 'Perc-bombo' },
    { id: 'PERC-CUNONO', name: 'PERC-CUNONO', category: 'Other (其他)', trackName: 'Perc-cunono' },
    { id: 'SAXOPHONE', name: 'SAXOPHONE', category: 'Other (其他)', trackName: 'Saxophone' },
    // === Keys (鍵盤) ===
    { id: 'PIANO-01', name: 'PIANO-01', category: 'Keys (鍵盤)', trackName: 'Piano-01' },
    { id: 'PIANO-02', name: 'PIANO-02', category: 'Keys (鍵盤)', trackName: 'Piano-02' },
    { id: 'PIANO-03', name: 'PIANO-03', category: 'Keys (鍵盤)', trackName: 'Piano-03' },
    { id: 'Synth-01', name: 'Synth-01', category: 'Keys (鍵盤)', trackName: 'Synth-01' },
    { id: 'Synth-02', name: 'Synth-02', category: 'Keys (鍵盤)', trackName: 'Synth-02' },
    { id: 'Synth-03', name: 'Synth-03', category: 'Keys (鍵盤)', trackName: 'Synth-03' },
    { id: 'Synth-04', name: 'Synth-04', category: 'Keys (鍵盤)', trackName: 'Synth-04' },
    { id: 'Organ', name: 'Organ', category: 'Keys (鍵盤)', trackName: 'Organ' },
    { id: 'Rhodes', name: 'Rhodes', category: 'Keys (鍵盤)', trackName: 'Rhodes' },
    // === Female Vocal (女聲) ===
    { id: '練習用女聲主音1', name: '練習用女聲主音1', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-1' },
    { id: '練習用女聲主音2', name: '練習用女聲主音2', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-2' },
    { id: '練習用女聲主音3', name: '練習用女聲主音3', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-3' },
    { id: '練習用女聲主音4', name: '練習用女聲主音4', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-4' },
    { id: '練習用女聲主音5', name: '練習用女聲主音5', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-5' },
    { id: '練習用女聲主音6', name: '練習用女聲主音6', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-6' },
    { id: '練習用女聲主音7', name: '練習用女聲主音7', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-7' },
    { id: '練習用女聲主音8', name: '練習用女聲主音8', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-8' },
    { id: '練習用女聲主音9', name: '練習用女聲主音9', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-9' },
    // === Male Vocal (男聲) ===
    { id: '練習用男聲主音1', name: '練習用男聲主音1', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-1' },
    { id: '練習用男聲主音2', name: '練習用男聲主音2', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-2' },
    { id: '練習用男聲主音3', name: '練習用男聲主音3', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-3' },
    { id: '練習用男聲主音4', name: '練習用男聲主音4', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-4' },
    { id: '練習用男聲主音5', name: '練習用男聲主音5', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-5' },
    { id: '練習用男聲主音6', name: '練習用男聲主音6', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-6' },
    { id: '練習用男聲主音7', name: '練習用男聲主音7', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-7' },
    { id: '練習用男聲主音8', name: '練習用男聲主音8', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-8' },
    { id: '練習用男聲主音9', name: '練習用男聲主音9', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-9' },
];
```

**Important:** The rest of `constants.js` (lines 476-557: TOOLTIPS, APP_VERSION) remains UNCHANGED. Only the AUDIO_SOURCES array is replaced.

---

## Step 9: Update useAudioEngine.js

**Modify:** `comp-v-2/src/hooks/useAudioEngine.js`

### Change 1 — Line 83

**Find:**
```javascript
            const arrayBuffer = await fetchAudioBuffer(preset.url);
```

**Replace with:**
```javascript
            const arrayBuffer = await fetchAudioBuffer(preset.trackName);
```

### Change 2 — Line 164

**Find:**
```javascript
            const defaultSource = AUDIO_SOURCES.find(s => s.id === 'Lead-Vocal-03') || AUDIO_SOURCES[0];
```

**Replace with:**
```javascript
            const defaultSource = AUDIO_SOURCES[0];
```

No other changes needed in this file. All `preset.id`, `preset.name`, `preset.category` references remain valid.

---

## Files Summary

| Action | File |
|--------|------|
| npm install | `@supabase/supabase-js` |
| Create | `.env` |
| Modify | `.gitignore` |
| Create | `.env.example` |
| Create | `src/lib/supabase.js` |
| Create | `src/services/trackUrlService.js` |
| Rewrite | `src/utils/audioLoader.js` |
| Modify | `src/utils/constants.js` (AUDIO_SOURCES array only) |
| Modify | `src/hooks/useAudioEngine.js` (2 lines) |

No changes needed to: `storage.js`, `Header.jsx`, `presetsData.js`, or any other files.

---

## Verification

1. Run `npm run dev` to start the dev server
2. Open the app in browser
3. Check browser console — should see `[Cache] Fetching from network: Bass-01` (trackName, not URL)
4. Switch between different categories (Bass, Kick, Vocal) and verify audio loads and plays
5. Reload the page — audio should load from IndexedDB cache (`[Cache] Loaded from DB: Bass-01`)
6. Check that compressor preset auto-matching still works after loading a track

---

## Notes

- **IndexedDB cache migration:** Existing cache entries (keyed by old CDN URLs) will be orphaned. Audio re-downloads once under new stable cache keys (`track:practice:{trackName}`). One-time cost per user.
- **Bass-03 URL difference:** `track_urls` has `Bass-03-MP3-updated.mp3` (updated version). comp-v-2 will now get this version instead of the original.
- **Saved state compatibility:** `id` fields are unchanged, so existing `localStorage` saved states (`currentSourceId`, `lastPracticeSourceId`) continue to work.
