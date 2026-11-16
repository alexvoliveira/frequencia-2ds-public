/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#070B2A',
        panel: '#10183D',
        panel2: '#121C46',
        line: '#202B59',
        line2: '#304A82',
        text: '#F4F7FF',
        muted: '#A8B1CC',
        dim: '#69738F',
        cyan: '#00D9FF',
        blue: '#268CFF',
        pink: '#FF176B',
        purple: '#8B5CF6',
        orange: '#FFAA32',
        green: '#20D68A',
        red: '#FF456E'
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,.22)',
        hover: '0 12px 35px rgba(0,0,0,.30)',
        modal: '0 20px 60px rgba(0,0,0,.50)'
      }
    }
  },
  plugins: []
}
