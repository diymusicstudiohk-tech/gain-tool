/**
 * Non-linear lookahead knob mapping (piecewise linear):
 *   ctrl 0      → 0 ms   (fully CCW)
 *   ctrl 50     → 5 ms   (12 o'clock)
 *   ctrl 100    → 100 ms (fully CW)
 *
 * Lower half: 0.1 ms per step (fine control for mastering range)
 * Upper half: 1.9 ms per step (coarser for longer lookahead)
 */
export const lookaheadControlToMs = (ctrl) => {
    if (ctrl <= 0) return 0;
    if (ctrl <= 50) return (ctrl / 50) * 5;
    return 5 + ((ctrl - 50) / 50) * 95;
};

export const lookaheadMsToControl = (ms) => {
    if (ms <= 0) return 0;
    if (ms <= 5) return (ms / 5) * 50;
    return 50 + ((ms - 5) / 95) * 50;
};
