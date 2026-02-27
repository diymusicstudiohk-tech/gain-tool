# Colour Guide — claude-eq-tool GUI Reference

Extracted from `/Users/onetrackstudio/claude-eq-tool`. All file paths are relative to that project root.

---

## 1. Theme Color Tokens (JS Constants)

**File: `src/utils/constants.js`**

```js
THEME_COLORS = {
  ACCENT_GOLD:      '#C2A475',
  ACCENT_GOLD_NODE: '#C1A475',
  SAGE_GREEN:       '#96CFAD',
  SAGE_GREEN_GLOW:  'rgba(150, 207, 173, 0.5)',
  PRACTICE_ORANGE:  '#B54C35',
  REFERENCE_BLUE:   '#4D5B72',
  SUGGESTED_NEON:   '#00ff9f'
}
```

No CSS custom properties are used — all theming is driven through these JS constants.

---

## 2. Color Palettes

### 2.1 Gold Accent Palette

| Role | Value |
|------|-------|
| Primary accent | `#C2A475` |
| Node gold | `#C1A475` |
| Logo stroke | `#C0A374` |
| Hover variants | `#D4B686` / `#D4B88A` / `#d4b98a` |
| Glow (40%) | `rgba(194, 164, 117, 0.4)` |
| Glow (80%) | `rgba(194, 164, 117, 0.8)` |

### 2.2 Practice Track (Orange-Red) Palette

| Role | Value |
|------|-------|
| Primary | `#B54C35` |
| Hover | `#C96550` |
| Waveform | `#D05A40` |
| RTA fill | `rgb(181, 76, 53)` |
| RTA peak | `rgb(224, 94, 66)` |
| RTA gradient top | `#CD573C` |
| Breathing base | `#B54C35` |
| Breathing highlight | `#CA6852` |
| Bypassed node fill | `#8F3C29` |
| Bypassed glow | `#FF6B4A` |

### 2.3 Reference Track (Slate Blue) Palette

| Role | Value |
|------|-------|
| Primary | `#4D5B72` |
| Hover | `#637085` |
| Waveform | `#7D93B7` |
| RTA fill | `rgb(77, 91, 114)` |
| RTA peak | `rgb(134, 158, 198)` |
| RTA gradient top | `#6C80A0` |

### 2.4 Sage Green (Suggested / Completion) Palette

| Role | Value |
|------|-------|
| Primary | `#96CFAD` |
| Glow | `rgba(150, 207, 173, 0.5)` |
| Neon variant | `#00ff9f` |
| Hover | `#7FBF96` |
| Dimmed | `#666666` |

### 2.5 Neutral / Background Palette

| Role | Value |
|------|-------|
| App background | `#111111` |
| Panel background | `#202020` |
| Grid main | `#2B2B2B` |
| Disabled button bg | `#313131` |
| Text disabled / inactive curve | `#555` |
| Grid text | `#666` |
| Text secondary | `#888` |

### 2.6 Semantic Colors

| Role | Value |
|------|-------|
| Gain positive | `#4ade80` (Tailwind green-400) |
| Gain negative | `#f87171` (Tailwind red-400) |
| Clip indicator | `#E05E42` |
| Solo purple | `#ab20fd` |
| Tutorial arrow | `#F5A652` |
| Trial button bg | `#8B4513` (30% alpha) |
| Trial button text | `#D4956B` |
| EQ tips boost region | `#729D83` |
| EQ tips cut region | `#F9838A` |

---

## 3. Tooltip Styles

### 3.1 Crosshair Tooltip (Canvas)

**File: `src/utils/constants.js` — `VISUALIZER_STYLES.CROSSHAIR`**

| Property | Value |
|----------|-------|
| Background | `rgba(27, 27, 27, 0.95)` |
| Border | `rgba(255, 255, 255, 0.1)` |
| Border radius | `12px` |
| Text color | `#e5e7eb` |
| Shadow | `rgba(0, 0, 0, 0.6)` — 10px blur |
| Gain positive text | `#4ade80` |
| Gain negative text | `#f87171` |
| Line color | `rgba(255, 255, 255, 0.3)` |

