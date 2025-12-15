import { MicVocal, Zap, Disc, AudioWaveform } from 'lucide-react';

import { PRESETS_DATA } from './presetsData';
export { PRESETS_DATA };

export const AUDIO_SOURCES = [
    {
        id: 'Bass-01',
        name: 'Bass-01',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-01-MP3.mp3'
    },
    {
        id: 'Bass-02',
        name: 'Bass-02',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-02-MP3.mp3'
    },
    {
        id: 'Bass-03',
        name: 'Bass-03',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-03-MP3.mp3'
    },
    {
        id: 'Bass-04',
        name: 'Bass-04',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-04-MP3.mp3'
    },
    {
        id: 'Bass-05',
        name: 'Bass-05',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-05-MP3.mp3'
    },
    {
        id: 'Bass-06',
        name: 'Bass-06',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-06-MP3.mp3'
    },
    {
        id: 'Bass-07',
        name: 'Bass-07',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-07-MP3.mp3'
    },
    {
        id: 'Bass-08',
        name: 'Bass-08',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-08-MP3.mp3'
    },
    {
        id: 'Bass-09',
        name: 'Bass-09',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-09-MP3.mp3'
    },
    {
        id: 'Bass-10',
        name: 'Bass-10',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-10-MP3.mp3'
    },
    {
        id: 'Bass-11',
        name: 'Bass-11',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-11-MP3.mp3'
    },
    {
        id: 'Bass-12',
        name: 'Bass-12',
        category: 'Bass (貝斯)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Bass-12-MP3.mp3'
    },
    {
        id: 'AG-03',
        name: 'AG-03',
        category: 'Acoustic Guitar (木吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/AG-03-MP3.mp3'
    },
    {
        id: 'AG-04',
        name: 'AG-04',
        category: 'Acoustic Guitar (木吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/AG-04-MP3.mp3'
    },
    {
        id: 'EG-01',
        name: 'EG-01',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-01-MP3.mp3'
    },
    {
        id: 'EG-02',
        name: 'EG-02',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-02-MP3.mp3'
    },
    {
        id: 'EG-03',
        name: 'EG-03',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-03-MP3.mp3'
    },
    {
        id: 'EG-04',
        name: 'EG-04',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-04-MP3.mp3'
    },
    {
        id: 'EG-05',
        name: 'EG-05',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-05-MP3.mp3'
    },
    {
        id: 'EG-06',
        name: 'EG-06',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-06-MP3.mp3'
    },
    {
        id: 'EG-07',
        name: 'EG-07',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-07-MP3.mp3'
    },
    {
        id: 'EG-08',
        name: 'EG-08',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-08-MP3.mp3'
    },
    {
        id: 'EG-09',
        name: 'EG-09',
        category: 'Electric Guitar (電吉他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/EG-09-MP3.mp3'
    },
    {
        id: 'KICK-01',
        name: 'KICK-01',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-01-MP3.mp3'
    },
    {
        id: 'KICK-02',
        name: 'KICK-02',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-02-MP3.mp3'
    },
    {
        id: 'KICK-03',
        name: 'KICK-03',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-03-MP3.mp3'
    },
    {
        id: 'KICK-04',
        name: 'KICK-04',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-04-MP3.mp3'
    },
    {
        id: 'KICK-05',
        name: 'KICK-05',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-05-MP3.mp3'
    },
    {
        id: 'KICK-06',
        name: 'KICK-06',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-06-MP3.mp3'
    },
    {
        id: 'KICK-07',
        name: 'KICK-07',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-07-MP3.mp3'
    },
    {
        id: 'KICK-08',
        name: 'KICK-08',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-08-MP3.mp3'
    },
    {
        id: 'KICK-09',
        name: 'KICK-09',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-09-MP3.mp3'
    },
    {
        id: 'KICK-10',
        name: 'KICK-10',
        category: 'Kick (大鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/KICK-10-MP3.mp3'
    },
    {
        id: 'Snare-01',
        name: 'Snare-01',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-01-MP3.mp3'
    },
    {
        id: 'Snare-02',
        name: 'Snare-02',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-02-MP3.mp3'
    },
    {
        id: 'Snare-03',
        name: 'Snare-03',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-03-MP3.mp3'
    },
    {
        id: 'Snare-04',
        name: 'Snare-04',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-04-MP3.mp3'
    },
    {
        id: 'Snare-05',
        name: 'Snare-05',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-05-MP3.mp3'
    },
    {
        id: 'Snare-06',
        name: 'Snare-06',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-06-MP3.mp3'
    },
    {
        id: 'Snare-07',
        name: 'Snare-07',
        category: 'Snare (小鼓)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Snare-07-MP3.mp3'
    },
    {
        id: 'HIHAT-01',
        name: 'HIHAT-01',
        category: 'Other Drums (其他鼓件)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/HIHAT-01-MP3.mp3'
    },
    {
        id: 'HIHAT-02',
        name: 'HIHAT-02',
        category: 'Other Drums (其他鼓件)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/HIHAT-02-MP3.mp3'
    },
    {
        id: 'HIHAT-03',
        name: 'HIHAT-03',
        category: 'Other Drums (其他鼓件)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/HIHAT-03-MP3.mp3'
    },
    {
        id: 'Tom',
        name: 'Tom',
        category: 'Other Drums (其他鼓件)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Tom-MP3.mp3'
    },
    {
        id: 'VIOLA',
        name: 'VIOLA',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/VIOLA-MP3.mp3'
    },
    {
        id: 'Cello',
        name: 'Cello',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Cello-MP3.mp3'
    },
    {
        id: 'OTHER-DOBRO',
        name: 'OTHER-DOBRO',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/OTHER-DOBRO-MP3.mp3'
    },
    {
        id: 'OTHER-MARIMBA',
        name: 'OTHER-MARIMBA',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/OTHER-MARIMBA-MP3.mp3'
    },
    {
        id: 'PERC-BOMBO',
        name: 'PERC-BOMBO',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PERC-BOMBO-MP3.mp3'
    },
    {
        id: 'PERC-CUNONO',
        name: 'PERC-CUNONO',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PERC-CUNONO-MP3.mp3'
    },
    {
        id: 'SAXOPHONE',
        name: 'SAXOPHONE',
        category: 'Other (其他)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/SAXOPHONE-MP3.mp3'
    },
    {
        id: 'PIANO-01',
        name: 'PIANO-01',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PIANO-01-MP3.mp3'
    },
    {
        id: 'PIANO-02',
        name: 'PIANO-02',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PIANO-02-MP3.mp3'
    },
    {
        id: 'PIANO-03',
        name: 'PIANO-03',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/PIANO-03-MP3.mp3'
    },
    {
        id: 'Synth-01',
        name: 'Synth-01',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Synth-01-MP3.mp3'
    },
    {
        id: 'Synth-02',
        name: 'Synth-02',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Synth-02-MP3.mp3'
    },
    {
        id: 'Synth-03',
        name: 'Synth-03',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Synth-03-MP3.mp3'
    },
    {
        id: 'Synth-04',
        name: 'Synth-04',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Synth-04.mp3'
    },
    {
        id: 'Organ',
        name: 'Organ',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Organ-MP3.mp3'
    },
    {
        id: 'Rhodes',
        name: 'Rhodes',
        category: 'Keys (鍵盤)',
        url: 'https://onetrackstudiohk.b-cdn.net/eq-tool-practice-tracks-besides-vocal/Rhodes-MP3.mp3'
    },
    {
        id: '練習用女聲主音1',
        name: '練習用女聲主音1',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B31.mp3'
    },
    {
        id: '練習用女聲主音2',
        name: '練習用女聲主音2',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B32.mp3'
    },
    {
        id: '練習用女聲主音3',
        name: '練習用女聲主音3',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B33.mp3'
    },
    {
        id: '練習用女聲主音4',
        name: '練習用女聲主音4',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B34.mp3'
    },
    {
        id: '練習用女聲主音5',
        name: '練習用女聲主音5',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B35.mp3'
    },
    {
        id: '練習用女聲主音6',
        name: '練習用女聲主音6',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B36.mp3'
    },
    {
        id: '練習用女聲主音7',
        name: '練習用女聲主音7',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B37.mp3'
    },
    {
        id: '練習用女聲主音8',
        name: '練習用女聲主音8',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B38.mp3'
    },
    {
        id: '練習用女聲主音9',
        name: '練習用女聲主音9',
        category: 'Female Vocal (女聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E5%A5%B3%E8%81%B2%E4%B8%BB%E9%9F%B39.mp3'
    },
    {
        id: '練習用男聲主音1',
        name: '練習用男聲主音1',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B31.mp3'
    },
    {
        id: '練習用男聲主音2',
        name: '練習用男聲主音2',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B32.mp3'
    },
    {
        id: '練習用男聲主音3',
        name: '練習用男聲主音3',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B33.mp3'
    },
    {
        id: '練習用男聲主音4',
        name: '練習用男聲主音4',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B34.mp3'
    },
    {
        id: '練習用男聲主音5',
        name: '練習用男聲主音5',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B35.mp3'
    },
    {
        id: '練習用男聲主音6',
        name: '練習用男聲主音6',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B36.mp3'
    },
    {
        id: '練習用男聲主音7',
        name: '練習用男聲主音7',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B37.mp3'
    },
    {
        id: '練習用男聲主音8',
        name: '練習用男聲主音8',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B38.mp3'
    },
    {
        id: '練習用男聲主音9',
        name: '練習用男聲主音9',
        category: 'Male Vocal (男聲)',
        url: 'https://onetrackstudiohk.b-cdn.net/EQ%20tool%20tracks/%E7%B7%B4%E7%BF%92%E7%94%A8%E7%94%B7%E8%81%B2%E4%B8%BB%E9%9F%B39.mp3'
    }
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