'use client'

import { useState } from 'react'
import { exportToCSV } from '@/lib/utils/export-csv'

interface Person {
  id?: number
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
  disability_status?: boolean
  disability_type?: string | null
  chronic_health?: boolean
  mental_health?: boolean
  addiction?: string | null
}

interface Encounter {
  id?: number
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

interface CustomReportBuilderProps {
  persons: Person[]
  encounters: Encounter[]
}

export default function CustomReportBuilder({
  persons,
  encounters,
}: CustomReportBuilderProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Metric selections
  const [includeClientsServed, setIncludeClientsServed] = useState(true)
  const [includeServiceInteractions, setIncludeServiceInteractions] = useState(true)
  const [includeNaloxone, setIncludeNaloxone] = useState(true)
  const [includeFentanylStrips, setIncludeFentanylStrips] = useState(true)
  const [includeTotalReferrals, setIncludeTotalReferrals] = useState(true)
  const [includeReferralBreakdown, setIncludeReferralBreakdown] = useState(true)
  const [includeHousingPlacements, setIncludeHousingPlacements] = useState(true)
  const [includeByNameList, setIncludeByNameList] = useState(false)
  const [includeInteractionsDetail, setIncludeInteractionsDetail] = useState(false)

  const handleExport = () => {
    setIsExporting(true)

    try {
      // Filter encounters by date range
      let filteredEncounters = encounters
      if (startDate && endDate) {
        filteredEncounters = encounters.filter(
          e => e.service_date >= startDate && e.service_date <= endDate
        )
      }

      // Calculate metrics
      const clientsServed = startDate && endDate
        ? new Set(filteredEncounters.map(e => e.person_id)).size
        : persons.length

      const totalInteractions = filteredEncounters.length
      const naloxoneDistributed = filteredEncounters.filter(e => e.naloxone_distributed).length
      const fentanylTestStrips = filteredEncounters.reduce(
        (sum, e) => sum + (e.fentanyl_test_strips_count || 0),
        0
      )
      const matReferrals = filteredEncounters.filter(e => e.mat_referral).length
      const detoxReferrals = filteredEncounters.filter(e => e.detox_referral).length
      const totalReferrals = matReferrals + detoxReferrals
      const housingPlacements = 0 // Placeholder

      // Build referral breakdown
      const matByProvider = filteredEncounters
        .filter(e => e.mat_referral && e.mat_provider)
        .reduce((acc, e) => {
          const provider = e.mat_provider || 'Unknown'
          acc[provider] = (acc[provider] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const detoxByProvider = filteredEncounters
        .filter(e => e.detox_referral && e.detox_provider)
        .reduce((acc, e) => {
          const provider = e.detox_provider || 'Unknown'
          acc[provider] = (acc[provider] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // Build custom report data
      const reportData: Record<string, unknown>[] = []

      // Add report header
      reportData.push({
        'Report Type': 'Custom Data Report',
        'Generated': new Date().toISOString(),
        'Date Range': startDate && endDate ? `${startDate} to ${endDate}` : 'All Time',
        '': '',
      })

      // Add selected metrics
      if (includeClientsServed) {
        reportData.push({
          'Metric': 'Clients Served',
          'Value': clientsServed,
          'Description': 'Unduplicated individuals',
          '': '',
        })
      }

      if (includeServiceInteractions) {
        reportData.push({
          'Metric': 'Service Interactions',
          'Value': totalInteractions,
          'Description': 'Total encounters',
          '': '',
        })
      }

      if (includeNaloxone) {
        reportData.push({
          'Metric': 'Naloxone Distributed',
          'Value': naloxoneDistributed,
          'Description': 'Kits given out',
          '': '',
        })
      }

      if (includeFentanylStrips) {
        reportData.push({
          'Metric': 'Fentanyl Test Strips',
          'Value': fentanylTestStrips,
          'Description': 'Total distributed',
          '': '',
        })
      }

      if (includeTotalReferrals) {
        reportData.push({
          'Metric': 'Total Referrals',
          'Value': totalReferrals,
          'Description': `MAT: ${matReferrals}, Detox: ${detoxReferrals}`,
          '': '',
        })
      }

      if (includeReferralBreakdown) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
          '': '',
        })
        reportData.push({
          'Metric': 'MAT Referrals by Provider',
          'Value': '',
          'Description': '',
          '': '',
        })
        Object.entries(matByProvider).forEach(([provider, count]) => {
          reportData.push({
            'Metric': `  ${provider}`,
            'Value': count,
            'Description': '',
            '': '',
          })
        })

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
          '': '',
        })
        reportData.push({
          'Metric': 'Detox Referrals by Provider',
          'Value': '',
          'Description': '',
          '': '',
        })
        Object.entries(detoxByProvider).forEach(([provider, count]) => {
          reportData.push({
            'Metric': `  ${provider}`,
            'Value': count,
            'Description': '',
            '': '',
          })
        })
      }

      if (includeHousingPlacements) {
        reportData.push({
          'Metric': 'Housing Placements',
          'Value': housingPlacements,
          'Description': 'Permanent housing',
          '': '',
        })
      }

      // Calculate age helper
      const calculateAge = (dob: string): number => {
        const birthDate = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age
      }

      // Export by-name list if selected
      if (includeByNameList) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
          '': '',
        })
        reportData.push({
          'Metric': '--- ACTIVE BY-NAME LIST ---',
          'Value': '',
          'Description': '',
          '': '',
        })
        reportData.push({
          'Client ID': 'Client ID',
          'First Name': 'First Name',
          'Last Name': 'Last Name',
          'Age': 'Age',
          'Gender': 'Gender',
          'Veteran': 'Veteran',
          'Chronic Homeless': 'Chronic Homeless',
          'Enrollment Date': 'Enrollment Date',
        })
        persons.forEach(p => {
          reportData.push({
            'Client ID': p.client_id,
            'First Name': p.first_name,
            'Last Name': p.last_name,
            'Age': calculateAge(p.date_of_birth),
            'Gender': p.gender,
            'Veteran': p.veteran_status ? 'Yes' : 'No',
            'Chronic Homeless': p.chronic_homeless ? 'Yes' : 'No',
            'Enrollment Date': p.enrollment_date,
          })
        })
      }

      // Export interactions detail if selected
      if (includeInteractionsDetail) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
          '': '',
        })
        reportData.push({
          'Metric': '--- SERVICE INTERACTIONS DETAIL ---',
          'Value': '',
          'Description': '',
          '': '',
        })
        reportData.push({
          'Service Date': 'Service Date',
          'Client ID': 'Client ID',
          'Location': 'Location',
          'Outreach Worker': 'Outreach Worker',
          'MAT Referral': 'MAT Referral',
          'Detox Referral': 'Detox Referral',
          'Naloxone': 'Naloxone',
          'Fentanyl Strips': 'Fentanyl Strips',
        })
        filteredEncounters.forEach(e => {
          reportData.push({
            'Service Date': e.service_date,
            'Client ID': e.person_id,
            'Location': e.outreach_location,
            'Outreach Worker': e.outreach_worker,
            'MAT Referral': e.mat_referral ? 'Yes' : 'No',
            'Detox Referral': e.detox_referral ? 'Yes' : 'No',
            'Naloxone': e.naloxone_distributed ? 'Yes' : 'No',
            'Fentanyl Strips': e.fentanyl_test_strips_count || 0,
          })
        })
      }

      // Generate filename
      const dateRange = startDate && endDate
        ? `_${startDate}_to_${endDate}`
        : '_all_time'
      const filename = `custom_report${dateRange}.csv`

      // Export to CSV
      exportToCSV(reportData, filename)

      setTimeout(() => {
        alert('Custom report exported successfully!')
        setIsExporting(false)
      }, 500)
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting custom report. Please try again.')
      setIsExporting(false)
    }
  }

  const allUnchecked = !includeClientsServed && !includeServiceInteractions &&
                       !includeNaloxone && !includeFentanylStrips &&
                       !includeTotalReferrals && !includeReferralBreakdown &&
                       !includeHousingPlacements && !includeByNameList &&
                       !includeInteractionsDetail

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
      <div className="flex items-center mb-4">
        <svg
          className="w-6 h-6 text-green-600 mr-2"
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
        <h3 className="text-xl font-bold text-gray-900">
          Custom Report Builder
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Select the metrics you want to include in your custom report and specify a date range.
      </p>

      {/* Date Range */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Date Range</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Select Metrics to Include</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeClientsServed}
              onChange={(e) => setIncludeClientsServed(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Clients Served (Unduplicated)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeServiceInteractions}
              onChange={(e) => setIncludeServiceInteractions(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Service Interactions Count</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeNaloxone}
              onChange={(e) => setIncludeNaloxone(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Naloxone Distributed</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeFentanylStrips}
              onChange={(e) => setIncludeFentanylStrips(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Fentanyl Test Strips</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeTotalReferrals}
              onChange={(e) => setIncludeTotalReferrals(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Total Referrals (MAT & Detox)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeReferralBreakdown}
              onChange={(e) => setIncludeReferralBreakdown(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Referrals by Provider</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeHousingPlacements}
              onChange={(e) => setIncludeHousingPlacements(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Housing Placements</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByNameList}
              onChange={(e) => setIncludeByNameList(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">Active By-Name List</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeInteractionsDetail}
              onChange={(e) => setIncludeInteractionsDetail(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">Service Interactions Detail</span>
          </label>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting || allUnchecked}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isExporting ? 'Generating Report...' : 'Generate Custom Report'}
        </button>
      </div>

      {allUnchecked && (
        <p className="text-sm text-red-600 text-right mt-2">
          Please select at least one metric to export
        </p>
      )}
    </div>
  )
}