### 3.2 Suggested Node Tooltip (Canvas)

**File: `src/components/Visualizer/painters/suggestedNodeTooltipPainter.js`**

| Property | Value |
|----------|-------|
| Background | `rgba(27, 27, 27, 0.95)` |
| Border | `#96CFAD` (sage green) |
| Corner radius | `6px` |
| Font | `11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| Text | `#ffffff` |
| Leader line | Dashed `[4, 4]`, sage green at alpha 0.6 |
| Hovered glow | blur 15–40px at `rgba(150, 207, 173, 0.8)`, blur 20–50px at `rgba(150, 207, 173, 0.9)` |

### 3.3 Suggested Overview Box (Canvas)

**File: `src/components/Visualizer/painters/suggestedOverviewPainter.js`**

| Property | Value |
|----------|-------|
| Background | `rgba(27, 27, 27, 0.92)` |
| Border | sage green or `#666666` (dimmed) |
| Glow blur | 40 (normal) / 0 (dimmed) |
| Corner radius | `10px` |
| Font | `13px` system stack |

### 3.4 EQ Tips Tooltip (Canvas)

**File: `src/components/Visualizer/painters/eqTipsPainter.js`**

| Property | Value |
|----------|-------|
| Shadow | `rgba(0, 0, 0, 0.5)` — blur 10 |
| Background | `rgba(30, 30, 30, 0.95)` |
| Border | `rgba(255, 255, 255, 0.2)` |
| Left indicator bar | 4px wide, colored by region type |
| Icon color | `#FFFFFF` |
| Font | `12px` system stack |

### 3.5 Filter Toggle Button Tooltip (DOM)

**File: `src/components/Visualizer/subcomponents/FilterToggleButtons.jsx`**

- Background: `bg-gray-900`
- Border: `border-gray-700`
- Arrow: same colors, rotated 45deg

### 3.6 MixCheck Tooltip (DOM)

**File: `src/components/MixCheckTooltip.jsx`**

| Property | Value |
|----------|-------|
| Container | `bg-black/50`, `border-white/10` |
| Shadow | `0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)` |
| Backdrop blur | `8px` |

### 3.7 Drag Tooltips (DOM)

- **GainScaler** (`src/components/GainScaler.jsx`): `bg-black/80`
- **MasterVolumeKnob** (`src/components/MasterVolumeKnob.jsx` line 94): `bg-gray-900`, `border-gray-600`

### 3.8 Onboarding Tooltip (DOM)

**File: `src/components/Onboarding/OnboardingTooltip.jsx`**

| Property | Value |
|----------|-------|
| Background | `bg-black/50` + `backdrop-blur-[8px]` |
| Border | `border-white/10` |
| Shadow | `0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)` |
| Step counter | `text-[#C2A475]` |

---

## 4. Gradient Fills

### 4.1 Canvas Gradients

#### Grid Line Edge Fade
**File: `src/components/Visualizer/painters/gridPainter.js`**
- Vertical linear gradient: `rgba(255,255,255,0)` at edges → `rgba(255,255,255, 0.25 or 0.5)` at center

#### EQ Curve Fill
**File: `src/components/Visualizer/painters/eqCurvePainter.js`**
- Normal: white RGB, alpha **0.25** at curve line → **0.05** at baseline
- Hovered: gold `#EAC68D` (234,198,141), alpha **0.50** at line → **0.05** at baseline
- Bypassed: `#8F3C29` (143,60,41), alpha **0.25–0.9** (breathing animation)

#### Q Bandwidth Line
**File: `src/components/Visualizer/painters/nodesPainter.js` (lines 141–144)**
- Vertical gradient using node color RGB: edge alpha **0.05**, center alpha **0.9–1.0**

