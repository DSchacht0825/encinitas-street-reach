import Link from 'next/link'

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back link */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-flex items-center"
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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Client Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Client ID: {params.id}
          </p>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Profile Page Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            This page will show client details, service interaction history, and timeline.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Client List
          </Link>
        </div>
      </div>
    </div>
  )
}
