/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "mac-caption": ["11px", { lineHeight: "14px", letterSpacing: "0" }],
        "mac-body": ["13px", { lineHeight: "18px" }],
        "mac-title": ["15px", { lineHeight: "20px" }],
        "mac-large": ["22px", { lineHeight: "26px" }],
        "mac-hero": ["40px", { lineHeight: "44px" }],
      },
    },
  },
  plugins: [],
};
