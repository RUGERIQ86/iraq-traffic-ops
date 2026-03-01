import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'

// Force clear cache on load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-center"
      toastOptions={{
        style: {
          background: '#000',
          color: '#00ff00',
          borderRadius: '0',
          border: '1px solid #00ff00',
          fontFamily: 'monospace',
          fontSize: '12px',
          boxShadow: '0 0 10px rgba(0,255,0,0.5)'
        }
      }}
    />
  </StrictMode>,
)
