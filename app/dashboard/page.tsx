import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import EncounterHeatMap from '@/components/EncounterHeatMap'
import ExportButton from '@/components/ExportButton'
import CustomReportBuilder from '@/components/CustomReportBuilder'
import DuplicateManager from '@/components/DuplicateManager'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { start_date?: string; end_date?: string }
}) {
  const supabase = await createClient()

  // Parse date range from query params
  const startDate = searchParams.start_date || null
  const endDate = searchParams.end_date || null

  // Build base query for encounters
  let encountersQuery = supabase.from('encounters').select('*')

  if (startDate && endDate) {
    encountersQuery = encountersQuery
      .gte('service_date', startDate)
      .lte('service_date', endDate)
  }

  const { data: encounters, error: encountersError } = await encountersQuery

  // Fetch all persons
  const { data: persons, error: personsError } = await supabase
    .from('persons')
    .select('*')

  if (encountersError || personsError) {
    console.error('Dashboard data fetch error:', encountersError || personsError)
  }

  // Type assertions for Supabase data (all fields from database)
  type EncounterData = {
    service_date: string
    person_id: number
    outreach_location: string
    latitude: number
    longitude: number
    outreach_worker: string
    language_preference?: string | null
    co_occurring_mh_sud: boolean
    co_occurring_type?: string | null
    mat_referral: boolean
    mat_type?: string | null
    mat_provider?: string | null
    detox_referral: boolean
    detox_provider?: string | null
    naloxone_distributed: boolean
    naloxone_date?: string | null
    fentanyl_test_strips_count?: number | null
    harm_reduction_education: boolean
    transportation_provided: boolean
    shower_trailer: boolean
    other_services?: string | null
    case_management_notes?: string | null
  }

  type PersonData = {
    id: number
    client_id: string
    first_name: string
    last_name: string
    nickname?: string | null
    date_of_birth: string
    gender: string
    race: string
    ethnicity: string
    living_situation: string
    length_of_time_homeless?: string | null
    veteran_status: boolean
    chronic_homeless: boolean
    enrollment_date: string
    case_manager?: string | null
    referral_source?: string | null
  }

  const allEncounters = (encounters || []) as EncounterData[]
  const allPersons = (persons || []) as PersonData[]

  // Calculate clients served in date range (unique person_ids from filtered encounters)
  const clientsServedInRange = startDate && endDate
    ? new Set(allEncounters.map(e => e.person_id)).size
    : allPersons.length

  // Calculate metrics
  const metrics = {
    // 1. Number of unduplicated individuals served
    unduplicatedIndividuals: allPersons.length,

    // 2. Exits from unsheltered homelessness (detox, shelter, treatment referrals)
    exitsFromHomelessness: allEncounters.filter(
      (e) => e.detox_referral || e.mat_referral
    ).length,

    // 3. Permanent housing placements (need to track this separately - placeholder)
    permanentHousingPlacements: 0, // TODO: Add housing_placement field to encounters

    // 4. Total Naloxone kits distributed
    naloxoneDistributed: allEncounters.filter((e) => e.naloxone_distributed).length,

    // 5. Total MAT/detox referrals
    matDetoxReferrals: allEncounters.filter(
      (e) => e.mat_referral || e.detox_referral
    ).length,

    // 6. Co-occurring SUD and mental health conditions
    coOccurringConditions: allEncounters.filter((e) => e.co_occurring_mh_sud).length,

    // 7. Shower trailer events (need to add this field - placeholder)
    showerTrailerEvents: 0, // TODO: Add shower_trailer field tracking

    // 8. Total service interactions
    totalInteractions: allEncounters.length,

    // 9. Fentanyl test strips distributed
    fentanylTestStrips: allEncounters.reduce(
      (sum, e) => sum + (e.fentanyl_test_strips_count || 0),
      0
    ),

    // 10. Transportation provided count
    transportationProvided: allEncounters.filter((e) => e.transportation_provided)
      .length,
  }

  // Demographics breakdown
  const demographics = {
    byGender: allPersons.reduce((acc, p) => {
      acc[p.gender] = (acc[p.gender] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byRace: allPersons.reduce((acc, p) => {
      acc[p.race] = (acc[p.race] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byEthnicity: allPersons.reduce((acc, p) => {
      acc[p.ethnicity] = (acc[p.ethnicity] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    veterans: allPersons.filter((p) => p.veteran_status).length,
    chronicallyHomeless: allPersons.filter((p) => p.chronic_homeless).length,
  }

  // Service interaction types
  const serviceTypes = {
    caseManagement: allEncounters.filter((e) => e.case_management_notes).length,
    harmReduction: allEncounters.filter((e) => e.harm_reduction_education).length,
    matReferrals: allEncounters.filter((e) => e.mat_referral).length,
    detoxReferrals: allEncounters.filter((e) => e.detox_referral).length,
    naloxone: allEncounters.filter((e) => e.naloxone_distributed).length,
    transportation: allEncounters.filter((e) => e.transportation_provided).length,
    showerTrailer: allEncounters.filter((e) => e.shower_trailer).length,
  }

  // Referral breakdown by provider
  const referralBreakdown = {
    mat: allEncounters
      .filter(e => e.mat_referral && e.mat_provider)
      .reduce((acc, e) => {
        const provider = e.mat_provider || 'Unknown'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    detox: allEncounters
      .filter(e => e.detox_referral && e.detox_provider)
      .reduce((acc, e) => {
        const provider = e.detox_provider || 'Unknown'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      }, {} as Record<string, number>),
  }

  // GPS coordinates for heat map
  const encounterLocations = allEncounters
    .filter((e) => e.latitude && e.longitude)
    .map((e) => ({
      latitude: e.latitude,
      longitude: e.longitude,
      date: e.service_date,
    }))

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
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with navigation */}
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
              Admin Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Program metrics and service analytics
            </p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Custom Date Range</h3>
          <form method="GET" action="/dashboard" className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                defaultValue={startDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                defaultValue={endDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Filter
            </button>
            {(startDate || endDate) && (
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
          {startDate && endDate && (
            <p className="text-sm text-gray-600 mt-3">
              Showing data from {format(new Date(startDate), 'MMM dd, yyyy')} to{' '}
              {format(new Date(endDate), 'MMM dd, yyyy')}
            </p>
          )}
        </div>

        {/* Custom Reports Summary - Highlighted Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-200">
          <div className="flex items-center mb-4">
            <svg
              className="w-6 h-6 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-900">
              Custom Reports Summary
              {startDate && endDate && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')})
                </span>
              )}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Clients Served</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{clientsServedInRange}</p>
              <p className="text-xs text-gray-500 mt-1">Unduplicated individuals</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Service Interactions</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.totalInteractions}</p>
              <p className="text-xs text-gray-500 mt-1">Total encounters</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Naloxone Distributed</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{metrics.naloxoneDistributed}</p>
              <p className="text-xs text-gray-500 mt-1">Kits given out</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Fentanyl Test Strips</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{metrics.fentanylTestStrips}</p>
              <p className="text-xs text-gray-500 mt-1">Total distributed</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Total Referrals</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{metrics.matDetoxReferrals}</p>
              <p className="text-xs text-gray-500 mt-1">MAT & Detox combined</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Housing Placements</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">{metrics.permanentHousingPlacements}</p>
              <p className="text-xs text-gray-500 mt-1">Permanent housing</p>
            </div>
          </div>
        </div>

        {/* Referral Breakdown Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Referral Breakdown by Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-purple-700 mb-3">MAT Referrals</h4>
              {Object.keys(referralBreakdown.mat).length > 0 ? (
                <dl className="space-y-2">
                  {Object.entries(referralBreakdown.mat)
                    .sort(([, a], [, b]) => b - a)
                    .map(([provider, count]) => (
                      <div key={provider} className="flex justify-between items-center bg-purple-50 px-3 py-2 rounded">
                        <dt className="text-gray-700">{provider}</dt>
                        <dd className="font-semibold text-purple-600">{count}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-gray-500 text-sm italic">No MAT referrals in this period</p>
              )}
            </div>

            <div>
              <h4 className="text-md font-medium text-red-700 mb-3">Detox Referrals</h4>
              {Object.keys(referralBreakdown.detox).length > 0 ? (
                <dl className="space-y-2">
                  {Object.entries(referralBreakdown.detox)
                    .sort(([, a], [, b]) => b - a)
                    .map(([provider, count]) => (
                      <div key={provider} className="flex justify-between items-center bg-red-50 px-3 py-2 rounded">
                        <dt className="text-gray-700">{provider}</dt>
                        <dd className="font-semibold text-red-600">{count}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-gray-500 text-sm italic">No detox referrals in this period</p>
              )}
            </div>
          </div>
        </div>

        {/* Custom Report Builder */}
        <div className="mb-6">
          <CustomReportBuilder persons={allPersons} encounters={allEncounters} />
        </div>

        {/* Duplicate Manager */}
        <div className="mb-6">
          <DuplicateManager persons={allPersons} />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Metric 1 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unduplicated Clients</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {metrics.unduplicatedIndividuals}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Interactions</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {metrics.totalInteractions}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Naloxone Distributed</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {metrics.naloxoneDistributed}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MAT/Detox Referrals</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {metrics.matDetoxReferrals}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 5 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Co-Occurring Conditions</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {metrics.coOccurringConditions}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 6 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fentanyl Test Strips</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {metrics.fentanylTestStrips}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 7 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transportation Provided</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">
                  {metrics.transportationProvided}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric 8 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exits from Homelessness</p>
                <p className="text-3xl font-bold text-teal-600 mt-1">
                  {metrics.exitsFromHomelessness}
                </p>
              </div>
              <div className="bg-teal-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Gender Distribution</h3>
            <dl className="space-y-2">
              {Object.entries(demographics.byGender).map(([gender, count]) => (
                <div key={gender} className="flex justify-between">
                  <dt className="text-gray-600">{gender}</dt>
                  <dd className="font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Race Distribution</h3>
            <dl className="space-y-2">
              {Object.entries(demographics.byRace).map(([race, count]) => (
                <div key={race} className="flex justify-between">
                  <dt className="text-gray-600">{race}</dt>
                  <dd className="font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Special Populations</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Veterans</dt>
                <dd className="font-medium">{demographics.veterans}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Chronically Homeless</dt>
                <dd className="font-medium">{demographics.chronicallyHomeless}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Service Types Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Service Interaction Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {serviceTypes.caseManagement}
              </p>
              <p className="text-sm text-gray-600 mt-1">Case Management</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {serviceTypes.harmReduction}
              </p>
              <p className="text-sm text-gray-600 mt-1">Harm Reduction</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {serviceTypes.matReferrals}
              </p>
              <p className="text-sm text-gray-600 mt-1">MAT Referrals</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {serviceTypes.detoxReferrals}
              </p>
              <p className="text-sm text-gray-600 mt-1">Detox Referrals</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {serviceTypes.naloxone}
              </p>
              <p className="text-sm text-gray-600 mt-1">Naloxone</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">
                {serviceTypes.transportation}
              </p>
              <p className="text-sm text-gray-600 mt-1">Transportation</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <p className="text-2xl font-bold text-teal-600">
                {serviceTypes.showerTrailer}
              </p>
              <p className="text-sm text-gray-600 mt-1">Shower Trailer</p>
            </div>
          </div>
        </div>

        {/* Heat Map */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Service Interaction Heat Map</h3>
          <EncounterHeatMap locations={encounterLocations} />
        </div>

        {/* Export Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Export Data</h3>
          <p className="text-gray-600 mb-4">
            Download all metrics and data for the selected date range. Exports three CSV files:
            summary metrics, client list, and service interactions.
          </p>
          <ExportButton
            persons={allPersons}
            encounters={allEncounters}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  )
}
