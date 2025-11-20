import type {
  BuilderConfig,
  PhotoManifestItem,
  PhotoProcessorOptions,
  ProcessPhotoResult,
  StorageConfig,
  StorageObject,
} from '@afilmory/builder'
import type { MessagePort, TransferListItem } from 'node:worker_threads'

import type { BuilderWorkerLogLevel } from './builder-log.helpers'

export type SerializedStorageObject = Omit<StorageObject, 'lastModified'> & {
  lastModified?: string | null
}

export function serializeStorageObject(object: StorageObject): SerializedStorageObject {
  return {
    ...object,
    lastModified: object.lastModified instanceof Date ? object.lastModified.toISOString() : object.lastModified ?? null,
  }
}

export function deserializeStorageObject(object: SerializedStorageObject): StorageObject {
  return {
    ...object,
    lastModified: object.lastModified ? new Date(object.lastModified) : undefined,
  }
}

export type SerializedLivePhotoMap = Array<[string, SerializedStorageObject]>

export function serializeLivePhotoMap(map?: Map<string, StorageObject>): SerializedLivePhotoMap | undefined {
  if (!map?.size) {
    return undefined
  }
  return Array.from(map.entries()).map(([key, value]) => [key, serializeStorageObject(value)])
}

export function deserializeLivePhotoMap(entries?: SerializedLivePhotoMap): Map<string, StorageObject> | undefined {
  if (!entries?.length) {
    return undefined
  }
  return new Map(entries.map(([key, value]) => [key, deserializeStorageObject(value)]))
}

export type SerializedPrefetchedBufferEntry = {
  key: string
  buffer: ArrayBuffer
}

export function serializePrefetchedBuffers(
  map: Map<string, Buffer> | undefined,
  transferList: TransferListItem[],
): SerializedPrefetchedBufferEntry[] | undefined {
  if (!map?.size) {
    return undefined
  }

  const entries: SerializedPrefetchedBufferEntry[] = []
  for (const [key, buffer] of map.entries()) {
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    transferList.push(arrayBuffer)
    entries.push({ key, buffer: arrayBuffer })
  }
  return entries
}

export function deserializePrefetchedBuffers(
  entries: SerializedPrefetchedBufferEntry[] | undefined,
): Map<string, Buffer> | undefined {
  if (!entries?.length) {
    return undefined
  }

  return new Map(entries.map((entry) => [entry.key, Buffer.from(entry.buffer)]))
}

export type BuilderWorkerProviderSnapshot =
  | {
      type: 'in-memory-debug'
      provider: string
      files: Array<{
        key: string
        metadata: SerializedStorageObject
        buffer: ArrayBuffer
      }>
    }

export type BuilderWorkerRequest =
  | {
      id: string
      type: 'process-photo'
      payload: ProcessPhotoRequestPayload
      logPort?: MessagePort
    }

export type BuilderWorkerResponse =
  | {
      id: string
      type: 'process-photo'
      success: true
      result: ProcessPhotoResult | null
    }
  | {
      id: string
      type: 'process-photo'
      success: false
      error: SerializedWorkerError
    }

export type SerializedWorkerError = {
  message: string
  stack?: string
  name?: string
}

export type BuilderWorkerLogEvent = {
  level: BuilderWorkerLogLevel
  message: string
  timestamp: string
  tag?: string | null
  details?: Record<string, unknown> | null
}

export type ProcessPhotoRequestPayload = {
  builderConfig: BuilderConfig
  storageConfig?: StorageConfig
  storageObject: SerializedStorageObject
  existingItem?: PhotoManifestItem
  livePhotoMap?: SerializedLivePhotoMap
  processorOptions?: Partial<PhotoProcessorOptions>
  providerSnapshots?: BuilderWorkerProviderSnapshot[]
  prefetchedBuffers?: SerializedPrefetchedBufferEntry[]
}

export type ProviderSnapshotSerializationResult = {
  snapshots?: BuilderWorkerProviderSnapshot[]
  transferList: TransferListItem[]
}
