import type { TickTickTask } from '@/types'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: TickTickTask
}

/**
 * Individual task item component
 * Displays task title, priority, due date, and project
 */
export function TaskItem({ task }: TaskItemProps) {
  // Priority color mapping
  const priorityColors = {
    0: 'text-muted-foreground', // none
    1: 'text-blue-500', // low
    3: 'text-yellow-500', // medium
    5: 'text-red-500', // high
  } as const

  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors[0]

  // Format due date
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', isOverdue: false, isToday: true }
    }

    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', isOverdue: false, isToday: false }
    }

    // Check if overdue
    const isOverdue = date < today

    // Format as "Mon, Jan 1"
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    return { text: formattedDate, isOverdue, isToday: false }
  }

  const dueInfo = formatDueDate(task.dueDate)

  return (
    <div className="group flex items-start gap-3 py-3 px-4 hover:bg-muted/30 rounded-lg transition-colors">
      {/* Priority indicator dot */}
      <div className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0", priorityColor)} />

      <div className="flex-1 min-w-0">
        {/* Task title */}
        <div className="text-sm font-medium leading-snug mb-1">{task.title}</div>

        {/* Task metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Project name */}
          {task.projectName && (
            <span className="truncate">{task.projectName}</span>
          )}

          {/* Due date */}
          {dueInfo && (
            <>
              {task.projectName && <span>•</span>}
              <span className={cn(
                dueInfo.isOverdue && "text-red-500 font-medium",
                dueInfo.isToday && "text-blue-500 font-medium"
              )}>
                {dueInfo.text}
              </span>
            </>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <>
              <span>•</span>
              <span className="truncate">{task.tags.join(', ')}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
