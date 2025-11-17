'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  encounterFormSchema,
  type EncounterFormData,
  MAT_TYPES,
  CO_OCCURRING_TYPES,
} from '@/lib/schemas/encounter-schema'
import { REFERRAL_SOURCES } from '@/lib/schemas/intake-schema'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import MapPicker from './MapPicker'

interface ServiceInteractionFormProps {
  personId: string
  personName: string
}

export default function ServiceInteractionForm({
  personId,
  personName,
}: ServiceInteractionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { latitude, longitude, accuracy, error: gpsError, loading: gpsLoading, refreshLocation } = useGeolocation()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EncounterFormData>({
    resolver: zodResolver(encounterFormSchema),
    defaultValues: {
      service_date: new Date().toISOString().split('T')[0],
      co_occurring_mh_sud: false,
      mat_referral: false,
      detox_referral: false,
      naloxone_distributed: false,
      harm_reduction_education: false,
      transportation_provided: false,
      shower_trailer: false,
      high_utilizer_contact: false,
    },
  })

  // Watch conditional fields
  const coOccurring = watch('co_occurring_mh_sud')
  const matReferral = watch('mat_referral')
  const detoxReferral = watch('detox_referral')
  const naloxoneDistributed = watch('naloxone_distributed')

  // Set GPS coordinates when available (auto GPS takes priority)
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setValue('latitude', latitude)
      setValue('longitude', longitude)
      setManualLocation(null) // Clear manual location if GPS is available
    }
  }, [latitude, longitude, setValue])

  // Handle manual location selection from map
  const handleManualLocationSelect = (lat: number, lng: number) => {
    setManualLocation({ lat, lng })
    setValue('latitude', lat)
    setValue('longitude', lng)
  }

  // Determine which location to use (GPS or manual)
  const currentLatitude = manualLocation?.lat ?? latitude
  const currentLongitude = manualLocation?.lng ?? longitude
  const isManuallySet = manualLocation !== null

  const onSubmit = async (data: EncounterFormData) => {
    if (currentLatitude === null || currentLongitude === null) {
      alert('GPS location is required. Please enable location services or manually select a location on the map.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from('encounters').insert([
        {
          person_id: personId,
          service_date: new Date(data.service_date).toISOString(),
          outreach_location: data.outreach_location,
          latitude: data.latitude,
          longitude: data.longitude,
          outreach_worker: data.outreach_worker,
          referral_source: data.referral_source || null,
          language_preference: data.language_preference || null,
          cultural_notes: data.cultural_notes || null,
          co_occurring_mh_sud: data.co_occurring_mh_sud,
          co_occurring_type: data.co_occurring_type || null,
          mat_referral: data.mat_referral,
          mat_type: data.mat_type || null,
          mat_provider: data.mat_provider || null,
          detox_referral: data.detox_referral,
          detox_provider: data.detox_provider || null,
          naloxone_distributed: data.naloxone_distributed,
          naloxone_date: data.naloxone_date || null,
          fentanyl_test_strips_count: data.fentanyl_test_strips_count || null,
          harm_reduction_education: data.harm_reduction_education,
          transportation_provided: data.transportation_provided,
          shower_trailer: data.shower_trailer,
          other_services: data.other_services || null,
          high_utilizer_contact: data.high_utilizer_contact,
          case_management_notes: data.case_management_notes || null,
        } as never,
      ])

      if (error) throw error

      // Success! Navigate back to client profile
      router.push(`/client/${personId}`)
    } catch (error) {
      console.error('Error saving service interaction:', error)
      alert('Error saving service interaction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {showMapPicker && (
        <MapPicker
          initialLatitude={currentLatitude || undefined}
          initialLongitude={currentLongitude || undefined}
          onLocationSelect={handleManualLocationSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* GPS Location Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg
              className="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            GPS Location (Required)
          </h2>

          {gpsLoading && !isManuallySet && (
            <div className="flex items-center text-blue-600 mb-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              Getting your location...
            </div>
          )}

          {gpsError && !isManuallySet && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 font-medium">❌ {gpsError}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={refreshLocation}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Select Location on Map
                </button>
              </div>
            </div>
          )}

          {isManuallySet && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-700 font-medium">📍 Location set manually from map</p>
              <p className="text-sm text-blue-600 mt-1">
                Coordinates: {currentLatitude!.toFixed(6)}, {currentLongitude!.toFixed(6)}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-sm text-blue-700 underline hover:text-blue-800"
                >
                  Change Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualLocation(null)
                    refreshLocation()
                  }}
                  className="text-sm text-blue-700 underline hover:text-blue-800"
                >
                  Use Auto GPS Instead
                </button>
              </div>
            </div>
          )}

          {latitude !== null && longitude !== null && !isManuallySet && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-medium">✓ Location captured successfully (Auto GPS)</p>
              <p className="text-sm text-green-600 mt-1">
                Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                {accuracy && ` (±${Math.round(accuracy)}m)`}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={refreshLocation}
                  className="text-sm text-green-700 underline hover:text-green-800"
                >
                  Refresh Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-sm text-green-700 underline hover:text-green-800"
                >
                  Use Map Instead
                </button>
              </div>
            </div>
          )}

          {/* Manual pin drop option always available */}
          {!isManuallySet && latitude === null && !gpsLoading && !gpsError && (
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Select Location on Map
            </button>
          )}
        </div>

      {/* Basic Service Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Service Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <p className="text-lg font-medium text-gray-900 mb-4">
              Client: {personName}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('service_date')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.service_date && (
              <p className="text-red-500 text-sm mt-1">{errors.service_date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outreach Worker <span className="text-red-500">*</span>
            </label>
            <input
              {...register('outreach_worker')}
              type="text"
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.outreach_worker && (
              <p className="text-red-500 text-sm mt-1">{errors.outreach_worker.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location/Area <span className="text-red-500">*</span>
            </label>
            <input
              {...register('outreach_location')}
              type="text"
              placeholder="e.g., Main St & 1st Ave"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.outreach_location && (
              <p className="text-red-500 text-sm mt-1">{errors.outreach_location.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referral Source
            </label>
            <select
              {...register('referral_source')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select source...</option>
              {REFERRAL_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clinical/Treatment Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Clinical & Treatment Referrals</h2>
        <div className="space-y-4">
          {/* Co-occurring */}
          <div>
            <div className="flex items-center mb-2">
              <input
                {...register('co_occurring_mh_sud')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Co-occurring Mental Health & Substance Use
              </label>
            </div>
            {coOccurring && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Co-occurring Condition
                </label>
                <select
                  {...register('co_occurring_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  {CO_OCCURRING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* MAT Referral */}
          <div>
            <div className="flex items-center mb-2">
              <input
                {...register('mat_referral')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                MAT (Medication-Assisted Treatment) Referral
              </label>
            </div>
            {matReferral && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MAT Type
                  </label>
                  <select
                    {...register('mat_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    {MAT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    {...register('mat_provider')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Detox Referral */}
          <div>
            <div className="flex items-center mb-2">
              <input
                {...register('detox_referral')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Detox Referral
              </label>
            </div>
            {detoxReferral && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detox Facility/Provider
                </label>
                <input
                  {...register('detox_provider')}
                  type="text"
                  placeholder="Where referred"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Harm Reduction Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Harm Reduction Services</h2>
        <div className="space-y-4">
          {/* Naloxone */}
          <div>
            <div className="flex items-center mb-2">
              <input
                {...register('naloxone_distributed')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Naloxone Kit Distributed
              </label>
            </div>
            {naloxoneDistributed && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distribution Date
                </label>
                <input
                  {...register('naloxone_date')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Fentanyl Test Strips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fentanyl Test Strips Provided (quantity)
            </label>
            <input
              {...register('fentanyl_test_strips_count', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Harm Reduction Education */}
          <div className="flex items-center">
            <input
              {...register('harm_reduction_education')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Harm Reduction Education Provided
            </label>
          </div>
        </div>
      </div>

      {/* Other Services Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Other Services Provided</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              {...register('transportation_provided')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Transportation Provided
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('shower_trailer')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Shower Trailer Access
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Services (IDs, birth certificates, etc.)
            </label>
            <textarea
              {...register('other_services')}
              rows={2}
              placeholder="Describe any other services provided..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Case Management Notes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Case Management Notes</h2>

        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-300 rounded-lg px-4 py-3 transition-colors">
            <input
              {...register('high_utilizer_contact')}
              type="checkbox"
              className="h-5 w-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <span className="text-sm font-semibold text-yellow-900">
              ⚠️ High Utilizer Contact
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-1">
            Check if this client is a frequent service user
          </p>
        </div>

        <textarea
          {...register('case_management_notes')}
          rows={6}
          placeholder="Progress notes, follow-up needed, client goals, barriers, successes..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-500 mt-2">
          These notes will be added to the client&apos;s Individual Service Plan (ISP)
        </p>
      </div>

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
          disabled={isSubmitting || currentLatitude === null || currentLongitude === null}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Service Interaction'}
        </button>
      </div>
    </form>
    </>
  )
}
