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
  setTimeout(() => {
    sessionStorage.removeItem('vite_preload_reloaded');
  }, 5000);
}

// ✅ DOM SAFETY SHIELD:
// Prevents React from throwing 'NotFoundError: Failed to execute removeChild on Node'
// when Google Translate, browser extensions (Grammarly, password autofill), or animation transitions
// detach or mutate DOM nodes asynchronously during React reconciler unmount passes.
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
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

