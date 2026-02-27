import { displayAmp } from './displayMath';

/**
 * Parse hex color to RGB components.
 */
const parseHexColor = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 85, g: 85, b: 85 };
};

/**
 * Draw a threshold line pair (top + bottom) with gradient fill and optional glow.
 * Used for the compressor threshold.
 */
export const drawThresholdLine = (ctx, {
    thresholdDb, color, isHighlight, centerY, ampScale, width, height,
}) => {
    const threshY = displayAmp(Math.pow(10, thresholdDb / 20)) * ampScale;
    if (centerY - threshY <= -20 || centerY - threshY >= height + 20) return;

    const tTop = centerY - threshY;
    const tBot = centerY + threshY;
    const { r, g, b } = parseHexColor(color);

    // Gradient fill between the two threshold lines (fades toward center)
    const fillAlpha = isHighlight ? 0.22 : 0.12;
    const fillGrad = ctx.createLinearGradient(0, tTop, 0, tBot);
    fillGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${fillAlpha})`);
    fillGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0)`);
    fillGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${fillAlpha})`);
    ctx.fillStyle = fillGrad;
    ctx.fillRect(0, tTop, width, tBot - tTop);

    // Horizontal gradient for line stroke (fades at left/right edges)
    const baseAlpha = isHighlight ? 1.0 : 0.9;
    const edgeAlpha = isHighlight ? 0.9 : 0.6;
    const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
    strokeGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${edgeAlpha})`);
    strokeGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
    strokeGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${edgeAlpha})`);

    // Draw solid lines with glow on hover
    ctx.setLineDash([]);
    if (isHighlight) {
        ctx.save();
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.shadowBlur = 12;
    }
    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = isHighlight ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, tTop); ctx.lineTo(width, tTop);
    ctx.moveTo(0, tBot); ctx.lineTo(width, tBot);
    ctx.stroke();
    if (isHighlight) ctx.restore();
};
