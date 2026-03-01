# Mobile Browser 效能分析報告

## 總結評價

本程式在 **桌面瀏覽器** 上的優化已經做得相當好，是專業水準的實作。但在 **mobile browser** 上仍有若干可改進的空間，主要集中在渲染幀率控制和記憶體管理方面。

整體評分：**音訊 8.5/10、視覺渲染 7/10**（以 mobile 為基準）

---

## 一、音訊處理（Audio DSP）— 優化程度：高

### 已做好的優化（不需要改動）

| 優化項目 | 檔案位置 | 說明 |
|---------|---------|------|
| AudioWorklet 獨立線程 | `public/compressor-processor.js` | DSP 在獨立 Worker 執行，不阻塞 UI |
| Pre-allocated Float32Array | `compressor-processor.js:44-52` | delayBuffer, dequeValues, dequeIndices, rmsBuffer, tpHistory 全部預分配，零 GC |
| Monotonic deque 滑動窗最大值 | `compressor-processor.js:273-285` | O(n) 複雜度，比 O(n log n) 的堆結構高效 |
| 線性增益快取 | `compressor-processor.js:197-224` | 只在 smoothed 值變化時才呼叫 `Math.exp()`，避免每 sample 計算 |
| 預計算常數 | `dspConstants.js` | LN10_OVER_20, TWENTY_LOG10E 等避免重複運算 |
| Chunk-based 離線處理 | `useDSPProcessing.js:100-126` | 50k samples/chunk，每 4ms yield，不凍結 UI |
| 參數延遲（knob 拖動時不重算） | `useDSPProcessing.js:16-21` | 滑鼠放開才觸發 DSP 重新計算 |
| 參數平滑（5ms 指數移動平均） | `compressor-processor.js:206-211` | 避免 zipper noise，也避免不必要的增益重算 |

### 可改進的地方

1. **每 sample 的 `Math.exp()` 調用** (`compressor-processor.js:338`)
   - `compGainLinear = Math.exp(compGainReductiondB * LN10_OVER_20)` 每個 sample 都會執行
   - 影響：在低端手機上，48kHz * 128 samples/block = 每次 process() 呼叫 128 次 Math.exp()
   - 建議：可以用查表法 (LUT) 或快速近似 `exp()` 替代，但實際影響不大（AudioWorklet 在獨立線程）

2. **ScriptProcessorNode 降級方案** (`usePlayback.js:114-122`)
   - 在 AudioWorklet 不支援時使用 ScriptProcessorNode（已廢棄 API）
   - 2048 samples buffer size 在主線程運行
   - 現代 iOS Safari 和 Android Chrome 都支援 AudioWorklet，此降級方案影響面很小

3. **離線處理完成後建立 AudioBuffer** (`useDSPProcessing.js:115-121`)
   - `audioContext.createBuffer()` + `copyToChannel()` 是同步操作，可能在長音檔上造成短暫卡頓
   - delta buffer 的計算也在同一個 chunk 完成後立即執行

**結論：音訊處理的優化已經非常到位。** AudioWorklet 確保了 DSP 不會影響 UI，pre-allocated buffer 避免了 GC，核心演算法使用了高效的資料結構。在 mobile 上唯一可能的瓶頸是 AudioWorklet 線程的 CPU 負擔，但以 limiter 這類演算法的複雜度來說，現代手機完全能負擔。

---

## 二、視覺渲染（Canvas Rendering）— 優化程度：中上

### 已做好的優化

| 優化項目 | 檔案位置 | 說明 |
|---------|---------|------|
| 主波形 30fps 節流 | `useVisualizerLoop.js:213` | `(frame + 1) % 2`，跳幀繪製 |
| ImageData 背景快取 | `Waveform.jsx:50-95` | 波形背景不變時直接 `putImageData()` |
| Mipmap 階層快取 | `mipmapCache.js` | 6 級降採樣，根據縮放選擇最佳解析度 |
| Viewport culling | `waveformData.js` | 只計算可見範圍的波形點 |
| 直接 DOM 更新 | `Meters.jsx:608-612, 822-823` | tooltip 用 `textContent` 直接改，不觸發 React re-render |
| OffscreenCanvas | `Meters.jsx:66-126` | CF 熱力圖用離屏 canvas 合成 |
| Gradient WeakMap 快取 | `Meters.jsx:128-139` | 漸變只在 resize 時重建 |
| 參數變化偵測 | `useVisualizerLoop.js:221-231` | 比較 15 個繪圖參數，沒變就跳過 |

### 需要改進的地方

#### 1. Meter tooltip 的 RAF 迴圈沒有幀率限制 ⚠️
- **位置**: `Meters.jsx:606-618`（InputMeter）、`Meters.jsx:820-829`（Meters）
- **問題**: tooltip 可見時，會啟動獨立的 RAF 迴圈更新文字，在 120Hz 的手機上 = 120fps
- **影響**: 僅更新 `textContent`，成本不高，但完全不需要這麼頻繁
- **建議**: 可以改為每 3-4 幀更新一次，或直接用 setInterval(100ms)

