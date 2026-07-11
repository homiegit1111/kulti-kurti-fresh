// OpenNext Cloudflare adapter config.
//
// Docs: https://opennext.js.org/cloudflare
// This produces a Workers bundle (.open-next/worker.js) that wrangler deploys.
//
// The custom Worker entrypoint in custom-worker.ts adds the scheduled() handler
// around the generated fetch handler. Keeping that wrapper separate is required
// by Wrangler/OpenNext and leaves the app's API route as the single job logic.

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  // Persist Next's incremental cache (ISR + fetch cache) in R2. Requires the
  // NEXT_INC_CACHE_R2_BUCKET binding in wrangler.toml. To run without ISR
  // persistence, remove this line and the r2_buckets binding.
  incrementalCache: r2IncrementalCache,
});
