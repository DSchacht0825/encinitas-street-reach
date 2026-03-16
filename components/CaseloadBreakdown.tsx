'use client'

import { useState } from 'react'

type PersonData = {
  id: string
  first_name: string
  last_name: string
  case_manager?: string | null
  exit_date?: string | null
}

type CaseloadBreakdownProps = {
  persons: PersonData[]
}

export default function CaseloadBreakdown({ persons }: CaseloadBreakdownProps) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null)

  // Filter to active clients only (no exit_date)
  const activeClients = persons.filter(p => !p.exit_date)

  // Group by case manager
  const caseloadByWorker = activeClients.reduce((acc, p) => {
    const worker = p.case_manager || 'Unassigned'
    if (!acc[worker]) {
      acc[worker] = []
    }
    acc[worker].push({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
    })
    return acc
  }, {} as Record<string, { id: string; name: string }[]>)

  const totalActiveClients = activeClients.length

  const toggleWorker = (worker: string) => {
    setExpandedWorker(expandedWorker === worker ? null : worker)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Caseloads by Outreach Worker
        <span className="ml-2 text-sm font-normal text-gray-500">(click to see names)</span>
      </h3>
      <div className="mb-4">
        <p className="text-3xl font-bold text-indigo-600">{totalActiveClients}</p>
        <p className="text-sm text-gray-500">Total active clients</p>
      </div>

      {Object.keys(caseloadByWorker).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(caseloadByWorker)
            .sort(([workerA, clientsA], [workerB, clientsB]) => {
              // Put "Unassigned" at the end
              if (workerA === 'Unassigned') return 1
              if (workerB === 'Unassigned') return -1
              // Sort by count descending
              return clientsB.length - clientsA.length
            })
            .map(([worker, clients]) => (
              <div key={worker} className="border border-indigo-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleWorker(worker)}
                  className={`w-full flex justify-between items-center px-4 py-3 hover:bg-indigo-100 transition-colors text-left ${
                    worker === 'Unassigned' ? 'bg-gray-50' : 'bg-indigo-50'
                  }`}
                >
                  <span className={`font-medium ${worker === 'Unassigned' ? 'text-gray-500 italic' : 'text-gray-700'}`}>
                    {worker}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${worker === 'Unassigned' ? 'text-gray-500' : 'text-indigo-600'}`}>
                      {clients.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedWorker === worker ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedWorker === worker && (
                  <div className="bg-white px-4 py-3 border-t border-indigo-200 max-h-64 overflow-y-auto">
                    <ul className="space-y-2">
                      {clients
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((client) => (
                          <li key={client.id} className="flex items-center py-1 border-b border-gray-100 last:border-0">
                            <span className="font-medium text-gray-800">{client.name}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">No active clients</p>
      )}
    </div>
  )
}
