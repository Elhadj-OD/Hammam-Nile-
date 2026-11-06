/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#002e25',
        gold: '#ffcd32',
        gold2: '#f0d27a',
        ink: '#f6ead6',
        mut: '#b2c9be'
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
}
