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

  // Fetch encounters count and data
  const { data: encounters, count: encounterCount } = await supabase
    .from('encounters')
    .select('*', { count: 'exact' })
    .eq('person_id', params.id)
    .order('service_date', { ascending: false })

  const allEncounters = encounters || []
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

        {/* Interaction Timeline */}
        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-xl font-semibold mb-6">Service Interaction Timeline</h3>

          {allEncounters.length === 0 ? (
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
              <p>No service interactions recorded yet</p>
              <p className="text-sm mt-2">
                Click "New Service Interaction" above to record the first encounter
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {allEncounters.map((encounter, index) => (
                <div
                  key={encounter.id}
                  className="relative pl-8 pb-8 border-l-2 border-gray-200 last:pb-0 last:border-l-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 -ml-2 w-4 h-4 rounded-full bg-blue-600 border-4 border-white"></div>

                  {/* Encounter card */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {format(new Date(encounter.service_date), 'MMMM dd, yyyy')}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {encounter.outreach_location}
                        </p>
                        <p className="text-sm text-gray-500">
                          Outreach Worker: {encounter.outreach_worker}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Interaction #{allEncounters.length - index}
                      </span>
                    </div>

                    {/* Services Provided */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Clinical Services */}
                      {(encounter.mat_referral || encounter.detox_referral || encounter.co_occurring_mh_sud) && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Clinical Services
                          </h5>
                          <ul className="space-y-1 text-sm">
                            {encounter.mat_referral && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                MAT Referral
                                {encounter.mat_type && ` - ${encounter.mat_type}`}
                                {encounter.mat_provider && ` (${encounter.mat_provider})`}
                              </li>
                            )}
                            {encounter.detox_referral && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Detox Referral
                                {encounter.detox_provider && ` - ${encounter.detox_provider}`}
                              </li>
                            )}
                            {encounter.co_occurring_mh_sud && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Co-Occurring MH/SUD
                                {encounter.co_occurring_type && ` - ${encounter.co_occurring_type}`}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Harm Reduction */}
                      {(encounter.naloxone_distributed || encounter.fentanyl_test_strips_count || encounter.harm_reduction_education) && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Harm Reduction
                          </h5>
                          <ul className="space-y-1 text-sm">
                            {encounter.naloxone_distributed && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Naloxone Kit Distributed
                              </li>
                            )}
                            {encounter.fentanyl_test_strips_count > 0 && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Fentanyl Test Strips ({encounter.fentanyl_test_strips_count})
                              </li>
                            )}
                            {encounter.harm_reduction_education && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Harm Reduction Education
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Other Services */}
                      {(encounter.transportation_provided || encounter.shower_trailer || encounter.other_services) && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Other Services
                          </h5>
                          <ul className="space-y-1 text-sm">
                            {encounter.transportation_provided && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Transportation Provided
                              </li>
                            )}
                            {encounter.shower_trailer && (
                              <li className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Shower Trailer Access
                              </li>
                            )}
                            {encounter.other_services && (
                              <li className="flex items-start text-gray-600">
                                <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>{encounter.other_services}</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Case Notes */}
                    {encounter.case_management_notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">
                          Case Notes
                        </h5>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {encounter.case_management_notes}
                        </p>
                      </div>
                    )}

                    {/* GPS Coordinates */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        GPS: {encounter.latitude.toFixed(6)}, {encounter.longitude.toFixed(6)}
                        {encounter.language_preference && ` • Language: ${encounter.language_preference}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
