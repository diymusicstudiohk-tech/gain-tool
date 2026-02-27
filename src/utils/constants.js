import { PRESETS_DATA } from './presetsData';
export { PRESETS_DATA };

export const AUDIO_SOURCES = [
    // === Bass (貝斯) ===
    { id: 'Bass-01', name: 'Bass-01', category: 'Bass (貝斯)', trackName: 'Bass-01' },
    { id: 'Bass-02', name: 'Bass-02', category: 'Bass (貝斯)', trackName: 'Bass-02' },
    { id: 'Bass-03', name: 'Bass-03', category: 'Bass (貝斯)', trackName: 'Bass-03' },
    { id: 'Bass-04', name: 'Bass-04', category: 'Bass (貝斯)', trackName: 'Bass-04' },
    { id: 'Bass-05', name: 'Bass-05', category: 'Bass (貝斯)', trackName: 'Bass-05' },
    { id: 'Bass-06', name: 'Bass-06', category: 'Bass (貝斯)', trackName: 'Bass-06' },
    { id: 'Bass-07', name: 'Bass-07', category: 'Bass (貝斯)', trackName: 'Bass-07' },
    { id: 'Bass-08', name: 'Bass-08', category: 'Bass (貝斯)', trackName: 'Bass-08' },
    { id: 'Bass-09', name: 'Bass-09', category: 'Bass (貝斯)', trackName: 'Bass-09' },
    { id: 'Bass-10', name: 'Bass-10', category: 'Bass (貝斯)', trackName: 'Bass-10' },
    { id: 'Bass-11', name: 'Bass-11', category: 'Bass (貝斯)', trackName: 'Bass-11' },
    { id: 'Bass-12', name: 'Bass-12', category: 'Bass (貝斯)', trackName: 'Bass-12' },
    // === Acoustic Guitar (木吉他) ===
    { id: 'AG-03', name: 'AG-03', category: 'Acoustic Guitar (木吉他)', trackName: 'Ag-03' },
    { id: 'AG-04', name: 'AG-04', category: 'Acoustic Guitar (木吉他)', trackName: 'Ag-04' },
    // === Electric Guitar (電吉他) ===
    { id: 'EG-01', name: 'EG-01', category: 'Electric Guitar (電吉他)', trackName: 'Eg-01' },
    { id: 'EG-02', name: 'EG-02', category: 'Electric Guitar (電吉他)', trackName: 'Eg-02' },
    { id: 'EG-03', name: 'EG-03', category: 'Electric Guitar (電吉他)', trackName: 'Eg-03' },
    { id: 'EG-04', name: 'EG-04', category: 'Electric Guitar (電吉他)', trackName: 'Eg-04' },
    { id: 'EG-05', name: 'EG-05', category: 'Electric Guitar (電吉他)', trackName: 'Eg-05' },
    { id: 'EG-06', name: 'EG-06', category: 'Electric Guitar (電吉他)', trackName: 'Eg-06' },
    { id: 'EG-07', name: 'EG-07', category: 'Electric Guitar (電吉他)', trackName: 'Eg-07' },
    { id: 'EG-08', name: 'EG-08', category: 'Electric Guitar (電吉他)', trackName: 'Eg-08' },
    { id: 'EG-09', name: 'EG-09', category: 'Electric Guitar (電吉他)', trackName: 'Eg-09' },
    // === Kick (大鼓) ===
    { id: 'KICK-01', name: 'KICK-01', category: 'Kick (大鼓)', trackName: 'Kick-01' },
    { id: 'KICK-02', name: 'KICK-02', category: 'Kick (大鼓)', trackName: 'Kick-02' },
    { id: 'KICK-03', name: 'KICK-03', category: 'Kick (大鼓)', trackName: 'Kick-03' },
    { id: 'KICK-04', name: 'KICK-04', category: 'Kick (大鼓)', trackName: 'Kick-04' },
    { id: 'KICK-05', name: 'KICK-05', category: 'Kick (大鼓)', trackName: 'Kick-05' },
    { id: 'KICK-06', name: 'KICK-06', category: 'Kick (大鼓)', trackName: 'Kick-06' },
    { id: 'KICK-07', name: 'KICK-07', category: 'Kick (大鼓)', trackName: 'Kick-07' },
    { id: 'KICK-08', name: 'KICK-08', category: 'Kick (大鼓)', trackName: 'Kick-08' },
    { id: 'KICK-09', name: 'KICK-09', category: 'Kick (大鼓)', trackName: 'Kick-09' },
    { id: 'KICK-10', name: 'KICK-10', category: 'Kick (大鼓)', trackName: 'Kick-10' },
    // === Snare (小鼓) ===
    { id: 'Snare-01', name: 'Snare-01', category: 'Snare (小鼓)', trackName: 'Snare-01' },
    { id: 'Snare-02', name: 'Snare-02', category: 'Snare (小鼓)', trackName: 'Snare-02' },
    { id: 'Snare-03', name: 'Snare-03', category: 'Snare (小鼓)', trackName: 'Snare-03' },
    { id: 'Snare-04', name: 'Snare-04', category: 'Snare (小鼓)', trackName: 'Snare-04' },
    { id: 'Snare-05', name: 'Snare-05', category: 'Snare (小鼓)', trackName: 'Snare-05' },
    { id: 'Snare-06', name: 'Snare-06', category: 'Snare (小鼓)', trackName: 'Snare-06' },
    { id: 'Snare-07', name: 'Snare-07', category: 'Snare (小鼓)', trackName: 'Snare-07' },
    // === Other Drums (其他鼓件) ===
    { id: 'HIHAT-01', name: 'HIHAT-01', category: 'Other Drums (其他鼓件)', trackName: 'Hihat-01' },
    { id: 'HIHAT-02', name: 'HIHAT-02', category: 'Other Drums (其他鼓件)', trackName: 'Hihat-02' },
    { id: 'HIHAT-03', name: 'HIHAT-03', category: 'Other Drums (其他鼓件)', trackName: 'Hihat-03' },
    { id: 'Tom', name: 'Tom', category: 'Other Drums (其他鼓件)', trackName: 'Tom' },
    // === Other (其他) ===
    { id: 'VIOLA', name: 'VIOLA', category: 'Other (其他)', trackName: 'Viola' },
    { id: 'Cello', name: 'Cello', category: 'Other (其他)', trackName: 'Cello' },
    { id: 'OTHER-DOBRO', name: 'OTHER-DOBRO', category: 'Other (其他)', trackName: 'Other-dobro' },
    { id: 'OTHER-MARIMBA', name: 'OTHER-MARIMBA', category: 'Other (其他)', trackName: 'Other-marimba' },
    { id: 'PERC-BOMBO', name: 'PERC-BOMBO', category: 'Other (其他)', trackName: 'Perc-bombo' },
    { id: 'PERC-CUNONO', name: 'PERC-CUNONO', category: 'Other (其他)', trackName: 'Perc-cunono' },
    { id: 'SAXOPHONE', name: 'SAXOPHONE', category: 'Other (其他)', trackName: 'Saxophone' },
    // === Keys (鍵盤) ===
    { id: 'PIANO-01', name: 'PIANO-01', category: 'Keys (鍵盤)', trackName: 'Piano-01' },
    { id: 'PIANO-02', name: 'PIANO-02', category: 'Keys (鍵盤)', trackName: 'Piano-02' },
    { id: 'PIANO-03', name: 'PIANO-03', category: 'Keys (鍵盤)', trackName: 'Piano-03' },
    { id: 'Synth-01', name: 'Synth-01', category: 'Keys (鍵盤)', trackName: 'Synth-01' },
    { id: 'Synth-02', name: 'Synth-02', category: 'Keys (鍵盤)', trackName: 'Synth-02' },
    { id: 'Synth-03', name: 'Synth-03', category: 'Keys (鍵盤)', trackName: 'Synth-03' },
    { id: 'Synth-04', name: 'Synth-04', category: 'Keys (鍵盤)', trackName: 'Synth-04' },
    { id: 'Organ', name: 'Organ', category: 'Keys (鍵盤)', trackName: 'Organ' },
    { id: 'Rhodes', name: 'Rhodes', category: 'Keys (鍵盤)', trackName: 'Rhodes' },
    // === Female Vocal (女聲) ===
    { id: '練習用女聲主音1', name: '練習用女聲主音1', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-1' },
    { id: '練習用女聲主音2', name: '練習用女聲主音2', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-2' },
    { id: '練習用女聲主音3', name: '練習用女聲主音3', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-3' },
    { id: '練習用女聲主音4', name: '練習用女聲主音4', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-4' },
    { id: '練習用女聲主音5', name: '練習用女聲主音5', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-5' },
    { id: '練習用女聲主音6', name: '練習用女聲主音6', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-6' },
    { id: '練習用女聲主音7', name: '練習用女聲主音7', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-7' },
    { id: '練習用女聲主音8', name: '練習用女聲主音8', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-8' },
    { id: '練習用女聲主音9', name: '練習用女聲主音9', category: 'Female Vocal (女聲)', trackName: 'Female-vocal-9' },
    // === Male Vocal (男聲) ===
    { id: '練習用男聲主音1', name: '練習用男聲主音1', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-1' },
    { id: '練習用男聲主音2', name: '練習用男聲主音2', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-2' },
    { id: '練習用男聲主音3', name: '練習用男聲主音3', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-3' },
    { id: '練習用男聲主音4', name: '練習用男聲主音4', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-4' },
    { id: '練習用男聲主音5', name: '練習用男聲主音5', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-5' },
    { id: '練習用男聲主音6', name: '練習用男聲主音6', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-6' },
    { id: '練習用男聲主音7', name: '練習用男聲主音7', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-7' },
    { id: '練習用男聲主音8', name: '練習用男聲主音8', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-8' },
    { id: '練習用男聲主音9', name: '練習用男聲主音9', category: 'Male Vocal (男聲)', trackName: 'Male-vocal-9' },
];

export const TOOLTIPS = {
    // --- COMPRESSOR MODULE ---
    threshold: {
        title: "Threshold (門檻值)",
        desc: "Threshold (門檻值) 決定壓縮器開始介入的音量基準線。\n\n向左扭 (數值變小)：會抓到更多小音量的細節，紅色壓縮(GR)曲線會向下延伸得更深、更頻繁。\n\n向右扭 (數值變大)：只有最大聲的峰值會被壓縮，紅色壓縮曲線只會在音量最大時出現。\n\n目的：控制動態範圍。\n\n常用：設在比平均音量稍低處，讓 GR 保持在 -3dB 至 -6dB 之間最為安全自然。"
    },
    attack: {
        title: "Attack (啟動時間)",
        desc: "Attack (啟動時間) 決定聲音超過門檻後，壓縮器「花多久時間」才完全壓下來。\n\n向左扭 (快)：立即壓縮，會吃掉聲音開頭的衝擊感 (Transient)，紅色壓縮(GR)曲線呈現垂直下墜。\n\n向右扭 (慢)：保留聲音開頭的打擊感 (Punch)，隨後才壓低，紅色壓縮曲線呈現圓滑斜坡。\n\n目的：控制衝擊力。\n\n常用：慢 Attack (10-30ms) 可保留聲音衝擊感；快 Attack (<1ms) 用於控制失控的衝擊感。"
    },
    release: {
        title: "Release (釋放時間)",
        desc: "Release (釋放時間) 決定當聲音低於門檻後，壓縮器「花多久時間」才停止運作。\n\n向左扭 (快)：壓縮迅速結束，音量會快速彈回，聲音聽起來較響亮但可能有「抽吸感」(Pumping)，紅色壓縮(GR)會快速歸零。\n\n向右扭 (慢)：壓縮持續較久，聲音較平穩，紅色壓縮(GR)歸零得很慢。\n\n目的：控制節奏律動 (Groove)。\n\n常用：設為與歌曲拍子同步。太快會導致低頻失真，太慢會壓住下一個音符。"
    },
    lookahead: {
        title: "Lookahead (預讀)",
        desc: "Lookahead (預讀) 讓壓縮器「偷看」未來的訊號，以提早做出反應。\n\n向右扭 (時間長)：壓縮器能在瞬態發生前就開始壓縮。觀察紅色壓縮(GR)曲線，會發現它比白色波形的峰值「稍微提早」一點點開始下潛。\n\n目的：完美攔截極快的峰值 (Brickwall Limiting)。\n\n常用：2-5ms，主要用於母帶處理或防止數位失真 (Clipping)。"
    },
    clip: {
        title: "Soft Clip (柔性削波)",
        desc: "Soft Clip (柔性削波) 在限幅器之後加入 tanh 飽和曲線，作為最後安全網。\n\n0%：完全關閉，訊號直接通過。\n\n向右扭：逐漸將超過限幅器的峰值圓滑化（round off），增加類似磁帶飽和的溫暖感。\n\n100%：重度飽和效果。\n\n目的：防止數位削波、增加溫暖感。\n\n常用：10-30% 用於透明的峰值保護；50%+ 用於刻意的飽和音色。"
    },

    // --- OUTPUT MODULE ---
    makeup: {
        title: "Wet Output (音訊經壓縮處理後的音量補償)",
        desc: "Wet Output 讓你手動增加經壓縮處理後的音訊的輸出音量，以補償壓縮後損失的音量。\n\n向右扭：整體波形變大。注意這不會改變紅色壓縮(GR)曲線，因為這是發生在壓縮之後。\n\n目的：A/B 測試時保持音量一致。\n\n常用：看 GR 減少了多少 dB，就補回多少 dB (例如 GR 平均 -3dB，Makeup 就加 3dB)。"
    },
    dryGain: {
        title: "Dry Output (在輸出結果混合未壓縮的音訊)",
        desc: "Dry Output讓你將未經處理的原始訊號 (Dry) 混合進來，即「平行壓縮」。\n\n向右扭：金色斜線波形（原始訊號）會疊加在濕（Wet）訊號上。這能讓大音量的動態回歸，同時保留壓縮帶來的細節。\n\n目的：保留衝擊力同時增加厚度。\n\n常用：通常只會在最後的輸出結果添加少量乾(Dry)訊號，常用於鼓組或人聲增厚。"
    },
};
