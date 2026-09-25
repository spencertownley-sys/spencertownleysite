import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/orbitron'
import './styles/base.css'
import './styles/room.css'
import './styles/brain.css'
import './styles/panels.css'
import App from './App'
import { installAudioUnlock } from './lib/audio'

installAudioUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
