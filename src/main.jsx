import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TestApp from './TestApp.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { AudioProvider } from './context/AudioContext'
import { CompressorProvider } from './context/CompressorContext'
import { UIProvider } from './context/UIContext'

console.log('🚀 Main.jsx loading...');

// Toggle between TestApp and real App for debugging
const USE_TEST_APP = false;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {USE_TEST_APP ? (
        <TestApp />
      ) : (
        <AudioProvider>
          <CompressorProvider>
            <UIProvider>
              <App />
            </UIProvider>
          </CompressorProvider>
        </AudioProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
)

console.log('✅ React app rendered');
