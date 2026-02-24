import { useState } from 'react'
import { setAdminKey } from '../api'
import toast from 'react-hot-toast'

export default function Login({ onLogin }) {
    const [key, setKey] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!key.trim()) return
        setLoading(true)
        try {
            setAdminKey(key.trim())
            // Quick validation: hit /health which doesn't require auth, then /admin/domains
            const res = await fetch('/admin/domains?limit=1', {
                headers: { 'X-Admin-Key': key.trim() },
            })
            if (res.status === 401) {
                toast.error('Invalid admin key.')
                setAdminKey('')
            } else if (!res.ok) {
                toast.error('Cannot reach the server. Is the backend running?')
                setAdminKey('')
            } else {
                toast.success('Authenticated!')
                onLogin(key.trim())
            }
        } catch {
            toast.error('Cannot connect to the backend.')
            setAdminKey('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-md">
                {/* Logo / brand */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-5 shadow-lg shadow-indigo-500/30">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Compliance Admin</h1>
                    <p className="mt-2 text-gray-400 text-sm">Sign in to manage compliance records</p>
                </div>

                {/* Card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="admin-key" className="block text-sm font-medium text-gray-300 mb-2">
                                Admin API Key
                            </label>
                            <input
                                id="admin-key"
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Enter your admin key…"
                                required
                                className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Connecting…' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-600 text-xs mt-6">
                    Compliance Status Publishing & Verification MVP
                </p>
            </div>
        </div>
    )
}
