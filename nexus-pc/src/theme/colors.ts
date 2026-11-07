/**
 * Token màu dùng chung cho NEXUS PC.
 * Giữ đồng bộ với biến CSS trong src/index.css (:root).
 */
export const colors = {
  primary: '#ff6b1a',
  primaryHover: '#ff8442',
  primaryActive: '#e85b0d',
  primaryLight: 'rgba(255, 107, 26, 0.12)',
  onPrimary: '#1a0f07',

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
} as const;

export type ThemeColors = typeof colors;
