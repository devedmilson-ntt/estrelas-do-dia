/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka"', '"Quicksand"', 'sans-serif'],
        body: ['"Quicksand"', 'system-ui', 'sans-serif']
      },
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        gold: 'var(--gold)',
        'gold-glow': 'var(--gold-glow)',
        'star-empty': 'var(--star-empty)',
        teal: 'var(--teal)',
        'teal-text': 'var(--teal-text)',
        green: 'var(--green)',
        'green-soft': 'var(--green-soft)',
        pink: 'var(--pink)',
        'pink-text': 'var(--pink-text)',
        coral: 'var(--coral)',
        'coral-soft': 'var(--coral-soft)',
        violet: 'var(--violet)',
        'violet-soft': 'var(--violet-soft)',
        line: 'var(--line)'
      },
      boxShadow: {
        sticker: '3px 4px 0 var(--ink)',
        'sticker-sm': '2px 3px 0 var(--ink)'
      },
      borderWidth: {
        3: '2.5px'
      }
    }
  },
  plugins: []
}
