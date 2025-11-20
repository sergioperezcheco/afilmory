import { format as utilFormat } from 'node:util'

import type { LogMessage } from '@afilmory/builder/logger/index.js'

export type BuilderWorkerLogLevel = 'info' | 'success' | 'warn' | 'error'

const LEVEL_MAP: Record<string, BuilderWorkerLogLevel> = {
  log: 'info',
  info: 'info',
  start: 'info',
  success: 'success',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
  debug: 'info',
  trace: 'info',
}

export function mapBuilderLogLevel(level: string): BuilderWorkerLogLevel {
  return LEVEL_MAP[level] ?? 'info'
}

export function formatBuilderLogMessage(message: LogMessage): string | null {
  const prefix = message.tag ? `[${message.tag}] ` : ''

  if (!message.args?.length) {
    return prefix.trim() || null
  }

  try {
    return `${prefix}${utilFormat(...message.args)}`.trim()
  } catch {
    const fallback = message.args[0] ? String(message.args[0]) : ''
    const formatted = `${prefix}${fallback}`.trim()
    return formatted || null
  }
}
