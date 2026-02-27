
export const PRESETS_DATA = [
    // --- GENERAL (通用) ---
    {
        name: "General: 1. Gentle Leveling (溫和平整)",
        category: "General",
        params: { threshold: -18, attack: 20, release: 200, lookahead: 0, makeupGain: 0, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "General: 2. All-Purpose Glue (萬用黏合)",
        category: "General",
        params: { threshold: -22, attack: 15, release: 150, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "General: 3. Punch Enhancer (增強衝擊)",
        category: "General",
        params: { threshold: -20, attack: 35, release: 120, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "General: 4. Heavy Control (重度控制)",
        category: "General",
        params: { threshold: -26, attack: 8, release: 80, lookahead: 0, makeupGain: 6, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "General: 5. Parallel Thickener (平行增厚)",
        category: "General",
        params: { threshold: -30, attack: 5, release: 100, lookahead: 0, makeupGain: 8, dryGain: -12, clipDrive: 1.0 }
    },

    // --- BASS (貝斯) ---
    {
        name: "Bass: 1. Transparent Leveling (透明平整)",
        category: "Bass",
        params: { threshold: -20, attack: 30, release: 200, lookahead: 0, makeupGain: 2, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Bass: 2. Punchy Pick (撥片打擊感)",
        category: "Bass",
        params: { threshold: -20, attack: 40, release: 100, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Bass: 3. Thick Sustain (厚實延音)",
        category: "Bass",
        params: { threshold: -25, attack: 10, release: 80, lookahead: 0, makeupGain: 5, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Bass: 4. Aggressive Rock (兇猛搖滾)",
        category: "Bass",
        params: { threshold: -28, attack: 5, release: 50, lookahead: 0, makeupGain: 8, dryGain: -200, clipDrive: 1.0 }
    },

    // --- ACOUSTIC GUITAR (木吉他) ---
    {
        name: "AG: 1. Natural Strum (自然刷扣)",
        category: "Acoustic Guitar",
        params: { threshold: -18, attack: 25, release: 300, lookahead: 0, makeupGain: 1, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "AG: 2. Picking Detail (指彈細節)",
        category: "Acoustic Guitar",
        params: { threshold: -24, attack: 15, release: 200, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "AG: 3. Pop Backing (流行伴奏)",
        category: "Acoustic Guitar",
        params: { threshold: -28, attack: 10, release: 150, lookahead: 0, makeupGain: 6, dryGain: -200, clipDrive: 1.0 }
    },

    // --- ELECTRIC GUITAR (電吉他) ---
    {
        name: "EG: 1. Clean Funky (清脆放克)",
        category: "Electric Guitar",
        params: { threshold: -20, attack: 30, release: 100, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "EG: 2. Drive Sustain (破音延音)",
        category: "Electric Guitar",
        params: { threshold: -25, attack: 20, release: 400, lookahead: 0, makeupGain: 5, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "EG: 3. Solo Lead (獨奏)",
        category: "Electric Guitar",
        params: { threshold: -22, attack: 15, release: 250, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "EG: 4. Heavy Wall (音牆)",
        category: "Electric Guitar",
        params: { threshold: -30, attack: 5, release: 100, lookahead: 0, makeupGain: 8, dryGain: -200, clipDrive: 1.0 }
    },

    // --- KICK (大鼓) ---
    {
        name: "Kick: 1. Natural (自然大鼓)",
        category: "Kick",
        params: { threshold: -15, attack: 30, release: 100, lookahead: 0, makeupGain: 2, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Kick: 2. Punchy Tight (緊實有力)",
        category: "Kick",
        params: { threshold: -20, attack: 40, release: 60, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Kick: 3. Fat Low-End (肥厚低頻)",
        category: "Kick",
        params: { threshold: -22, attack: 25, release: 200, lookahead: 0, makeupGain: 5, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Kick: 4. Clicky Metal (金屬嗒聲)",
        category: "Kick",
        params: { threshold: -26, attack: 50, release: 50, lookahead: 0, makeupGain: 8, dryGain: -200, clipDrive: 1.0 }
    },

    // --- SNARE (小鼓) ---
    {
        name: "Snare: 1. Natural Snap (自然響亮)",
        category: "Snare",
        params: { threshold: -18, attack: 25, release: 120, lookahead: 0, makeupGain: 2, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Snare: 2. Fat Body (飽滿鼓身)",
        category: "Snare",
        params: { threshold: -22, attack: 10, release: 150, lookahead: 0, makeupGain: 5, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Snare: 3. Smash (爆炸感)",
        category: "Snare",
        params: { threshold: -30, attack: 20, release: 100, lookahead: 0, makeupGain: 10, dryGain: -200, clipDrive: 1.0 }
    },

    // --- OTHER DRUMS (其他鼓件) ---
    {
        name: "Drums: 1. Overhead Glue (Overhead黏合)",
        category: "Other Drums",
        params: { threshold: -20, attack: 30, release: 250, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Drums: 2. Tom Sustain (通鼓延音)",
        category: "Other Drums",
        params: { threshold: -24, attack: 15, release: 300, lookahead: 0, makeupGain: 5, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Drums: 3. Room Smash (鼓室爆裂)",
        category: "Other Drums",
        params: { threshold: -35, attack: 5, release: 150, lookahead: 0, makeupGain: 15, dryGain: -200, clipDrive: 1.0 }
    },

    // --- KEYS (鍵盤) ---
    {
        name: "Keys: 1. Piano Natural (自然鋼琴)",
        category: "Keys",
        params: { threshold: -15, attack: 30, release: 200, lookahead: 0, makeupGain: 1, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Keys: 2. Piano Pop (流行鋼琴)",
        category: "Keys",
        params: { threshold: -22, attack: 20, release: 150, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Keys: 3. Synth Glue (合成器黏合)",
        category: "Keys",
        params: { threshold: -20, attack: 50, release: 300, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Keys: 4. Organ Percussive (風琴打擊)",
        category: "Keys",
        params: { threshold: -20, attack: 15, release: 100, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },

    // --- FEMALE VOCAL (女聲) ---
    {
        name: "Fem Vox: 1. Gentle Ballad (溫柔抒情)",
        category: "Female Vocal",
        params: { threshold: -20, attack: 15, release: 250, lookahead: 0, makeupGain: 3, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Fem Vox: 2. Modern Pop (現代流行)",
        category: "Female Vocal",
        params: { threshold: -25, attack: 10, release: 150, lookahead: 2, makeupGain: 6, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Fem Vox: 3. Airy (空氣感)",
        category: "Female Vocal",
        params: { threshold: -22, attack: 20, release: 300, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Fem Vox: 4. Power Belt (爆發力)",
        category: "Female Vocal",
        params: { threshold: -28, attack: 5, release: 100, lookahead: 0, makeupGain: 8, dryGain: -200, clipDrive: 1.0 }
    },

    // --- MALE VOCAL (男聲) ---
    {
        name: "Male Vox: 1. Natural (自然對話)",
        category: "Male Vocal",
        params: { threshold: -20, attack: 20, release: 200, lookahead: 0, makeupGain: 2, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Male Vox: 2. Rap Aggressive (激進饒舌)",
        category: "Male Vocal",
        params: { threshold: -28, attack: 2, release: 60, lookahead: 2, makeupGain: 10, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Male Vox: 3. Warm Vintage (溫暖復古)",
        category: "Male Vocal",
        params: { threshold: -24, attack: 40, release: 300, lookahead: 0, makeupGain: 5, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Male Vox: 4. Rock Grit (搖滾顆粒)",
        category: "Male Vocal",
        params: { threshold: -26, attack: 15, release: 100, lookahead: 0, makeupGain: 7, dryGain: -200, clipDrive: 1.0 }
    },

    // --- OTHER (其他) ---
    {
        name: "Other: 1. String Smoother (弦樂平順)",
        category: "Other",
        params: { threshold: -25, attack: 50, release: 500, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Other: 2. Brass Punch (銅管衝擊)",
        category: "Other",
        params: { threshold: -20, attack: 30, release: 150, lookahead: 0, makeupGain: 4, dryGain: -200, clipDrive: 1.0 }
    },
    {
        name: "Other: 3. General Limiter (通用限制)",
        category: "Other",
        params: { threshold: -10, attack: 1, release: 50, lookahead: 5, makeupGain: 0, dryGain: -200, clipDrive: 1.0 }
    }
];
