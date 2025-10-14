import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'

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

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch person details
  const { data: person, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !person) {
    notFound()
  }

  // Fetch encounters count
  const { count: encounterCount } = await supabase
    .from('encounters')
    .select('*', { count: 'exact', head: true })
    .eq('person_id', params.id)

  const age = calculateAge(person.date_of_birth)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue Header Bar */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="https://www.sdrescue.org/wp-content/uploads/2021/06/SDRMLogo2016.svg"
                alt="San Diego Rescue Mission"
                width={180}
                height={60}
                className="h-12 w-auto bg-white p-2 rounded"
              />
              <div className="border-l-2 border-blue-500 pl-4">
                <h1 className="text-2xl font-bold text-white">
                  Encinitas Street Reach
                </h1>
                <p className="text-blue-200 text-sm">
                  By-name list & service tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back link */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link
              href="/"
              className="text-blue-700 hover:text-blue-800 font-medium mb-4 inline-flex items-center"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Client List
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mt-4">
              {person.first_name} {person.last_name}
              {person.nickname && (
                <span className="text-xl text-gray-600 ml-2">
                  (aka {person.nickname})
                </span>
              )}
            </h2>
            <p className="text-gray-600 mt-1">
              Client ID: {person.client_id}
            </p>
          </div>
          <Link
            href={`/client/${params.id}/encounter/new`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Service Interaction
          </Link>
        </div>

        {/* Client Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Demographics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Demographics</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Age</dt>
                <dd className="font-medium">{age} years old</dd>
              </div>
              <div>
                <dt className="text-gray-600">Date of Birth</dt>
                <dd className="font-medium">{format(new Date(person.date_of_birth), 'MM/dd/yyyy')}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Gender</dt>
                <dd className="font-medium">{person.gender}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Race</dt>
                <dd className="font-medium">{person.race}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Ethnicity</dt>
                <dd className="font-medium">{person.ethnicity}</dd>
              </div>
            </dl>
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Status</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Living Situation</dt>
                <dd className="font-medium">{person.living_situation}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Time Homeless</dt>
                <dd className="font-medium">{person.length_of_time_homeless || 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Enrollment Date</dt>
                <dd className="font-medium">{format(new Date(person.enrollment_date), 'MM/dd/yyyy')}</dd>
              </div>
              <div className="flex items-center">
                {person.veteran_status && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">Veteran</span>}
                {person.chronic_homeless && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Chronic</span>}
              </div>
            </dl>
          </div>

          {/* Service Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Service Summary</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Total Interactions</dt>
                <dd className="text-2xl font-bold text-blue-600">{encounterCount || 0}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Case Manager</dt>
                <dd className="font-medium">{person.case_manager || 'Not assigned'}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Referral Source</dt>
                <dd className="font-medium">{person.referral_source || 'Not recorded'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Interaction Timeline - Coming Soon */}
        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-xl font-semibold mb-4">Service Interaction Timeline</h3>
          <div className="text-center py-12 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>Timeline view coming soon!</p>
            <p className="text-sm mt-2">This will show all service interactions, case notes, and progress.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
