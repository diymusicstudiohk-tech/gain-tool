
export const PRESETS_DATA = [
    // --- BASS (貝斯) ---
    {
        name: "Bass: 1. Transparent Leveling (透明平整)",
        category: "Bass",
        explanation: "【特色】\n溫和的設定，用於稍微控制貝斯動態，讓演奏更平穩但不改變音色。\n\n【建議調整】\n調整 Threshold 讓 GR 偶爾跳動 (-2dB 左右)。\n\n【音色變化】\n若想要更緊實的顆粒感，可稍微調快 Release；若想要更平滑，調慢 Release。",
        params: { threshold: -20, ratio: 3, attack: 30, release: 200, knee: 10, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass: 2. Punchy Pick (撥片打擊感)",
        category: "Bass",
        explanation: "【特色】\n較慢的 Attack 讓撥片的觸弦聲通過，增強節奏感。\n\n【建議調整】\n調整 Threshold 讓 GR 達到 -3dB 至 -5dB。\n\n【音色變化】\n若覺得太刺耳，加快 Attack；若不夠有力，加大 Ratio 或調慢 Attack。",
        params: { threshold: -20, ratio: 4, attack: 40, release: 100, knee: 5, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass: 3. Thick Sustain (厚實延音)",
        category: "Bass",
        explanation: "【特色】\n快速 Release 配合中等 Ratio，提升貝斯尾音的持續力。\n\n【建議調整】\n調整 Threshold 讓 GR 保持在 -3dB 左右。\n\n【音色變化】\n小心 Release 不要太快導致失真，若有失真請調慢 Release。",
        params: { threshold: -25, ratio: 5, attack: 10, release: 80, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Bass: 4. Aggressive Rock (兇猛搖滾)",
        category: "Bass",
        explanation: "【特色】\n高壓縮比與快 Release，讓貝斯緊貼在混音前方，充滿侵略性。\n\n【建議調整】\n大膽降低 Threshold 讓 GR 超過 -6dB 甚至更多。\n\n【音色變化】\n調快 Attack 可以讓聲音更髒、更壓扁；調慢 Release 則會減少侵略性。",
        params: { threshold: -28, ratio: 8, attack: 5, release: 50, knee: 2, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- ACOUSTIC GUITAR (木吉他) ---
    {
        name: "AG: 1. Natural Strum (自然刷扣)",
        category: "Acoustic Guitar",
        explanation: "【特色】\n非常輕微的壓縮，僅用於撫平過大的掃弦。\n\n【建議調整】\nGR 不應超過 -3dB。\n\n【音色變化】\n若刷扣聲太尖銳，可嘗試加快 Attack。",
        params: { threshold: -18, ratio: 2.5, attack: 25, release: 300, knee: 15, lookahead: 0, makeupGain: 1, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "AG: 2. Picking Detail (指彈細節)",
        category: "Acoustic Guitar",
        explanation: "【特色】\n提升指彈時的微小細節音量。\n\n【建議調整】\n調整 Threshold 讓 GR 約 -3dB，並使用 Makeup Gain 補償音量。\n\n【音色變化】\n調快 Release 可以讓細節更突出，但要注意呼吸感是否自然。",
        params: { threshold: -24, ratio: 4, attack: 15, release: 200, knee: 10, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "AG: 3. Pop Backing (流行伴奏)",
        category: "Acoustic Guitar",
        explanation: "【特色】\n較重的壓縮，讓吉他穩定地鋪在人聲後方。\n\n【建議調整】\n調整 Threshold 直到吉他位置穩定，GR 可達 -6dB。\n\n【音色變化】\n若吉他聽起來太後面，可放慢 Attack 讓它跳出來一點。",
        params: { threshold: -28, ratio: 6, attack: 10, release: 150, knee: 5, lookahead: 0, makeupGain: 6, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- ELECTRIC GUITAR (電吉他) ---
    {
        name: "EG: 1. Clean Funky (清脆放克)",
        category: "Electric Guitar",
        explanation: "【特色】\n強調切分音的顆粒感，Attack 稍慢。\n\n【建議調整】\n讓 GR 在 -3 到 -6dB 之間跳動。\n\n【音色變化】\n調慢 Attack 會讓「切」的聲音更脆；調快 Attack 則會更溫和。",
        params: { threshold: -20, ratio: 4, attack: 30, release: 100, knee: 5, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "EG: 2. Drive Sustain (破音延音)",
        category: "Electric Guitar",
        explanation: "【特色】\n延長 Overdrive 吉他的持續音。\n\n【建議調整】\n不要壓太多，GR 約 -3dB 即可，以免底噪過大。\n\n【音色變化】\n慢 Release 有助於延音，但太慢會讓聲音失去活力。",
        params: { threshold: -25, ratio: 4, attack: 20, release: 400, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "EG: 3. Solo Lead (獨奏)",
        category: "Electric Guitar",
        explanation: "【特色】\n讓 Solo 線條清晰浮現。\n\n【建議調整】\n調整 Threshold 讓 GR 在 -3dB 至 -6dB。\n\n【音色變化】\n配合 Delay/Reverb 時，可調慢 Release 避免尾音被切斷。",
        params: { threshold: -22, ratio: 5, attack: 15, release: 250, knee: 5, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "EG: 4. Heavy Wall (音牆)",
        category: "Electric Guitar",
        explanation: "【特色】\n極端壓縮，製造厚實音牆。\n\n【建議調整】\nGR 可達 -10dB 以上，用於 Rhythm Guitar 疊錄。\n\n【音色變化】\n快 Attack 和 快 Release 可製造出一整面牆的聲音效果。",
        params: { threshold: -30, ratio: 10, attack: 5, release: 100, knee: 2, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- KICK (大鼓) ---
    {
        name: "Kick: 1. Natural (自然大鼓)",
        category: "Kick",
        explanation: "【特色】\n保留大鼓原本的動態，只控制最大峰值。\n\n【建議調整】\nThreshold 不要設太低，GR 僅在最大聲時出現 (-1~-3dB)。\n\n【音色變化】\nAttack 保持在 30ms 左右以保留咚聲。",
        params: { threshold: -15, ratio: 4, attack: 30, release: 100, knee: 10, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick: 2. Punchy Tight (緊實有力)",
        category: "Kick",
        explanation: "【特色】\n慢 Attack 保留「咚」的衝擊，快 Release 讓聲音收緊。\n\n【建議調整】\n這是最常用的現代大鼓設定，GR 可控制在 -3dB 至 -6dB。\n\n【音色變化】\n想更衝：調慢 Attack；想更緊：調快 Release。",
        params: { threshold: -20, ratio: 6, attack: 40, release: 60, knee: 2, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -25, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick: 3. Fat Low-End (肥厚低頻)",
        category: "Kick",
        explanation: "【特色】\n釋放較慢，帶出更多低頻共振。\n\n【建議調整】\n注意 GR 不要一直壓著不放，需隨節奏呼吸。\n\n【音色變化】\nRelease 太慢會讓大鼓變得混濁，需仔細微調。",
        params: { threshold: -22, ratio: 5, attack: 25, release: 200, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Kick: 4. Clicky Metal (金屬嗒聲)",
        category: "Kick",
        explanation: "【特色】\n極度慢的 Attack 強調 Click 聲，重度壓縮。\n\n【建議調整】\nGR 可達 -10dB 以上。\n\n【音色變化】\n若 Click 聲太過分，可稍微加快 Attack。",
        params: { threshold: -26, ratio: 8, attack: 50, release: 50, knee: 0, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -20, gateRatio: 6, gateAttack: 1, gateRelease: 50 }
    },

    // --- SNARE (小鼓) ---
    {
        name: "Snare: 1. Natural Snap (自然響亮)",
        category: "Snare",
        explanation: "【特色】\n讓小鼓自然地融合在鼓組中，保留細節。\n\n【建議調整】\n輕微壓縮，GR 約 -2dB 至 -4dB。\n\n【音色變化】\nAttack 不宜太快，以免吃掉小鼓的響度。",
        params: { threshold: -18, ratio: 3, attack: 25, release: 120, knee: 5, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -40, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Snare: 2. Fat Body (飽滿鼓身)",
        category: "Snare",
        explanation: "【特色】\n較快 Attack 削減一些高頻衝擊，突顯中低頻鼓身。\n\n【建議調整】\nGR 可控制在 -4dB 至 -6dB。\n\n【音色變化】\n若覺得太悶，調慢 Attack；若想要更厚實，保持快 Attack。",
        params: { threshold: -22, ratio: 5, attack: 10, release: 150, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -35, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Snare: 3. Smash (爆炸感)",
        category: "Snare",
        explanation: "【特色】\n極限壓縮，製造充滿空間感的爆炸聲音。\n\n【建議調整】\nGR 可達 -10dB 以上，配合 Reverb 使用效果驚人。\n\n【音色變化】\n快 Release 可增加激動感，適合慢歌或特效。",
        params: { threshold: -30, ratio: 12, attack: 20, release: 100, knee: 2, lookahead: 0, makeupGain: 10, dryGain: -60, gateThreshold: -30, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- OTHER DRUMS (其他鼓件) ---
    {
        name: "Drums: 1. Overhead Glue (Overhead黏合)",
        category: "Other Drums",
        explanation: "【特色】\n用於整個 Overhead 軌道，讓銅鈸與鼓組融合。\n\n【建議調整】\nGR 輕微控制在 -2dB 至 -3dB。\n\n【音色變化】\nRelease 需配合歌曲速度，避免銅鈸聲忽大忽小 (Pumping)。",
        params: { threshold: -20, ratio: 3, attack: 30, release: 250, knee: 10, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Drums: 2. Tom Sustain (通鼓延音)",
        category: "Other Drums",
        explanation: "【特色】\n增加 Tom 的共鳴長度。\n\n【建議調整】\n配合 Gate 使用，只在打擊時開啟。\n\n【音色變化】\n調慢 Release 可讓 Tom 的尾音更長、更震憾。",
        params: { threshold: -24, ratio: 5, attack: 15, release: 300, knee: 5, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -45, gateRatio: 6, gateAttack: 2, gateRelease: 200 }
    },
    {
        name: "Drums: 3. Room Smash (鼓室爆裂)",
        category: "Other Drums",
        explanation: "【特色】\n將 Room Mic 壓扁，製造巨大的空間殘響。\n\n【建議調整】\n重壓！GR 超過 -15dB 都不為過。\n\n【音色變化】\nAttack 越快，聲音越遠；Release 越快，空間越激動。",
        params: { threshold: -35, ratio: 20, attack: 5, release: 150, knee: 0, lookahead: 0, makeupGain: 15, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- KEYS (鍵盤) ---
    {
        name: "Keys: 1. Piano Natural (自然鋼琴)",
        category: "Keys",
        explanation: "【特色】\n幾乎聽不出的壓縮，僅用於控制最大音量。\n\n【建議調整】\nThreshold 設在最高峰值處，GR 偶爾 -1dB。\n\n【音色變化】\n此設定不應改變鋼琴音色，若變悶請檢查 Attack 是否太快。",
        params: { threshold: -15, ratio: 2, attack: 30, release: 200, knee: 10, lookahead: 0, makeupGain: 1, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Keys: 2. Piano Pop (流行鋼琴)",
        category: "Keys",
        explanation: "【特色】\n讓鋼琴在混音中更靠前，但仍保留動態。\n\n【建議調整】\n調整 Threshold 讓 GR 約 -3dB 至 -5dB。\n\n【音色變化】\n可稍微加快 Attack 讓鋼琴更穩，但不要吃掉觸鍵聲。",
        params: { threshold: -22, ratio: 4, attack: 20, release: 150, knee: 5, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Keys: 3. Synth Glue (合成器黏合)",
        category: "Keys",
        explanation: "【特色】\n將多層合成器音色融合在一起。\n\n【建議調整】\nGR 保持穩定，約 -3dB。\n\n【音色變化】\n長 Attack 和 Release 確保合成器的 Pad 音色不被切斷。",
        params: { threshold: -20, ratio: 3, attack: 50, release: 300, knee: 10, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Keys: 4. Organ Percussive (風琴打擊)",
        category: "Keys",
        explanation: "【特色】\n強調風琴的 Key Click 聲。\n\n【建議調整】\nGR 可達 -4dB 至 -6dB。\n\n【音色變化】\n可以嘗試更快的 Attack 來突顯 Click 聲的打擊感。",
        params: { threshold: -20, ratio: 4, attack: 15, release: 100, knee: 5, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- FEMALE VOCAL (女聲) ---
    {
        name: "Fem Vox: 1. Gentle Ballad (溫柔抒情)",
        category: "Female Vocal",
        explanation: "【特色】\n透明、輕柔，保留氣音與情感。\n\n【建議調整】\nGR 不超過 -3dB。\n\n【音色變化】\nRelease 需慢一點以適應慢歌的長音。",
        params: { threshold: -20, ratio: 2.5, attack: 15, release: 250, knee: 15, lookahead: 0, makeupGain: 3, dryGain: -60, gateThreshold: -55, gateRatio: 3, gateAttack: 5, gateRelease: 200 }
    },
    {
        name: "Fem Vox: 2. Modern Pop (現代流行)",
        category: "Female Vocal",
        explanation: "【特色】\n明亮、靠前，動態穩定。\n\n【建議調整】\n讓聲音始終在聽眾耳邊，GR 可達 -6dB。\n\n【音色變化】\n此設定 Attack 較快，若覺得氣音變少，可稍微調慢 Attack。",
        params: { threshold: -25, ratio: 5, attack: 10, release: 150, knee: 5, lookahead: 2, makeupGain: 6, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 150 }
    },
    {
        name: "Fem Vox: 3. Airy (空氣感)",
        category: "Female Vocal",
        explanation: "【特色】\n極軟膝 (Soft Knee) 設定，強調高頻細節。\n\n【建議調整】\nGR 約 -3dB，配合 EQ 增加高頻。\n\n【音色變化】\nRelease 極慢，保持聲音的絲滑感。",
        params: { threshold: -22, ratio: 3, attack: 20, release: 300, knee: 20, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Fem Vox: 4. Power Belt (爆發力)",
        category: "Female Vocal",
        explanation: "【特色】\n控制高音爆發時的音量，防止刺耳。\n\n【建議調整】\nThreshold 需設在爆發音量處，GR 在高音時可達 -8dB。\n\n【音色變化】\n快 Attack 確保瞬間壓住大音量，避免爆音。",
        params: { threshold: -28, ratio: 8, attack: 5, release: 100, knee: 5, lookahead: 0, makeupGain: 8, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- MALE VOCAL (男聲) ---
    {
        name: "Male Vox: 1. Natural (自然對話)",
        category: "Male Vocal",
        explanation: "【特色】\n像在說話一樣自然，無明顯壓縮痕跡。\n\n【建議調整】\n低 Ratio，GR 僅 -1dB 至 -2dB。\n\n【音色變化】\nAttack 保持中等 (20ms) 以保留自然唇齒音。",
        params: { threshold: -20, ratio: 2, attack: 20, release: 200, knee: 10, lookahead: 0, makeupGain: 2, dryGain: -60, gateThreshold: -55, gateRatio: 3, gateAttack: 5, gateRelease: 200 }
    },
    {
        name: "Male Vox: 2. Rap Aggressive (激進饒舌)",
        category: "Male Vocal",
        explanation: "【特色】\n像磚牆一樣的控制，字字清晰有力。\n\n【建議調整】\nGR 可達 -6dB 至 -10dB，確保每個字音量一致。\n\n【音色變化】\n極快 Attack 和 Release，確保壓縮器能跟上快速的歌詞。",
        params: { threshold: -28, ratio: 10, attack: 2, release: 60, knee: 2, lookahead: 2, makeupGain: 10, dryGain: -60, gateThreshold: -40, gateRatio: 5, gateAttack: 1, gateRelease: 80 }
    },
    {
        name: "Male Vox: 3. Warm Vintage (溫暖復古)",
        category: "Male Vocal",
        explanation: "【特色】\n模擬老式管機壓縮，反應較慢。\n\n【建議調整】\nGR 溫和地在 -3dB 至 -5dB。\n\n【音色變化】\n放慢 Attack (40ms+) 讓聲音聽起來更飽暖、更寬。",
        params: { threshold: -24, ratio: 4, attack: 40, release: 300, knee: 10, lookahead: 0, makeupGain: 5, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Male Vox: 4. Rock Grit (搖滾顆粒)",
        category: "Male Vocal",
        explanation: "【特色】\n中等 Attack 保留喉音顆粒感。\n\n【建議調整】\n讓副歌時推到極限，GR 可超過 -6dB。\n\n【音色變化】\n若需要更多嘶吼感，可嘗試調慢 Attack 並加大 Input/Makeup。",
        params: { threshold: -26, ratio: 6, attack: 15, release: 100, knee: 5, lookahead: 0, makeupGain: 7, dryGain: -60, gateThreshold: -45, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },

    // --- OTHER (其他) ---
    {
        name: "Other: 1. String Smoother (弦樂平順)",
        category: "Other",
        explanation: "【特色】\n非常慢的 Attack 和 Release，維持長線條。\n\n【建議調整】\n避免任何突然的音量跳動，GR 需非常平穩。\n\n【音色變化】\nRelease 必須足夠長 (500ms+)，否則會破壞弦樂的連貫性。",
        params: { threshold: -25, ratio: 3, attack: 50, release: 500, knee: 15, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Other: 2. Brass Punch (銅管衝擊)",
        category: "Other",
        explanation: "【特色】\n保留銅管刺耳的開頭，隨後控制。\n\n【建議調整】\nGR -3dB 至 -6dB。\n\n【音色變化】\nAttack 不要太快，否則銅管會失去「叭」的衝擊力變等「嗚」聲。",
        params: { threshold: -20, ratio: 5, attack: 30, release: 150, knee: 5, lookahead: 0, makeupGain: 4, dryGain: -60, gateThreshold: -50, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    },
    {
        name: "Other: 3. General Limiter (通用限制)",
        category: "Other",
        explanation: "【特色】\n防止任何聲音過載。\n\n【建議調整】\n掛在 Master 或 Bus 上，確保 Output 不亮紅燈。\n\n【音色變化】\n這是功能性工具，不應對音色有太大改變，除非壓得極深。",
        params: { threshold: -10, ratio: 100, attack: 1, release: 50, knee: 0, lookahead: 5, makeupGain: 0, dryGain: -60, gateThreshold: -60, gateRatio: 4, gateAttack: 2, gateRelease: 100 }
    }
];
