import { MicVocal, Zap, Disc, AudioWaveform } from 'lucide-react';

export const PRESETS_DATA = [
    {
        name: "Default (初始設定)",
        explanation: "【特色】\n這是壓縮器的初始狀態。Threshold 為 0dB，Ratio 為 4:1。目前不會對聲音產生任何壓縮，適合用來聆聽原始訊號，或作為從零開始調整的起點。\n\n【建議調整】\n試著慢慢逆時針旋轉 Threshold 旋鈕，直到 Gain Reduction (GR) 表頭開始跳動，觀察壓縮器如何介入。\n\n【微調技巧】\n若覺得壓縮效果不明顯，可試著增加 Ratio；若覺得聲音變小，可增加 Makeup Gain。",
        params: { threshold: 0, ratio: 4, attack: 15, release: 150, knee: 0, lookahead: 0, makeupGain: 0, dryGain: -60, gateThreshold: -80, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Subtle Vocal Control (輕微人聲控制)",
        explanation: "【特色】\n溫和的設定 (Ratio 2.5:1, 軟膝)，旨在輕輕撫平人聲動態，保留自然的呼吸感，聽眾幾乎不會察覺壓縮的存在。\n\n【建議調整】\n調整 Threshold，讓 Gain Reduction 在人聲最大聲時大約達到 -2dB 至 -3dB 即可。\n\n【微調技巧】\n若覺得人聲還是忽大忽小，可稍微調快 Release (向左)；若覺得聲音不夠自然，可調慢 Attack (向右)。",
        params: { threshold: -20, ratio: 2.5, attack: 10, release: 200, knee: 5, lookahead: 2, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Aggressive Rap Vocal (激進饒舌人聲)",
        explanation: "【特色】\n高 Ratio (8:1) 配合極快 Attack。這會將動態像磚牆一樣壓平，讓每一個字都像子彈一樣清晰有力，適合穿透力強的混音。\n\n【建議調整】\n調整 Threshold，讓 Gain Reduction 大約在 -6dB 至 -10dB，確保每一句歌詞都被緊緊抓住。\n\n【微調技巧】\n若覺得咬字不清 (Transient 被吃掉)，可稍微調慢 Attack (向右 10-20ms)；若覺得尾音太短，可調慢 Release (向右)。",
        params: { threshold: -28, ratio: 8, attack: 2, release: 80, knee: 2, lookahead: 5, makeupGain: 8, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Vocal Bus Glue (人聲總線黏合)",
        explanation: "【特色】\n中等 Attack (30ms) 讓瞬態通過，配合中等 Release 讓尾韻拉起。這能讓合聲與主唱聽起來像是在同一個空間演唱，產生完美的「黏合感」。\n\n【建議調整】\n調整 Threshold，讓 Gain Reduction 輕微地在 -2dB 至 -4dB 之間擺動。\n\n【微調技巧】\n若覺得合聲聽起來太分開，可增加 Ratio；若覺得總體音量被壓得太死，可嘗試調慢 Release。",
        params: { threshold: -24, ratio: 3, attack: 30, release: 100, knee: 10, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Acoustic Guitar Leveler (木吉他平整化)",
        explanation: "【特色】\n使用軟膝 (Soft Knee) 和較慢的 Release，讓壓縮動作非常平滑，避免吉他刷扣時出現忽大忽小的「抽吸感」(Pumping)。\n\n【建議調整】\n調整 Threshold，讓 Gain Reduction 維持在 -3dB 至 -5dB，讓吉他鋪底更穩定。\n\n【微調技巧】\n若覺得吉他聽起來這悶，可調慢 Attack 讓刷弦聲出來；若覺得延音太短，可向右增加 Release。",
        params: { threshold: -25, ratio: 4, attack: 20, release: 250, knee: 15, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -55, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Snare Snap (小鼓衝擊感)",
        explanation: "【特色】\n關鍵在於慢 Attack (35ms)！它允許小鼓敲擊瞬間的「啪」聲通過，隨後才介入壓低。這會人為地放大敲擊感 (Transient)，讓小鼓更兇猛。\n\n【建議調整】\n調整 Threshold，讓只有小鼓敲擊時才會觸發壓縮 (GR -3dB 到 -6dB)。\n\n【微調技巧】\n若覺得小鼓太刺耳，將 Attack 向左調快；若覺得小鼓不夠有力，試著將 Ratio 加大。",
        params: { threshold: -18, ratio: 5, attack: 35, release: 80, knee: 0, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick Drum Tight (大鼓緊實化)",
        explanation: "【特色】\n針對大鼓低頻。較短的 Release (60ms) 讓壓縮器隨著節奏快速復位，防止大鼓的低頻糊成一團，讓節奏聽起來更緊湊乾淨。\n\n【建議調整】\n調整 Threshold，讓每一次大鼓踩下去都有 -3dB 至 -6dB 的壓縮量。\n\n【微調技巧】\n若覺得大鼓太短促 (Clicky)，可稍微調慢 Release；若覺得低頻混濁，可調快 Release。",
        params: { threshold: -20, ratio: 6, attack: 40, release: 60, knee: 2, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Drum Bus Smash (鼓組極限壓縮)",
        explanation: "【特色】\n極端設定 (20:1 Ratio)！這將鼓組壓得粉碎，產生巨大的能量感與空間殘響。通常配合 Dry Gain 做平行壓縮使用。\n\n【建議調整】\n大膽調整 Threshold，讓 GR 超過 -10dB 甚至更多！\n\n【微調技巧】\n覺得太吵？慢慢增加 Dry Gain (原音混合) 把乾淨的鼓聲找回來，保留 Smash 的能量作為襯底。",
        params: { threshold: -30, ratio: 20, attack: 5, release: 120, knee: 5, lookahead: 0, makeupGain: 12, dryGain: -10, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Parallel Compression (平行壓縮)",
        explanation: "【特色】\n注意 Dry Gain！這個 Preset 混合了未壓縮的乾訊號 (0dB) 與被重度壓縮的濕訊號。這能在保留原始動態衝擊力的同時，大幅提升細節音量。\n\n【建議調整】\n主要調整 Threshold 來決定濕訊號的壓縮質感 (GR -10dB+)。\n\n【微調技巧】\n若想要更多衝擊力，增加 Dry Gain；若想要更多厚度與細節，增加 Makeup Gain (濕訊號)。",
        params: { threshold: -35, ratio: 12, attack: 0.5, release: 200, knee: 10, lookahead: 0, makeupGain: 0, dryGain: 0, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Mastering Glue (母帶黏合)",
        explanation: "【特色】\n母帶處理經典設定。低 Ratio (2:1) 和長 Attack/Release。目的不是改變音色，而是讓整首歌的所有樂器在動態上微幅「擁抱」在一起。\n\n【建議調整】\n非常微妙！調整 Threshold，讓指針只在最大聲時稍微動一點點 (-1dB 至 -2dB)。\n\n【微調技巧】\n若覺得音樂變平了，調慢 Attack；若覺得有些突兀的峰值，稍微調快 Attack。",
        params: { threshold: -10, ratio: 2, attack: 50, release: 300, knee: 12, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Brickwall Limiter (磚牆限制器)",
        explanation: "【特色】\n無限大的 Ratio (100:1) 加上 Lookahead。這是一道牆，保證聲音絕對不會超過 Threshold。通常放在訊號鏈最後防止破音。\n\n【建議調整】\n設定 Threshold 為你允許的最大音量 (Ceiling)。\n\n【微調技巧】\n若聽見破音 (Distortion)，表示壓太多了，請降低 Input 或提高 Threshold；Lookahead 可增加安全性但會增加延遲。",
        params: { threshold: -12, ratio: 100, attack: 0.1, release: 50, knee: 0, lookahead: 5, makeupGain: 12, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass Sustain (貝斯延音增強)",
        explanation: "【特色】\n長 Release (400ms) 是重點。它確保壓縮器在貝斯撥奏後持續壓制，當壓縮釋放時，會自然地帶起尾音，讓貝斯線條連綿不斷。\n\n【建議調整】\n調整 Threshold，讓 GR 保持穩定 (-3dB 至 -6dB)，不要讓指針歸零太快。\n\n【微調技巧】\n若貝斯變糊，調快 Release；若想要更有顆粒感，將 Attack 調慢。",
        params: { threshold: -25, ratio: 4, attack: 15, release: 400, knee: 6, lookahead: 0, makeupGain: 6, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
];

export const AUDIO_SOURCES = [
    // Acoustic Guitar
    { id: 'AG-01', name: 'AG-01', category: 'Acoustic Guitar (木結他)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/AG-01-MP3.mp3' },
    { id: 'AG-02', name: 'AG-02', category: 'Acoustic Guitar (木結他)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/AG-02-MP3.mp3' },

    // Bass
    { id: 'Bass-01', name: 'Bass-01', category: 'Bass (貝斯)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Bass-01-MP3.mp3' },
    { id: 'Bass-02', name: 'Bass-02', category: 'Bass (貝斯)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Bass-02-MP3.mp3' },
    { id: 'Bass-03', name: 'Bass-03', category: 'Bass (貝斯)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Bass-03-MP3.mp3' },
    { id: 'Bass-04', name: 'Bass-04', category: 'Bass (貝斯)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Bass-04-MP3.mp3' },
    { id: 'Bass-05', name: 'Bass-05', category: 'Bass (貝斯)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Bass-05-MP3.mp3' },

    // Cello
    { id: 'Cello', name: 'Cello', category: 'Cello (大提琴)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Cello-MP3.mp3' },

    // Drum Room
    { id: 'Drum room', name: 'Drum room', category: 'Drum Room (鼓室音)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Drum%20room-MP3.mp3' },

    // Electric Guitar
    { id: 'EG-01', name: 'EG-01', category: 'Electric Guitar (電結他)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/EG-01-MP3.mp3' },
    { id: 'EG-02', name: 'EG-02', category: 'Electric Guitar (電結他)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/EG-02-MP3.mp3' },
    { id: 'EG-03', name: 'EG-03', category: 'Electric Guitar (電結他)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/EG-03-MP3.mp3' },
    { id: 'EG-04', name: 'EG-04', category: 'Electric Guitar (電結他)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/EG-04-MP3.mp3' },

    // Kick
    { id: 'Kick-01', name: 'Kick-01', category: 'Kick (大鼓)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Kick-01-MP3.mp3' },
    { id: 'Kick-02', name: 'Kick-02', category: 'Kick (大鼓)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Kick-02-MP3.mp3' },
    { id: 'Kick-03', name: 'Kick-03', category: 'Kick (大鼓)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Kick-03-MP3.mp3' },

    // Lead Vocal
    { id: 'Lead-Vocal-01', name: 'Lead-Vocal-01', category: 'Lead Vocal (主唱)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Lead-Vocal-01-MP3.mp3' },
    { id: 'Lead-Vocal-02', name: 'Lead-Vocal-02', category: 'Lead Vocal (主唱)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Lead-Vocal-02-MP3.mp3' },
    { id: 'Lead-Vocal-03', name: 'Lead-Vocal-03', category: 'Lead Vocal (主唱)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Lead-Vocal-03-MP3.mp3' },
    { id: 'Lead-Vocal-04', name: 'Lead-Vocal-04', category: 'Lead Vocal (主唱)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Lead-Vocal-04-MP3.mp3' },
    { id: 'Lead-Vocal-05', name: 'Lead-Vocal-05', category: 'Lead Vocal (主唱)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Lead-Vocal-05-MP3.mp3' },
    { id: 'Lead-Vocal-06', name: 'Lead-Vocal-06', category: 'Lead Vocal (主唱)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Lead-Vocal-06-MP3.mp3' },

    // Organ
    { id: 'Organ', name: 'Organ', category: 'Organ (風琴)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Organ-MP3.mp3' },

    // Rhodes
    { id: 'Rhodes', name: 'Rhodes', category: 'Rhodes (羅德電鋼琴)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Rhodes-MP3.mp3' },

    // Snare
    { id: 'Snare-01', name: 'Snare-01', category: 'Snare (小鼓)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Snare-01-MP3.mp3' },
    { id: 'Snare-02', name: 'Snare-02', category: 'Snare (小鼓)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Snare-02-MP3.mp3' },
    { id: 'Snare-03', name: 'Snare-03', category: 'Snare (小鼓)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Snare-03-MP3.mp3' },

    // Synth
    { id: 'Synth', name: 'Synth', category: 'Synth (合成器)', url: 'https://onetrackstudiohk.b-cdn.net/comp-tool-playlist/Synth-MP3.mp3' },
];

export const TOOLTIPS = {
    // --- COMPRESSOR MODULE ---
    threshold: {
        title: "Threshold (門檻值)",
        desc: "決定壓縮器開始介入的音量基準線。",
        setting: "向左扭 (數值變小)：會抓到更多小音量的細節，紅色 GR 波形會向下延伸得更深、更頻繁。向右扭 (數值變大)：只有最大聲的峰值會被壓縮，紅色波形只會在音量最大時出現。",
        common: "目的：控制動態範圍。常用：設在比平均音量稍低處，讓 GR 保持在 -3dB 至 -6dB 之間最為安全自然。"
    },
    ratio: {
        title: "Ratio (壓縮比)",
        desc: "決定當音量超過門檻時，要將其「壓低」多少倍。",
        setting: "向右扭 (變大)：壓縮力道變強，聲音變扁平，紅色 GR 波形會下潛得更深。向左扭 (變小)：壓縮力道溫和，保留較多原始動態，紅色波形較淺。",
        common: "目的：決定聲音的「穩度」。常用：2:1~4:1 用於一般動態控制；10:1 以上用於限制 (Limiting) 確保不破音。"
    },
    attack: {
        title: "Attack (啟動時間)",
        desc: "決定聲音超過門檻後，壓縮器「花多久時間」才完全壓下來。",
        setting: "向左扭 (快)：立即壓縮，會吃掉聲音開頭的衝擊感 (Transient)，紅色 GR 波形呈現垂直下墜。向右扭 (慢)：保留聲音開頭的打擊感 (Punch)，隨後才壓低，紅色 GR 波形呈現圓滑斜坡。",
        common: "目的：控制衝擊力。常用：慢 Attack (10-30ms) 可保留鼓聲或彈撥樂器的打擊感；快 Attack (<1ms) 用於控制失控的峰值。"
    },
    release: {
        title: "Release (釋放時間)",
        desc: "決定當聲音低於門檻後，壓縮器「花多久時間」才停止運作。",
        setting: "向左扭 (快)：壓縮迅速結束，音量會快速彈回，聲音聽起來較響亮但可能有「抽吸感」(Pumping)，紅色 GR 波形會快速歸零。向右扭 (慢)：壓縮持續較久，聲音較平穩，紅色 GR 波形歸零得很慢。",
        common: "目的：控制節奏律動 (Groove)。常用：設為與歌曲拍子同步。太快會導致低頻失真，太慢會壓住下一個音符。"
    },
    knee: {
        title: "Knee (轉折/軟硬)",
        desc: "決定壓縮動作在門檻附近的「過渡平滑度」。",
        setting: "向左扭 (0/Hard)：一過門檻立即以全比例壓縮，紅色 GR 波形轉折尖銳。向右扭 (Soft)：在門檻附近慢慢增加壓縮比例，紅色 GR 波形轉折處圓潤。",
        common: "目的：調整透明度。常用：Hard Knee 用於精準限制；Soft Knee (10dB+) 用於讓壓縮聽起來不著痕跡、更自然。"
    },
    lookahead: {
        title: "Lookahead (預讀)",
        desc: "讓壓縮器「偷看」未來的訊號，以提早做出反應。",
        setting: "向右扭 (時間長)：壓縮器能在瞬態發生前就開始壓縮。觀察紅色 GR 波形，會發現它比白色波形的峰值「稍微提早」一點點開始下潛。",
        common: "目的：完美攔截極快的峰值 (Brickwall Limiting)。常用：2-5ms，主要用於母帶處理或防止數位失真 (Clipping)。"
    },

    // --- GATE MODULE ---
    gateThreshold: {
        title: "Gate Threshold (閘門門檻)",
        desc: "決定音量低於多少時要將聲音「靜音」或衰減。",
        setting: "向右扭 (數值變大)：標準變嚴格，更多聲音會被切掉（變靜音），紅色 GR 波形會頻繁地處於最底部。向左扭 (數值變小)：讓更多背景聲音通過。",
        common: "目的：去除背景底噪或串音 (Bleed)。常用：設定在「噪音」與「主要樂器聲」之間的音量值。"
    },
    gateRatio: {
        title: "Gate Ratio (衰減比例)",
        desc: "決定當聲音低於門檻時，要衰減得「多乾淨」。",
        setting: "向右扭 (大)：低於門檻的聲音會完全靜音。向左扭 (小)：低於門檻的聲音只是稍微變小聲（類似 Expander）。",
        common: "目的：決定背景是否完全消失。常用：鼓組串音通常設高 (6:1以上)；人聲或柔和樂器可設低 (2:1) 讓淡出更自然。"
    },
    gateAttack: {
        title: "Gate Attack (開啟時間)",
        desc: "當聲音超過門檻時，閘門打開（恢復聲音）的速度。",
        setting: "向左扭 (快)：聲音瞬間出現，保留敲擊頭。向右扭 (慢)：聲音會有淡入 (Fade-in) 效果，可能吃掉開頭。",
        common: "目的：確保樂器開頭完整。常用：通常極快 (<1ms) 以避免切掉鼓點或發音的瞬間。"
    },
    gateRelease: {
        title: "Gate Release (關閉時間)",
        desc: "當聲音低於門檻後，閘門「花多久時間」才完全關閉。",
        setting: "向左扭 (快)：聲音突然切斷，會有「卡、卡」的斷裂感。向右扭 (慢)：聲音自然淡出，紅色 GR 波形緩慢下降到底部。",
        common: "目的：保留樂器尾音 (Sustain)。常用：依據樂器自然殘響調整，通常 100ms-300ms 讓尾音聽起來不突兀。"
    },

    // --- OUTPUT MODULE ---
    makeup: {
        title: "Makeup Gain (音量補償)",
        desc: "手動增加輸出音量，以補償壓縮後損失的電平。",
        setting: "向右扭：整體波形（白色與藍色）變大。注意這不會改變紅色 GR 波形，因為這是發生在壓縮之後。",
        common: "目的：A/B 測試時保持音量一致。常用：看 GR 減少了多少 dB，就補回多少 dB (例如 GR 平均 -3dB，Makeup 就加 3dB)。"
    },
    dryGain: {
        title: "Dry Gain (原音混合)",
        desc: "將未經處理的原始訊號 (Dry) 混合進來，即「平行壓縮」。",
        setting: "向右扭：黃色波形（原始訊號）會疊加在畫面上。這能讓大音量的動態回歸，同時保留壓縮帶來的細節。",
        common: "目的：保留衝擊力同時增加厚度。常用：通常設在比濕訊號小一點的位置，用於鼓組或人聲增厚。"
    },
};

export const APP_VERSION = 'v0.8.1';