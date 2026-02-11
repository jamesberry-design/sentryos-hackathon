import { NextResponse } from 'next/server'

const SENTRY_ORG = 'demo'
const SENTRY_API_BASE = 'https://sentry.io/api/0'

interface Project {
  id: string
  name: string
  platform: string
  slug: string
}

interface TeamMember {
  id: string
  email: string
}

async function fetchSentryData(endpoint: string) {
  const response = await fetch(`${SENTRY_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Sentry API error: ${response.statusText}`)
  }

  return response.json()
}

export async function GET() {
  try {
    // Fetch all projects for the org
    const projects: Project[] = await fetchSentryData(`/organizations/${SENTRY_ORG}/projects/`)

    // Categorize projects by platform
    const categorizedProjects = {
      ios: projects.filter(p => p.platform?.includes('apple') || p.platform?.includes('ios') || p.platform?.includes('swift') || p.platform?.includes('cocoa')),
      android: projects.filter(p => p.platform?.includes('android') || p.platform?.includes('java') || p.platform?.includes('kotlin')),
      frontend: projects.filter(p =>
        p.platform?.includes('javascript') ||
        p.platform?.includes('react') ||
        p.platform?.includes('vue') ||
        p.platform?.includes('angular') ||
        p.platform?.includes('next')
      ),
      backend: projects.filter(p =>
        p.platform?.includes('python') ||
        p.platform?.includes('node') ||
        p.platform?.includes('ruby') ||
        p.platform?.includes('go') ||
        p.platform?.includes('php') ||
        p.platform?.includes('java') && !p.platform?.includes('javascript')
      ),
    }

    // Fetch error event counts and team members for each category
    const stats = {
      ios: { projects: 0, events: 0, members: new Set<string>() },
      android: { projects: 0, events: 0, members: new Set<string>() },
      frontend: { projects: 0, events: 0, members: new Set<string>() },
      backend: { projects: 0, events: 0, members: new Set<string>() },
    }

    // Process each category
    for (const [category, categoryProjects] of Object.entries(categorizedProjects)) {
      const key = category as keyof typeof stats
      stats[key].projects = categoryProjects.length

      // Fetch stats and team info for each project
      for (const project of categoryProjects) {
        try {
          // Get error event count (last 30 days)
          const statsData = await fetchSentryData(
            `/projects/${SENTRY_ORG}/${project.slug}/stats/?stat=received&resolution=1d`
          )

          // Sum up the event counts
          if (Array.isArray(statsData)) {
            const totalEvents = statsData.reduce((sum, [, count]) => sum + count, 0)
            stats[key].events += totalEvents
          }

          // Get teams associated with this project
          const projectTeams = await fetchSentryData(
            `/projects/${SENTRY_ORG}/${project.slug}/teams/`
          )

          // Get members from each team
          for (const team of projectTeams) {
            try {
              const teamMembers: TeamMember[] = await fetchSentryData(
                `/teams/${SENTRY_ORG}/${team.slug}/members/`
              )
              teamMembers.forEach(member => stats[key].members.add(member.id))
            } catch (error) {
              console.error(`Error fetching team members for ${team.slug}:`, error)
            }
          }
        } catch (error) {
          console.error(`Error fetching stats for project ${project.slug}:`, error)
        }
      }
    }

    // Convert Sets to counts
    const result = {
      ios: {
        projects: stats.ios.projects,
        events: stats.ios.events,
        members: stats.ios.members.size,
      },
      android: {
        projects: stats.android.projects,
        events: stats.android.events,
        members: stats.android.members.size,
      },
      frontend: {
        projects: stats.frontend.projects,
        events: stats.frontend.events,
        members: stats.frontend.members.size,
      },
      backend: {
        projects: stats.backend.projects,
        events: stats.backend.events,
        members: stats.backend.members.size,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching Sentry data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Sentry data' },
      { status: 500 }
    )
  }
}