#### RTA Fill
**File: `src/components/Visualizer/painters/rtaPainter.js`**
- Practice: top `#CD573C` → transparent at bottom
- Reference: top `#6C80A0` → transparent at bottom
- Peak fill: `rgba(180,77,53,0.2)` (practice) / `rgba(77,91,114,0.2)` (reference)

#### EQ Tips Hover Region
**File: `src/components/Visualizer/painters/eqTipsPainter.js`**
- Vertical gradient: base opacity **40%** at baseline → **0%** at edges

#### Spectral Centroid Heat Map
**File: `src/components/Visualizer/painters/spectralCentroidPainter.js`**
- Radial gradients: base color at alpha 0.1–1.0, blending toward white at high heat values

### 4.2 CSS / DOM Gradients

#### Track Browser Modal Dividers
**File: `src/components/TrackBrowserModal.jsx` (lines 254–256, 347–353)**
```css
/* Main divider */
linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)

/* Internal divider */
linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)
```

#### Login Overlay Marquee Fade
**File: `src/components/Auth/LoginOverlay.jsx`**
```css
linear-gradient(to right, rgba(0,0,0,0.5), transparent)
```

---

## 5. Box Shadows

| Component | File | Shadow |
|-----------|------|--------|
| Header | `Header.jsx` | `0 4px 20px rgba(0,0,0,0.25)` |
| Track Browser Modal (accent) | `TrackBrowserModal.jsx` | `0 0 30px ${hexToRgba(accentColor, 0.3)}, 0 10px 40px rgba(0,0,0,0.6)` |
| Track Browser Modal (no accent) | `TrackBrowserModal.jsx` | `0 10px 40px rgba(0,0,0,0.6)` |
| Mode Selection bar | `ModeSelectionBar.jsx` | `0 2px 8px rgba(0,0,0,0.2)` |
| Mode dropdown | `ModeSelectionBar.jsx` | `0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)` |
| Gain Scaler glow | `GainScaler.jsx` | `0 0 15px rgba(194,164,117,0.6)` |
| Waveform playhead | `Waveform.jsx` | `0 0 8px rgba(255,255,255,0.9)` |
| Play button | `TransportControls.jsx` | `[#8FBC8F]/30` |
| Upgrade button | `Auth/UpgradeModal.jsx` | `0 0 20px rgba(194,164,117,0.4)` |
| Confirmation modal card | `ConfirmationModal.jsx` | `shadow-2xl` |
| Destructive confirm btn | `ConfirmationModal.jsx` | `shadow-red-900/50` |
| Tag filter L1 active | `TrackBrowserModal.jsx` | `0 0 10px rgba(194,164,117,0.4)` |
| Tag filter L2 active | `TrackBrowserModal.jsx` | `0 0 8px rgba(194,164,117,0.3)` |
| Tag filter L3 active | `TrackBrowserModal.jsx` | `0 0 6px rgba(194,164,117,0.2)` |

---

## 6. Borders & Border Radius

### Common Border Patterns

| Pattern | Usage |
|---------|-------|
| `border-white/10` | Panel borders, subtle dividers |
| `border-white/20` | Medium emphasis borders |
| `border-white/30` | Inactive button borders |
| `border-[#C2A475]` | Active gold buttons |
| `border-[#B54C35]` | Active HPF/LPF, practice accent |
| `border-[#ab20fd]` | Solo active |
| `border-red-400` | Bypass active |
| `border-[#96CFAD]/50` | Suggested panel |
| `border-[#C1A475]/50` | Loop region |
| `border-red-500/60` | Error / clip |
| `border-gray-600` | Disabled elements |

### Border Radius

| Context | Value |
|---------|-------|
| Canvas crosshair box | `12px` |
| Canvas suggested tooltip | `6px` |
| Canvas overview box | `10px` |
| Spectral centroid | `4px` |
| DOM modals | `rounded-xl` (12px) |
| DOM buttons | `rounded-lg` (8px) |
| DOM pill buttons | `rounded-full` |
| DOM smaller elements | `rounded-md` (6px) / `rounded` (4px) |

---

## 7. Typography

### Canvas Fonts

