const shimmer = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200'

export function HydrationOverlay() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className={`h-8 w-36 rounded-md ${shimmer}`} aria-hidden="true" />
          <div className="hidden md:flex items-center space-x-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-5 w-16 rounded-md ${shimmer}`} aria-hidden="true" />
            ))}
          </div>
          <div className={`h-9 w-9 rounded-full ${shimmer}`} aria-hidden="true" />
        </div>
      </div>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-80" aria-hidden="true" />
          <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-24">
            <div className="space-y-4 text-center text-white">
              <div className={`h-10 w-3/4 mx-auto rounded-md ${shimmer}`} aria-hidden="true" />
              <div className={`h-6 w-2/3 mx-auto rounded-md ${shimmer}`} aria-hidden="true" />
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                <div className={`h-12 w-32 rounded-full ${shimmer}`} aria-hidden="true" />
                <div className={`h-12 w-32 rounded-full ${shimmer}`} aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className={`h-8 w-48 mx-auto rounded-md ${shimmer}`} aria-hidden="true" />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4"
                style={{ animationDelay: `${index * 60}ms` }}
                aria-hidden="true"
              >
                <div className={`h-40 rounded-xl ${shimmer}`} />
                <div className={`h-4 w-3/4 rounded-md ${shimmer}`} />
                <div className={`h-4 w-1/2 rounded-md ${shimmer}`} />
                <div className="flex items-center justify-between pt-4">
                  <div className={`h-6 w-16 rounded-md ${shimmer}`} />
                  <div className={`h-10 w-24 rounded-full ${shimmer}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`h-14 rounded-lg ${shimmer}`} aria-hidden="true" />
            <div className={`h-14 rounded-lg ${shimmer}`} aria-hidden="true" />
          </div>
          <div className={`mt-6 h-4 w-1/3 mx-auto rounded-md ${shimmer}`} aria-hidden="true" />
        </div>
      </footer>
    </div>
  )
}
