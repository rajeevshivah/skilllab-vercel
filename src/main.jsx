import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OrgProvider } from './context/OrgContext'
import { SemesterProvider } from './context/SemesterContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <OrgProvider>
        <AuthProvider>
          <SemesterProvider>
            <App />
          </SemesterProvider>
        </AuthProvider>
      </OrgProvider>
    </BrowserRouter>
  </React.StrictMode>
)
