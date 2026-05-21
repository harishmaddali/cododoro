/** @type {import('tailwindcss').Config} */
// Mirrors the desktop-app token palette from apps/desktop-app/src/index.css so
// the landing page reads as the same product. Only the visual tokens are
// duplicated — the desktop app keeps using CSS custom properties at runtime,
// while the landing bakes them into Tailwind utilities at build time.
module.exports = {
  content: ["./src/**/*.{astro,html,ts,tsx,md,mdx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        bg: {
          0: "#07090c",
          1: "#0c1015",
          2: "#11161e",
          3: "#161c26",
        },
        line: {
          DEFAULT: "#1f2733",
          2: "#2a3340",
        },
        fg: {
          0: "#e7ecf3",
          1: "#aab2bf",
          2: "#6e7684",
          3: "#4a5160",
        },
        grass: {
          0: "#161c26",
          1: "#0e3a23",
          2: "#14633a",
          3: "#1f9d57",
          4: "#39d878",
        },
        warn: "#f5a524",
        danger: "#ef4a4a",
      },
      boxShadow: {
        glow: "0 8px 28px -10px rgba(57, 216, 120, 0.45)",
        "glow-lg": "0 12px 48px -16px rgba(57, 216, 120, 0.55)",
      },
      fontFamily: {
        sans: [
          "Geist",
          "Plus Jakarta Sans",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "24px",
      },
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle at center, rgba(57,216,120,0.06) 0, transparent 60%), radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "auto, 18px 18px",
      },
    },
  },
  plugins: [],
};
