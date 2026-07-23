import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sanity Studio schema lives here and is compiled by the separate Studio
    // project (it imports `sanity`, not a storefront dependency).
    "sanity/**",
    // Medusa commerce workspace is a separate project with its own eslint
    // config (apps/rangat-commerce/apps/backend/eslint.config.ts) and its own
    // module conventions — the storefront config must not lint into it.
    "apps/**",
  ]),
]);

export default eslintConfig;
