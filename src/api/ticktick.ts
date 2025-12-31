import type { TickTickTask, TickTickProject, TickTickData } from '@/types'

const TICKTICK_API_BASE = 'https://api.ticktick.com/open/v1'

// Get credentials from environment variables
const getCredentials = () => {
  const clientId = import.meta.env.VITE_TICKTICK_CLIENT_ID
  const clientSecret = import.meta.env.VITE_TICKTICK_CLIENT_SECRET
  const accessToken = import.meta.env.VITE_TICKTICK_ACCESS_TOKEN

  if (!clientId || !clientSecret || !accessToken) {
    throw new Error(
      'TickTick credentials not configured. Please set VITE_TICKTICK_CLIENT_ID, VITE_TICKTICK_CLIENT_SECRET, and VITE_TICKTICK_ACCESS_TOKEN in your .env file.'
    )
  }

  return { clientId, clientSecret, accessToken }
}

/**
 * TickTick API response types
 */
interface TickTickApiTask {
  id: string
  title: string
  content?: string
  isAllDay: boolean
  startDate?: string
  dueDate?: string
  timeZone?: string
  reminders?: string[]
  repeat?: string
  priority: number
  status: number
  completedTime?: string
  items?: unknown[]
  projectId: string
  sortOrder: number
  tags?: string[]
  createdTime: string
  modifiedTime: string
}

interface TickTickApiProject {
  id: string
  name: string
  color?: string
  sortOrder: number
  closed?: boolean
  groupId?: string
  viewMode?: string
  permission?: string
  kind?: string
}

/**
 * Fetch all tasks from TickTick
 */
async function fetchTasks(): Promise<TickTickTask[]> {
  const { accessToken } = getCredentials()

  const response = await fetch(`${TICKTICK_API_BASE}/task`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`TickTick API error: ${response.status} ${response.statusText}`)
  }

  const tasks: TickTickApiTask[] = await response.json()

  // Filter out completed tasks and map to our format
  return tasks
    .filter(task => task.status === 0) // 0 = not completed
    .map(task => ({
      id: task.id,
      title: task.title || task.content || 'Untitled Task',
      isCompleted: false,
      priority: task.priority,
      dueDate: task.dueDate,
      startDate: task.startDate,
      projectId: task.projectId,
      tags: task.tags || [],
      createdTime: task.createdTime,
      modifiedTime: task.modifiedTime,
    }))
}

/**
 * Fetch all projects from TickTick
 */
async function fetchProjects(): Promise<TickTickProject[]> {
  const { accessToken } = getCredentials()

  const response = await fetch(`${TICKTICK_API_BASE}/project`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`TickTick API error: ${response.status} ${response.statusText}`)
  }

  const projects: TickTickApiProject[] = await response.json()

  // Filter out closed projects and map to our format
  return projects
    .filter(project => !project.closed)
    .map(project => ({
      id: project.id,
      name: project.name,
      color: project.color,
      sortOrder: project.sortOrder,
    }))
}

/**
 * Fetch all TickTick data (tasks and projects)
 */
export async function fetchTickTick(): Promise<TickTickData> {
  try {
    // Fetch tasks and projects in parallel
    const [tasks, projects] = await Promise.all([
      fetchTasks(),
      fetchProjects(),
    ])

    // Map project names to tasks
    const projectMap = new Map(projects.map(p => [p.id, p.name]))
    const tasksWithProjects = tasks.map(task => ({
      ...task,
      projectName: projectMap.get(task.projectId),
    }))

    return {
      tasks: tasksWithProjects,
      projects,
      lastUpdated: new Date(),
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch TickTick data')
  }
}

const CACHE_KEY = 'inkdash_ticktick_cache'

/**
 * Get cached TickTick data from localStorage
 */
export function getCachedTickTick(): TickTickData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached)
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated),
    }
  } catch {
    return null
  }
}

/**
 * Save TickTick data to localStorage cache
 */
export function cacheTickTick(data: TickTickData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}
