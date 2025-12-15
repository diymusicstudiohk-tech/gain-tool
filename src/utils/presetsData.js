
export const PRESETS_DATA = [
    // --- BASS (貝斯) ---
    {
        name: "Bass: 1. Transparent Leveling (透明平整)",
        category: "Bass",
        explanation: "【特色】\n溫和的設定，用於稍微控制貝斯動態，讓演奏更平穩但不改變音色。\n\n【建議調整】\n調整 Threshold 讓 GR 偶爾跳動 (-2dB 左右)。",
        params: { threshold: -20, ratio: 3, attack: 30, release: 200, knee: 10, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass: 2. Punchy Pick (撥片打擊感)",
        category: "Bass",
        explanation: "【特色】\n較慢的 Attack 讓撥片的觸弦聲通過，增強節奏感。\n\n【建議調整】\n若覺得太刺耳，加快 Attack；若不夠有力，加大 Ratio。",
        params: { threshold: -20, ratio: 4, attack: 40, release: 100, knee: 5, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass: 3. Thick Sustain (厚實延音)",
        category: "Bass",
        explanation: "【特色】\n快速 Release 配合中等 Ratio，提升貝斯尾音的持續力。\n\n【建議調整】\n小心 Release 不要太快導致失真。",
        params: { threshold: -25, ratio: 5, attack: 10, release: 80, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass: 4. Aggressive Rock (兇猛搖滾)",
        category: "Bass",
        explanation: "【特色】\n高壓縮比與快 Release，讓貝斯緊貼在混音前方，充滿侵略性。\n\n【建議調整】\n大膽降低 Threshold 換取能量。",
        params: { threshold: -28, ratio: 8, attack: 5, release: 50, knee: 2, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- ACOUSTIC GUITAR (木吉他) ---
    {
        name: "AG: 1. Natural Strum (自然刷扣)",
        category: "Acoustic Guitar",
        explanation: "【特色】\n非常輕微的壓縮，僅用於撫平過大的掃弦。\n\n【建議調整】\nGR 不應超過 -3dB。",
        params: { threshold: -18, ratio: 2.5, attack: 25, release: 300, knee: 15, lookahead: 0, makeupGain: 1, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "AG: 2. Picking Detail (指彈細節)",
        category: "Acoustic Guitar",
        explanation: "【特色】\n提升指彈時的微小細節音量。\n\n【建議調整】\n使用 Makeup Gain 補償音量。",
        params: { threshold: -24, ratio: 4, attack: 15, release: 200, knee: 10, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "AG: 3. Pop Backing (流行伴奏)",
        category: "Acoustic Guitar",
        explanation: "【特色】\n較重的壓縮，讓吉他穩定地鋪在人聲後方。\n\n【建議調整】\n調整 Threshold 直到吉他位置穩定。",
        params: { threshold: -28, ratio: 6, attack: 10, release: 150, knee: 5, lookahead: 0, makeupGain: 6, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- ELECTRIC GUITAR (電吉他) ---
    {
        name: "EG: 1. Clean Funky (清脆放克)",
        category: "Electric Guitar",
        explanation: "【特色】\n強調切分音的顆粒感，Attack 稍慢。\n\n【建議調整】\n讓 GR 在 -3 到 -6dB 之間跳動。",
        params: { threshold: -20, ratio: 4, attack: 30, release: 100, knee: 5, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "EG: 2. Drive Sustain (破音延音)",
        category: "Electric Guitar",
        explanation: "【特色】\n延長 Overdrive 吉他的持續音。\n\n【建議調整】\n不要壓太多，以免底噪過大。",
        params: { threshold: -25, ratio: 4, attack: 20, release: 400, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "EG: 3. Solo Lead (獨奏)",
        category: "Electric Guitar",
        explanation: "【特色】\n讓 Solo 線條清晰浮現。\n\n【建議調整】\n配合 Delay/Reverb 使用效果更佳。",
        params: { threshold: -22, ratio: 5, attack: 15, release: 250, knee: 5, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "EG: 4. Heavy Wall (音牆)",
        category: "Electric Guitar",
        explanation: "【特色】\n極端壓縮，製造厚實音牆。\n\n【建議調整】\n通常用於 Rhythm Guitar 疊錄。",
        params: { threshold: -30, ratio: 10, attack: 5, release: 100, knee: 2, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- KICK (大鼓) ---
    {
        name: "Kick: 1. Natural (自然大鼓)",
        category: "Kick",
        explanation: "【特色】\n保留大鼓原本的動態，只控制最大峰值。\n\n【建議調整】\nThreshold 不要設太低。",
        params: { threshold: -15, ratio: 4, attack: 30, release: 100, knee: 10, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick: 2. Punchy Tight (緊實有力)",
        category: "Kick",
        explanation: "【特色】\n慢 Attack 保留「咚」的衝擊，快 Release 讓聲音收緊。\n\n【建議調整】\n這是最常用的現代大鼓設定。",
        params: { threshold: -20, ratio: 6, attack: 40, release: 60, knee: 2, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -25, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick: 3. Fat Low-End (肥厚低頻)",
        category: "Kick",
        explanation: "【特色】\n釋放較慢，帶出更多低頻共振。\n\n【建議調整】\n注意不要與貝斯打架。",
        params: { threshold: -22, ratio: 5, attack: 25, release: 200, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick: 4. Clicky Metal (金屬嗒聲)",
        category: "Kick",
        explanation: "【特色】\n極度慢的 Attack 強調 Click 聲，重度壓縮。\n\n【建議調整】\nGR 可達 -10dB 以上。",
        params: { threshold: -26, ratio: 8, attack: 50, release: 50, knee: 0, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -20, gateRatio: 6, gateAttack: 1, gateRelease: 50 }
    },

    // --- SNARE (小鼓) ---
    {
        name: "Snare: 1. Natural Snap (自然響亮)",
        category: "Snare",
        explanation: "【特色】\n讓小鼓自然地融合在鼓組中，保留細節。\n\n【建議調整】\n輕微壓縮即可。",
        params: { threshold: -18, ratio: 3, attack: 25, release: 120, knee: 5, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Snare: 2. Fat Body (飽滿鼓身)",
        category: "Snare",
        explanation: "【特色】\n較快 Attack 削減一些高頻衝擊，突顯中低頻鼓身。\n\n【建議調整】\n若覺得太悶，調慢 Attack。",
        params: { threshold: -22, ratio: 5, attack: 10, release: 150, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -35, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Snare: 3. Smash (爆炸感)",
        category: "Snare",
        explanation: "【特色】\n極限壓縮，製造充滿空間感的爆炸聲音。\n\n【建議調整】\n配合 Reverb 使用效果驚人。",
        params: { threshold: -30, ratio: 12, attack: 20, release: 100, knee: 2, lookahead: 0, makeupGain: 10, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- OTHER DRUMS (其他鼓件) ---
    {
        name: "Drums: 1. Overhead Glue (Overhead黏合)",
        category: "Other Drums",
        explanation: "【特色】\n用於整個 Overhead 軌道，讓銅鈸與鼓組融合。\n\n【建議調整】\nRatio 不要太高。",
        params: { threshold: -20, ratio: 3, attack: 30, release: 250, knee: 10, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Drums: 2. Tom Sustain (通鼓延音)",
        category: "Other Drums",
        explanation: "【特色】\n增加 Tom 的共鳴長度。\n\n【建議調整】\n配合 Gate 使用，只在打擊時開啟。",
        params: { threshold: -24, ratio: 5, attack: 15, release: 300, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -45, gateRatio: 6, gateAttack: 2, gateRelease: 200 }
    },
    {
        name: "Drums: 3. Room Smash (鼓室爆裂)",
        category: "Other Drums",
        explanation: "【特色】\n將 Room Mic 壓扁，製造巨大的空間殘響。\n\n【建議調整】\n通常混合在鼓組中作為氣氛。",
        params: { threshold: -35, ratio: 20, attack: 5, release: 150, knee: 0, lookahead: 0, makeupGain: 15, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- KEYS (鍵盤) ---
    {
        name: "Keys: 1. Piano Natural (自然鋼琴)",
        category: "Keys",
        explanation: "【特色】\n幾乎聽不出的壓縮，僅用於控制最大音量。\n\n【建議調整】\n適合古典或爵士鋼琴。",
        params: { threshold: -15, ratio: 2, attack: 30, release: 200, knee: 10, lookahead: 0, makeupGain: 1, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Keys: 2. Piano Pop (流行鋼琴)",
        category: "Keys",
        explanation: "【特色】\n讓鋼琴在混音中更靠前，但仍保留動態。\n\n【建議調整】\n調整 Threshold 讓每個音符都清晰。",
        params: { threshold: -22, ratio: 4, attack: 20, release: 150, knee: 5, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Keys: 3. Synth Glue (合成器黏合)",
        category: "Keys",
        explanation: "【特色】\n將多層合成器音色融合在一起。\n\n【建議調整】\n長 Attack 和 Release。",
        params: { threshold: -20, ratio: 3, attack: 50, release: 300, knee: 10, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Keys: 4. Organ Percussive (風琴打擊)",
        category: "Keys",
        explanation: "【特色】\n強調風琴的 Key Click 聲。\n\n【建議調整】\n可以嘗試更快的 Attack。",
        params: { threshold: -20, ratio: 4, attack: 15, release: 100, knee: 5, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- FEMALE VOCAL (女聲) ---
    {
        name: "Fem Vox: 1. Gentle Ballad (溫柔抒情)",
        category: "Female Vocal",
        explanation: "【特色】\n透明、輕柔，保留氣音與情感。\n\n【建議調整】\nGR 不超過 -3dB。",
        params: { threshold: -20, ratio: 2.5, attack: 15, release: 250, knee: 15, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -55, gateRatio: 3, gateAttack: 5, gateRelease: 200 }
    },
    {
        name: "Fem Vox: 2. Modern Pop (現代流行)",
        category: "Female Vocal",
        explanation: "【特色】\n明亮、靠前，動態穩定。\n\n【建議調整】\n讓聲音始終在聽眾耳邊。",
        params: { threshold: -25, ratio: 5, attack: 10, release: 150, knee: 5, lookahead: 2, makeupGain: 6, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 150 }
    },
    {
        name: "Fem Vox: 3. Airy (空氣感)",
        category: "Female Vocal",
        explanation: "【特色】\n極軟膝 (Soft Knee) 設定，強調高頻細節。\n\n【建議調整】\n配合 EQ 增加高頻。",
        params: { threshold: -22, ratio: 3, attack: 20, release: 300, knee: 20, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Fem Vox: 4. Power Belt (爆發力)",
        category: "Female Vocal",
        explanation: "【特色】\n控制高音爆發時的音量，防止刺耳。\n\n【建議調整】\n較高的 Ratio 用於控制動態範圍。",
        params: { threshold: -28, ratio: 8, attack: 5, release: 100, knee: 5, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- MALE VOCAL (男聲) ---
    {
        name: "Male Vox: 1. Natural (自然對話)",
        category: "Male Vocal",
        explanation: "【特色】\n像在說話一樣自然，無明顯壓縮痕跡。\n\n【建議調整】\n低 Ratio。",
        params: { threshold: -20, ratio: 2, attack: 20, release: 200, knee: 10, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -55, gateRatio: 3, gateAttack: 5, gateRelease: 200 }
    },
    {
        name: "Male Vox: 2. Rap Aggressive (激進饒舌)",
        category: "Male Vocal",
        explanation: "【特色】\n像磚牆一樣的控制，字字清晰有力。\n\n【建議調整】\n快 Attack 和 Release。",
        params: { threshold: -28, ratio: 10, attack: 2, release: 60, knee: 2, lookahead: 2, makeupGain: 10, dryGain: -60, gateThreshold: -40, gateRatio: 5, gateAttack: 1, gateRelease: 80 }
    },
    {
        name: "Male Vox: 3. Warm Vintage (溫暖復古)",
        category: "Male Vocal",
        explanation: "【特色】\n模擬老式管機壓縮，反應較慢。\n\n【建議調整】\n放慢 Attack 讓聲音更飽暖。",
        params: { threshold: -24, ratio: 4, attack: 40, release: 300, knee: 10, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Male Vox: 4. Rock Grit (搖滾顆粒)",
        category: "Male Vocal",
        explanation: "【特色】\n中等 Attack 保留喉音顆粒感。\n\n【建議調整】\n讓副歌時推到極限。",
        params: { threshold: -26, ratio: 6, attack: 15, release: 100, knee: 5, lookahead: 0, makeupGain: 7, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- OTHER (其他) ---
    {
        name: "Other: 1. String Smoother (弦樂平順)",
        category: "Other",
        explanation: "【特色】\n非常慢的 Attack 和 Release，維持長線條。\n\n【建議調整】\n避免任何突然的音量跳動。",
        params: { threshold: -25, ratio: 3, attack: 50, release: 500, knee: 15, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Other: 2. Brass Punch (銅管衝擊)",
        category: "Other",
        explanation: "【特色】\n保留銅管刺耳的開頭，隨後控制。\n\n【建議調整】\nAttack 不要太快。",
        params: { threshold: -20, ratio: 5, attack: 30, release: 150, knee: 5, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Other: 3. General Limiter (通用限制)",
        category: "Other",
        explanation: "【特色】\n防止任何聲音過載。\n\n【建議調整】\n掛在 Master 或 Bus 上。",
        params: { threshold: -10, ratio: 100, attack: 1, release: 50, knee: 0, lookahead: 5, makeupGain: 0, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    }
];