| Context | Font | File |
|---------|------|------|
| Grid labels | `10px monospace` | `constants.js` |
| Suggested node tooltip | `11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | `suggestedNodeTooltipPainter.js` |
| Suggested overview | `13px` system stack | `suggestedOverviewPainter.js` |
| EQ tips tooltip | `12px` system stack | `eqTipsPainter.js` |

### DOM Typography (Tailwind)

| Role | Classes |
|------|---------|
| Headers/titles | `text-sm font-medium` (14px) |
| Body text | `text-sm` (14px) |
| Small text | `text-xs` (12px) |
| Tiny labels | `text-[10px]` |
| Responsive tiny | `max-xs:text-[0.7rem]`, `max-xs:text-[0.6rem]` |
| Category headers | `uppercase tracking-wider` |
| Monospace | `font-mono` |
| App container | `font-sans` |

---

## 8. Background Patterns

### Solid Backgrounds

| Element | Color | File |
|---------|-------|------|
| Body / App container / Header | `#111111` | `index.css`, `AppLayout.jsx`, `Header.jsx` |
| Visualizer / Waveform / Panels | `#202020` | `Visualizer/index.jsx`, `Waveform.jsx` |
| Disabled button | `#313131` | Various |

### Glassmorphism Backgrounds (semi-transparent + blur)

| Pattern | Usage |
|---------|-------|
| `bg-black/50` + `backdrop-blur-[8px]` | TrackBrowserModal, tooltips, ModeSelectionBar dropdown |
| `bg-black/70` + `backdrop-blur-[8px]` | EqPresetDropdown |
| `bg-black/30` + `backdrop-blur-sm` | Backdrops |
| `bg-black/10` + `backdrop-blur-[1px]` | Onboarding overlay |
| `bg-black/25` + `backdrop-blur-[16px]` | Mobile toolbar |

### Subtle Section Backgrounds

| Pattern | Usage |
|---------|-------|
| `bg-black/20` | Subtle section backgrounds |
| `bg-black/30` | Category headers in track lists |
| `bg-black/40` | Graph areas (MixCheckTooltip) |
| `bg-white/5` | Subtle interactive backgrounds |
| `bg-white/10` | Light interactive backgrounds |

---

## 9. Button Styles & States

### Play Button (`TransportControls.jsx`)
- Default: `bg-[#8FBC8F] hover:bg-[#a3cfaa]`, shadow `[#8FBC8F]/30`
- Playing: `breathe-green` animation

### Solo Button (`TransportControls.jsx`)
- Default: `bg-[#202020] hover:bg-[#ab20fd] border-[#2b8a9e]/30`
- Active: `breathe-purple`, `border-[#ab20fd]`

### Bypass Button (`TransportControls.jsx`)
- Default: `bg-[#202020] hover:bg-[#ff3333] border-[#2b8a9e]/30`
- Active: `breathe-red-alert`, `border-red-400`

### Mode Selection Buttons (`ModeSelectionBar.jsx`)
- Active: `bg-[#C2A475] text-white`
- Inactive: `bg-[#111111] text-white/80 hover:bg-[#C2A475] hover:text-white`

### Filter Toggles (`FilterToggleButtons.jsx`)
- HPF/LPF active: `bg-[#B54C35] border-[#B54C35]`
- LSF/HSF active: `bg-[#C1A475] border-[#C1A475]`
- Inactive: `bg-[#202020] border-white/30`

### MixCheck Buttons (`MixCheckControls.jsx`)
- Active: `bg-[#B54C35] border-[#B54C35]` + `breathe-mixcheck`, text black
- Inactive: `bg-[#202020] border-white opacity-80`

### Tag Filter Buttons (`TrackBrowserModal.jsx`)

