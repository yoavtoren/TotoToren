export default function LeaderboardLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4 animate-pulse">
      <div className="h-10 w-48 glass rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl h-20" />)}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl h-16" />
      ))}
    </div>
  )
}
