/**
 * Token màu dùng chung cho NEXUS PC (cả trang khách và admin), hai chế độ sáng / tối cùng bộ khóa.
 * Giữ đồng bộ với biến CSS trong src/index.css (:root = tối, :root[data-theme="light"] = sáng).
 */
export type ThemeMode = 'light' | 'dark';

export const darkColors = {
  primary: '#ff6b1a',
  primaryHover: '#ff8442',
  primaryActive: '#e85b0d',
  primaryLight: 'rgba(255, 107, 26, 0.12)',
  primaryLightHover: 'rgba(255, 107, 26, 0.18)',
  /** nền đặc của nút primary / badge: chữ trắng trên nền này đạt 4,5:1 */
  primarySolid: '#ca4e0a',
  primarySolidHover: '#db5a12',
  primarySolidActive: '#b04408',
  onPrimary: '#ffffff',

  sale: '#ff4d6a',
  accentGreen: '#3ecf8e',
  accentGold: '#f5b83d',
  accentRed: '#f05252',

  background: '#121214',
  backgroundElevated: '#19191c',
  backgroundSubtle: '#0c0c0e',
  backgroundInput: '#212125',

  border: '#2a2a2f',
  borderLight: '#3a3a41',

  textPrimary: '#f2f2f3',
  textSecondary: '#b6b6bd',
  textMuted: '#8d8d96',
};

export type ThemeColors = typeof darkColors;

export const lightColors: ThemeColors = {
  primary: '#ea5f12',
  primaryHover: '#ff6b1a',
  primaryActive: '#c94e0a',
  primaryLight: 'rgba(234, 95, 18, 0.1)',
  primaryLightHover: 'rgba(234, 95, 18, 0.16)',
  primarySolid: '#ca4e0a',
  primarySolidHover: '#b34508',
  primarySolidActive: '#9c3c06',
  onPrimary: '#ffffff',

  sale: '#e0324f',
  accentGreen: '#16a06a',
  accentGold: '#c88a0c',
  accentRed: '#d93636',

  background: '#f5f5f7',
  backgroundElevated: '#ffffff',
  backgroundSubtle: '#ebebef',
  backgroundInput: '#f0f0f3',

  border: '#e2e2e7',
  borderLight: '#cfcfd6',

  textPrimary: '#17171b',
  textSecondary: '#46464f',
  textMuted: '#6b6b75',
};

export const paletteOf = (mode: ThemeMode): ThemeColors => (mode === 'light' ? lightColors : darkColors);
