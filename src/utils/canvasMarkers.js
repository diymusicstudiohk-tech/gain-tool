import { GOLD, GOLD_LIGHT } from './colors';

// --- Shared Constants ---
export const MARKER_EDGE_HIT_ZONE = 15;
export const DELETE_BTN_SIZE = 16;
export const DELETE_BTN_MARGIN = 4;
export const DEFAULT_HALF_WIDTH_PX = 40;

// Shared rounded button drawing
const drawRoundedBtn = (ctx, bx, by, fillColor) => {
    const btnR = 4;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(bx + btnR, by);
    ctx.lineTo(bx + DELETE_BTN_SIZE - btnR, by);
    ctx.quadraticCurveTo(bx + DELETE_BTN_SIZE, by, bx + DELETE_BTN_SIZE, by + btnR);
    ctx.lineTo(bx + DELETE_BTN_SIZE, by + DELETE_BTN_SIZE - btnR);
    ctx.quadraticCurveTo(bx + DELETE_BTN_SIZE, by + DELETE_BTN_SIZE, bx + DELETE_BTN_SIZE - btnR, by + DELETE_BTN_SIZE);
    ctx.lineTo(bx + btnR, by + DELETE_BTN_SIZE);
    ctx.quadraticCurveTo(bx, by + DELETE_BTN_SIZE, bx, by + DELETE_BTN_SIZE - btnR);
    ctx.lineTo(bx, by + btnR);
    ctx.quadraticCurveTo(bx, by, bx + btnR, by);
    ctx.closePath();
    ctx.fill();
};

/**
 * Draw hover preview: two gold vertical gradient lines ±40px from cursor,
 * plus a small gold square block on the baseline.
 */
export const drawMarkerHoverPreview = (ctx, mouseX, width, height, centerY) => {
    const halfW = DEFAULT_HALF_WIDTH_PX;
    const x1 = mouseX - halfW;
    const x2 = mouseX + halfW;

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (x1 >= 0 && x1 <= width) { ctx.moveTo(x1, 0); ctx.lineTo(x1, height); }
    if (x2 >= 0 && x2 <= width) { ctx.moveTo(x2, 0); ctx.lineTo(x2, height); }
    ctx.stroke();

    // "+" block at top-right of preview pair (same style/size/position as delete button)
    const btnX = Math.min(x2, width) - DELETE_BTN_SIZE - DELETE_BTN_MARGIN;
    const btnY = DELETE_BTN_MARGIN;
    if (btnX > -DELETE_BTN_SIZE && btnX < width + DELETE_BTN_SIZE) {
        drawRoundedBtn(ctx, btnX, btnY, GOLD);
        // White "+" sign
        const cx = btnX + DELETE_BTN_SIZE / 2;
        const cy = btnY + DELETE_BTN_SIZE / 2;
        const pOff = 4;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - pOff, cy); ctx.lineTo(cx + pOff, cy);
        ctx.moveTo(cx, cy - pOff); ctx.lineTo(cx, cy + pOff);
        ctx.stroke();
    }
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

        // Vertical gradient for edge lines: 80% at top/bottom edges, 100% at centerY
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        const centerStop = Math.max(0, Math.min(1, centerY / height));
        grad.addColorStop(0, 'rgba(194, 164, 117, 0.80)');
        grad.addColorStop(centerStop, 'rgba(194, 164, 117, 1.0)');
        grad.addColorStop(1, 'rgba(194, 164, 117, 0.80)');
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
            drawRoundedBtn(ctx, btnX, btnY, isDeleteHovered ? GOLD_LIGHT : GOLD);

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

        // Undo (reset gain) button: bottom-right, only when gain !== 0
        if (marker.clipGainDb !== 0) {
            const undoX = Math.min(x2, width) - DELETE_BTN_SIZE - DELETE_BTN_MARGIN;
            const undoY = height - DELETE_BTN_MARGIN - DELETE_BTN_SIZE;
            const isUndoHovered = hoveredZone === 'undo';

            if (undoX > -DELETE_BTN_SIZE && undoX < width + DELETE_BTN_SIZE) {
                drawRoundedBtn(ctx, undoX, undoY, isUndoHovered ? GOLD_LIGHT : GOLD);

                // Bold undo arrow with filled arrowhead
                const ucx = undoX + DELETE_BTN_SIZE / 2;
                const ucy = undoY + DELETE_BTN_SIZE / 2;
                const r = 5;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ucx, ucy, r, -Math.PI * 0.75, Math.PI * 0.55);
                ctx.stroke();
                // Filled arrowhead
                const tipAngle = Math.PI * 0.55;
                const tipX = ucx + r * Math.cos(tipAngle);
                const tipY = ucy + r * Math.sin(tipAngle);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(tipX - 4, tipY - 2);
                ctx.lineTo(tipX + 1, tipY + 3);
                ctx.lineTo(tipX + 2, tipY - 3);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    // Reset
    ctx.lineWidth = 1;
};

/**
 * Hit-test markers at a given mouse position.
 * Returns { markerId, zone: 'delete' | 'undo' | 'left' | 'right' | 'body' } or null.
 * Priority: delete > undo > edge > body.
 */
export const getMarkerHitZone = (mouseX, mouseY, markers, zoomX, panOffset, canvasWidth, canvasHeight) => {
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

        // Undo button check (only when gain !== 0)
        if (marker.clipGainDb !== 0 && canvasHeight) {
            const undoX = Math.min(x2, canvasWidth) - DELETE_BTN_SIZE - DELETE_BTN_MARGIN;
            const undoY = canvasHeight - DELETE_BTN_MARGIN - DELETE_BTN_SIZE;
            if (
                mouseX >= undoX && mouseX <= undoX + DELETE_BTN_SIZE &&
                mouseY >= undoY && mouseY <= undoY + DELETE_BTN_SIZE
            ) {
                return { markerId: marker.id, zone: 'undo' };
            }
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
