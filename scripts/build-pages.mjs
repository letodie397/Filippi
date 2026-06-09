import { execSync } from 'child_process'

process.env.VITE_BASE_PATH = '/Filippi/'

execSync('npm run build:locations && tsc && vite build', {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})
