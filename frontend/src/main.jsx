import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Routes from './routes'
import './index.css'
import './services/auth-interceptor.js'
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

// jspdf-autotable v5 no longer patches jsPDF on import; register doc.autoTable()
// once here so the existing report exports keep working after the upgrade.
applyPlugin(jsPDF)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Routes />
  </StrictMode>,
)
