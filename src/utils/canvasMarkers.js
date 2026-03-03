import { GOLD, GOLD_LIGHT } from './colors';

// --- Shared Constants ---
export const MARKER_EDGE_HIT_ZONE = 15;
export const DELETE_BTN_SIZE = 16;
export const DELETE_BTN_MARGIN = 4;
export const DEFAULT_HALF_WIDTH_PX = 40;

// Gold RGB for gradient construction
const GOLD_R = 194, GOLD_G = 164, GOLD_B = 117; // #C2A475

/**
 * Draw hover preview: two gold vertical gradient lines ±40px from cursor,
 * plus a small gold square block on the baseline.
 */
export const drawMarkerHoverPreview = (ctx, mouseX, width, height, centerY) => {
    const halfW = DEFAULT_HALF_WIDTH_PX;
    const x1 = mouseX - halfW;
    const x2 = mouseX + halfW;

    // Vertical gradient: 5% at top/bottom edges, 60% at centerY baseline
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    const centerStop = Math.max(0, Math.min(1, centerY / height));
    grad.addColorStop(0, `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.05)`);
    grad.addColorStop(centerStop, `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.60)`);
    grad.addColorStop(1, `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.05)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (x1 >= 0 && x1 <= width) { ctx.moveTo(x1, 0); ctx.lineTo(x1, height); }
    if (x2 >= 0 && x2 <= width) { ctx.moveTo(x2, 0); ctx.lineTo(x2, height); }
    ctx.stroke();

    // Gold rounded square block on baseline at cursor X
    const blockSize = 12;
    const bx = mouseX - blockSize / 2;
    const by = centerY - blockSize / 2;
    ctx.fillStyle = `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.7)`;
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + blockSize - r, by);
    ctx.quadraticCurveTo(bx + blockSize, by, bx + blockSize, by + r);
    ctx.lineTo(bx + blockSize, by + blockSize - r);
    ctx.quadraticCurveTo(bx + blockSize, by + blockSize, bx + blockSize - r, by + blockSize);
    ctx.lineTo(bx + r, by + blockSize);
    ctx.quadraticCurveTo(bx, by + blockSize, bx, by + blockSize - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
};

/**
 * Draw all placed markers with gold fill, gradient edge lines, and delete buttons.
 */
export const drawPlacedMarkers = (ctx, markers, width, height, centerY, zoomX, panOffset, hoveredInfo) => {
    for (const marker of markers) {
        const x1 = marker.startFrac * width * zoomX + panOffset;
        const x2 = marker.endFrac * width * zoomX + panOffset;

        // Skip entirely off-screen markers
        if (x2 < -2 || x1 > width + 2) continue;

        const isHovered = hoveredInfo && hoveredInfo.markerId === marker.id;
        const hoveredZone = isHovered ? hoveredInfo.zone : null;

        // Subtle gold fill between lines
        ctx.fillStyle = `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.08)`;
        ctx.fillRect(Math.max(0, x1), 0, Math.min(width, x2) - Math.max(0, x1), height);

        // Vertical gradient for edge lines: 5% edges, 90% at center
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        const centerStop = Math.max(0, Math.min(1, centerY / height));
        grad.addColorStop(0, `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.05)`);
        grad.addColorStop(centerStop, `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.90)`);
        grad.addColorStop(1, `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.05)`);

        ctx.strokeStyle = grad;

        // Left edge line
        ctx.lineWidth = hoveredZone === 'left' ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
        ctx.stroke();

        // Right edge line
        ctx.lineWidth = hoveredZone === 'right' ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x2, 0); ctx.lineTo(x2, height);
        ctx.stroke();

        // Delete button: 16x16 gold rounded square with white "x" at top-right of marker
        const btnX = Math.min(x2, width) - DELETE_BTN_SIZE - DELETE_BTN_MARGIN;
        const btnY = DELETE_BTN_MARGIN;
        const isDeleteHovered = hoveredZone === 'delete';

        // Only draw if visible
        if (btnX > -DELETE_BTN_SIZE && btnX < width + DELETE_BTN_SIZE) {
            const btnR = 4;
            ctx.fillStyle = isDeleteHovered
                ? `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.9)`
                : `rgba(${GOLD_R}, ${GOLD_G}, ${GOLD_B}, 0.5)`;
            ctx.beginPath();
            ctx.moveTo(btnX + btnR, btnY);
            ctx.lineTo(btnX + DELETE_BTN_SIZE - btnR, btnY);
            ctx.quadraticCurveTo(btnX + DELETE_BTN_SIZE, btnY, btnX + DELETE_BTN_SIZE, btnY + btnR);
            ctx.lineTo(btnX + DELETE_BTN_SIZE, btnY + DELETE_BTN_SIZE - btnR);
            ctx.quadraticCurveTo(btnX + DELETE_BTN_SIZE, btnY + DELETE_BTN_SIZE, btnX + DELETE_BTN_SIZE - btnR, btnY + DELETE_BTN_SIZE);
            ctx.lineTo(btnX + btnR, btnY + DELETE_BTN_SIZE);
            ctx.quadraticCurveTo(btnX, btnY + DELETE_BTN_SIZE, btnX, btnY + DELETE_BTN_SIZE - btnR);
            ctx.lineTo(btnX, btnY + btnR);
            ctx.quadraticCurveTo(btnX, btnY, btnX + btnR, btnY);
            ctx.closePath();
            ctx.fill();

            // White "x"
            const cx = btnX + DELETE_BTN_SIZE / 2;
            const cy = btnY + DELETE_BTN_SIZE / 2;
            const xOff = 4;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - xOff, cy - xOff); ctx.lineTo(cx + xOff, cy + xOff);
            ctx.moveTo(cx + xOff, cy - xOff); ctx.lineTo(cx - xOff, cy + xOff);
            ctx.stroke();
        }
    }

    // Reset
    ctx.lineWidth = 1;
};

/**
 * Hit-test markers at a given mouse position.
 * Returns { markerId, zone: 'delete' | 'left' | 'right' | 'body' } or null.
 * Priority: delete > edge > body.
 */
export const getMarkerHitZone = (mouseX, mouseY, markers, zoomX, panOffset, canvasWidth) => {
    // Iterate in reverse so topmost (last-drawn) markers get priority
    for (let i = markers.length - 1; i >= 0; i--) {
        const marker = markers[i];
        const x1 = marker.startFrac * canvasWidth * zoomX + panOffset;
        const x2 = marker.endFrac * canvasWidth * zoomX + panOffset;

        // Delete button check first
        const btnX = Math.min(x2, canvasWidth) - DELETE_BTN_SIZE - DELETE_BTN_MARGIN;
        const btnY = DELETE_BTN_MARGIN;
        if (
            mouseX >= btnX && mouseX <= btnX + DELETE_BTN_SIZE &&
            mouseY >= btnY && mouseY <= btnY + DELETE_BTN_SIZE
        ) {
            return { markerId: marker.id, zone: 'delete' };
        }

        // Left edge
        if (Math.abs(mouseX - x1) <= MARKER_EDGE_HIT_ZONE && mouseX <= x2) {
            return { markerId: marker.id, zone: 'left' };
        }

        // Right edge
        if (Math.abs(mouseX - x2) <= MARKER_EDGE_HIT_ZONE && mouseX >= x1) {
            return { markerId: marker.id, zone: 'right' };
        }

        // Body
        if (mouseX > x1 + MARKER_EDGE_HIT_ZONE && mouseX < x2 - MARKER_EDGE_HIT_ZONE) {
            return { markerId: marker.id, zone: 'body' };
        }
    }
    return null;
};