#### 2. `getImageData()` / `putImageData()` 在 mobile 上成本高 ⚠️
- **位置**: `Waveform.jsx:93`（寫入快取）、`Waveform.jsx:102`（從快取恢復）
- **問題**: 在 DPR=3 的手機上（如 iPhone），一個 400x300 的 canvas 實際是 1200x900 = 4.32MB per ImageData
- **影響**: cache miss 時的 `getImageData()` 需要從 GPU 讀回資料（readback），是已知的效能殺手
- **建議**: 考慮使用雙 canvas 策略（一個 background canvas + 一個 overlay canvas），避免 ImageData readback

#### 3. Meter canvas 沒有幀率節流 ⚠️
- **位置**: `useVisualizerLoop.js:204-210`（meter 繪製在主 animate 迴圈中）
- **問題**: 雖然主波形做了 30fps 節流，但 meter 繪製是每幀都執行的
- **影響**: 在 120Hz 裝置上 = 120 次/秒 canvas 繪製（input meter + output meter + GR + DR）
- **建議**: meter 也可以 30fps 或 60fps，人眼對 meter 的更新率感知有限

#### 4. CF 熱力圖每幀重繪 50 個 bucket
- **位置**: `Meters.jsx:104-123`（renderCfHeatMapVertical）
- **問題**: 每一幀都遍歷 50 個 bucket，跳過 heat < 0.01 的，但剩下的每個都需要：clearRect → drawImage → fillRect → drawImage
- **影響**: 活躍時可能有 20-30 個 bucket 需要繪製，每個涉及 OffscreenCanvas 合成操作
- **建議**: 可以整合為一次批量繪製，或降低 bucket 數量到 25

#### 5. 沒有 mobile DPR 降級策略
- **位置**: `useVisualizerLoop.js:65`（`interactionDPR = null`）
- **問題**: `interactionDPR` 永遠是 `null`，意味著永遠使用全解析度 DPR
- **影響**: DPR=3 的手機（iPhone 14 Pro, Pixel 7 Pro）canvas 像素是 DPR=1 的 9 倍
- **建議**: 在 mobile 上可以使用 `Math.min(dpr, 2)` 來降低繪圖成本

#### 6. 波形 Phase 2 overlay 的 hover 區域重繪成本高
- **位置**: `Waveform.jsx:167-238`（hover layers）
- **問題**: 當滑鼠 hover 在波形上時，會重新計算整個可見區域的 polygon 並繪製
- **影響**: 在手機上 hover 較少（觸控為主），但如果觸控也觸發了這些計算，就會很貴
- **說明**: 這個主要影響桌面端（hover 事件），mobile 影響較小

---

## 三、記憶體使用分析

| 項目 | 估計大小（10秒 48kHz 音檔） | 說明 |
|-----|--------------------------|------|
| 原始 AudioBuffer | ~1.8 MB | Float32 x 480k samples |
| Visual cache | ~1.0 MB | 250k samples x 4 bytes |
| DSP output buffer | ~1.8 MB | 全長 Float32 |
| Delta buffer | ~1.8 MB | 全長 Float32 |
| Mipmap (input + output + GR) | ~1.5 MB | 6 級 x 3 組 |
| ImageData 快取 | ~4.3 MB | DPR=3, 400x300 canvas |
| AudioWorklet buffers | ~0.26 MB | 8192 x 4 各種 buffer |
| **合計** | **~12.5 MB** | 10 秒音檔 |

對於 1 分鐘音檔約 ~50MB，3 分鐘約 ~130MB。在 2GB 記憶體的低端手機上可能造成壓力。

---

## 四、綜合建議（如果要實施優化）

### 高優先級（投入低、效果明顯）
1. **Mobile DPR cap**: `Math.min(devicePixelRatio, 2)` — 一行改動，canvas 繪製成本減少 56%
2. **Meter 繪製 30fps 節流**: 與波形相同的跳幀策略
3. **Tooltip RAF 節流**: 改為 10fps 或事件驅動更新

### 中優先級（需要一定改動）
4. **雙 canvas 替代 ImageData cache**: 避免 GPU readback
5. **CF heat map 批量繪製**: 減少 OffscreenCanvas 合成次數

### 低優先級（改動大，收益有限）
6. **WebGL renderer**: 替代 Canvas 2D（改動量太大）
7. **WASM DSP**: 替代 JS DSP（AudioWorklet 已在獨立線程，瓶頸不在這裡）

---

## 最終結論

**本程式的優化水準在 Web Audio 應用中屬於上乘。** 核心架構設計正確（AudioWorklet、mipmap、chunk processing、pre-allocation），主要的 mobile 弱點在於視覺渲染沒有針對高 DPR 裝置做降級，以及 meter 繪製沒有幀率節流。這些都是低成本的改進，不需要重構架構。

如果要實施優化，建議從高優先級的 3 項開始，預計可以讓 mobile 體驗提升 30-40%。
