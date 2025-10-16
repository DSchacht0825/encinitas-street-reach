'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  intakeFormSchema,
  type IntakeFormData,
  LIVING_SITUATIONS,
  GENDER_OPTIONS,
  RACE_OPTIONS,
  ETHNICITY_OPTIONS,
  DISABILITY_TYPES,
  REFERRAL_SOURCES,
  TIME_HOMELESS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  ADDICTION_OPTIONS,
} from '@/lib/schemas/intake-schema'
import { checkForDuplicates, SimilarPerson } from '@/lib/utils/duplicate-detection'
import DuplicateWarningModal from './DuplicateWarningModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function IntakeForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [similarPersons, setSimilarPersons] = useState<SimilarPerson[]>([])
  const [pendingFormData, setPendingFormData] = useState<IntakeFormData | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      veteran_status: false,
      disability_status: false,
      disability_types: [] as string[],
      chronic_homeless: false,
      domestic_violence_victim: false,
      chronic_health: false,
      mental_health: false,
      addictions: [] as string[],
      release_of_information: false,
      evictions: 0,
      income_amount: undefined,
      enrollment_date: new Date().toISOString().split('T')[0],
    },
  })

  const firstName = watch('first_name')
  const lastName = watch('last_name')
  const dateOfBirth = watch('date_of_birth')
  const disabilityStatus = watch('disability_status')

  // Check for duplicates when name or DOB changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (firstName && lastName && firstName.length > 2 && lastName.length > 2) {
        const result = await checkForDuplicates(firstName, lastName, dateOfBirth)
        if (result.hasPotentialDuplicates) {
          // Store similar persons but don't show modal yet
          setSimilarPersons(result.similarPersons)
        } else {
          setSimilarPersons([])
        }
      }
    }

    const timeoutId = setTimeout(checkDuplicates, 500)
    return () => clearTimeout(timeoutId)
  }, [firstName, lastName, dateOfBirth])

  const onSubmit = async (data: IntakeFormData) => {
    // If there are similar persons, show the modal first
    if (similarPersons.length > 0) {
      setPendingFormData(data)
      setShowDuplicateModal(true)
      return
    }

    // No duplicates, proceed with creation
    await createPerson(data)
  }

  const createPerson = async (data: IntakeFormData) => {
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const { data: result, error } = await supabase
        .from('persons')
        .insert([
          {
            first_name: data.first_name,
            last_name: data.last_name,
            nickname: data.nickname || null,
            phone_number: data.phone_number || null,
            date_of_birth: data.date_of_birth,
            gender: data.gender,
            race: data.race,
            ethnicity: data.ethnicity,
            sexual_orientation: data.sexual_orientation || null,
            veteran_status: data.veteran_status,
            disability_status: data.disability_status,
            disability_type: data.disability_types?.length ? data.disability_types.join(',') : null,
            chronic_homeless: data.chronic_homeless,
            domestic_violence_victim: data.domestic_violence_victim,
            chronic_health: data.chronic_health,
            mental_health: data.mental_health,
            addiction: data.addictions?.length ? data.addictions.join(',') : null,
            living_situation: data.living_situation,
            length_of_time_homeless: data.length_of_time_homeless || null,
            evictions: data.evictions || 0,
            income: data.income || null,
            income_amount: data.income_amount || null,
            support_system: data.support_system || null,
            enrollment_date: data.enrollment_date,
            case_manager: data.case_manager || null,
            referral_source: data.referral_source || null,
            release_of_information: data.release_of_information,
            preferred_language: data.preferred_language || null,
            cultural_lived_experience: data.cultural_lived_experience || null,
          } as never,
        ])
        .select()
        .single()

      if (error) throw error

      // Type assertion for returned person data
      const newPerson = result as { id: string }

      // Success! Navigate to the person's profile
      router.push(`/client/${newPerson.id}`)
    } catch (error) {
      console.error('Error creating person:', error)
      alert('Error creating person. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectExisting = (personId: string) => {
    setShowDuplicateModal(false)
    router.push(`/client/${personId}`)
  }

  const handleCreateNew = async () => {
    setShowDuplicateModal(false)
    if (pendingFormData) {
      await createPerson(pendingFormData)
    }
  }

  const handleCancelDuplicate = () => {
    setShowDuplicateModal(false)
    setPendingFormData(null)
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('first_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.first_name && (
                <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('last_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.last_name && (
                <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname / AKA
              </label>
              <input
                {...register('nickname')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                {...register('phone_number')}
                type="tel"
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                {...register('date_of_birth')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date_of_birth && (
                <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender...</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Race <span className="text-red-500">*</span>
              </label>
              <select
                {...register('race')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select race...</option>
                {RACE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.race && (
                <p className="text-red-500 text-sm mt-1">{errors.race.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ethnicity <span className="text-red-500">*</span>
              </label>
              <select
                {...register('ethnicity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select ethnicity...</option>
                {ETHNICITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.ethnicity && (
                <p className="text-red-500 text-sm mt-1">{errors.ethnicity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexual Orientation
              </label>
              <select
                {...register('sexual_orientation')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select sexual orientation...</option>
                {SEXUAL_ORIENTATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Language
              </label>
              <input
                {...register('preferred_language')}
                type="text"
                placeholder="e.g., English, Spanish"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cultural / Lived Experience Notes
              </label>
              <textarea
                {...register('cultural_lived_experience')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any relevant cultural considerations or lived experience..."
              />
            </div>
          </div>
        </div>

        {/* Status Information Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Status Information</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                {...register('veteran_status')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Veteran
              </label>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <input
                  {...register('disability_status')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Has Disability
                </label>
              </div>
              {disabilityStatus && (
                <div className="ml-6 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type of Disability (select all that apply)
                  </label>
                  {DISABILITY_TYPES.map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        {...register('disability_types')}
                        type="checkbox"
                        value={option}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                {...register('chronic_homeless')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Chronically Homeless
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...register('domestic_violence_victim')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Domestic Violence Victim
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...register('chronic_health')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Chronic Health Condition
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...register('mental_health')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Mental Health Condition
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Addiction / Substance Use (select all that apply)
              </label>
              <div className="space-y-2">
                {ADDICTION_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center">
                    <input
                      {...register('addictions')}
                      type="checkbox"
                      value={option}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Living Situation <span className="text-red-500">*</span>
              </label>
              <select
                {...register('living_situation')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select living situation...</option>
                {LIVING_SITUATIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.living_situation && (
                <p className="text-red-500 text-sm mt-1">{errors.living_situation.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Length of Time Homeless
              </label>
              <select
                {...register('length_of_time_homeless')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select timeframe...</option>
                {TIME_HOMELESS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Evictions
              </label>
              <input
                {...register('evictions', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Source
              </label>
              <input
                {...register('income')}
                type="text"
                placeholder="e.g., SSI, Employment, None"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Income Amount
              </label>
              <input
                {...register('income_amount', { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Enter amount in dollars (e.g., 1200.00)</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support System
              </label>
              <textarea
                {...register('support_system')}
                rows={3}
                placeholder="Describe family, friends, or community support..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Program Information Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Program Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('enrollment_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.enrollment_date && (
                <p className="text-red-500 text-sm mt-1">{errors.enrollment_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Manager
              </label>
              <input
                {...register('case_manager')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Source
              </label>
              <select
                {...register('referral_source')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select referral source...</option>
                {REFERRAL_SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  {...register('release_of_information')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Release of Information (ROI) Signed
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                Check if client has signed authorization to share information with other providers
              </p>
            </div>
          </div>
        </div>

        {/* Warning if similar persons found */}
        {similarPersons.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Similar person(s) found
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  We found {similarPersons.length} person(s) with similar names. When you
                  submit, you&apos;ll be asked to confirm if this is a new person.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>

      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        similarPersons={similarPersons}
        enteredName={`${firstName} ${lastName}`}
        onSelectExisting={handleSelectExisting}
        onCreateNew={handleCreateNew}
        onCancel={handleCancelDuplicate}
      />
    </>
  )
}
