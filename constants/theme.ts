import { Dimensions, PixelRatio } from "react-native";

// ==========================================
// 1. SCALING UTILITY
// ==========================================
const { scale: SCREEN_SCALE, fontScale: FONT_SCALE } = Dimensions.get("window");

export function s(size: number) {
  const newSize = size / SCREEN_SCALE;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function f(size: number) {
  const newSize = size / FONT_SCALE;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// ==========================================
// 2. COLORS
// ==========================================
const tintColorLight = "#61E786";
const tintColorDark = "#61E786";

export const Colors = {
  light: {
    text: "#212124",
    background: "#FCF7F8",
    surface: "#303036",
    border: "#E5E7EB", // Added
    primary: "#98AAE1",
    tertiary: tintColorLight,
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    muted: "#646667",
  },
  dark: {
    text: "#FCF7F8",
    background: "#212124",
    surface: "#303036",
    border: "#2F3336", // Added
    primary: "#98AAE1",
    tertiary: tintColorDark,
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    muted: "#646667",
  },
};

// ==========================================
// 3. SIZES (SCALED)
// ==========================================

export const SizesScaled = {
  tabBarHeight: s(60),
  iconMd: s(24),
  iconLg: s(32),

  spacing: {
    xxxs_2: s(2),
    xxxs_4: s(4),
    xxs_6: s(6),
    xxs_8: s(8),
    xs_12: s(12),
    sm_16: s(16),
    sm_24: s(24),
    md_32: s(32),
    md_48: s(48),
    lg_96: s(96),
    xl_128: s(128),
  },

  radius: {
    sm_8: s(8),
  },
};

export const SizesRaw = {
  tabBarHeight: 60,
  iconSm: 16,
  iconMd: 24,
  iconLg: 32,

  spacing: {
    xxxs_2: 2,
    xxxs_4: 4,
    xxs_6: 6,
    xxs_8: 8,
    xs_12: 12,
    sm_16: 16,
    sm_24: 24,
    md_32: 32,
    md_48: 48,
    lg_96: 96,
    xl_128: 128,
  },

  radius: {
    sm_8: 8,
  },
};

/*

UNUSED

*/

// [2, 4, 6, 8, 12, 16, 24, 32, 48, 96, 128].forEach((x) =>
//   console.log(`${x} => ${x / SCREEN_SCALE} ${s(x)}`)
// );
//  LOG  2.625 0.800000011920929
//  LOG  2 => 0.7619047619047619 1
//  LOG  4 => 1.5238095238095237 2
//  LOG  6 => 2.2857142857142856 2
//  LOG  8 => 3.0476190476190474 3
//  LOG  12 => 4.571428571428571 5
//  LOG  16 => 6.095238095238095 6
//  LOG  24 => 9.142857142857142 9
//  LOG  32 => 12.19047619047619 12
//  LOG  48 => 18.285714285714285 18
//  LOG  96 => 36.57142857142857 37
//  LOG  128 => 48.76190476190476 49

// [10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128].forEach((x) =>
//   console.log(`${x} => ${x / FONT_SCALE} ${s(x)}`)
// );
//  LOG  10 => 12.499999813735489 4
//  LOG  11 => 13.749999795109037 4
//  LOG  12 => 14.999999776482586 5
//  LOG  13 => 16.249999757856134 5
//  LOG  14 => 17.499999739229683 5
//  LOG  15 => 18.74999972060323 6
//  LOG  16 => 19.99999970197678 6
//  LOG  20 => 24.999999627470977 8
//  LOG  24 => 29.99999955296517 9
//  LOG  32 => 39.99999940395356 12
//  LOG  36 => 44.99999932944775 14
//  LOG  40 => 49.999999254941955 15
//  LOG  48 => 59.99999910593034 18
//  LOG  64 => 79.99999880790712 24
//  LOG  96 => 119.99999821186069 37
//  LOG  128 => 159.99999761581424 49

// const tintColorLight = "#61E786";
// const tintColorDark = "#61E786";
// export const Colors = {
//   // Standard Theme Colors
//   light: {
//     text: "#11181C",
//     background: "#fff",
//     tint: tintColorLight,
//     icon: "#687076",
//     tabIconDefault: "#687076",
//     tabIconSelected: tintColorLight,
//   },
//   dark: {
//     text: "#FCF7F8",
//     background: "#212124",
//     tint: tintColorDark,
//     icon: "#FCF7F8",
//     tabIconDefault: "#FCF7F8",
//     tabIconSelected: tintColorDark,
//   },

//   // Custom UI Colors
//   primary: "#98AAE1",
//   tertiary: "#61E786",
//   foreground: "#FCF7F8",
//   background: "#212124",
//   surface: "#1E1E1E",

//   // Gradient stops
//   gradient: {
//     start: "rgba(33, 33, 36, 0)",
//     middle: "rgba(33, 33, 36, 0.95)",
//     end: "rgba(101, 126, 212, 1)",
//   },
// };

// // ==========================================
// // 4. FONTS
// // ==========================================

// export const Fonts = {
//   // 1. Custom Fonts (Cross-Platform)
//   // You don't need Platform.select because Expo handles the mapping.
//   sans: "Quicksand", // Good for body text
//   serif: "YeonSung", // Good for headings/decorative text

//   // 2. Fallbacks (System Fonts)
//   // Keep Platform.select only for fonts you haven't replaced (like Mono)
//   mono: Platform.select({
//     ios: "ui-monospace",
//     android: "monospace",
//     default: "monospace",
//   }),

//   // Optional: Add semantic names for easier usage
//   heading: "YeonSung",
//   body: "Quicksand",
// };