| Level | Active | Inactive |
|-------|--------|----------|
| L1 | `bg-[#C2A475] text-white shadow-[0_0_10px_rgba(194,164,117,0.4)]` | `bg-white/10 text-gray-300 hover:bg-white/20` |
| L2 | `bg-[#C2A475]/80 text-white shadow-[0_0_8px_rgba(194,164,117,0.3)]` | `bg-white/5 text-gray-400 hover:bg-white/10` |
| L3 | `bg-[#C2A475]/60 text-white shadow-[0_0_6px_rgba(194,164,117,0.2)]` | `bg-white/5 text-gray-500 hover:bg-white/10` |

### Auth Buttons (`Auth/LoginOverlay.jsx`)
- Google: `bg-white text-gray-800`
- Magic link: `bg-[#C2A475]/20 border-[#C2A475]/40 text-[#C2A475]`
- Trial: `bg-[#8B4513]/30 border-[#8B4513]/60 text-[#D4956B]`
- Upgrade: `bg-[#C2A475] hover:bg-[#D4B68A] shadow-[0_0_20px_rgba(194,164,117,0.4)]`

### Onboarding/Tutorial Buttons (`AppLayout.jsx`, `OnboardingTooltip.jsx`)
- Proceed: `bg-[#C2A475] hover:bg-[#D4B686]`
- Disabled: `bg-gray-600 text-gray-400`
- Completion: `bg-[#96CFAD] text-black hover:bg-[#7FBF96]`
- Bypass: `bg-[#B54C35] hover:bg-[#C55D46]`
- Skip: `text-white/40 hover:text-white/70`

### Common Disabled State
- `opacity-40 cursor-not-allowed` or `opacity-50 cursor-not-allowed`
- `bg-[#313131] text-gray-400` or `bg-gray-600 text-gray-400`
- Press scale: `active:scale-[0.98]`

---

## 10. Opacity / Transparency Reference

### Tailwind Utility Opacity
| Value | Usage |
|-------|-------|
| `opacity-80` | Inactive buttons, user menu |
| `opacity-50` | Trial-locked navigation |
| `opacity-40` | Disabled buttons, trial-locked items |
| `opacity-0 group-hover:opacity-100` | Reveal-on-hover (favorites star) |

### Alpha Channel Scale
| Alpha | Tailwind | Usage |
|-------|----------|-------|
| 5% | `/5` | `bg-white/5` — subtle hover bg, border dividers |
| 10% | `/10` | `bg-white/10`, `border-white/10` — light interactive, panel borders |
| 20% | `/20` | `bg-white/20`, `bg-black/20` — moderate backgrounds |
| 30% | `/30` | `bg-black/30`, `border-white/30` — standard backdrops, inactive borders |
| 40% | `/40` | `text-white/40`, `border-[#C2A475]/40` — muted text, accent borders |
| 50% | `/50` | `bg-black/50`, `border-[#96CFAD]/50` — modal backgrounds |
| 60% | `/60` | `border-[#8B4513]/60`, `border-red-500/60` — stronger accent borders |
| 70% | `/70` | `bg-black/70`, `text-white/70` — dark overlays, secondary text |
| 80% | `/80` | `bg-[#C2A475]/80`, `text-white/80` — active accent variants |

### Canvas Alpha Values
| Context | Alpha |
|---------|-------|
| RTA fill (peak area) | 0.2 |
| RTA stroke (active) | 0.9 |
| LTAS inactive | 0.7 |
| Grid lines | 0.05, 0.25, 0.5 |
| EQ curve fill (baseline) | 0.05 |
| EQ curve fill (at line) | 0.25 |
| EQ curve fill (hovered) | 0.50 |
| EQ curve fill (bypassed, breathing) | 0.25–0.9 |
| Q bandwidth edges | 0.05 |
| Q bandwidth center | 0.9–1.0 |
| EQ tips regions default | 0.10 |
| EQ tips regions hovered | 0.40 |
| Crosshair/tooltip bg | 0.92–0.95 |
| Solo mask | 0.7 |

---

## 11. Animations

### CSS @keyframes Breathing Animations (`src/index.css`)

All follow 0% → 50% → 100% with `ease-in-out`:

