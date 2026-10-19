# Selection and sanitization

Included: three existing domain modules, a minimal type excerpt, twelve newly authored synthetic tests, a minimal dependency manifest/lockfile, and documentation.

- `workflow-domain.ts`: source logic retained; type-only import changed from `./types` to `./types.ts` for Node's native loader.
- `compliance-domain.ts` and `amendment-domain.ts`: source retained with line endings normalized.
- `types.ts`: only `stages`, `Stage`, and `Opportunity` retained; unrelated integration and business types omitted.
- `package-lock.json`: only the pinned Zod 4.6.2 package entry and sample root retained from the original dependency graph. No original project scripts copied.
- Tests: all records, source passages, names and identifiers are explicitly fictional. No original operational fixtures were copied.

Excluded: Next.js UI/server routes, authentication, vault and owner configuration, `.env` files, databases and backups, source documents, real procurement identifiers and supplier quotes, business profiles, employer/customer/family information, mail/calendar/OAuth connectors, bid submission and approval execution, live research and AI providers, imports and exports, worker launchers, deployment scripts, original tests and generated reports, caches, original Git metadata/history, and licenses requiring a new owner decision.

The source checkout's OneDrive and generated-output instructions were inspected. No source build or original test command was run. Private source paths and provenance hashes remain outside this project folder in the parent review records.
