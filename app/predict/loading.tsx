export default function PredictLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      <div className="h-10 w-64 glass rounded-xl" />
      <div className="h-4 w-48 glass rounded-lg opacity-50" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-4 space-y-3">
            <div className="h-4 w-20 bg-white/10 rounded" />
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-10 bg-white/5 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