| Name | Duration | Color A | Color B |
|------|----------|---------|---------|
| `breathe-green` | 2s | `#8FBC8F` | `#9ACA9A` |
| `breathe-red-dim` | 2s | `#2a1010` | `#502020` |
| `breathe-red-alert` | 1s | `#cc0000` | `#ff3333` |
| `breathe-purple` | 2s | `#4b0082` | `#8a2be2` |
| `breathe-pink` | 2s | `rgba(236,72,153,0.6)` | `rgba(236,72,153,1)` |
| `breathe-bright-pink` | 2s | `#db2777` | `#f472b6` |
| `breathe-gold` | 2s | `rgba(234,179,8,0.6)` | `rgba(234,179,8,1)` |
| `breathe-dark-green` | 2s | `#064e3b` | `#047857` |
| `breathe-teal` | 2s | `#0f766e` | `#115e59` |
| `breathe-cyan` | 2s | `#005f3f` | `#00ff9f` |
| `breathe-gold-brown` | 2s | `#9A8259` | `#C1A475` |
| `breathe-brick-red` | 2s | `#8F3C29` | `#B54C35` |
| `breathe-ltas` | 2s | `#C2A475` | `#D4B88A` |
| `breathe-mixcheck` | 2s | `#C2A475` | `#D4B88A` |
| `breathe-free-mode` | 2s | `#C2A475` | `#D4B88A` |
| `breathe-track-practice` | 2s | `rgba(181,76,53,0.3)` | `rgba(181,76,53,0.5)` |
| `breathe-track-reference` | 2s | `rgba(77,91,114,0.3)` | `rgba(77,91,114,0.5)` |
| `breathe-track-hover` | 2s | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.15)` |
| `breathe-red-onboarding` | 2s | `rgba(255,68,68,0.6)` | `rgba(255,68,68,1.0)` border |
| `breathe-tutorial-arrow` | 1.5s | `#F5A652` shadow 0 | `#F5A652` shadow 8px blur |

### Framer Motion (`ModeSelectionBar.jsx`)

| Element | Animation |
|---------|-----------|
| Dropdown curtain | `height: 0 → auto`, `opacity: 0 → 1`, 0.3s, ease `[0.4, 0, 0.2, 1]` |
| Content slide | `y: -20 → 0`, `opacity: 0 → 1`, 0.25s, delay 0.05s |
| Backdrop | `opacity: 0 → 1`, 0.2s |
| Arrow rotation | `rotate: 0 → 180`, 0.3s |
| Lesson item | `whileHover: scale 1.02`, `whileTap: scale 0.98` |

### Spring Config (`constants.js`)
```js
ANIMATION = {
  fadeIn: 0.3,
  fadeOut: 0.2,
  spring: { stiffness: 200, damping: 25, mass: 1 }
}
```

### Canvas Breathing Animations (requestAnimationFrame)

| Element | Oscillation | File |
|---------|-------------|------|
| Suggested curve glow | blur 30–80px | `suggestedCurvePainter.js` |
| Bypassed node alpha | 0.25–0.9 | `eqCurvePainter.js` |
| Bypassed glow blur | 2–7px | `eqCurvePainter.js` |
| Suggested tooltip glow | blur 15–40px, 20–50px | `suggestedNodeTooltipPainter.js` |
| LTAS neon glow | shadowBlur 5–20px | `ltasPainter.js` |

### Tailwind Transitions
- Standard: `transition-all duration-200`
- Color only: `transition-colors duration-150`
- Opacity: `transition-opacity`
- Modal entrance: `animate-in fade-in duration-75`

---

## 12. SVG Fills & Strokes

### Logo (`Header.jsx`)
- `stroke="#C0A374"`, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `fill="none"`

### Master Volume Knob (`MasterVolumeKnob.jsx`)
- Background arc: `stroke="#374151"`, width 2, round cap, no fill
- Active arc: `stroke={isClipping ? '#E05E42' : 'white'}`, width 2
- Knob circle: `fill={isClipping ? '#E05E42' : 'white'}`
- Pointer triangle: `fill={isClipping ? 'white' : '#1f2937'}`

