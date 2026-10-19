# BidOps — selected code sample from an unfinished project

BidOps is an unfinished procurement workflow system intended to organize opportunities, evidence, review states, and bid preparation. This folder isolates its workflow and review rules using synthetic examples. It is not the complete application and cannot submit bids, contact suppliers, access a database, or send email.

## Verified scope

| Included module | Implemented behavior exercised here |
| --- | --- |
| `workflow-domain.ts` | Independent sourcing, pricing, submission and award states; deadline validation; queue precedence; review holds and readiness rules |
| `compliance-domain.ts` | Structured requirement checks that distinguish confidence from verified evidence and require a rationale for non-applicability |
| `amendment-domain.ts` | Bounded line comparison, source locations, topic labels, and comparison of reviewed fact values |
| `types.ts` | Only the source stage definitions and `Opportunity` interface needed by the sample |

All 12 tests in `tests/offline.test.ts` pass with Node 24.14.1 and Zod 4.6.2. These synthetic tests were written during portfolio preparation. They exercise local rules, not a real procurement workflow or the application's integration suite.

## Architecture

The source manifest and layout describe a Next.js/React TypeScript application with PostgreSQL/PGlite dependencies, service modules, migrations and workers. That broader runtime is omitted. This sample uses Zod schemas for input validation, pure functions for workflow status and review checks, and an in-memory longest-common-subsequence comparison for document revisions. It contains no server entrypoint or integration adapter.

## Kyle's role and AI assistance

Kyle is the project owner identified for this portfolio. This review verifies the selected code's behavior, not per-line authorship or the exact distribution of original work between Kyle and AI tools. Kyle should confirm his specific design and implementation contributions before submitting an application; no sole-authorship claim is made here.

Codex performed the allowlisted extraction, isolated the required type definitions, adjusted one relative TypeScript import, pinned the sample's existing dependency, wrote synthetic tests and this documentation, and verified the sample. No product feature was added for the portfolio.

## Setup and reproducible tests

Use Node 24.14.1 or a compatible Node release supporting native TypeScript type stripping. From this folder:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The install retrieves the pinned Zod package from the standard npm registry. No lifecycle scripts are needed. After dependency installation, the tests run offline and need no environment file or credentials. Alternatively, with that dependency already present, run `node --test tests/offline.test.ts` directly.

The original preparation run used a byte-identical verification copy and the already installed Zod 4.6.2 package in a separate local verification folder. It did not download dependencies or run the original app's scripts. On October 19, 2026, a separate fresh verification copy completed `npm ci --ignore-scripts --no-audit --no-fund` and all 12 tests passed with Node 24.19.0. The minimal lockfile retains the source lock's registry URL and integrity value. No dependency vulnerability audit or TypeScript typecheck was performed; Node strips types without checking them.

## Honest limitations

- The project remains unfinished. The sample does not establish end-to-end readiness, procurement compliance, secure authorization, delivery, or business results.
- `validateComplianceReview` returns early when structured details are absent. The test explicitly records this bypass. An integrating caller needs a separate requirement that structured details exist where mandatory.
- A queue label such as `ready` depends on caller-supplied booleans and state. The sample does not authenticate the evidence, validate a real quote, or enforce approval against persistent records.
- Workflow `Success` is the source's label for an established on-time submission; it is not an award or financial success claim.
- Amendment topic labels use keyword matching, and text comparison is bounded and quadratic. This sample does not verify legal meaning or whether extracted text matches a real document.
- No live opportunity identifiers, supplier quotes, recipients, customer data or private business records are included.

No open-source license has been selected. Zod's own license metadata applies to that third-party dependency, not to this project's code. This repository is a selected portfolio code sample; public availability does not grant an open-source license.
