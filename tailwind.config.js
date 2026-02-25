/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          gold: {
            DEFAULT: '#C2A475',
            light: '#d4b98a',
          },
          'brick-red': '#B54C35',
          panel: '#202020',
          app: '#111111',
          green: '#618C71',
          disabled: '#313131',
        },
      },
    },
    plugins: [],
  }