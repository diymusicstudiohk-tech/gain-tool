// Pre-computed constants to replace Math.log10/Math.pow(10, x/20) in hot loops
export const LN10_OVER_20 = Math.LN10 / 20;        // Math.exp(db * LN10_OVER_20) === Math.pow(10, db/20)
export const TWENTY_LOG10E = 20 * Math.LOG10E;      // Math.log(x) * TWENTY_LOG10E === 20 * Math.log10(x)
export const LOG_FLOOR = 1e-6;                       // Floor value for log calculations to avoid -Infinity
