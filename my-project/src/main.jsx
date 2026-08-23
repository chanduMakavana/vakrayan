import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store.js'
import { ToastProvider } from './context/ToastContext.jsx'
import ErrorBoundary from './componets/ErrorBoundary.jsx'
// Auto-recover from stale chunks/new deployments on mobile Safari & iOS WebKit
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    const reloaded = sessionStorage.getItem('vite_preload_reloaded');
    if (!reloaded) {
      sessionStorage.setItem('vite_preload_reloaded', 'true');
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>
)

