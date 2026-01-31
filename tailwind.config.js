/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'rgb(var(--bg-main) / <alpha-value>)',
          paper: 'rgb(var(--bg-paper) / <alpha-value>)',
          subtle: 'rgb(var(--bg-subtle) / <alpha-value>)',
        },
        text: {
          main: 'rgb(var(--text-main) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-main) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary-main) / <alpha-value>)',
          fg: 'rgb(var(--primary-fg) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger-main) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [],
}