import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// يمكنك حذف استيراد Toaster من هنا أيضاً إذا أردت
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
    {/* أبقينا فقط على App لأنه يحتوي بداخله على نظام الإشعارات المحمي */}
    <App />
  </StrictMode>,
)