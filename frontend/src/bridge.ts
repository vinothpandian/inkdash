type InvokeArgs = Record<string, unknown> | null

export async function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  if (!window.zero) {
    throw new Error('Native bridge not available. Run the app with zig build run or zig build dev.')
  }
  const result = await window.zero.invoke(`app.${command}`, args ?? null)
  return result as T
}
