import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#128C7E',
          dark: '#075E54',
          light: '#DCF8C6',
          lighter: '#ECE5DD',
        },
      },
    },
  },
  plugins: [],
}
export default config
