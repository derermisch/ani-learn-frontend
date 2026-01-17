/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        primary: "var(--color-primary)",
        tertiary: "var(--color-tertiary)",
        muted: "var(--color-muted)",

        // Content
        foreground: "var(--color-text)",
        icon: "var(--color-icon)", // New: Use text-icon
        border: "var(--color-border)", // New: Use border-border
      },
      fontFamily: {
        heading: ["YeonSung"],
        japanese: ["NotoSansJP-Regular"],
        "japanese-thin": ["NotoSansJP-Thin"],
        "japanese-extralight": ["NotoSansJP-ExtraLight"],
        "japanese-light": ["NotoSansJP-Light"],
        "japanese-medium": ["NotoSansJP-Medium"],
        "japanese-semibold": ["NotoSansJP-SemiBold"],
        "japanese-bold": ["NotoSansJP-Bold"],
        "japanese-extrabold": ["NotoSansJP-ExtraBold"],
        "japanese-black": ["NotoSansJP-Black"],
        sans: ["Quicksand-Regular"], // Default: font-sans
        "sans-light": ["Quicksand-Light"], // Usage: font-sans-light
        "sans-medium": ["Quicksand-Medium"], // Usage: font-sans-medium
        "sans-semibold": ["Quicksand-SemiBold"], // Usage: font-sans-bold
        "sans-bold": ["Quicksand-Bold"], // Usage: font-sans-bold
      },
      // 1. Map Spacing (Padding, Margin, Width, Height, Gap)
      spacing: {
        // Your specific spacing values
        xxxs_2: "2px",
        xxxs_4: "4px",
        xxs_6: "6px",
        xxs_8: "8px",
        xs_12: "12px",
        sm_16: "16px",
        sm_24: "24px",
        md_32: "32px",
        md_48: "48px",
        lg_96: "96px",
        xl_128: "128px",

        // Your standalone sizes (tab bar, icons)
        // Adding them here makes them available as w-iconMd, h-tabBarHeight, etc.
        tabBarHeight: "60px",
        iconMd: "24px",
        iconLg: "32px",
      },

      // 2. Map Border Radius
      borderRadius: {
        sm_8: "8px",
      },
    },
  },
  plugins: [],
};
