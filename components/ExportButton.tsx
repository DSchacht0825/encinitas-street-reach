'use client'

import { exportToCSV, formatDataForExport } from '@/lib/utils/export-csv'
import { useState } from 'react'

interface ExportButtonProps {
  persons: any[]
  encounters: any[]
  startDate?: string | null
  endDate?: string | null
}

export default function ExportButton({
  persons,
  encounters,
  startDate,
  endDate,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)

    try {
      const { personsExport, encountersExport, metrics } = formatDataForExport(
        persons,
        encounters,
        startDate,
        endDate
      )

      const dateRange = startDate && endDate
        ? `_${startDate}_to_${endDate}`
        : '_all_time'

      // Export three separate CSV files
      exportToCSV(metrics, `encinitas_street_reach_summary${dateRange}.csv`)

      setTimeout(() => {
        exportToCSV(personsExport, `encinitas_street_reach_clients${dateRange}.csv`)
      }, 500)

      setTimeout(() => {
        exportToCSV(encountersExport, `encinitas_street_reach_interactions${dateRange}.csv`)
      }, 1000)

      // Show success message
      setTimeout(() => {
        alert(
          'Export successful! Three CSV files have been downloaded:\n' +
            '1. Summary metrics\n' +
            '2. Client list\n' +
            '3. Service interactions'
        )
        setIsExporting(false)
      }, 1500)
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting data. Please try again.')
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
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
      {isExporting ? 'Exporting...' : 'Export to CSV'}
    </button>
  )
}
