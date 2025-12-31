/**
 * TasksPage - TickTick iframe with padded container
 *
 * Displays TickTick task management in a rounded, padded iframe container.
 * Users can log in directly in the iframe and stay authenticated.
 */
export function TasksPage() {
  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      <div className="iframe-container flex-1 min-h-0">
        <iframe
          src="https://www.ticktick.com/webapp"
          title="TickTick Tasks"
          className="h-full w-full border-0"
          allow="microphone; camera"
        />
      </div>
    </div>
  );
}
