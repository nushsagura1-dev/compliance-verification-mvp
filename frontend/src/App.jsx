import { useState } from 'react'
import { clearAdminKey, getAdminKey } from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
    const [authenticated, setAuthenticated] = useState(!!getAdminKey())

    const handleLogin = (key) => {
        setAuthenticated(true)
    }

    const handleLogout = () => {
        clearAdminKey()
        setAuthenticated(false)
    }

    return authenticated ? (
        <Dashboard onLogout={handleLogout} />
    ) : (
        <Login onLogin={handleLogin} />
    )
}
