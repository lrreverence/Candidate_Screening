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
        "primary": "#2bee79",
        "secondary": "#234832",
        "background-light": "#f6f8f7",
        "background-dark": "#112218",
        "card-dark": "#193324",
        "text-muted": "#92c9a8",
        "brand-navy": "#003366",
        "surface-dark": "#193324",
        "surface-light": "#ffffff",
        "border-dark": "#234832",
        "accent-green": "#326747",
        "navy": "#003366",
        "navy-light": "#004080",
        "gold": "#FFD700",
        "navy-dark": "#0d121c",
        "panel-dark": "#161e2c",
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"]
      },
      borderRadius: { 
        "DEFAULT": "1rem", 
        "lg": "1.5rem", 
        "xl": "2rem", 
        "2xl": "3rem", 
        "full": "9999px" 
      },
    },
  },
  plugins: [],
}

