/**
 * TasksPage - Full-page TickTick iframe
 *
 * Displays TickTick task management in a full-viewport iframe.
 * Users can log in directly in the iframe and stay authenticated.
 */
export function TasksPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        src="https://www.ticktick.com/webapp"
        title="TickTick Tasks"
        className="h-full w-full border-0"
        allow="microphone; camera"
      />
    </div>
  );
}
