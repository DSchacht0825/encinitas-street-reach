'use client'

import { useState } from 'react'
import { exportToCSV } from '@/lib/utils/export-csv'
import { EXIT_DESTINATIONS } from '@/lib/schemas/exit-schema'

interface Person {
  id: string  // UUID from database
  client_id: string
  first_name: string
  last_name: string
  nickname?: string | null
  date_of_birth: string
  gender: string
  race: string
  ethnicity: string
  sexual_orientation?: string | null
  living_situation: string
  length_of_time_homeless?: string | null
  veteran_status: boolean
  chronic_homeless: boolean
  enrollment_date: string
  case_manager?: string | null
  referral_source?: string | null
  disability_status?: boolean
  disability_type?: string | null
  exit_date?: string | null
  exit_destination?: string | null
  exit_notes?: string | null
}

interface Encounter {
  id?: string  // UUID from database
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
  case_management_notes?: string | null
}

interface CustomReportBuilderProps {
  persons: Person[]
  encounters: Encounter[]
}

interface GeneratedReport {
  reportData: Record<string, unknown>[]
  metadata: {
    generated: string
    dateRange: string
    startDate: string
    endDate: string
  }
  metrics: {
    clientsServed: number
    totalInteractions: number
    naloxoneDistributed: number
    fentanylTestStrips: number
    totalReferrals: number
    matReferrals: number
    detoxReferrals: number
    housingPlacements: number
  }
  breakdowns: {
    matByProvider: Record<string, number>
    detoxByProvider: Record<string, number>
  }
  filteredPersons: Person[]
  filteredEncounters: Encounter[]
  housingDebugInfo?: Array<{
    name: string
    exit_date: string | null | undefined
    exit_destination: string | null | undefined
    exitDateStr: string
    inDateRange: boolean
    isPermanentHousing: boolean
    included: boolean
  }>
}

