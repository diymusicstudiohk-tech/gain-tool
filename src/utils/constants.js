import { MicVocal, Zap, Disc, AudioWaveform } from 'lucide-react';

export const PRESETS_DATA = [
    {
        name: "Default (初始設定)",
        explanation: "這是壓縮器的初始狀態。Threshold 為 0dB，Ratio 為 4:1，不會對聲音產生任何壓縮。適合用來聆聽原始訊號，或作為從零開始調整的起點。",
        params: { threshold: 0, ratio: 4, attack: 15, release: 150, knee: 0, lookahead: 0, makeupGain: 0, dryGain: -60, gateThreshold: -88, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Subtle Vocal Control (輕微人聲控制)",
        explanation: "溫和的壓縮設定。低 Ratio (2.5:1) 配合較慢的 Attack，旨在輕輕撫平人聲的動態，保留自然的呼吸感，不會讓聽眾察覺到明顯的壓縮痕跡。",
        params: { threshold: -20, ratio: 2.5, attack: 10, release: 200, knee: 5, lookahead: 2, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Aggressive Rap Vocal (激進饒舌人聲)",
        explanation: "為了讓饒舌人聲在擁擠的混音中突圍，使用了高 Ratio (8:1) 和極快的 Attack。這會壓平所有動態，讓每一個字都像子彈一樣清晰有力。",
        params: { threshold: -28, ratio: 8, attack: 2, release: 80, knee: 2, lookahead: 5, makeupGain: 8, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Vocal Bus Glue (人聲總線黏合)",
        explanation: "當多軌人聲混合時，使用中等 Attack (30ms) 讓瞬態通過，然後用 Release 將尾韻拉起。這能讓合聲與主唱聽起來像是在同一個空間演唱，產生「黏合」感。",
        params: { threshold: -24, ratio: 3, attack: 30, release: 100, knee: 10, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Acoustic Guitar Leveler (木吉他平整化)",
        explanation: "木吉他掃弦時動態差異很大。這裡使用軟膝 (Soft Knee) 和較慢的 Release，讓壓縮動作非常平滑，避免吉他聲音出現「抽吸感」(Pumping)，保持穩定的延音。",
        params: { threshold: -25, ratio: 4, attack: 20, release: 250, knee: 15, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -55, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Snare Snap (小鼓衝擊感)",
        explanation: "慢 Attack (35ms) 是關鍵！它允許小鼓敲擊瞬間的「啪」聲通過，然後壓縮器才介入壓低後續聲音。這會人為地放大敲擊感 (Transient)，讓小鼓更兇猛。",
        params: { threshold: -18, ratio: 5, attack: 35, release: 80, knee: 0, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick Drum Tight (大鼓緊實化)",
        explanation: "針對大鼓，我們需要控制其低頻尾音。較短的 Release (60ms) 讓壓縮器隨著節奏快速復位，防止大鼓的低頻糊成一團，讓節奏聽起來更緊湊。",
        params: { threshold: -20, ratio: 6, attack: 40, release: 60, knee: 2, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Drum Bus Smash (鼓組極限壓縮)",
        explanation: "極端設定 (20:1 Ratio)。這通常用於 Parallel Compression。它將鼓組壓得粉碎，產生巨大的能量感與空間殘響，然後你可以稍微混合一點進去增加厚度。",
        params: { threshold: -30, ratio: 20, attack: 5, release: 120, knee: 5, lookahead: 0, makeupGain: 12, dryGain: -10, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Parallel Compression (平行壓縮)",
        explanation: "注意看 Dry Gain！這個 Preset 混合了未壓縮的乾訊號 (0dB) 與被重度壓縮的濕訊號。這能在保留原始動態衝擊力的同時，大幅提升細節音量。",
        params: { threshold: -35, ratio: 12, attack: 0.5, release: 200, knee: 10, lookahead: 0, makeupGain: 0, dryGain: 0, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Mastering Glue (母帶黏合)",
        explanation: "母帶處理的經典設定。低 Ratio (2:1) 和長 Attack/Release。目的不是改變音色，而是讓整首歌的所有樂器在動態上微幅「擁抱」在一起，增加整體感。",
        params: { threshold: -10, ratio: 2, attack: 50, release: 300, knee: 12, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Brickwall Limiter (磚牆限制器)",
        explanation: "無限大的 Ratio (100:1) 加上 Lookahead。這是一道牆，保證聲音絕對不會超過 Threshold。通常放在訊號鏈的最後，用來最大化音量並防止破音。",
        params: { threshold: -12, ratio: 100, attack: 0.1, release: 50, knee: 0, lookahead: 5, makeupGain: 12, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass Sustain (貝斯延音增強)",
        explanation: "貝斯需要穩定的低頻地基。長 Release (400ms) 確保壓縮器在貝斯撥奏後持續壓制，當壓縮釋放時，會自然地帶起尾音，讓貝斯線條連綿不斷。",
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
    threshold: { title: "Threshold (門檻值)", desc: "決定壓縮器何時開始工作。", setting: "數值越低，壓縮越多。", visual: "GR 曲線凹陷點。", common: "Vocal: -20dB" },
    ratio: { title: "Ratio (壓縮比)", desc: "決定壓縮強度。", setting: "往右越強。", visual: "GR 深度。", common: "Vocal: 2:1-4:1" },
    attack: { title: "Attack (啟動)", desc: "反應速度。", setting: "往左快，往右慢(保留Punch)。", visual: "下陷斜率。", common: "Fast: Peak control" },
    release: { title: "Release (釋放)", desc: "回復速度。", setting: "往左快(響)，往右慢(穩)。", visual: "回升斜率。", common: "Vocal: 100ms+" },
    knee: { title: "Knee (轉折)", desc: "觸發平滑度。", setting: "往右越軟。", visual: "轉折圓滑度。", common: "Soft: 自然" },
    lookahead: { title: "Lookahead (預讀)", desc: "提前反應。", setting: "防止瞬態過大。", visual: "GR 提前發生。", common: "Limiter: 2ms+" },
    makeup: { title: "Makeup Gain", desc: "音量補償。", setting: "補回被壓小的音量。", visual: "藍色波形變大。", common: "+2~6dB" },
    dryGain: { title: "Dry Gain", desc: "原始訊號混合。", setting: "平行壓縮用。", visual: "黃色波形。", common: "Parallel: -10dB" },
    gateThreshold: { title: "Gate Thresh", desc: "噪音門檻。", setting: "低於此音量靜音。", visual: "紅色底部。", common: "-60dB" },
    gateRatio: { title: "Gate Ratio", desc: "衰減強度。", setting: "越大越乾淨。", visual: "切除深度。", common: "4:1" },
    gateAttack: { title: "Gate Attack", desc: "開啟速度。", setting: "通常極快。", visual: "開頭完整度。", common: "<1ms" },
};