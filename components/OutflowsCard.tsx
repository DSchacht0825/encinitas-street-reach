'use client'

import { useState } from 'react'
import Link from 'next/link'

type OutflowPerson = {
  id: string
  client_id: string
  first_name: string
  last_name: string
  exit_date?: string | null
  exit_destination?: string | null
}

type OutflowsCardProps = {
  housed: OutflowPerson[]
  sheltered: OutflowPerson[]
  detox: OutflowPerson[]
}

type Bucket = 'housed' | 'sheltered' | 'detox'

const BUCKET_LABEL: Record<Bucket, string> = {
  housed: 'Housed (permanent housing)',
  sheltered: 'Sheltered',
  detox: 'Detox',
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OutflowsCard({ housed, sheltered, detox }: OutflowsCardProps) {
  const [openBucket, setOpenBucket] = useState<Bucket | null>(null)

  const buckets: Record<Bucket, OutflowPerson[]> = { housed, sheltered, detox }
  const total = housed.length + sheltered.length + detox.length

  const toggle = (b: Bucket) => setOpenBucket((cur) => (cur === b ? null : b))

  const tile = (b: Bucket, color: string) => {
    const count = buckets[b].length
    const isOpen = openBucket === b
    return (
      <button
        type="button"
        onClick={() => count > 0 && toggle(b)}
        aria-expanded={isOpen}
        disabled={count === 0}
        className={`bg-white rounded p-2 text-center transition-colors ${
          count > 0 ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        } ${isOpen ? 'ring-2 ring-amber-400' : ''}`}
      >
        <p className={`text-2xl font-bold ${color}`}>{count}</p>
        <p className="text-xs text-gray-600 capitalize">{b}</p>
      </button>
    )
  }

  const openList = openBucket ? buckets[openBucket] : []

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
      <div className="flex items-center mb-4">
        <svg className="w-6 h-6 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <h3 className="text-xl font-bold text-gray-900">Outflows</h3>
      </div>
      <p className="text-4xl font-bold text-amber-600">{total}</p>
      <p className="text-sm text-gray-600 mt-2">Exits to housing, shelter, or detox</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {tile('housed', 'text-blue-600')}
        {tile('sheltered', 'text-teal-600')}
        {tile('detox', 'text-purple-600')}
      </div>
      {total > 0 && (
        <p className="text-xs text-gray-500 mt-2">Click a category to see names</p>
      )}

      {openBucket && (
        <div className="mt-4 bg-white rounded-lg border border-amber-200 p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            {BUCKET_LABEL[openBucket]} — {openList.length}
          </p>
          <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {[...openList]
              .sort((a, b) => new Date(b.exit_date || 0).getTime() - new Date(a.exit_date || 0).getTime())
              .map((p) => (
                <li key={p.id} className="py-1.5 flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/client/${p.id}`}
                      className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {p.first_name} {p.last_name}
                    </Link>
                    {p.exit_destination && (
                      <p className="text-xs text-gray-500">
                        {p.exit_destination.split('(')[0].trim()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(p.exit_date)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
