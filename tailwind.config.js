/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        booth: {
          bg: "#0b1020",
          panel: "#11172a",
          accent: "#7c5cff",
          accentStrong: "#5a3bff",
          text: "#f8f9ff",
          muted: "#aab0d6",
          danger: "#ff5c7a"
        }
      },
      boxShadow: {
        panel: "0 10px 30px rgba(10, 14, 40, 0.35)"
      }
    }
  },
  plugins: []
};
