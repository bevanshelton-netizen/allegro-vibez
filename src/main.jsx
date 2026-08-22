import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/app.css'
import './styles/landing-upgrade.css'
import './styles/artist-magnet.css'
import './styles/platform-experience.css'
import './homeArtistExperience.js'
import './platformExperience.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
