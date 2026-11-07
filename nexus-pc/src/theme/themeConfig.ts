import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import { colors } from './colors';

/**
 * Ant Design Theme Configuration
 * Injected into Ant Design's ConfigProvider.
 */
export const antdDarkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: colors.primary,
    colorInfo: colors.primary,
    colorLink: colors.primary,
    colorSuccess: colors.accentGreen,
    colorWarning: colors.accentGold,
    colorError: colors.accentRed,
    colorBgBase: colors.background,
    colorBgContainer: colors.backgroundElevated,
    colorBgElevated: colors.backgroundInput,
    colorTextBase: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextPlaceholder: colors.textMuted,
    colorBorder: colors.borderLight,
    colorBorderSecondary: colors.border,
    borderRadius: 8,
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif",
    controlHeight: 42,
    fontSize: 14,
  },
  components: {
    Button: {
      colorPrimary: colors.primary,
      colorPrimaryHover: colors.primaryHover,
      colorPrimaryActive: colors.primaryActive,
      primaryColor: colors.onPrimary,
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 600,
    },
    Input: {
      colorBgContainer: colors.backgroundInput,
      activeShadow: `0 0 0 2px ${colors.primaryLight}`,
    },
    Select: {
      colorBgContainer: colors.backgroundInput,
      optionSelectedBg: colors.primaryLight,
    },
    Drawer: {
      colorBgElevated: colors.backgroundElevated,
    },
    Card: {
      colorBgContainer: colors.backgroundElevated,
    },
    Slider: {
      trackBg: colors.primary,
      trackHoverBg: colors.primaryHover,
      handleColor: colors.primary,
      handleActiveColor: colors.primaryHover,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Divider: {
      colorSplit: colors.border,
    },
    Tabs: {
      itemSelectedColor: colors.primary,
      inkBarColor: colors.primary,
    },
    Skeleton: {
      colorFill: colors.backgroundInput,
      colorFillContent: colors.backgroundElevated,
      borderRadiusSM: 6,
    },
  },
};
