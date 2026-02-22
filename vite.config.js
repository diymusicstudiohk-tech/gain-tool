import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Embed latest git commit timestamp at build time
let gitCommitTime = 'unknown'
try {
  gitCommitTime = execSync('git log -1 --format=%cI').toString().trim()
} catch (_) {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT_TIME__: JSON.stringify(gitCommitTime),
  },
})
