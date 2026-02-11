'use client'

import { useEffect, useState } from 'react'

interface PlatformStats {
  projects: number
  events: number
  members: number
}

interface StatsData {
  ios: PlatformStats
  android: PlatformStats
  frontend: PlatformStats
  backend: PlatformStats
}

export function SentryStatsTable() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const response = await fetch('/api/sentry-stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#7553ff] animate-pulse">Loading Sentry data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">No data available</div>
      </div>
    )
  }

  return (
    <div className="h-full bg-[#1a1625] p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-[#7553ff] mb-6">
          Sentry Platform Statistics
        </h2>

        <div className="bg-[#0f0c14] border border-[#7553ff]/20 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#7553ff]/10 border-b border-[#7553ff]/20">
                <th className="text-left p-4 font-semibold text-[#7553ff]">Metric</th>
                <th className="text-center p-4 font-semibold text-[#7553ff]">iOS</th>
                <th className="text-center p-4 font-semibold text-[#7553ff]">Android</th>
                <th className="text-center p-4 font-semibold text-[#7553ff]">Frontend</th>
                <th className="text-center p-4 font-semibold text-[#7553ff]">Backend</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#7553ff]/10 hover:bg-[#7553ff]/5 transition-colors">
                <td className="p-4 text-gray-300">Number of Projects</td>
                <td className="p-4 text-center text-white font-mono">{data.ios.projects}</td>
                <td className="p-4 text-center text-white font-mono">{data.android.projects}</td>
                <td className="p-4 text-center text-white font-mono">{data.frontend.projects}</td>
                <td className="p-4 text-center text-white font-mono">{data.backend.projects}</td>
              </tr>
              <tr className="border-b border-[#7553ff]/10 hover:bg-[#7553ff]/5 transition-colors">
                <td className="p-4 text-gray-300">Total Error Events</td>
                <td className="p-4 text-center text-white font-mono">
                  {data.ios.events.toLocaleString()}
                </td>
                <td className="p-4 text-center text-white font-mono">
                  {data.android.events.toLocaleString()}
                </td>
                <td className="p-4 text-center text-white font-mono">
                  {data.frontend.events.toLocaleString()}
                </td>
                <td className="p-4 text-center text-white font-mono">
                  {data.backend.events.toLocaleString()}
                </td>
              </tr>
              <tr className="hover:bg-[#7553ff]/5 transition-colors">
                <td className="p-4 text-gray-300">Team Members</td>
                <td className="p-4 text-center text-white font-mono">{data.ios.members}</td>
                <td className="p-4 text-center text-white font-mono">{data.android.members}</td>
                <td className="p-4 text-center text-white font-mono">{data.frontend.members}</td>
                <td className="p-4 text-center text-white font-mono">{data.backend.members}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p>Data from: demo.sentry.io</p>
          <p className="text-xs mt-1">Error events are calculated over the last 30 days</p>
        </div>
      </div>
    </div>
  )
}
