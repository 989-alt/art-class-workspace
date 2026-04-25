import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Vercel 빌드(VERCEL=1 자동 주입) → 루트 `/` 에서 서빙.
// 그 외 빌드(GitHub Pages 등) → `/art-class-workspace/` 서브패스.
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/art-class-workspace/',
  plugins: [react()],
})
