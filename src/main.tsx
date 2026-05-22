import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { ErrorBoundary } from './sdk/ui/ErrorBoundary'
import './index.css'
import './site/styles/fonts.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
