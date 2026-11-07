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
    Breadcrumb: {
      fontSize: 13,
      itemColor: colors.textMuted,
      lastItemColor: colors.textMuted,
      linkColor: colors.textMuted,
      linkHoverColor: colors.textPrimary,
      separatorColor: colors.textMuted,
      separatorMargin: 4,
    },
    // Menu dọc: menu tài khoản, menu chính sách, danh mục ở bộ lọc
    Menu: {
      itemBg: 'transparent',
      itemColor: colors.textSecondary,
      itemHoverColor: colors.textPrimary,
      itemHoverBg: colors.backgroundInput,
      itemSelectedBg: colors.primaryLight,
      itemSelectedColor: colors.primary,
      itemActiveBg: colors.backgroundInput,
      itemBorderRadius: 6,
      itemHeight: 42,
      itemMarginInline: 0,
      itemMarginBlock: 2,
      itemPaddingInline: 10,
      activeBarBorderWidth: 0,
      iconMarginInlineEnd: 8,
    },
    Table: {
      headerBg: colors.backgroundElevated,
      headerColor: colors.textMuted,
      headerSplitColor: 'transparent',
      borderColor: colors.border,
      rowHoverBg: 'transparent',
      colorBgContainer: 'transparent',
      cellPaddingBlock: 11,
      cellPaddingInline: 14,
      cellFontSize: 14,
    },
    Timeline: {
      tailColor: colors.borderLight,
      dotBg: colors.backgroundElevated,
    },
    Progress: {
      remainingColor: colors.backgroundInput,
      defaultColor: colors.primary,
    },
    Segmented: {
      trackBg: colors.backgroundInput,
      itemSelectedBg: colors.backgroundElevated,
      itemSelectedColor: colors.textPrimary,
      itemColor: colors.textSecondary,
    },
    Skeleton: {
      colorFill: colors.backgroundInput,
      colorFillContent: colors.backgroundElevated,
      borderRadiusSM: 6,
    },
  },
};

/**
 * Lớp chỉnh thêm cho khu quản trị (/admin), lồng trong ConfigProvider gốc nên kế thừa màu của antdDarkTheme.
 * Admin dùng trên desktop, làm việc lâu: control thấp hơn, bảng dày (hàng ~40px), hover dòng rõ.
 */
export const antdAdminTheme: ThemeConfig = {
  token: {
    controlHeight: 34,
    fontSize: 14,
  },
  components: {
    Layout: {
      siderBg: colors.backgroundSubtle,
      headerBg: colors.backgroundSubtle,
      bodyBg: colors.background,
      headerHeight: 56,
      headerPadding: '0 20px',
      triggerBg: colors.backgroundElevated,
    },
    Menu: {
      itemHeight: 38,
      itemMarginInline: 8,
      itemPaddingInline: 12,
      groupTitleColor: colors.textMuted,
      groupTitleFontSize: 11,
      collapsedWidth: 64,
    },
    Table: {
      headerBg: colors.backgroundInput,
      headerColor: colors.textSecondary,
      colorBgContainer: colors.backgroundElevated,
      rowHoverBg: colors.backgroundInput,
      rowSelectedBg: colors.primaryLight,
      rowSelectedHoverBg: 'rgba(255, 107, 26, 0.18)',
      cellPaddingBlock: 8,
      cellPaddingInline: 12,
      cellPaddingBlockSM: 6,
      cellFontSize: 13,
    },
    Card: {
      headerFontSize: 15,
      bodyPadding: 20,
    },
    Statistic: {
      contentFontSize: 26,
    },
  },
};
