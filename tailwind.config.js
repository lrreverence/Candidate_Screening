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
        "primary": "#3b82f6",
        "secondary": "#1e40af",
        "background-light": "#f0f4f8",
        "background-dark": "#0f172a",
        "card-dark": "#1e293b",
        "text-muted": "#93c5fd",
        "brand-navy": "#003366",
        "surface-dark": "#1e293b",
        "surface-light": "#ffffff",
        "border-dark": "#1e40af",
        "accent-green": "#2563eb",
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

