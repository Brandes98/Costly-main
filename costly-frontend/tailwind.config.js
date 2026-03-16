/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
      colors: {
        ink:    '#1A2433',
        slate:  '#5C7089',
        mist:   '#8FA3B8',
        border: '#E2E8EF',
        'border-lt': '#EEF1F5',
        bg:     '#F2F5F8',
        sur:    '#FFFFFF',
        sur2:   '#F8FAFB',
        sur3:   '#F0F4F7',
        // Teal — color primario
        tl:     '#1F7A7A',
        'tl-d': '#155555',
        'tl-m': '#2A9494',
        'tl-l': '#DFF2F2',
        'tl-xl':'#F0FAFA',
        // Dorado
        gd:     '#B8821A',
        'gd-l': '#FBF3E3',
        am:     '#D97706',
        // Rojo
        rs:     '#A33A36',
        'rs-l': '#FDF1F0',
        // Verde
        sg:     '#3A6B4A',
        'sg-l': '#E8F4ED',
        // Violeta
        vi:     '#5B4FCF',
        'vi-l': '#EEECFB',
        op:     '#9DB3C8',
      },
      boxShadow: {
        'sh0': '0 1px 4px rgba(26,36,51,.07)',
        'sh1': '0 3px 14px rgba(26,36,51,.09)',
        'sh2': '0 8px 32px rgba(26,36,51,.12)',
      },
      borderRadius: {
        card: '11px',
      }
    },
  },
  plugins: [],
}
