// constants/theme.ts
// Tüm uygulama için merkezi renk/boyut sabitleri — Netflix koyu tema

export const C = {
  // ── Arkaplan katmanları
  bg:          '#141414',   // ana sayfa arkaplanı
  surface:     '#1E1E1E',   // kart, modal yüzeyi
  surfaceHigh: '#2A2A2A',   // input, chip arkaplanı
  overlay:     'rgba(0,0,0,0.72)',

  // ── Vurgu
  accent:      '#E91E8C',  
  accentSoft:  'rgba(229,9,20,0.18)',

  // ── Metin
  text:        '#FFFFFF',
  textSub:     '#B3B3B3',
  textMuted:   '#6B6B6B',

  // ── Kenarlık
  border:      '#2C2C2C',

  // ── Gradient (LinearGradient colors tuple)
  gradientHero:  ['transparent', 'rgba(20,20,20,0.98)'] as [string, string],
  gradientCard:  ['transparent', 'rgba(0,0,0,0.80)']   as [string, string],
} as const;

export const Radius = { sm: 6, md: 10, lg: 16, xl: 24 } as const;
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

// Kart boyutları — Netflix yatay carousel kartı
export const CARD = { w: 110, h: 165 } as const;