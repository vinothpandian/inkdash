import { useTickTick } from '@/hooks/useTickTick'
import { TaskList } from '@/components/widgets/TaskList'
import { Card, CardContent } from '@/components/ui/card'

/**
 * TasksPage - Read-only TickTick task viewer
 *
 * Displays tasks from TickTick API with filtering options:
 * - Today: Tasks due today or overdue
 * - This Week: Tasks due within the next 7 days
 * - Backlog: Tasks without a due date
 */
export function TasksPage() {
  const { data, isLoading, error } = useTickTick()

  if (error) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-500 mb-2">
                Failed to load tasks
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please check your .env configuration and ensure your TickTick API credentials are set correctly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    )
  }

  if (!data || data.tasks.length === 0) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">No tasks found</h2>
              <p className="text-sm text-muted-foreground">
                You don't have any active tasks in TickTick.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      <Card className="flex-1 min-h-0">
        <CardContent className="h-full py-6">
          <TaskList tasks={data.tasks} />
        </CardContent>
      </Card>
    </div>
  )
}
