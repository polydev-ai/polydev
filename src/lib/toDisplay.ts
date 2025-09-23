export function toDisplay(value: unknown): string {
  if (value == null || value === false) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value instanceof Date) return value.toISOString()

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return Object.prototype.toString.call(value)
  }
}