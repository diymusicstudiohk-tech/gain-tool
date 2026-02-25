import { linearFromDisplay } from './displayMath';
import { GOLD, COMP_TOOLTIP_BG, GREEN } from './colors';

/**
 * Draw crosshair lines at mouse position.
 */
export const drawCrosshair = (ctx, mousePos, width, height) => {
    // Vertical crosshair line
    ctx.save();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, height);
    ctx.stroke();
    ctx.restore();

    // Horizontal crosshair line with edge-fade gradient
    ctx.save();
    const hGrad = ctx.createLinearGradient(0, 0, width, 0);
    hGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
    hGrad.addColorStop(0.15, 'rgba(255,255,255,1)');
    hGrad.addColorStop(0.85, 'rgba(255,255,255,1)');
    hGrad.addColorStop(1, 'rgba(255,255,255,0.6)');
    ctx.strokeStyle = hGrad; ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, mousePos.y); ctx.lineTo(width, mousePos.y);
    ctx.stroke();
    ctx.restore();
};

/**
 * Draw gold gain tooltip at cursor position.
 */
export const drawGainTooltip = (ctx, mousePos, centerY, ampScale, width) => {
    const distFromCenter = Math.abs(mousePos.y - centerY);
    const displayVal = distFromCenter / ampScale;
    const linearAmp = linearFromDisplay(displayVal);
    const gainDb = linearAmp > 0.000001 ? 20 * Math.log10(linearAmp) : -Infinity;
    const gainText = Number.isFinite(gainDb) ? `${gainDb.toFixed(1)} dB` : '-\u221E dB';

    ctx.font = 'bold 12px sans-serif';
    const gm = ctx.measureText(gainText);
    const gPadX = 8;
    const gW = gm.width + gPadX * 2;
    const gH = 24;
    let gX = mousePos.x + 12;
    let gY = mousePos.y - gH - 8;
    if (gX + gW > width) gX = mousePos.x - gW - 12;
    if (gY < 2) gY = mousePos.y + 12;

    ctx.fillStyle = GOLD;
    ctx.fillRect(gX, gY, gW, gH);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(gainText, gX + gPadX, gY + 16);
};

/**
 * Draw threshold tooltip (comp or gate).
 */
export const drawThresholdTooltip = (ctx, mousePos, type, thresholdDb, width) => {
    ctx.font = 'bold 12px sans-serif';
    const text = type === 'comp'
        ? `Comp Threshold: ${thresholdDb} dB`
        : `Gate Threshold: ${thresholdDb} dB`;
    const metrics = ctx.measureText(text);
    const padX = 8; const bgW = metrics.width + padX * 2; const bgH = 24;
    let bgX = mousePos.x + 12;
    let bgY = mousePos.y - bgH - 8;
    if (bgX + bgW > width) bgX = mousePos.x - bgW - 12;
    if (bgY < 2) bgY = mousePos.y + 12;
    ctx.fillStyle = type === 'comp' ? COMP_TOOLTIP_BG : GREEN;
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(text, bgX + padX, bgY + 16);
};
