import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/utils/auth'
import EncounterHeatMap from '@/components/EncounterHeatMap'
import ExportButton from '@/components/ExportButton'
import CustomReportBuilder from '@/components/CustomReportBuilder'
import DuplicateManager from '@/components/DuplicateManager'
import LogoutButton from '@/components/LogoutButton'
import ProgramExitsSection from '@/components/ProgramExitsSection'
import MetricsGrid from '@/components/MetricsGrid'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { start_date?: string; end_date?: string }
}) {
  // Check if user is admin - redirect if not
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect('/')
  }

  const supabase = await createClient()

  // Parse date range from query params
  const startDate = searchParams.start_date || null
  const endDate = searchParams.end_date || null

  // Fetch ALL encounters for CustomReportBuilder (unfiltered)
  const { data: allEncountersData, error: allEncountersError } = await supabase
    .from('encounters')
    .select('*')

  // Build filtered query for dashboard metrics
  // Use timestamp range that covers the full day in local timezone
  // Start date: beginning of day (00:00:00)
  // End date: end of day (23:59:59)
  let dashboardEncountersQuery = supabase.from('encounters').select('*')

  if (startDate && endDate) {
    // Both dates provided: filter between range
    const startTimestamp = `${startDate}T00:00:00`
    const endTimestamp = `${endDate}T23:59:59`
    dashboardEncountersQuery = dashboardEncountersQuery
      .gte('service_date', startTimestamp)
      .lte('service_date', endTimestamp)
  } else if (startDate) {
    // Only start date: filter from start date onwards
    const startTimestamp = `${startDate}T00:00:00`
    dashboardEncountersQuery = dashboardEncountersQuery
      .gte('service_date', startTimestamp)
  } else if (endDate) {
    // Only end date: filter up to end date
    const endTimestamp = `${endDate}T23:59:59`
    dashboardEncountersQuery = dashboardEncountersQuery
      .lte('service_date', endTimestamp)
  }

  const { data: encounters, error: encountersError } = await dashboardEncountersQuery

  // Fetch all persons
  const { data: persons, error: personsError } = await supabase
    .from('persons')
    .select('*')

  // Fetch all status changes for reporting
  const { data: statusChanges, error: statusChangesError } = await supabase
    .from('status_changes')
    .select('*')

  if (encountersError || personsError || allEncountersError || statusChangesError) {
    console.error('Dashboard data fetch error:', encountersError || personsError || allEncountersError || statusChangesError)
  }

  // Type assertions for Supabase data (all fields from database)
  type EncounterData = {
    service_date: string
    person_id: string  // UUID foreign key
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
    placement_made?: boolean
    placement_location?: string | null
    placement_location_other?: string | null
    case_management_notes?: string | null
  }

  type PersonData = {
    id: string  // UUID from database
    client_id: string
    first_name: string
    last_name: string
    nickname?: string | null
    phone_number?: string | null
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
    income?: string | null
    income_amount?: number | null
    exit_date?: string | null
    exit_destination?: string | null
    exit_notes?: string | null
  }

  type StatusChangeData = {
    id: string
    person_id: string
    change_type: 'exit' | 'return_to_active'
    change_date: string
    exit_destination?: string | null
    notes?: string | null
    created_by?: string | null
    created_at: string
  }

  const allEncounters = (encounters || []) as EncounterData[]
  const allEncountersUnfiltered = (allEncountersData || []) as EncounterData[]
  const allPersons = (persons || []) as PersonData[]
  const allStatusChanges = (statusChanges || []) as StatusChangeData[]

  // Helper function to get local date string (YYYY-MM-DD) from timestamp
  // This properly handles timezone offsets by parsing the date and extracting local date
  const getLocalDateString = (dateStr: string): string => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Get persons who had encounters in the date range (for filtered demographics)
  const personIdsInRange = new Set(allEncounters.map(e => e.person_id))
  const personsInRange = (startDate || endDate)
    ? allPersons.filter(p => personIdsInRange.has(p.id))
    : allPersons

  // Calculate clients served in date range (unique person_ids from filtered encounters)
  const clientsServedInRange = personsInRange.length

  // Calculate metrics
  const metrics = {
    // 1. Number of unduplicated individuals served (filtered by date range)
    unduplicatedIndividuals: personsInRange.length,

    // 2. Exits from unsheltered homelessness (placements made)
    exitsFromHomelessness: allEncounters.filter(
      (e) => e.placement_made
    ).length,

    // 3. Placements made
    placementsMade: allEncounters.filter((e) => e.placement_made).length,

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

  // Demographics breakdown - use personsInRange for date-filtered stats
  const demographics = {
    byGender: personsInRange.reduce((acc, p) => {
      acc[p.gender] = (acc[p.gender] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byRace: personsInRange.reduce((acc, p) => {
      acc[p.race] = (acc[p.race] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    veterans: personsInRange.filter((p) => p.veteran_status).length,
    chronicallyHomeless: personsInRange.filter((p) => p.chronic_homeless).length,
    withPhoneNumber: personsInRange.filter((p) => p.phone_number).length,
    withIncome: personsInRange.filter((p) => p.income_amount && p.income_amount > 0).length,
    averageIncome: personsInRange.filter((p) => p.income_amount && p.income_amount > 0).length > 0
      ? Math.round(personsInRange.reduce((sum, p) => sum + (p.income_amount || 0), 0) /
          personsInRange.filter((p) => p.income_amount && p.income_amount > 0).length)
      : 0,
    totalIncome: personsInRange.reduce((sum, p) => sum + (p.income_amount || 0), 0),
  }

  // Program exits breakdown - filter by date range if specified
  const exitedPersons = allPersons.filter((p) => {
    if (!p.exit_date) return false
    const exitDateStr = getLocalDateString(p.exit_date)
    if (startDate && endDate) {
      return exitDateStr >= startDate && exitDateStr <= endDate
    } else if (startDate) {
      return exitDateStr >= startDate
    } else if (endDate) {
      return exitDateStr <= endDate
    }
    return true // No date filter, show all exits
  })
  const exitMetrics = {
    totalExits: exitedPersons.length,
    byDestination: exitedPersons.reduce((acc, p) => {
      if (p.exit_destination) {
        acc[p.exit_destination] = (acc[p.exit_destination] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>),
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

  // Placement breakdown by location
  const placementBreakdown = allEncounters
    .filter(e => e.placement_made)
    .reduce((acc, e) => {
      const location = e.placement_location === 'Other'
        ? (e.placement_location_other || 'Other')
        : (e.placement_location || 'Unknown')
      acc[location] = (acc[location] || 0) + 1
      return acc
    }, {} as Record<string, number>)

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
          <div>
            <Link
              href="/dashboard/users"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Manage Users
            </Link>
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
          {(startDate || endDate) && (
            <p className="text-sm text-gray-600 mt-3">
              {startDate && endDate
                ? `Showing data from ${format(new Date(startDate), 'MMM dd, yyyy')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`
                : startDate
                  ? `Showing data from ${format(new Date(startDate), 'MMM dd, yyyy')} onwards`
                  : `Showing data up to ${format(new Date(endDate!), 'MMM dd, yyyy')}`
              }
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
              {(startDate || endDate) && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  {startDate && endDate
                    ? `(${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')})`
                    : startDate
                      ? `(From ${format(new Date(startDate), 'MMM dd, yyyy')})`
                      : `(Up to ${format(new Date(endDate!), 'MMM dd, yyyy')})`
                  }
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
              <p className="text-sm text-gray-600 font-medium">Program Exits</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">{exitMetrics.totalExits}</p>
              <p className="text-xs text-gray-500 mt-1">Clients exited from program</p>
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

        {/* Placement Breakdown Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Placements by Location
          </h3>
          <div className="mb-4">
            <p className="text-3xl font-bold text-green-600">{metrics.placementsMade}</p>
            <p className="text-sm text-gray-500">Total placements in this period</p>
          </div>
          {Object.keys(placementBreakdown).length > 0 ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(placementBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([location, count]) => (
                  <div key={location} className="flex justify-between items-center bg-green-50 px-4 py-3 rounded-lg">
                    <dt className="text-gray-700 font-medium">{location}</dt>
                    <dd className="font-bold text-green-600 text-lg">{count}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-gray-500 text-sm italic">No placements recorded in this period</p>
          )}
        </div>

        {/* Custom Report Builder */}
        <div className="mb-6">
          <CustomReportBuilder persons={allPersons} encounters={allEncountersUnfiltered} statusChanges={allStatusChanges} />
        </div>

        {/* Duplicate Manager */}
        <div className="mb-6">
          <DuplicateManager persons={allPersons} />
        </div>

        {/* Key Metrics Grid - Clickable Cards */}
        <MetricsGrid
          metrics={metrics}
          persons={personsInRange}
          encounters={allEncounters}
          demographics={demographics}
        />

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
            <h3 className="text-lg font-semibold mb-4">Race/Ethnicity Distribution</h3>
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

        {/* Program Exits Section */}
        <ProgramExitsSection
          totalExits={exitMetrics.totalExits}
          exitsByDestination={exitMetrics.byDestination}
        />

        {/* Contact & Economic Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Contact & Economic Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {demographics.withPhoneNumber}
              </p>
              <p className="text-sm text-gray-600 mt-1">Clients with Phone</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((demographics.withPhoneNumber / allPersons.length) * 100)}% of total
              </p>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <p className="text-2xl font-bold text-cyan-600">
                {demographics.withIncome}
              </p>
              <p className="text-sm text-gray-600 mt-1">Reporting Income</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((demographics.withIncome / allPersons.length) * 100)}% of total
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                ${demographics.averageIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Average Monthly Income</p>
              <p className="text-xs text-gray-500 mt-1">Among those reporting</p>
            </div>
            <div className="text-center p-4 bg-violet-50 rounded-lg">
              <p className="text-2xl font-bold text-violet-600">
                ${demographics.totalIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Monthly Income</p>
              <p className="text-xs text-gray-500 mt-1">All clients combined</p>
            </div>
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
