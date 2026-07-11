import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const redisUrl = process.env.REDIS_URL

// worker | server | shared. Railway runs a `server` web instance + a `worker`
// instance off the same image; set MEDUSA_WORKER_MODE per service. Falls back
// to `shared` for single-process local dev.
const workerMode =
  (process.env.MEDUSA_WORKER_MODE as 'shared' | 'worker' | 'server' | undefined) ??
  'shared'

// Redis-backed modules only when REDIS_URL is present. Without Redis the
// in-memory event bus + local workflow engine work for a single instance but
// break the moment there is more than one (events/jobs stay in one process).
const redisModules = redisUrl
  ? [
      {
        resolve: '@medusajs/medusa/event-bus-redis',
        key: Modules.EVENT_BUS,
        options: { redisUrl },
      },
      {
        resolve: '@medusajs/medusa/workflow-engine-redis',
        key: Modules.WORKFLOW_ENGINE,
        options: { redis: { url: redisUrl } },
      },
      {
        resolve: '@medusajs/medusa/cache-redis',
        key: Modules.CACHE,
        options: { redisUrl },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    workerMode,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [...redisModules],
})
