/**
 * Mipmap-based peak cache for waveform rendering.
 *
 * Level 0 = raw data (reference, not copied)
 * Level 1 = peak per 4 samples
 * Level 2 = peak per 16 samples
 * Level 3 = peak per 64 samples
 * Level 4 = peak per 256 samples
 * Level 5 = peak per 1024 samples
 */

const BLOCK_SIZES = [1, 4, 16, 64, 256, 1024];

/**
 * Build mipmap levels from a Float32Array.
 * @param {Float32Array} data - source samples
 * @param {'absMax'|'min'} mode - 'absMax' keeps the sample with largest |value| (for waveforms),
 *                                 'min' keeps the minimum value (for GR curves)
 * @returns {Float32Array[]} array of levels (level 0 = data reference)
 */
export const buildMipmaps = (data, mode = 'absMax') => {
    const levels = [data]; // level 0 is the raw reference

    let prev = data;
    for (let lvl = 1; lvl < BLOCK_SIZES.length; lvl++) {
        const factor = 4; // each level reduces by 4x from previous
        const len = Math.floor(prev.length / factor);
        if (len === 0) break;
        const out = new Float32Array(len);

        if (mode === 'min') {
            for (let i = 0; i < len; i++) {
                const base = i * factor;
                let val = prev[base];
                for (let j = 1; j < factor; j++) {
                    const s = prev[base + j];
                    if (s < val) val = s;
                }
                out[i] = val;
            }
        } else {
            // absMax: keep sample with largest absolute value
            for (let i = 0; i < len; i++) {
                const base = i * factor;
                let best = prev[base];
                let bestAbs = Math.abs(best);
                for (let j = 1; j < factor; j++) {
                    const s = prev[base + j];
                    const a = Math.abs(s);
                    if (a > bestAbs) { best = s; bestAbs = a; }
                }
                out[i] = best;
            }
        }

        levels.push(out);
        prev = out;
    }

    return levels;
};

/**
 * Select the best mipmap level for a given pixel step.
 * Returns the largest blockSize that fits within `step` so the inner loop
 * only iterates ceil(step / blockSize) entries (typically 1-4).
 *
 * @param {Float32Array[]} levels - from buildMipmaps()
 * @param {number} step - samples per pixel (srcLength / visiblePixelWidth)
 * @returns {{ level: Float32Array, blockSize: number, levelIdx: number }}
 */
export const selectMipmapLevel = (levels, step) => {
    let chosen = 0;
    for (let i = 1; i < levels.length; i++) {
        if (BLOCK_SIZES[i] <= step) {
            chosen = i;
        } else {
            break;
        }
    }
    return {
        level: levels[chosen],
        blockSize: BLOCK_SIZES[chosen],
        levelIdx: chosen,
    };
};
