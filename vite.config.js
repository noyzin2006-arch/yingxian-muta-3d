import { defineConfig } from 'vite';

// 应县木塔 3D —— 纯静态 SPA，无后端、无第三方 CDN。
// 所有资产均由程序在运行时生成，因此不需要任何 public/ 下的二进制资源。
export default defineConfig({
  base: './',            // 相对路径：dist/ 可直接以 file:// 或任意子路径部署
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 900
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false
  }
});
