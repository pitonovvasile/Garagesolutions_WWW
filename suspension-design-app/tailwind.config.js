/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0b0f14",
        panel2: "#12181f",
        accent: "#3b82f6",
        accent2: "#06b6d4",
        danger: "#f43f5e",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(6, 182, 212, 0.15)",
      },
    },
  },
  plugins: [],
};
