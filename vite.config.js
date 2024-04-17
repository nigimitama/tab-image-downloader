import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const sourceRoot = resolve(__dirname, 'src')
const outDir = resolve(__dirname, 'dist')

// https://vitejs.dev/config/
// 参考: https://ja.vitejs.dev/guide/build.html#multi-page-app
export default defineConfig({
  root: sourceRoot,
  plugins: [react()],
  build: {
    outDir: outDir,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        option: resolve(__dirname, 'src/options/index.html'),
      },
    },
  },
})
