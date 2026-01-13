import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AudioProvider } from './context/AudioContext'
import { CompressorProvider } from './context/CompressorContext'
import { UIProvider } from './context/UIContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AudioProvider>
      <CompressorProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </CompressorProvider>
    </AudioProvider>
  </StrictMode>,
)
