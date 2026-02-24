import { useState } from 'react'
import { createDomain } from '../api'
import toast from 'react-hot-toast'

const COMPLIANCE_LEVELS = ['basic', 'standard', 'advanced', 'premium']

export default function AddDomainForm({ onAdded }) {
    const [domain, setDomain] = useState('')
    const [level, setLevel] = useState('basic')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!domain.trim()) return
        setLoading(true)
        try {
            const result = await createDomain(domain.trim(), level)
            toast.success(`Domain "${result.domain_name}" added!`)
            setDomain('')
            setLevel('basic')
            onAdded(result)
        } catch (err) {
            const msg = err.response?.data?.detail || 'Failed to create domain.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </span>
                Add Domain
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    id="domain-name-input"
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    required
                    className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
                <select
                    id="compliance-level-select"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                >
                    {COMPLIANCE_LEVELS.map((l) => (
                        <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                </select>
                <button
                    type="submit"
                    id="add-domain-btn"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                    {loading ? 'Adding…' : 'Add'}
                </button>
            </form>
        </div>
    )
}