export default function CustomReportBuilder({
  persons,
  encounters,
}: CustomReportBuilderProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

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

  // Demographic breakdown selections
  const [includeByRace, setIncludeByRace] = useState(false)
  const [includeByEthnicity, setIncludeByEthnicity] = useState(false)
  const [includeByGender, setIncludeByGender] = useState(false)
  const [includeBySexualOrientation, setIncludeBySexualOrientation] = useState(false)
  const [includeByAgeRange, setIncludeByAgeRange] = useState(false)
  const [includeByVeteranStatus, setIncludeByVeteranStatus] = useState(false)
  const [includeByDisabilityStatus, setIncludeByDisabilityStatus] = useState(false)
  const [includeByLivingSituation, setIncludeByLivingSituation] = useState(false)

  // Filter selections
  const [filterVeteransOnly, setFilterVeteransOnly] = useState(false)
  const [filterDisabledOnly, setFilterDisabledOnly] = useState(false)
  const [filterChronicHomeless, setFilterChronicHomeless] = useState(false)
  const [filterAgeRange, setFilterAgeRange] = useState('')

  const handleGenerate = () => {
    setIsGenerating(true)

    // DEBUG: Log what data we're working with
    console.log('=== CUSTOM REPORT DEBUG ===')
    console.log('Start Date:', startDate, 'Type:', typeof startDate, 'Length:', startDate.length)
    console.log('End Date:', endDate, 'Type:', typeof endDate, 'Length:', endDate.length)
    console.log('Date check (startDate && endDate):', !!(startDate && endDate))
    console.log('Persons array length:', persons.length)
    console.log('Encounters array length:', encounters.length)
    console.log('Checkboxes selected:', {
      includeClientsServed,
      includeServiceInteractions,
      includeNaloxone,
      includeFentanylStrips,
      includeTotalReferrals,
      includeReferralBreakdown,
      includeHousingPlacements,
      includeByNameList,
      includeInteractionsDetail
    })

    try {
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

      // Filter encounters by date range FIRST
      let filteredEncounters = encounters

      console.log('🔍 DATE FILTERING DEBUG:')
      console.log('  - Start date filter:', startDate)
      console.log('  - End date filter:', endDate)
      console.log('  - Sample service_date values from database (first 5):',
        encounters.slice(0, 5).map(e => e.service_date)
      )

      if (startDate && endDate) {
        // Both dates provided: filter between range
        // Extract YYYY-MM-DD from ISO timestamp for comparison
        filteredEncounters = filteredEncounters.filter(
          e => e.service_date.substring(0, 10) >= startDate && e.service_date.substring(0, 10) <= endDate
        )
      } else if (startDate) {
        // Only start date: filter from start date onwards
        filteredEncounters = filteredEncounters.filter(
          e => e.service_date.substring(0, 10) >= startDate
        )
      } else if (endDate) {
        // Only end date: filter up to end date
        filteredEncounters = filteredEncounters.filter(
          e => e.service_date.substring(0, 10) <= endDate
        )
      }

      // Get unique person IDs from filtered encounters
      const personIdsWithEncounters = new Set(filteredEncounters.map(e => e.person_id))

      // Get person IDs with exits in the date range
      const personIdsWithExits = new Set(
        persons
          .filter(p => {
            if (!p.exit_date) return false
            const exitDateStr = p.exit_date.substring(0, 10)
            if (startDate && endDate) {
              return exitDateStr >= startDate && exitDateStr <= endDate
            } else if (startDate) {
              return exitDateStr >= startDate
            } else if (endDate) {
              return exitDateStr <= endDate
            }
            return true
          })
          .map(p => p.id)
      )

      console.log('📊 FILTERING DEBUG:')
      console.log('  - Filtered encounters count:', filteredEncounters.length)
      console.log('  - Unique person IDs from encounters:', personIdsWithEncounters.size)
      console.log('  - Unique person IDs from exits:', personIdsWithExits.size)
      console.log('  - Sample encounter person_ids (first 3):', filteredEncounters.slice(0, 3).map(e => e.person_id))
      console.log('  - Sample person ids from database (first 3):', persons.slice(0, 3).map(p => p.id))

      // Filter persons by demographics AND by whether they have encounters OR exits in the date range
      let filteredPersons = persons.filter(p =>
        personIdsWithEncounters.has(p.id) || personIdsWithExits.has(p.id)
      )

      console.log('  - Persons after encounter filter:', filteredPersons.length)

      if (filterVeteransOnly) {
        filteredPersons = filteredPersons.filter(p => p.veteran_status)
        console.log('  - After veterans filter:', filteredPersons.length)
      }

      if (filterDisabledOnly) {
        filteredPersons = filteredPersons.filter(p => p.disability_status)
        console.log('  - After disabled filter:', filteredPersons.length)
      }

      if (filterChronicHomeless) {
        filteredPersons = filteredPersons.filter(p => p.chronic_homeless)
        console.log('  - After chronic homeless filter:', filteredPersons.length)
      }

      if (filterAgeRange) {
        filteredPersons = filteredPersons.filter(p => {
          const age = calculateAge(p.date_of_birth)
          switch (filterAgeRange) {
            case '18-24': return age >= 18 && age <= 24
            case '25-34': return age >= 25 && age <= 34
            case '35-44': return age >= 35 && age <= 44
            case '45-54': return age >= 45 && age <= 54
            case '55-64': return age >= 55 && age <= 64
            case '65+': return age >= 65
            default: return true
          }
        })
        console.log('  - After age range filter:', filteredPersons.length)
      }

      console.log('  - FINAL filtered persons count:', filteredPersons.length)

      // Filter encounters to only include those for the filtered persons
      const filteredPersonIds = new Set(filteredPersons.map(p => p.id))
      filteredEncounters = filteredEncounters.filter(e => filteredPersonIds.has(e.person_id))

      console.log('  - FINAL filtered encounters count:', filteredEncounters.length)

      // Calculate metrics from filtered data
      const clientsServed = filteredPersons.length

      const totalInteractions = filteredEncounters.length
      const naloxoneDistributed = filteredEncounters.filter(e => e.naloxone_distributed).length
      const fentanylTestStrips = filteredEncounters.reduce(
        (sum, e) => sum + (e.fentanyl_test_strips_count || 0),
        0
      )
      const matReferrals = filteredEncounters.filter(e => e.mat_referral).length
      const detoxReferrals = filteredEncounters.filter(e => e.detox_referral).length
      const totalReferrals = matReferrals + detoxReferrals

      // Calculate housing placements from program exits to permanent housing
      const permanentHousingDestinations = EXIT_DESTINATIONS['Permanent Housing'] as readonly string[]

      console.log('🏠 HOUSING PLACEMENTS DEBUG:')
      console.log('  - Permanent housing destinations:', permanentHousingDestinations)
      console.log('  - Filtered persons count:', filteredPersons.length)
      console.log('  - Persons with exit_date:', filteredPersons.filter(p => p.exit_date).length)
      console.log('  - All exits in filtered persons:', filteredPersons.filter(p => p.exit_date).map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        exit_date: p.exit_date,
        exit_destination: p.exit_destination,
        exit_date_str: p.exit_date?.substring(0, 10)
      })))

      const housingPlacements = filteredPersons.filter(p => {
        if (!p.exit_date || !p.exit_destination) return false

        // Check if exit is within date range
        const exitDateStr = p.exit_date.substring(0, 10)
        const inDateRange = startDate && endDate
          ? (exitDateStr >= startDate && exitDateStr <= endDate)
          : startDate
            ? exitDateStr >= startDate
            : endDate
              ? exitDateStr <= endDate
              : true

        // Check if destination is permanent housing
        const isPermanentHousing = permanentHousingDestinations.includes(p.exit_destination)

        console.log(`  - Checking ${p.first_name} ${p.last_name}:`, {
          exitDateStr,
          startDate,
          endDate,
          inDateRange,
          exit_destination: p.exit_destination,
          isPermanentHousing
        })

        return inDateRange && isPermanentHousing
      }).length

      console.log('  - Final housing placements count:', housingPlacements)

      // Create debug info for housing placements (visible in UI)
      const housingDebugInfo = filteredPersons
        .filter(p => p.exit_date)
        .map(p => {
          const exitDateStr = p.exit_date!.substring(0, 10)
          const inDateRange = startDate && endDate
            ? (exitDateStr >= startDate && exitDateStr <= endDate)
            : startDate
              ? exitDateStr >= startDate
              : endDate
                ? exitDateStr <= endDate
                : true
          const isPermanentHousing = permanentHousingDestinations.includes(p.exit_destination || '')

          return {
            name: `${p.first_name} ${p.last_name}`,
            exit_date: p.exit_date,
            exit_destination: p.exit_destination,
            exitDateStr,
            inDateRange,
            isPermanentHousing,
            included: inDateRange && isPermanentHousing
          }
        })

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

      // Add report metadata using same column structure as metrics
      reportData.push({
        'Metric': '=== REPORT INFORMATION ===',
        'Value': '',
        'Description': '',
      })
      reportData.push({
        'Metric': 'Report Type',
        'Value': 'Custom Data Report',
        'Description': '',
      })
      reportData.push({
        'Metric': 'Generated',
        'Value': new Date().toISOString(),
        'Description': '',
      })
      // Determine date range text
      let dateRangeText = 'All Time'
      if (startDate && endDate) {
        dateRangeText = `${startDate} to ${endDate}`
      } else if (startDate) {
        dateRangeText = `From ${startDate}`
      } else if (endDate) {
        dateRangeText = `Up to ${endDate}`
      }

      reportData.push({
        'Metric': 'Date Range',
        'Value': dateRangeText,
        'Description': '',
      })
      reportData.push({
        'Metric': '',
        'Value': '',
        'Description': '',
      })
      reportData.push({
        'Metric': '=== METRICS ===',
        'Value': '',
        'Description': '',
      })

      // Add selected metrics
      if (includeClientsServed) {
        reportData.push({
          'Metric': 'Clients Served',
          'Value': clientsServed,
          'Description': 'Unduplicated individuals',
        })
      }

      if (includeServiceInteractions) {
        reportData.push({
          'Metric': 'Service Interactions',
          'Value': totalInteractions,
          'Description': 'Total encounters',
        })
      }

      if (includeNaloxone) {
        reportData.push({
          'Metric': 'Naloxone Distributed',
          'Value': naloxoneDistributed,
          'Description': 'Kits given out',
        })
      }

      if (includeFentanylStrips) {
        reportData.push({
          'Metric': 'Fentanyl Test Strips',
          'Value': fentanylTestStrips,
          'Description': 'Total distributed',
        })
      }

      if (includeTotalReferrals) {
        reportData.push({
          'Metric': 'Total Referrals',
          'Value': totalReferrals,
          'Description': `MAT: ${matReferrals}, Detox: ${detoxReferrals}`,
        })
      }

      if (includeReferralBreakdown) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'MAT Referrals by Provider',
          'Value': '',
          'Description': '',
        })
        Object.entries(matByProvider).forEach(([provider, count]) => {
          reportData.push({
            'Metric': `  ${provider}`,
            'Value': count,
            'Description': '',
          })
        })

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Detox Referrals by Provider',
          'Value': '',
          'Description': '',
        })
        Object.entries(detoxByProvider).forEach(([provider, count]) => {
          reportData.push({
            'Metric': `  ${provider}`,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeHousingPlacements) {
        reportData.push({
          'Metric': 'Housing Placements',
          'Value': housingPlacements,
          'Description': 'Permanent housing',
        })
      }

      // Export by-name list if selected
      if (includeByNameList) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== ACTIVE BY-NAME LIST ===',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Client ID',
          'Value': 'First Name',
          'Description': 'Last Name',
          'Age': 'Age',
          'Gender': 'Gender',
          'Veteran': 'Veteran',
          'Chronic Homeless': 'Chronic Homeless',
          'Enrollment Date': 'Enrollment Date',
        })
        persons.forEach(p => {
          reportData.push({
            'Metric': p.client_id,
            'Value': p.first_name,
            'Description': p.last_name,
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
        })
        reportData.push({
          'Metric': '=== SERVICE INTERACTIONS DETAIL ===',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Service Date',
          'Value': 'Client ID',
          'Description': 'Location',
          'Outreach Worker': 'Outreach Worker',
          'MAT Referral': 'MAT Referral',
          'Detox Referral': 'Detox Referral',
          'Naloxone': 'Naloxone',
          'Fentanyl Strips': 'Fentanyl Strips',
        })
        filteredEncounters.forEach(e => {
          reportData.push({
            'Metric': e.service_date,
            'Value': e.person_id,
            'Description': e.outreach_location,
            'Outreach Worker': e.outreach_worker,
            'MAT Referral': e.mat_referral ? 'Yes' : 'No',
            'Detox Referral': e.detox_referral ? 'Yes' : 'No',
            'Naloxone': e.naloxone_distributed ? 'Yes' : 'No',
            'Fentanyl Strips': e.fentanyl_test_strips_count || 0,
          })
        })
      }

      // Export demographic breakdowns if selected
      if (includeByRace) {
        const raceBreakdown = filteredPersons.reduce((acc, p) => {
          const race = p.race || 'Unknown'
          acc[race] = (acc[race] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY RACE ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(raceBreakdown).forEach(([race, count]) => {
          reportData.push({
            'Metric': race,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByEthnicity) {
        const ethnicityBreakdown = filteredPersons.reduce((acc, p) => {
          const ethnicity = p.ethnicity || 'Unknown'
          acc[ethnicity] = (acc[ethnicity] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY ETHNICITY ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(ethnicityBreakdown).forEach(([ethnicity, count]) => {
          reportData.push({
            'Metric': ethnicity,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByGender) {
        const genderBreakdown = filteredPersons.reduce((acc, p) => {
          const gender = p.gender || 'Unknown'
          acc[gender] = (acc[gender] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY GENDER ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(genderBreakdown).forEach(([gender, count]) => {
          reportData.push({
            'Metric': gender,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeBySexualOrientation) {
        const sexualOrientationBreakdown = filteredPersons.reduce((acc, p) => {
          const orientation = p.sexual_orientation || 'Not specified'
          acc[orientation] = (acc[orientation] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY SEXUAL ORIENTATION ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(sexualOrientationBreakdown).forEach(([orientation, count]) => {
          reportData.push({
            'Metric': orientation,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByAgeRange) {
        const ageBreakdown: Record<string, number> = {
          '18-24': 0,
          '25-34': 0,
          '35-44': 0,
          '45-54': 0,
          '55-64': 0,
          '65+': 0,
        }

        filteredPersons.forEach(p => {
          const age = calculateAge(p.date_of_birth)
          if (age >= 18 && age <= 24) ageBreakdown['18-24']++
          else if (age >= 25 && age <= 34) ageBreakdown['25-34']++
          else if (age >= 35 && age <= 44) ageBreakdown['35-44']++
          else if (age >= 45 && age <= 54) ageBreakdown['45-54']++
          else if (age >= 55 && age <= 64) ageBreakdown['55-64']++
          else if (age >= 65) ageBreakdown['65+']++
        })

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY AGE RANGE ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(ageBreakdown).forEach(([range, count]) => {
          reportData.push({
            'Metric': range,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByVeteranStatus) {
        const veteranBreakdown = {
          'Veteran': filteredPersons.filter(p => p.veteran_status).length,
          'Non-Veteran': filteredPersons.filter(p => !p.veteran_status).length,
        }

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY VETERAN STATUS ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(veteranBreakdown).forEach(([status, count]) => {
          reportData.push({
            'Metric': status,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByDisabilityStatus) {
        const disabilityBreakdown = {
          'Has Disability': filteredPersons.filter(p => p.disability_status).length,
          'No Disability': filteredPersons.filter(p => !p.disability_status).length,
        }

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY DISABILITY STATUS ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(disabilityBreakdown).forEach(([status, count]) => {
          reportData.push({
            'Metric': status,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByLivingSituation) {
        const livingSituationBreakdown = filteredPersons.reduce((acc, p) => {
          const situation = p.living_situation || 'Unknown'
          acc[situation] = (acc[situation] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY LIVING SITUATION ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(livingSituationBreakdown).forEach(([situation, count]) => {
          reportData.push({
            'Metric': situation,
            'Value': count,
            'Description': '',
          })
        })
      }

      // DEBUG: Log report data before display
      console.log('Report data array length:', reportData.length)
      console.log('First 5 rows of report data:', reportData.slice(0, 5))
      console.log('=========================')

      // Store the generated report data to display
      setGeneratedReport({
        reportData,
        metadata: {
          generated: new Date().toISOString(),
          dateRange: dateRangeText,
          startDate,
          endDate,
        },
        metrics: {
          clientsServed,
          totalInteractions,
          naloxoneDistributed,
          fentanylTestStrips,
          totalReferrals,
          matReferrals,
          detoxReferrals,
          housingPlacements,
        },
        breakdowns: {
          matByProvider,
          detoxByProvider,
        },
        filteredPersons,
        filteredEncounters,
        housingDebugInfo,
      })

      console.log('✅ Report generated successfully - NO EXPORT CALLED')
      setShowReportModal(true)
      setIsGenerating(false)
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Error generating report. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleDownloadCSV = () => {
    console.log('🚨 DOWNLOAD CSV BUTTON CLICKED - EXPORTING NOW')
    if (!generatedReport) return

    let dateRange = '_all_time'
    if (generatedReport.metadata.startDate && generatedReport.metadata.endDate) {
      dateRange = `_${generatedReport.metadata.startDate}_to_${generatedReport.metadata.endDate}`
    } else if (generatedReport.metadata.startDate) {
      dateRange = `_from_${generatedReport.metadata.startDate}`
    } else if (generatedReport.metadata.endDate) {
      dateRange = `_up_to_${generatedReport.metadata.endDate}`
    }
    const filename = `custom_report${dateRange}.csv`

    exportToCSV(generatedReport.reportData, filename)
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

      {/* Demographic Filters */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-purple-200">
        <h4 className="font-semibold text-gray-800 mb-3">Filter Data By Demographics</h4>
        <p className="text-sm text-gray-600 mb-3">
          Apply filters to narrow down the data before generating the report. These filters will affect all metrics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filterVeteransOnly}
              onChange={(e) => setFilterVeteransOnly(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Veterans Only</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filterDisabledOnly}
              onChange={(e) => setFilterDisabledOnly(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Disabled Only</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filterChronicHomeless}
              onChange={(e) => setFilterChronicHomeless(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Chronic Homeless Only</span>
          </label>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700 min-w-fit">Age Range:</label>
            <select
              value={filterAgeRange}
              onChange={(e) => setFilterAgeRange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">All Ages</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Demographic Breakdowns */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-200">
        <h4 className="font-semibold text-gray-800 mb-3">Include Demographic Breakdowns</h4>
        <p className="text-sm text-gray-600 mb-3">
          Add demographic breakdowns to the report for creating presentation charts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByRace}
              onChange={(e) => setIncludeByRace(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Race</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByEthnicity}
              onChange={(e) => setIncludeByEthnicity(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Ethnicity</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByGender}
              onChange={(e) => setIncludeByGender(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Gender</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeBySexualOrientation}
              onChange={(e) => setIncludeBySexualOrientation(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Sexual Orientation</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByAgeRange}
              onChange={(e) => setIncludeByAgeRange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Age Range</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByVeteranStatus}
              onChange={(e) => setIncludeByVeteranStatus(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Veteran Status</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByDisabilityStatus}
              onChange={(e) => setIncludeByDisabilityStatus(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Disability Status</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByLivingSituation}
              onChange={(e) => setIncludeByLivingSituation(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Living Situation</span>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || allUnchecked}
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isGenerating ? 'Generating Report...' : 'Generate Report'}
        </button>
      </div>

      {allUnchecked && (
        <p className="text-sm text-red-600 text-right mt-2">
          Please select at least one metric to generate
        </p>
      )}

      {/* Report Modal */}
      {showReportModal && generatedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Generated Report</h4>
                  <p className="text-sm text-gray-600">
                    Generated: {new Date(generatedReport.metadata.generated).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date Range: {generatedReport.metadata.dateRange}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
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
              Download CSV
            </button>
          </div>

          <div className="p-6">
            {/* Key Metrics Grid */}
          {(includeClientsServed || includeServiceInteractions || includeNaloxone ||
            includeFentanylStrips || includeTotalReferrals || includeHousingPlacements) && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Key Metrics
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {includeClientsServed && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 font-medium">Clients Served</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{generatedReport.metrics.clientsServed}</p>
                    <p className="text-xs text-gray-500 mt-1">Unduplicated individuals</p>
                  </div>
                )}
                {includeServiceInteractions && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Service Interactions</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{generatedReport.metrics.totalInteractions}</p>
                    <p className="text-xs text-gray-500 mt-1">Total encounters</p>
                  </div>
                )}
                {includeNaloxone && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-gray-600 font-medium">Naloxone Distributed</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{generatedReport.metrics.naloxoneDistributed}</p>
                    <p className="text-xs text-gray-500 mt-1">Kits given out</p>
                  </div>
                )}
                {includeFentanylStrips && (
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600 font-medium">Fentanyl Test Strips</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{generatedReport.metrics.fentanylTestStrips}</p>
                    <p className="text-xs text-gray-500 mt-1">Total distributed</p>
                  </div>
                )}
                {includeTotalReferrals && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 font-medium">Total Referrals</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{generatedReport.metrics.totalReferrals}</p>
                    <p className="text-xs text-gray-500 mt-1">MAT: {generatedReport.metrics.matReferrals}, Detox: {generatedReport.metrics.detoxReferrals}</p>
                  </div>
                )}
                {includeHousingPlacements && (
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
                    <p className="text-sm text-gray-600 font-medium">Housing Placements</p>
                    <p className="text-3xl font-bold text-teal-600 mt-1">{generatedReport.metrics.housingPlacements}</p>
                    <p className="text-xs text-gray-500 mt-1">Permanent housing</p>
                  </div>
                )}
              </div>

              {/* Housing Placements Debug Info */}
              {includeHousingPlacements && generatedReport.housingDebugInfo && generatedReport.housingDebugInfo.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h6 className="text-sm font-semibold text-yellow-900 mb-3">🔍 Housing Placements Debug Info</h6>
                  <div className="space-y-2 text-xs">
                    {generatedReport.housingDebugInfo.map((debug, idx) => (
                      <div key={idx} className={`p-2 rounded ${debug.included ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                        <p className="font-semibold">{debug.name}</p>
                        <p>Exit Date: {debug.exit_date} (parsed as: {debug.exitDateStr})</p>
                        <p>Exit Destination: {debug.exit_destination}</p>
                        <p>In Date Range ({generatedReport.metadata.startDate} to {generatedReport.metadata.endDate}): {debug.inDateRange ? '✓ YES' : '✗ NO'}</p>
                        <p>Is Permanent Housing: {debug.isPermanentHousing ? '✓ YES' : '✗ NO'}</p>
                        <p className="font-semibold mt-1">Counted: {debug.included ? '✓ YES' : '✗ NO'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Referral Breakdown */}
          {includeReferralBreakdown && (Object.keys(generatedReport.breakdowns.matByProvider).length > 0 || Object.keys(generatedReport.breakdowns.detoxByProvider).length > 0) && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Referral Breakdown by Provider
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(generatedReport.breakdowns.matByProvider).length > 0 && (
                  <div>
                    <h6 className="text-md font-medium text-purple-700 mb-3">MAT Referrals</h6>
                    <div className="space-y-2">
                      {Object.entries(generatedReport.breakdowns.matByProvider)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([provider, count]) => (
                          <div key={provider} className="flex justify-between items-center bg-purple-50 px-4 py-3 rounded-lg border border-purple-200">
                            <span className="text-gray-700 font-medium">{provider}</span>
                            <span className="text-xl font-bold text-purple-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {Object.keys(generatedReport.breakdowns.detoxByProvider).length > 0 && (
                  <div>
                    <h6 className="text-md font-medium text-red-700 mb-3">Detox Referrals</h6>
                    <div className="space-y-2">
                      {Object.entries(generatedReport.breakdowns.detoxByProvider)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([provider, count]) => (
                          <div key={provider} className="flex justify-between items-center bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                            <span className="text-gray-700 font-medium">{provider}</span>
                            <span className="text-xl font-bold text-red-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* By-Name List */}
          {includeByNameList && generatedReport.filteredPersons.length > 0 && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Active By-Name List ({generatedReport.filteredPersons.length} clients)
              </h5>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veteran</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chronic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedReport.filteredPersons.map((person: Person, idx: number) => {
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
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{person.client_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{person.first_name} {person.last_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{calculateAge(person.date_of_birth)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{person.gender}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${person.veteran_status ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {person.veteran_status ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${person.chronic_homeless ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                              {person.chronic_homeless ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{person.enrollment_date}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Service Interactions Detail */}
          {includeInteractionsDetail && generatedReport.filteredEncounters.length > 0 && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Service Interactions Detail ({generatedReport.filteredEncounters.length} interactions)
              </h5>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detox</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naloxone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fentanyl Strips</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedReport.filteredEncounters.map((encounter: Encounter, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{encounter.service_date}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{encounter.outreach_location}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{encounter.outreach_worker}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${encounter.mat_referral ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                            {encounter.mat_referral ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${encounter.detox_referral ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                            {encounter.detox_referral ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${encounter.naloxone_distributed ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                            {encounter.naloxone_distributed ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{encounter.fentanyl_test_strips_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Demographic Breakdowns */}
          {(includeByRace || includeByEthnicity || includeByGender || includeBySexualOrientation ||
            includeByAgeRange || includeByVeteranStatus || includeByDisabilityStatus || includeByLivingSituation) && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Demographic Breakdowns
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Race Breakdown */}
                {includeByRace && (
                  <div>
                    <h6 className="text-md font-medium text-blue-700 mb-3">By Race</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const race = p.race || 'Unknown'
                          acc[race] = (acc[race] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([race, count]) => (
                          <div key={race} className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                            <span className="text-gray-700 font-medium">{race}</span>
                            <span className="text-xl font-bold text-blue-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Ethnicity Breakdown */}
                {includeByEthnicity && (
                  <div>
                    <h6 className="text-md font-medium text-indigo-700 mb-3">By Ethnicity</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const ethnicity = p.ethnicity || 'Unknown'
                          acc[ethnicity] = (acc[ethnicity] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([ethnicity, count]) => (
                          <div key={ethnicity} className="flex justify-between items-center bg-indigo-50 px-4 py-3 rounded-lg border border-indigo-200">
                            <span className="text-gray-700 font-medium">{ethnicity}</span>
                            <span className="text-xl font-bold text-indigo-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Gender Breakdown */}
                {includeByGender && (
                  <div>
                    <h6 className="text-md font-medium text-pink-700 mb-3">By Gender</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const gender = p.gender || 'Unknown'
                          acc[gender] = (acc[gender] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([gender, count]) => (
                          <div key={gender} className="flex justify-between items-center bg-pink-50 px-4 py-3 rounded-lg border border-pink-200">
                            <span className="text-gray-700 font-medium">{gender}</span>
                            <span className="text-xl font-bold text-pink-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sexual Orientation Breakdown */}
                {includeBySexualOrientation && (
                  <div>
                    <h6 className="text-md font-medium text-violet-700 mb-3">By Sexual Orientation</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const orientation = p.sexual_orientation || 'Not specified'
                          acc[orientation] = (acc[orientation] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([orientation, count]) => (
                          <div key={orientation} className="flex justify-between items-center bg-violet-50 px-4 py-3 rounded-lg border border-violet-200">
                            <span className="text-gray-700 font-medium">{orientation}</span>
                            <span className="text-xl font-bold text-violet-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Age Range Breakdown */}
                {includeByAgeRange && (
                  <div>
                    <h6 className="text-md font-medium text-orange-700 mb-3">By Age Range</h6>
                    <div className="space-y-2">
                      {(() => {
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

                        const ageBreakdown: Record<string, number> = {
                          '18-24': 0,
                          '25-34': 0,
                          '35-44': 0,
                          '45-54': 0,
                          '55-64': 0,
                          '65+': 0,
                        }

                        generatedReport.filteredPersons.forEach(p => {
                          const age = calculateAge(p.date_of_birth)
                          if (age >= 18 && age <= 24) ageBreakdown['18-24']++
                          else if (age >= 25 && age <= 34) ageBreakdown['25-34']++
                          else if (age >= 35 && age <= 44) ageBreakdown['35-44']++
                          else if (age >= 45 && age <= 54) ageBreakdown['45-54']++
                          else if (age >= 55 && age <= 64) ageBreakdown['55-64']++
                          else if (age >= 65) ageBreakdown['65+']++
                        })

                        return Object.entries(ageBreakdown).map(([range, count]) => (
                          <div key={range} className="flex justify-between items-center bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
                            <span className="text-gray-700 font-medium">{range}</span>
                            <span className="text-xl font-bold text-orange-600">{count}</span>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {/* Veteran Status Breakdown */}
                {includeByVeteranStatus && (
                  <div>
                    <h6 className="text-md font-medium text-blue-700 mb-3">By Veteran Status</h6>
                    <div className="space-y-2">
                      {Object.entries({
                        'Veteran': generatedReport.filteredPersons.filter(p => p.veteran_status).length,
                        'Non-Veteran': generatedReport.filteredPersons.filter(p => !p.veteran_status).length,
                      }).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                          <span className="text-gray-700 font-medium">{status}</span>
                          <span className="text-xl font-bold text-blue-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disability Status Breakdown */}
                {includeByDisabilityStatus && (
                  <div>
                    <h6 className="text-md font-medium text-amber-700 mb-3">By Disability Status</h6>
                    <div className="space-y-2">
                      {Object.entries({
                        'Has Disability': generatedReport.filteredPersons.filter(p => p.disability_status).length,
                        'No Disability': generatedReport.filteredPersons.filter(p => !p.disability_status).length,
                      }).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                          <span className="text-gray-700 font-medium">{status}</span>
                          <span className="text-xl font-bold text-amber-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Living Situation Breakdown */}
                {includeByLivingSituation && (
                  <div>
                    <h6 className="text-md font-medium text-teal-700 mb-3">By Living Situation</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const situation = p.living_situation || 'Unknown'
                          acc[situation] = (acc[situation] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([situation, count]) => (
                          <div key={situation} className="flex justify-between items-center bg-teal-50 px-4 py-3 rounded-lg border border-teal-200">
                            <span className="text-gray-700 font-medium">{situation}</span>
                            <span className="text-xl font-bold text-teal-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
        </div>
        </div>
      )}
    </div>
  )
}
