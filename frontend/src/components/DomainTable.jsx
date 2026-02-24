import { useState } from 'react'
import { revokeDomain, deleteDomain } from '../api'
import toast from 'react-hot-toast'

function StatusBadge({ status }) {
    if (status === 'active') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Revoked
        </span>
    )
}

function CopyButton({ text, label }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={handleCopy}
            title={`Copy ${label}`}
            className="text-gray-500 hover:text-indigo-400 transition-colors"
        >
            {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
            )}
        </button>
    )
}

export default function DomainTable({ domains, onUpdate }) {
    const [revoking, setRevoking] = useState(null)
    const [deleting, setDeleting] = useState(null)

    const handleRevoke = async (domain) => {
        if (!confirm(`Revoke "${domain.domain_name}"? This cannot be undone.`)) return
        setRevoking(domain.id)
        try {
            const updated = await revokeDomain(domain.id)
            toast.success(`"${domain.domain_name}" revoked.`)
            onUpdate(updated)
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Revocation failed.')
        } finally {
            setRevoking(null)
        }
    }

    const handleDelete = async (domain) => {
        if (!confirm(`Permanently delete "${domain.domain_name}"?`)) return
        setDeleting(domain.id)
        try {
            await deleteDomain(domain.id)
            toast.success(`"${domain.domain_name}" deleted.`)
            onUpdate(null, domain.id)
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Deletion failed.')
        } finally {
            setDeleting(null)
        }
    }

    const verifyUrl = (domainName) =>
        `${window.location.protocol}//${window.location.hostname}:8000/verify?domain=${domainName}`

    if (domains.length === 0) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm">No domains yet. Add your first one above.</p>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-gray-500 font-medium px-6 py-4">Domain</th>
                            <th className="text-left text-gray-500 font-medium px-6 py-4">Status</th>
                            <th className="text-left text-gray-500 font-medium px-6 py-4">Level</th>
                            <th className="text-left text-gray-500 font-medium px-6 py-4">Issued</th>
                            <th className="text-left text-gray-500 font-medium px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {domains.map((d) => (
                            <tr key={d.id} className="hover:bg-gray-800/40 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">{d.domain_name}</span>
                                        <CopyButton text={JSON.stringify(d, null, 2)} label="JSON" />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={d.status} />
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700">
                                        {d.compliance_level}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-400">
                                    {new Date(d.issued_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                    })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {/* Verify link */}
                                        <a
                                            href={verifyUrl(d.domain_name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Open verification URL"
                                            className="text-gray-500 hover:text-indigo-400 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                            </svg>
                                        </a>
                                        {/* Revoke */}
                                        {d.status === 'active' && (
                                            <button
                                                onClick={() => handleRevoke(d)}
                                                disabled={revoking === d.id}
                                                title="Revoke"
                                                className="text-gray-500 hover:text-amber-400 transition-colors disabled:opacity-50"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                            </button>
                                        )}
                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDelete(d)}
                                            disabled={deleting === d.id}
                                            title="Delete"
                                            className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
