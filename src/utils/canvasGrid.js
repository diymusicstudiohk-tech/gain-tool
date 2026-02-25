import { displayAmp } from './displayMath';

/**
 * Draw horizontal dB grid lines with gradient fade at edges.
 */
export const drawDbGrid = (ctx, width, height, centerY, ampScale) => {
    const FADE_DISTANCE = 160;
    const fadeL = Math.min(FADE_DISTANCE / width, 0.4);
    const fadeR = 1 - fadeL;

    // Zero line
    const zeroGrad = ctx.createLinearGradient(0, 0, width, 0);
    zeroGrad.addColorStop(0, 'rgba(255,255,255,0)');
    zeroGrad.addColorStop(fadeL, 'rgba(255,255,255,0.05)');
    zeroGrad.addColorStop(fadeR, 'rgba(255,255,255,0.05)');
    zeroGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = zeroGrad; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY); ctx.stroke();

    // dB grid lines
    const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
    lineGrad.addColorStop(fadeL, 'rgba(255,255,255,0.25)');
    lineGrad.addColorStop(fadeR, 'rgba(255,255,255,0.25)');
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');

    for (let db = -5; db >= -60; db -= 5) {
        const linAmp = Math.pow(10, db / 20);
        const yOff = displayAmp(linAmp) * ampScale;
        const yTop = centerY - yOff;
        const yBot = centerY + yOff;
        const topFade = Math.min(1, yTop / FADE_DISTANCE);
        const botFade = Math.min(1, (height - yBot) / FADE_DISTANCE);
        if (topFade <= 0 && botFade <= 0) continue;
        ctx.lineWidth = 0.5;
        if (topFade > 0) { ctx.globalAlpha = Math.max(0, topFade); ctx.strokeStyle = lineGrad; ctx.beginPath(); ctx.moveTo(0, yTop); ctx.lineTo(width, yTop); ctx.stroke(); }
        if (botFade > 0) { ctx.globalAlpha = Math.max(0, botFade); ctx.strokeStyle = lineGrad; ctx.beginPath(); ctx.moveTo(0, yBot); ctx.lineTo(width, yBot); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
};
