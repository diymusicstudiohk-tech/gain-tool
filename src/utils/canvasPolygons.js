/**
 * Shared polygon path construction: traces top edge left-to-right,
 * then bottom edge right-to-left, forming a closed waveform polygon.
 */
const buildPolygonPath = (ctx, points, centerY) => {
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].yTop);
    ctx.lineTo(points[points.length - 1].x, centerY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yBot);
    ctx.closePath();
};

export const drawPolygon = (ctx, points, color, width, centerY, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color;
    buildPolygonPath(ctx, points, centerY);
    ctx.fill(); ctx.restore();
};

export const drawPolygonWithStroke = (ctx, points, fillColor, strokeColor, width, centerY, strokeWidth = 1.5, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save(); ctx.globalAlpha = opacity;
    buildPolygonPath(ctx, points, centerY);
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.stroke();
    ctx.restore();
};

export const drawPolygonWithPeakFade = (ctx, points, color, width, centerY, opacity = 1.0, fadeAmount = 0.3) => {
    if (points.length === 0) return;
    ctx.save();

    // Find vertical extent of the waveform
    let minY = centerY, maxY = centerY;
    for (let i = 0; i < points.length; i++) {
        if (points[i].yTop < minY) minY = points[i].yTop;
        if (points[i].yBot > maxY) maxY = points[i].yBot;
    }

    // Parse hex color
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const range = maxY - minY;

    if (range > 0) {
        const grad = ctx.createLinearGradient(0, minY, 0, maxY);
        const cs = (centerY - minY) / range;
        const midAlpha = opacity * (1 - fadeAmount / 2);
        const peakA = opacity * (1 - fadeAmount);
        const centerAlpha = opacity;
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peakA})`);
        grad.addColorStop(Math.max(0.01, cs * 0.5), `rgba(${r}, ${g}, ${b}, ${midAlpha})`);
        grad.addColorStop(Math.max(0.02, Math.min(0.98, cs)), `rgba(${r}, ${g}, ${b}, ${centerAlpha})`);
        grad.addColorStop(Math.min(0.99, cs + (1 - cs) * 0.5), `rgba(${r}, ${g}, ${b}, ${midAlpha})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${peakA})`);
        ctx.fillStyle = grad;
    } else {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
    }

    buildPolygonPath(ctx, points, centerY);
    ctx.fill(); ctx.restore();
};

export const drawHatchedPolygon = (ctx, points, color, width, centerY, spacing = 6, lineWidth = 1.5, opacity = 1.0) => {
    if (points.length === 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;

    // Build clip path from polygon
    buildPolygonPath(ctx, points, centerY);
    ctx.clip();

    // Find bounding box
    let minY = centerY, maxY = centerY;
    for (let i = 0; i < points.length; i++) {
        if (points[i].yTop < minY) minY = points[i].yTop;
        if (points[i].yBot > maxY) maxY = points[i].yBot;
    }
    const minX = points[0].x;
    const maxX = points[points.length - 1].x;

    // Draw diagonal lines (top-right to bottom-left)
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    const totalSpan = (maxX - minX) + (maxY - minY);
    for (let d = 0; d < totalSpan; d += spacing) {
        const x1 = minX + d;
        const y1 = minY;
        const x2 = minX + d - (maxY - minY);
        const y2 = maxY;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.restore();
};
