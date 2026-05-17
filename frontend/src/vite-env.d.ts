/// <reference types="vite/client" />

interface Window {
  zero?: {
    invoke(command: string, payload?: unknown): Promise<unknown>
  }
}
