import { useState, useEffect, useCallback } from 'react'
import { fetchDomains } from '../api'
import AddDomainForm from '../components/AddDomainForm'
import DomainTable from '../components/DomainTable'
import toast from 'react-hot-toast'

export default function Dashboard({ onLogout }) {
    const [domains, setDomains] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    const loadDomains = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchDomains()
            setDomains(data.items)
            setTotal(data.total)
        } catch (err) {
            if (err.response?.status === 401) {
                toast.error('Session expired. Please sign in again.')
                onLogout()
            } else {
                toast.error('Failed to load domains.')
            }
        } finally {
            setLoading(false)
        }
    }, [onLogout])

    useEffect(() => { loadDomains() }, [loadDomains])

    const handleAdded = (newDomain) => {
        setDomains((prev) => [newDomain, ...prev])
        setTotal((t) => t + 1)
    }

    const handleUpdate = (updated, deletedId) => {
        if (deletedId) {
            setDomains((prev) => prev.filter((d) => d.id !== deletedId))
            setTotal((t) => t - 1)
        } else if (updated) {
            setDomains((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        }
    }

    const activeCnt = domains.filter((d) => d.status === 'active').length
    const revokedCnt = domains.filter((d) => d.status === 'revoked').length

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Nav */}
            <nav className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-white">Compliance Admin</span>
                    </div>
                    <button
                        onClick={onLogout}
                        id="logout-btn"
                        className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Domains', value: total, color: 'text-white', icon: '🌐' },
                        { label: 'Active', value: activeCnt, color: 'text-emerald-400', icon: '✅' },
                        { label: 'Revoked', value: revokedCnt, color: 'text-red-400', icon: '🚫' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5">
                            <p className="text-gray-500 text-sm flex items-center gap-2">
                                <span>{stat.icon}</span>{stat.label}
                            </p>
                            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Add form */}
                <AddDomainForm onAdded={handleAdded} />

                {/* Table */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Domain Records
                            {total > 0 && <span className="ml-2 text-gray-500 font-normal text-sm">({total})</span>}
                        </h2>
                        <button
                            onClick={loadDomains}
                            id="refresh-btn"
                            className="text-sm text-gray-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : (
                        <DomainTable domains={domains} onUpdate={handleUpdate} />
                    )}
                </div>
            </main>
        </div>
    )
}
