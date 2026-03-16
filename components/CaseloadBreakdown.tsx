'use client'

import { useState } from 'react'

type PersonData = {
  id: string
  first_name: string
  last_name: string
  exit_date?: string | null
  enrollment_date: string
}

type EncounterData = {
  person_id: string
  outreach_worker: string
  service_date: string
}

type CaseloadBreakdownProps = {
  persons: PersonData[]
  encounters: EncounterData[]
}

// Normalize worker names to standard names
const normalizeWorkerName = (name: string): string | null => {
  const normalized = name.toLowerCase().trim()

  // Mario variations
  if (normalized.includes('mario')) {
    return 'Mario'
  }

  // Ben/Benjamin variations
  if (normalized.includes('ben') || normalized.includes('salas')) {
    return 'Ben'
  }

  // Stephanie variations
  if (normalized.includes('stephanie') || normalized.includes('duffy')) {
    return 'Stephanie'
  }

  // Not one of the three workers
  return null
}

export default function CaseloadBreakdown({ persons, encounters }: CaseloadBreakdownProps) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null)

  // Filter to active clients only (no exit_date)
  const activeClients = persons.filter(p => !p.exit_date)

  // Find the intake worker for each person (first encounter)
  const getIntakeWorker = (personId: string): string | null => {
    const personEncounters = encounters
      .filter(e => e.person_id === personId)
      .sort((a, b) => new Date(a.service_date).getTime() - new Date(b.service_date).getTime())

    if (personEncounters.length === 0) return null

    return normalizeWorkerName(personEncounters[0].outreach_worker)
  }

  // Group by intake worker (Mario, Ben, Stephanie, Unassigned)
  const caseloadByWorker: Record<string, { id: string; name: string }[]> = {
    'Mario': [],
    'Ben': [],
    'Stephanie': [],
    'Unassigned': [],
  }

  activeClients.forEach(p => {
    const worker = getIntakeWorker(p.id)
    if (worker && caseloadByWorker[worker]) {
      caseloadByWorker[worker].push({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
      })
    } else {
      caseloadByWorker['Unassigned'].push({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
      })
    }
  })

  const totalClients = activeClients.length

  const toggleWorker = (worker: string) => {
    setExpandedWorker(expandedWorker === worker ? null : worker)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Caseloads
        <span className="ml-2 text-sm font-normal text-gray-500">(click to see names)</span>
      </h3>
      <div className="mb-4">
        <p className="text-3xl font-bold text-indigo-600">{totalClients}</p>
        <p className="text-sm text-gray-500">Total active clients</p>
      </div>

      <div className="space-y-3">
        {Object.entries(caseloadByWorker)
          .sort(([workerA, clientsA], [workerB, clientsB]) => {
            // Put Unassigned at the end
            if (workerA === 'Unassigned') return 1
            if (workerB === 'Unassigned') return -1
            // Sort by count descending
            return clientsB.length - clientsA.length
          })
          .map(([worker, clients]) => (
            <div key={worker} className={`border rounded-lg overflow-hidden ${worker === 'Unassigned' ? 'border-gray-300' : 'border-indigo-200'}`}>
              <button
                onClick={() => toggleWorker(worker)}
                className={`w-full flex justify-between items-center px-4 py-3 transition-colors text-left ${
                  worker === 'Unassigned'
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-indigo-50 hover:bg-indigo-100'
                }`}
              >
                <span className={`font-medium ${worker === 'Unassigned' ? 'text-gray-500 italic' : 'text-gray-700'}`}>{worker}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${worker === 'Unassigned' ? 'text-gray-500' : 'text-indigo-600'}`}>{clients.length}</span>
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
                <div className={`bg-white px-4 py-3 border-t max-h-64 overflow-y-auto ${worker === 'Unassigned' ? 'border-gray-300' : 'border-indigo-200'}`}>
                  {clients.length > 0 ? (
                    <ul className="space-y-2">
                      {clients
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((client) => (
                          <li key={client.id} className="flex items-center py-1 border-b border-gray-100 last:border-0">
                            <span className="font-medium text-gray-800">{client.name}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No clients assigned</p>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
