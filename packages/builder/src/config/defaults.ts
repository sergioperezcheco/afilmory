import os from 'node:os'

import type { BuilderConfig } from '../types/config.js'

export function createDefaultBuilderConfig(): BuilderConfig {
  return {
    system: {
      processing: {
        defaultConcurrency: 10,
        enableLivePhotoDetection: true,
        digestSuffixLength: 0,
        // 地理编码默认配置
        enableGeocoding: false, // 默认关闭，需要用户主动启用
        geocodingProvider: 'auto',
      },
      observability: {
        showProgress: true,
        showDetailedStats: true,
        logging: {
          verbose: false,
          level: 'info',
          outputToFile: false,
        },
        performance: {
          worker: {
            workerCount: os.cpus().length * 2,
            timeout: 30_000,
            useClusterMode: true,
            workerConcurrency: 2,
          },
        },
      },
    },
    user: null!,
    plugins: [],
  }
}
