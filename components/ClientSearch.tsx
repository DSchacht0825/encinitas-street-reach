'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fuzzySearchPersons } from '@/lib/utils/duplicate-detection'
import { format } from 'date-fns'
import Link from 'next/link'

interface Person {
  id: string
  client_id: string
  first_name: string
  last_name: string
  nickname: string | null
  date_of_birth: string
  last_encounter?: {
    service_date: string
    outreach_location: string
  }
}

// Helper function to calculate age from date of birth
function calculateAge(dob: string): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export default function ClientSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allPersons, setAllPersons] = useState<Person[]>([])
  const [filteredPersons, setFilteredPersons] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // Load all persons on component mount
  useEffect(() => {
    loadPersons()
  }, [])

  // Filter persons when search term changes
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredPersons(allPersons.slice(0, 20)) // Show first 20 by default
      setIsSearching(false)
    } else {
      setIsSearching(true)
      const results = fuzzySearchPersons(searchTerm, allPersons)
      setFilteredPersons(results.slice(0, 20))
      setIsSearching(false)
    }
  }, [searchTerm, allPersons])

  const loadPersons = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Get all persons with their most recent encounter
      const { data: persons, error } = await supabase
        .from('persons')
        .select(`
          id,
          client_id,
          first_name,
          last_name,
          nickname,
          date_of_birth,
          encounters (
            service_date,
            outreach_location
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process the data to include only the most recent encounter
      const processedPersons = persons?.map((person: any) => ({
        ...person,
        last_encounter: person.encounters && person.encounters.length > 0
          ? person.encounters.sort((a: any, b: any) =>
              new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
            )[0]
          : undefined,
        encounters: undefined, // Remove the full encounters array
      })) || []

      setAllPersons(processedPersons)
      setFilteredPersons(processedPersons.slice(0, 20))
    } catch (error) {
      console.error('Error loading persons:', error)
      alert('Error loading clients. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, nickname, or client ID..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          {isLoading
            ? 'Loading...'
            : isSearching
            ? 'Searching...'
            : `Showing ${filteredPersons.length} of ${allPersons.length} clients`}
        </span>
        <Link
          href="/client/new"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          + New Client
        </Link>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      ) : filteredPersons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-gray-600 font-medium">No clients found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm
              ? 'Try a different search term'
              : 'Get started by adding a new client'}
          </p>
          <Link
            href="/client/new"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add New Client
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPersons.map((person) => (
            <Link
              key={person.id}
              href={`/client/${person.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {person.first_name} {person.last_name}
                    {person.nickname && (
                      <span className="text-sm text-gray-600 ml-2 font-normal">
                        (aka {person.nickname})
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">ID:</span> {person.client_id} |{' '}
                      <span className="font-medium">Age:</span> {calculateAge(person.date_of_birth)} |{' '}
                      <span className="font-medium">DOB:</span>{' '}
                      {format(new Date(person.date_of_birth), 'MM/dd/yyyy')}
                    </p>
                    {person.last_encounter && (
                      <p className="text-gray-500">
                        <span className="font-medium">Last seen:</span>{' '}
                        {format(
                          new Date(person.last_encounter.service_date),
                          'MM/dd/yyyy'
                        )}{' '}
                        at {person.last_encounter.outreach_location}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
