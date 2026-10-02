/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bosque: '#1F4E34',
        dorado: '#C49A45',
        fondo: '#F8F9FA',
        alerta: '#8B0000',
      },
      boxShadow: {
        soft: '0 12px 30px rgba(31,78,52,0.12)',
      },
    },
  },
  plugins: [],
};
