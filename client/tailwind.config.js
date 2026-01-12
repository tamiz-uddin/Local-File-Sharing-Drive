/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Google Drive inspired palette
                surface: '#F8FAFD', // Light blue-ish gray background
                surfaceHover: '#E8F0FE', // Light blue hover
                onSurface: '#1F1F1F', // Nearly black text
                secondaryText: '#444746', // Dark gray text
                primary: '#C2E7FF', // Primary action button (light blue)
                primaryHover: '#B3D7EF',
                primaryText: '#001D35',
                accent: '#0B57D0', // Accent blue
                outline: '#747775',
                border: '#C7C7C7',
            },
            fontFamily: {
                sans: ['Google Sans', 'Roboto', 'Arial', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
                'card-hover': '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)',
                'floating': '0 4px 6px 0 rgba(0, 0, 0, 0.3)',
            }
        },
    },
    plugins: [],
}
