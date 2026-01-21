/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#137fec",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "surface-light": "#ffffff",
        "surface-dark": "#1e293b",
        "border-light": "#cfdbe7",
        "border-dark": "#334155",
      },
      fontFamily: {
        "sans": ["\"Be Vietnam Pro\"", "Arial", "sans-serif"],
        "serif": ["Times New Roman", "serif"],
        "display": ["\"Be Vietnam Pro\"", "Arial", "sans-serif"],
        "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "\"Liberation Mono\"", "\"Courier New\"", "\"Be Vietnam Pro\"", "monospace"]
      },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
    },
  },
  plugins: [],
}
