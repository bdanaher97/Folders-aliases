/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0c0c",
        paper: "#fafafa",
        lightbox: "rgba(255,255,255,0.70)", // white/70 overlay
        tilebg: "rgba(0,0,0,0.05)", // gallery tile bg
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
      },
      transitionTimingFunction: {
        zoom: "cubic-bezier(.2,.6,.2,1)",
      },
    },
  },
  plugins: [],
};
