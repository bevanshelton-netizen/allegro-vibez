import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles/allegro-rebuild.css'
import './styles/shelton-protocol.css'

const basePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basePath || undefined}>
      <ErrorBoundary><App /></ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
