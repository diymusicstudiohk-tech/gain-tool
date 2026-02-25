export const calculateRatioFromControl = (ctrl) =>
    ctrl <= 50 ? 1 + (ctrl / 50) * 4 : (ctrl <= 75 ? 5 + ((ctrl - 50) / 25) * 5 : 10 + ((ctrl - 75) / 25) * 90);

export const calculateControlFromRatio = (r) =>
    r <= 5 ? (r - 1) / 4 * 50 : (r <= 10 ? 50 + (r - 5) / 5 * 25 : 75 + (r - 10) / 90 * 25);

/**
 * Shared piecewise control-to-dB mapping.
 * The first 3 segments are identical for wet and dry:
 *   ctrl 0      → -200 dB (silence)
 *   ctrl 0-16.67  → -60 to -15 dB
 *   ctrl 16.67-50 → -15 to 0 dB
 *
 * Only the final segment differs (maxDb parameter):
 *   dry: ctrl 50-100 → 0 to +5 dB
 *   wet: ctrl 50-100 → 0 to +15 dB
 */
const gainControlToDbBase = (ctrl, maxDb) => {
    if (ctrl <= 0) return -200;
    if (ctrl <= 16.67) return -60 + (ctrl / 16.67) * 45;
    if (ctrl <= 50) return -15 + ((ctrl - 16.67) / 33.33) * 15;
    return ((ctrl - 50) / 50) * maxDb;
};

const gainDbToControlBase = (dB, maxDb) => {
    if (dB <= -60) return 0;
    if (dB <= -15) return ((dB + 60) / 45) * 16.67;
    if (dB <= 0) return 16.67 + ((dB + 15) / 15) * 33.33;
    return 50 + (dB / maxDb) * 50;
};

// Dry gain: fully CW → +5 dB
export const dryGainControlToDb = (ctrl) => gainControlToDbBase(ctrl, 5);
export const dryGainDbToControl = (dB) => gainDbToControlBase(dB, 5);

// Wet gain: fully CW → +15 dB
export const wetGainControlToDb = (ctrl) => gainControlToDbBase(ctrl, 15);
export const wetGainDbToControl = (dB) => gainDbToControlBase(dB, 15);
