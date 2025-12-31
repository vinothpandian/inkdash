import { useState, useMemo } from 'react'
import type { TickTickTask, TaskFilter } from '@/types'
import { TaskItem } from './TaskItem'
import { cn } from '@/lib/utils'

interface TaskListProps {
  tasks: TickTickTask[]
  projectName?: string
}

/**
 * Task list component with filtering
 * Supports filtering by: today, this week, backlog
 */
export function TaskList({ tasks, projectName }: TaskListProps) {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('today')

  // Filter tasks based on selected filter
  const filteredTasks = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    switch (activeFilter) {
      case 'today': {
        // Tasks due today or overdue
        return tasks.filter(task => {
          if (!task.dueDate) return false
          const dueDate = new Date(task.dueDate)
          const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
          return dueDateStart <= today
        })
      }
      case 'week': {
        // Tasks due within the next 7 days
        return tasks.filter(task => {
          if (!task.dueDate) return false
          const dueDate = new Date(task.dueDate)
          const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
          return dueDateStart >= today && dueDateStart < weekFromNow
        })
      }
      case 'backlog': {
        // Tasks without a due date
        return tasks.filter(task => !task.dueDate)
      }
      default:
        return tasks
    }
  }, [tasks, activeFilter])

  // Sort tasks by priority (high to low) then by due date
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // First sort by priority (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // Then by due date (earlier first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
  }, [filteredTasks])

  const filters: { value: TaskFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'backlog', label: 'Backlog' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-semibold">
          {projectName || 'Tasks'}
        </h2>
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeFilter === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
              <span className="ml-1.5 text-[10px] opacity-70">
                ({
                  filter.value === 'today'
                    ? tasks.filter(t => {
                        if (!t.dueDate) return false
                        const dueDate = new Date(t.dueDate)
                        const today = new Date()
                        const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
                        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                        return dueDateStart <= todayStart
                      }).length
                    : filter.value === 'week'
                    ? tasks.filter(t => {
                        if (!t.dueDate) return false
                        const dueDate = new Date(t.dueDate)
                        const today = new Date()
                        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                        const weekFromNow = new Date(todayStart)
                        weekFromNow.setDate(weekFromNow.getDate() + 7)
                        const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
                        return dueDateStart >= todayStart && dueDateStart < weekFromNow
                      }).length
                    : tasks.filter(t => !t.dueDate).length
                })
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No tasks {activeFilter === 'today' ? 'for today' : activeFilter === 'week' ? 'this week' : 'in backlog'}
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
