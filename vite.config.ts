import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: adjust base if repo name changes
export default defineConfig({
  plugins: [react()],
  base: '/da-quickcheck/'
})
