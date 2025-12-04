# Compressor Visualizer - Project Structure

## 📂 目錄結構規劃

src/
├── 📁 components/          # React UI 組件
│   ├── 📁 ui/              # 通用的小型 UI 元件
│   │   ├── RotaryKnob.jsx  # 旋鈕元件 (包含拖曳邏輯)
│   │   ├── PlayBtn.jsx     # 播放/控制按鈕
│   │   └── Draggables.jsx  # 可拖曳的浮動視窗 (InfoPanel, Legend, ViewControls)
│   ├── 📁 visualizer/      # Canvas 視覺化相關元件
│   │   ├── Waveform.jsx    # 主波形顯示器 (包含 Loop 邏輯)
│   │   └── Meters.jsx      # GR 表與 Output/Dry 表
│   └── 📁 layout/          # 版面佈局元件
│       ├── Header.jsx      # 上方標題列、上載按鈕
│       └── ControlHud.jsx  # 下方主要的參數控制區
│
├── 📁 utils/               # 純 JavaScript 邏輯與運算
│   ├── dsp.js              # 核心 DSP 演算法 (Compressor, Gate)
│   ├── audioHelper.js      # WAV 寫入、Buffer 處理、RMS 計算
│   └── constants.js        # 靜態資料 (Presets, Tooltips, AudioSources)
│
└── App.jsx                 # 主程式入口 (負責狀態整合與 AudioContext 管理)

## 🛠 重構步驟 (Refactoring Steps)

1. **Extraction (提取)**: 將靜態資料移至 `constants.js`，將 DSP 運算移至 `utils/dsp.js`。
2. **UI Components (UI 組件化)**: 將 `RotaryKnob` 等基礎元件獨立成檔。
3. **Visualization (視覺化拆分)**: 將 `canvas` 繪圖邏輯從 `App` 中分離。
4. **Integration (整合)**: `App.jsx` 瘦身，只負責 `useAudioContext` 和將 props 傳遞給上述組件。