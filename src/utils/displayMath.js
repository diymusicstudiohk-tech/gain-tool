// Display compression: exponent < 1 pushes waveform towards edges.
// 0.43 halves the gap between -5dB and the border vs linear display.
export const DISPLAY_EXP = 0.43;

export const displayAmp = (lin) => lin > 0 ? Math.pow(lin, DISPLAY_EXP) : 0;

export const linearFromDisplay = (disp) => disp > 0 ? Math.pow(disp, 1 / DISPLAY_EXP) : 0;

/**
 * Compute common waveform geometry values from canvas height, zoom, and pan.
 * Replaces repeated `height * 0.05` calculations across files.
 */
export const computeWaveformGeometry = (height, zoomY, panOffsetY) => {
    const centerY = (height / 2) + panOffsetY;
    const VERT_PAD = height * 0.05;
    const maxPixelHeight = (height / 2) - VERT_PAD;
    const ampScale = maxPixelHeight * zoomY;
    const grMaxHeight = maxPixelHeight * 0.5;
    return { centerY, VERT_PAD, maxPixelHeight, ampScale, grMaxHeight };
};
