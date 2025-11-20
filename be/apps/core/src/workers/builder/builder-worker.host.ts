import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { TransferListItem } from 'node:worker_threads'
import { MessageChannel, Worker } from 'node:worker_threads'

import type {
  BuilderConfig,
  PhotoManifestItem,
  PhotoProcessorOptions,
  ProcessPhotoResult,
  StorageConfig,
  StorageObject,
} from '@afilmory/builder'
import { createLogger } from '@afilmory/framework'
import { injectable } from 'tsyringe'

import type {
  BuilderWorkerLogEvent,
  BuilderWorkerProviderSnapshot,
  BuilderWorkerRequest,
  BuilderWorkerResponse,
} from './builder-worker.types'
import { serializeLivePhotoMap, serializePrefetchedBuffers, serializeStorageObject } from './builder-worker.types'

type PendingRequest = {
  resolve: (value: ProcessPhotoResult | null) => void
  reject: (error: Error) => void
  cleanup?: () => void
}

export type BuilderWorkerLogHandler = (event: BuilderWorkerLogEvent) => void

export type BuilderWorkerProviderSnapshotInput = {
  type: 'in-memory-debug'
  provider: string
  files: Array<{
    key: string
    metadata: StorageObject
    buffer: Buffer
  }>
}

type ProcessPhotoArgs = {
  builderConfig: BuilderConfig
  storageConfig?: StorageConfig
  storageObject: StorageObject
  existingItem?: PhotoManifestItem
  livePhotoMap?: Map<string, StorageObject>
  processorOptions?: Partial<PhotoProcessorOptions>
  logHandler?: BuilderWorkerLogHandler
  providerSnapshots?: BuilderWorkerProviderSnapshotInput[]
  prefetchedBuffers?: Map<string, Buffer>
}

@injectable()
export class BuilderWorkerHost {
  private worker: Worker | null = null
  private readonly pendingRequests = new Map<string, PendingRequest>()
  private readonly logger = createLogger('BuilderWorkerHost')
  private devWorkerUrl: URL | null = null

  async processPhoto(args: ProcessPhotoArgs): Promise<ProcessPhotoResult | null> {
    const transferList: TransferListItem[] = []
    const providerSnapshots = this.serializeProviderSnapshots(args.providerSnapshots, transferList)
    const prefetchedBuffers = serializePrefetchedBuffers(args.prefetchedBuffers, transferList)
    const messageId = randomUUID()
    const message: BuilderWorkerRequest = {
      id: messageId,
      type: 'process-photo',
      payload: {
        builderConfig: args.builderConfig,
        storageConfig: args.storageConfig,
        storageObject: serializeStorageObject(args.storageObject),
        existingItem: args.existingItem,
        livePhotoMap: serializeLivePhotoMap(args.livePhotoMap),
        processorOptions: args.processorOptions,
        providerSnapshots,
        prefetchedBuffers,
      },
    }

    let cleanup: (() => void) | undefined
    if (args.logHandler) {
      const { port1, port2 } = new MessageChannel()
      port1.on('message', (event: BuilderWorkerLogEvent) => {
        try {
          args.logHandler?.(event)
        } catch (error) {
          this.logger.error('BuilderWorkerHost log handler failed', error)
        }
      })
      transferList.push(port2)
      message.logPort = port2
      cleanup = () => {
        port1.removeAllListeners()
        port1.close()
      }
    }

    return await this.dispatch(message, transferList, cleanup)
  }

  private async dispatch(
    message: BuilderWorkerRequest,
    transferList: TransferListItem[],
    cleanup?: () => void,
  ): Promise<ProcessPhotoResult | null> {
    const worker = this.ensureWorker()
    return await new Promise<ProcessPhotoResult | null>((resolve, reject) => {
      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        cleanup,
      })

      try {
        worker.postMessage(message, transferList)
      } catch (error) {
        this.pendingRequests.delete(message.id)
        cleanup?.()
        reject(
          error instanceof Error ? error : new Error('Failed to post message to builder worker thread, unknown error.'),
        )
      }
    })
  }

  private serializeProviderSnapshots(
    inputs: BuilderWorkerProviderSnapshotInput[] | undefined,
    transferList: TransferListItem[],
  ): BuilderWorkerProviderSnapshot[] | undefined {
    if (!inputs?.length) {
      return undefined
    }

    return inputs.map((input) => {
      switch (input.type) {
        case 'in-memory-debug': {
          return {
            type: 'in-memory-debug',
            provider: input.provider,
            files: input.files.map((file) => {
              const buffer = file.buffer.buffer.slice(
                file.buffer.byteOffset,
                file.buffer.byteOffset + file.buffer.byteLength,
              )
              transferList.push(buffer)
              return {
                key: file.key,
                metadata: serializeStorageObject(file.metadata),
                buffer,
              }
            }),
          }
        }
        default: {
          throw new Error(`Unsupported provider snapshot type: ${input satisfies never}`)
        }
      }
    })
  }

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker
    }

    const workerUrl = this.resolveWorkerUrl()
    const worker = new Worker(workerUrl, {
      env: process.env,
      execArgv: this.resolveExecArgv(),
      type: 'module',
    })

    worker.on('message', (response: BuilderWorkerResponse) => this.handleWorkerResponse(response))
    worker.on('error', (error) => this.handleWorkerError(error))
    worker.on('exit', (code) => this.handleWorkerExit(code))

    this.worker = worker
    return worker
  }

  private resolveExecArgv(): string[] {
    return [...(process.execArgv ?? [])]
  }

  private resolveWorkerUrl(): URL {
    const jsUrl = new URL('./builder.worker.js', import.meta.url)
    if (this.isFileAvailable(jsUrl)) {
      return jsUrl
    }

    if (this.devWorkerUrl) {
      return this.devWorkerUrl
    }

    const tsUrl = new URL('./builder.worker.ts', import.meta.url)
    this.devWorkerUrl = this.createDevWorkerStub(tsUrl)
    return this.devWorkerUrl
  }

  private isFileAvailable(url: URL): boolean {
    try {
      return existsSync(fileURLToPath(url))
    } catch {
      return false
    }
  }

  private createDevWorkerStub(tsUrl: URL): URL {
    const cacheDir = join(process.cwd(), 'node_modules', '.cache', 'afilmory-builder-worker')
    mkdirSync(cacheDir, { recursive: true })
    const outFile = join(cacheDir, 'builder-worker-dev.mjs')
    const content = `import 'tsx/esm'\nimport ${JSON.stringify(tsUrl.href)}\n`
    writeFileSync(outFile, content)
    return pathToFileURL(outFile)
  }

  private handleWorkerResponse(response: BuilderWorkerResponse): void {
    const pending = this.pendingRequests.get(response.id)
    if (!pending) {
      return
    }

    this.pendingRequests.delete(response.id)
    pending.cleanup?.()

    if (response.success) {
      pending.resolve(response.result)
      return
    }

    const error = new Error(response.error.message)
    error.name = response.error.name ?? 'BuilderWorkerError'
    if (response.error.stack) {
      error.stack = response.error.stack
    }
    pending.reject(error)
  }

  private handleWorkerError(error: unknown): void {
    this.logger.error('Builder worker crashed', error)
  }

  private handleWorkerExit(code: number): void {
    this.logger.error(`Builder worker exited with code ${code}`)
    this.worker = null

    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.cleanup?.()
      pending.reject(new Error('Builder worker stopped unexpectedly.'))
      this.pendingRequests.delete(id)
    }
  }
}
