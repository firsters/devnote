import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

const version = pkg.version
const timestamp = new Date().toLocaleString('ko-KR', { 
  timeZone: 'Asia/Seoul', 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit', 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit',
  hour12: false 
}).replace(/\. /g, '').replace(':', '').replace(/\s/g, '').replace(':', '')

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`v${version}.${timestamp}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5242880, // 5MiB
      },
      manifest: {
        name: 'DevNote',
        short_name: 'DevNote',
        description: 'Developer Snippet & Note Management',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        share_target: {
          action: '/?share=true',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      }
    })
  ],
})