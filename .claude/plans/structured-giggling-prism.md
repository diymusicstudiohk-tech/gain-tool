# Limiter-v-2 Performance Optimization Plan

## Context

This is a web-based brickwall limiter (React 19 + Web Audio API + Canvas 2D). The codebase is already well-engineered — AudioWorklet uses pre-allocated typed arrays with zero GC in the hot loop, mipmap acceleration for waveform rendering, and ref-based state for performance-critical paths.

This plan identifies **remaining optimization opportunities** ranked by impact, with concrete fixes for each.

---

## Already Well-Optimized (Do Not Touch)

- AudioWorklet pre-allocated typed arrays (~97KB, zero GC)
- Local variable hoisting in `process()` for V8 register optimization
- Monotonic deque O(1) sliding window max
- Mipmap 6-level acceleration for waveform rendering
- ImageData cache (`waveformCacheRef`) for skipping redundant draws
- 30fps waveform throttle / 60fps only during interaction
- Ref-based meter state (no React re-renders)
- Debounced DSP processing during knob drag
- Chunked async full-audio processing (50K samples + 4ms yield)

---

## 1. CRITICAL — High Impact

### 1.1 postMessage fires on EVERY React render
- **File**: `src/hooks/usePlayback.js:43-47`
- **Problem**: `useEffect` with no dependency array sends `postMessage` on every render — 60+ times/sec during playback, most carrying identical data
- **Fix**: Add dirty check — compare current params vs last sent, skip if unchanged
- **Impact**: ~90-95% fewer IPC calls to audio thread

### 1.2 Per-sample Math.exp unconditionally in AudioWorklet
- **File**: `public/compressor-processor.js:178-179`
- **Problem**: `Math.exp(sMakeupGain * LN10_OVER_20)` and `Math.exp(sDryGain * LN10_OVER_20)` called every sample (48K/sec) even when values haven't changed (5ms smoothing)
- **Fix**: Cache linear values; only recompute when smoothed value changes (`!== prev`)
- **Impact**: Eliminates 96K transcendental calls/sec in steady state (params stable most of the time)

### 1.3 Batch DSP allocates new arrays on every call
- **File**: `src/utils/dsp.js:21-22,42-49` / `src/hooks/useDSPProcessing.js:73-76`
- **Problem**: `processCompressor()` creates `new Float32Array(length)` x2 + deque/RMS buffers on every invocation (~2-4MB per param change for a typical song)
- **Fix**: Accept optional pre-allocated output buffers; maintain them in `useDSPProcessing` via `useRef`, resize only when input length changes
- **Impact**: Eliminates ~2-4MB GC pressure per recompute, preventing jank

---

## 2. MODERATE — Medium Impact

### 2.1 Meters tooltip RAF forces 60 React re-renders/sec
- **File**: `src/components/visualizer/Meters.jsx` (tooltip RAF loop)
- **Problem**: `setTick(t => t + 1)` triggers full React reconciliation every frame while tooltip is visible
- **Fix**: Use ref to DOM element + direct `textContent` update instead of React state
- **Impact**: Eliminates 60 reconciliation cycles/sec

### 2.2 DspProcessor.js is dead code
- **File**: `src/dsp/DspProcessor.js`
- **Problem**: Never imported by any active code — only self-references. Adds confusion
- **Fix**: Delete the file
- **Impact**: Code clarity, marginal bundle reduction

### 2.3 19-param string cache key created every frame
- **File**: `src/hooks/useVisualizerLoop.js:223`
- **Problem**: Template literal concatenation of 18 values + string comparison every frame
- **Fix**: Replace with ref-based individual property comparison (fast short-circuit)
- **Impact**: Eliminates string alloc + comparison overhead per frame

### 2.4 CF heat map creates up to 50 gradients per frame
- **File**: `src/components/visualizer/Meters.jsx` (renderCfHeatMapVertical)
- **Problem**: `ctx.createRadialGradient()` called for every visible bucket = up to 3000 gradient objects/sec
- **Fix**: Pre-render gradient to OffscreenCanvas; reuse with tinting
- **Impact**: Eliminates 3000 gradient allocations/sec

### 2.5 Full-audio processing runs on main thread
- **File**: `src/hooks/useDSPProcessing.js:111-148`
- **Problem**: 50K-sample chunks with `setTimeout(4)` still compete with UI for main thread time (~700ms total for 3-min song)
- **Fix**: Move to Web Worker with Transferable buffer
- **Complexity**: Hard — requires worker bundling, transfer management
- **Impact**: Moves ~700ms of DSP entirely off main thread

---

## 3. MINOR — Low Impact

### 3.1 Pre-compute Lagrange interpolation coefficients
- **Files**: `public/compressor-processor.js:202-214`, `src/utils/dsp.js:79-89`
- **Problem**: Constant expressions (`t1p1 * t1p2 * t1 / (-6)`) recalculated per sample
- **Fix**: Extract as module-level constants (e.g., `L25_0 = -0.0390625`)
- **Impact**: Eliminates 12 multiplications + 4 divisions per sample (V8 may already optimize this)

### 3.2 Non-power-of-2 ring buffer modulo
- **File**: `public/compressor-processor.js` (throughout hot loop)
- **Problem**: `MAX_LOOKAHEAD_SAMPLES = 4800` requires integer division for modulo
- **Fix**: Change to 8192 + use bitmask `& 8191`
- **Impact**: ~1-2ns per modulo (marginal)

### 3.3 Float64Array for deque could be Float32Array
- **File**: `public/compressor-processor.js:36`
- **Problem**: 38.4KB for deque values; audio input is already Float32
- **Fix**: Change to Float32Array (saves 19.2KB, better cache locality)
- **Impact**: Minor memory + cache improvement (needs numerical validation)

### 3.4 mixMipmaps allocates new Float32Array every recompute
- **File**: `src/hooks/useDSPProcessing.js:94`
- **Problem**: `new Float32Array(len)` on every dry gain change
- **Fix**: Pre-allocate alongside item 1.3
- **Impact**: Saves ~1MB per dry gain change

---

## Recommended Implementation Order

| Priority | Item | Time Est. | Complexity |
|----------|------|-----------|------------|
| 1 | 1.1 postMessage fix | 10 min | Easy |
| 2 | 2.1 Meters tooltip | 15 min | Easy |
| 3 | 2.2 Delete dead code | 2 min | Easy |
| 4 | 1.3 + 3.4 Pre-allocate buffers | 30 min | Medium |
| 5 | 2.3 Cache key optimization | 15 min | Easy |
| 6 | 3.1 Lagrange constants | 10 min | Easy |
| 7 | 1.2 Conditional Math.exp | 30 min | Medium |
| 8 | 2.4 Gradient caching | 30 min | Medium |
| 9 | 3.2 Power-of-2 buffers | 20 min | Easy |
| 10 | 3.3 Float64 → Float32 | 10 min | Easy |
| 11 | 2.5 Web Worker | 2-4 hrs | Hard |

## Verification

- Run `npm run test` after each change to ensure DSP correctness
- Manual test: load audio file, play all modes (original/processed/delta), adjust knobs
- Check DevTools Performance tab for reduced GC events and shorter frame times
- Verify no audio glitches during playback with knob adjustments
