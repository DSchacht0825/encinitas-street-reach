import ClientSearch from '@/components/ClientSearch'
import Image from 'next/image'

export default function Home() {
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientSearch />
      </div>
    </div>
  )
}
