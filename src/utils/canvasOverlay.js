import { linearFromDisplay } from './displayMath';
import { GOLD } from './colors';
import {
    TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, TOOLTIP_HEIGHT,
    TOOLTIP_PAD_X, TOOLTIP_TEXT_BASELINE, TOOLTIP_EDGE_CLAMP,
} from './canvasConstants';

/**
 * Draw crosshair lines at mouse position.
 */
export const drawCrosshair = (ctx, mousePos, width, height) => {
    // Vertical crosshair line
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255,255,255,0.45)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, height);
    ctx.stroke();
    ctx.restore();

    // Horizontal crosshair line with edge-fade gradient
    ctx.save();
    const hGrad = ctx.createLinearGradient(0, 0, width, 0);
    hGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    hGrad.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    hGrad.addColorStop(0.85, 'rgba(255,255,255,0.5)');
    hGrad.addColorStop(1, 'rgba(255,255,255,0.3)');
    ctx.strokeStyle = hGrad; ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255,255,255,0.45)'; ctx.shadowBlur = 8;
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
    const gW = gm.width + TOOLTIP_PAD_X * 2;
    let gX = mousePos.x + TOOLTIP_OFFSET_X;
    let gY = mousePos.y - TOOLTIP_HEIGHT - TOOLTIP_OFFSET_Y;
    if (gX + gW > width) gX = mousePos.x - gW - TOOLTIP_OFFSET_X;
    if (gY < TOOLTIP_EDGE_CLAMP) gY = mousePos.y + TOOLTIP_OFFSET_X;

    ctx.fillStyle = GOLD;
    ctx.fillRect(gX, gY, gW, TOOLTIP_HEIGHT);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(gainText, gX + TOOLTIP_PAD_X, gY + TOOLTIP_TEXT_BASELINE);
};