### Gold Tick (`ModeSelectionBar.jsx`)
- Circle: `fill={THEME_COLORS.ACCENT_GOLD}`
- Check path: `stroke="#111"`, width 2.5, round cap/join

### Tutorial Arrow (`TutorialNodeArrow.jsx`)
- Line: `stroke="#F5A652"`, width 2
- Triangle head: `fill="#F5A652"`

### MixCheck Curve (`MixCheckTooltip.jsx`)
- `stroke="white"`, width 2, no fill, `filter="drop-shadow(0 0 4px rgba(255,255,255,0.3))"`

### Filter Icons (`src/assets/hpf-icon.svg`, `lpf-icon.svg`)
- `stroke="currentColor"`, `stroke-width="2.5"`, round cap/join, no fill

### Lucide React Icons
- Common sizes: 12, 14, 16, 18
- Star fill pattern: `fill={favorited ? 'currentColor' : 'none'}`

---

## 13. Canvas Drawing Reference

### Grid (`gridPainter.js`)
- Lines: `rgba(255,255,255,0.25)` / major: `rgba(255,255,255,0.5)`, line width 0.5
- Zero dB line: `rgba(255,255,255,0.05)`
- Text: `#666`, `10px monospace`

### EQ Curve (`eqCurvePainter.js`)
- Active stroke: `#fff`, width 1.5; shadow: `rgba(255,255,255,0.5)` blur 5
- Inactive stroke: `#555`
- Fill gradients: see Section 4.1

### Nodes (`nodesPainter.js`)
- Selected: filled node.color, `#fff` stroke width 1.5
- Unselected peaking: `#000` fill, node.color stroke width 2
- Unselected solid (HPF/LPF/Shelf): node.color fill & stroke, 1.5x size
- Disabled: `#555` or `#8F3C29` (individually bypassed)
- Hover ring: `rgba(255,255,255,0.4)`, width 2
- Filter icons: `#fff` active / `#888` inactive, width 1.5, round caps/joins

### RTA (`rtaPainter.js`)
- Fill gradients: see Section 4.1
- LTAS: `#555555`
- Active stroke opacity: 0.9
- Ghost curve: dashed `[5, 5]`

### Solo Mask (`soloMaskPainter.js`)
- `rgba(0,0,0,0.7)`

### Suggested Curve (`suggestedCurvePainter.js`)
- Active: `#96CFAD`, width 3, breathing glow blur 30–80
- Bypassed: `#666666`, width 3, alpha 0.3, no glow

### EQ Tips Regions (`eqTipsPainter.js`)
- HPF/LPF: `#C1A475` at 10% / 40% hover
- Boost: `#729D83` at 10% / 40% hover
- Cut: `#F9838A` at 10% / 40% hover

---

## 14. Z-Index Layers

```js
Z_INDEX = {
  modal:           9999,
  onboarding:      10000,
  tooltip:         10002,
  upgradeModal:    10050,
  loginOverlay:    10100,
  connectionError: 10200
}
```

---

## 15. Miscellaneous

### Selection Color (`index.css`)
```css
::selection { background: #C2A475; color: #fff; }
```

### Custom Scrollbar (`index.css`)
```css
.glass-scrollbar::-webkit-scrollbar { width: 6px; }
.glass-scrollbar::-webkit-scrollbar-track { background: transparent; }
.glass-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.8); border-radius: 3px; }
.glass-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
```

### Cursor Styles
- `cursor-pointer` — clickable elements
- `cursor-ns-resize` — vertical drag (knobs, sliders)
- `cursor-grabbing` — active drag state
- `cursor-not-allowed` — disabled elements

### Google Auth SVG Colors (`LoginOverlay.jsx`)
- Blue: `#4285F4`, Green: `#34A853`, Yellow: `#FBBC05`, Red: `#EA4335`

### Tailwind Config (`tailwind.config.js`)
- Custom breakpoints only: `xxs: '400px'`, `xs: '550px'`
- No custom color extensions
