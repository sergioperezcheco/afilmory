import type { MessagePort } from 'node:worker_threads'
import { parentPort } from 'node:worker_threads'

import type { LogMessage } from '@afilmory/builder/logger/index.js'
import { setLogListener } from '@afilmory/builder/logger/index.js'
import { PhotoBuilderService } from 'core/modules/content/photo/builder/photo-builder.service'
import { InMemoryDebugStorageProvider } from 'core/modules/platform/super-admin/InMemoryDebugStorageProvider'
import { formatBuilderLogMessage, mapBuilderLogLevel } from 'core/workers/builder/builder-log.helpers'
import type {
  BuilderWorkerLogEvent,
  BuilderWorkerProviderSnapshot,
  BuilderWorkerRequest,
  BuilderWorkerResponse,
} from 'core/workers/builder/builder-worker.types'
import {
  deserializeLivePhotoMap,
  deserializePrefetchedBuffers,
  deserializeStorageObject,
} from 'core/workers/builder/builder-worker.types'

const photoBuilderService = new PhotoBuilderService()

if (!parentPort) {
  throw new Error('Builder worker must be run inside a Node.js worker thread.')
}

parentPort.on('message', (message: BuilderWorkerRequest) => {
  void handleMessage(message)
})

async function handleMessage(message: BuilderWorkerRequest): Promise<void> {
  switch (message.type) {
    case 'process-photo': {
      await handleProcessPhoto(message)
      break
    }
    default: {
      parentPort?.postMessage({
        id: message.id,
        type: message.type,
        success: false,
        error: {
          message: `Unsupported builder worker message type: ${message.type satisfies never}`,
        },
      } satisfies BuilderWorkerResponse)
    }
  }
}

async function handleProcessPhoto(message: Extract<BuilderWorkerRequest, { type: 'process-photo' }>): Promise<void> {
  const { logPort } = message
  const detachLog = logPort ? attachBuilderLogPort(logPort) : null

  try {
    const result = await processPhoto(message.payload)
    parentPort?.postMessage({
      id: message.id,
      type: 'process-photo',
      success: true,
      result: result ?? null,
    } satisfies BuilderWorkerResponse)
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      type: 'process-photo',
      success: false,
      error: serializeError(error),
    } satisfies BuilderWorkerResponse)
  } finally {
    detachLog?.()
    logPort?.close()
  }
}

async function processPhoto(payload: {
  builderConfig: Extract<BuilderWorkerRequest, { type: 'process-photo' }>['payload']['builderConfig']
  storageConfig?: Extract<BuilderWorkerRequest, { type: 'process-photo' }>['payload']['storageConfig']
  storageObject: Extract<BuilderWorkerRequest, { type: 'process-photo' }>['payload']['storageObject']
  existingItem?: Extract<BuilderWorkerRequest, { type: 'process-photo' }>['payload']['existingItem']
  livePhotoMap?: Extract<BuilderWorkerRequest, { type: 'process-photo' }>['payload']['livePhotoMap']
  processorOptions?: Extract<BuilderWorkerRequest, { type: 'process-photo' }>['payload']['processorOptions']
  providerSnapshots?: BuilderWorkerProviderSnapshot[]
}) {
  const builder = photoBuilderService.createBuilder(payload.builderConfig)

  if (payload.providerSnapshots?.length) {
    registerProviderSnapshots(builder, payload.providerSnapshots)
  }

  if (payload.storageConfig) {
    photoBuilderService.applyStorageConfig(builder, payload.storageConfig)
  }

  const storageObject = deserializeStorageObject(payload.storageObject)
  const livePhotoMap = deserializeLivePhotoMap(payload.livePhotoMap)
  const prefetchedBuffers = deserializePrefetchedBuffers(payload.prefetchedBuffers)

  return await photoBuilderService.processPhotoFromStorageObject(storageObject, {
    existingItem: payload.existingItem,
    livePhotoMap,
    processorOptions: payload.processorOptions,
    builder,
    prefetchedBuffers,
  })
}

function registerProviderSnapshots(
  builder: ReturnType<PhotoBuilderService['createBuilder']>,
  snapshots: BuilderWorkerProviderSnapshot[],
): void {
  for (const snapshot of snapshots) {
    switch (snapshot.type) {
      case 'in-memory-debug': {
        const provider = new InMemoryDebugStorageProvider(
          snapshot.files.map((file) => ({
            key: file.key,
            metadata: deserializeStorageObject(file.metadata),
            buffer: Buffer.from(file.buffer),
          })),
        )
        builder.registerStorageProvider(snapshot.provider, () => provider, {
          category: 'local',
        })
        break
      }
      default: {
        throw new Error(`Unsupported provider snapshot type: ${snapshot}`)
      }
    }
  }
}

function attachBuilderLogPort(port: MessagePort): () => void {
  const listener = (log: LogMessage): void => {
    forwardBuilderLog(port, log)
  }

  setLogListener(listener, { forwardToConsole: false })
  return () => {
    setLogListener(null, { forwardToConsole: false })
  }
}

function forwardBuilderLog(port: MessagePort, message: LogMessage): void {
  const formatted = formatBuilderLogMessage(message)
  if (!formatted) {
    return
  }

  const payload: BuilderWorkerLogEvent = {
    level: mapBuilderLogLevel(message.level),
    message: formatted,
    timestamp: message.timestamp?.toISOString() ?? new Date().toISOString(),
    tag: message.tag ?? null,
    details: {
      source: 'builder',
      tag: message.tag,
    },
  }

  try {
    port.postMessage(payload)
  } catch {
    // Ignore log forwarding failures to avoid breaking worker execution.
  }
}

function serializeError(error: unknown): BuilderWorkerResponse['error'] {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown builder worker error',
  }
}
