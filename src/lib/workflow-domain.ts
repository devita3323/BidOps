import { z } from "zod";
import type { Opportunity } from "./types.ts";

export const axes = {
  interest: ["undecided", "interested", "not_interested"],
  disposition: ["intake", "active", "hold", "axed", "capture", "closed"],
  sourcing: [
    "unknown",
    "not_started",
    "in_progress",
    "partial",
    "complete_verified",
    "failed",
  ],
  pricing: [
    "unknown",
    "awaiting_quote",
    "landed_cost_incomplete",
    "landed_cost_complete",
    "offer_ready",
    "approved",
  ],
  benchmark: [
    "unverified",
    "not_found",
    "reference_only",
    "comparison_pending",
    "award_comparison_reviewed",
  ],
  submission: ["not_established", "not_submitted", "submitted"],
  award: ["unknown", "pending", "won", "lost", "cancelled"],
  fulfillment: [
    "unknown",
    "acceptance_review",
    "source_revalidation",
    "ordering",
    "in_transit",
    "delivered",
    "accepted",
    "invoiced",
    "paid",
    "closed",
  ],
} as const;
export const exitReasons = [
  "not_interested",
  "no_source",
  "doa",
  "economics",
  "deadline",
  "capacity",
  "withdrawn",
  "other",
] as const;
export const sourceChecks = [
  "All mandatory CLINs, units and quantities matched",
  "Supplier willingness and required authority supported",
  "Stock, lead time and every delivery destination supported",
  "Warranty, origin, packaging and documents reconciled",
  "Delivered cost, terms and quote validity verified",
  "Exceptions resolved or explicitly accepted against the solicitation",
] as const;
export const benchmarkChecks = [
  "Award source and observation date preserved",
  "Exact product or documented differences",
  "Unit/pack conversion and quantity tier",
  "Base/options and ceiling versus actual order separated",
  "Freight, taxes, destination and terms normalized",
  "Age, market differences and limitations reviewed",
  "Comparable unit range and operator decision recorded",
] as const;
// Date.parse alone accepts impossible dates. Zod checks calendar validity first.
export const instant = z.iso
  .datetime({ offset: true })
  .refine(
    (v) => !v.endsWith("-00:00") && Number.isFinite(Date.parse(v)),
    "Use a real timestamp with a known UTC offset.",
  );
const nullableTime = instant.nullable();
export const workflowStateSchema = z.object({
  interest: z.enum(axes.interest),
  disposition: z.enum(axes.disposition),
  exit_reason: z.enum(exitReasons).nullable(),
  exit_detail: z.string().max(8000),
  sourcing: z.enum(axes.sourcing),
  pricing: z.enum(axes.pricing),
  benchmark: z.enum(axes.benchmark),
  submission: z.enum(axes.submission),
  on_time: z.boolean().nullable(),
  award: z.enum(axes.award),
  fulfillment: z.enum(axes.fulfillment),
  review_hold: z.boolean(),
  blocker: z.string().max(8000),
  owner: z.string().max(240),
  next_review_at: nullableTime,
  next_action: z.string().max(8000),
  source_cutoff_at: nullableTime,
  price_freeze_at: nullableTime,
  submission_target_at: nullableTime,
  due_soon_hours: z.number().int().min(1).max(720).nullable(),
  negotiation_window_verified: z.boolean(),
  negotiation_until: nullableTime,
  source_checks: z.array(z.string().max(1000)).max(6),
  benchmark_checks: z.array(z.string().max(1000)).max(7),
  evidenceIds: z.array(z.uuid()).max(50),
  quoteId: z.uuid().nullable(),
  deadline_conflict: z.boolean(),
});
export type WorkflowState = z.infer<typeof workflowStateSchema>;
export interface WorkflowEvent {
  id: string;
  opportunityId: string;
  revision: number;
  opportunityRevision: number;
  state: WorkflowState;
  actor: string;
  createdAt: string;
  observedAt: string | null;
  reason: string;
  confidence: string;
  sourceRefs: string[];
  sourceHashes: { id: string; hash: string }[];
  batchId: string | null;
  supersedesId: string | null;
  historicalBasis?: boolean;
  quoteHash?: string | null;
  requirementsHash?: string;
  clinHash?: string | null;
}
export const workflowQueues = [
  ["needs-review", "Needs review"],
  ["due-soon", "Sourcing · due soon"],
  ["sourcing", "Sourcing · time remaining"],
  ["optimize", "Sourced · improve price"],
  ["benchmarked", "Sourced · award comparison ready"],
  ["sourced", "Sourced · pricing next"],
  ["ready", "Ready to submit"],
  ["submitted", "Submitted · await award"],
  ["dead", "DEAD · do not pursue"],
  ["wins", "Wins · delivery & closeout"],
  ["not-interested", "AXED · not interested"],
  ["no-source", "AXED · unable to source"],
  ["doa", "AXED · dead on arrival"],
  ["closed", "Closed · other outcomes"],
  ["capture", "Watch & future capture"],
  ["intake", "Intake · decide interest"],
] as const;
export type WorkflowQueue = (typeof workflowQueues)[number][0];
export interface WorkflowView {
  id: string;
  opportunityId: string;
  revision: number;
  state: WorkflowState;
  queue: WorkflowQueue;
  urgency: "unverified" | "elapsed" | "due_soon" | "time_remaining";
  achievement: string;
  confidence: string;
  historical: boolean;
  stale: boolean;
  warnings: string[];
  quoteCurrent: boolean;
  packageReady: boolean;
}
export function emptyWorkflow(op?: Opportunity): WorkflowState {
  return {
    interest: "undecided",
    disposition: "intake",
    exit_reason: null,
    exit_detail: "",
    sourcing: "unknown",
    pricing: "unknown",
    benchmark: "unverified",
    submission: "not_established",
    on_time: null,
    award:
      op?.stage === "Won"
        ? "won"
        : op?.stage === "Lost"
          ? "lost"
          : op?.stage === "Cancelled"
            ? "cancelled"
            : "unknown",
    fulfillment: "unknown",
    review_hold: false,
    blocker: "",
    owner: "",
    next_review_at: null,
    next_action: "",
    source_cutoff_at: null,
    price_freeze_at: null,
    submission_target_at: null,
    due_soon_hours: null,
    negotiation_window_verified: false,
    negotiation_until: null,
    source_checks: [],
    benchmark_checks: [],
    evidenceIds: [],
    quoteId: null,
    deadline_conflict: false,
  };
}
export function workflowAchievement(s: WorkflowState) {
  if (s.submission !== "submitted") return "Submission not established";
  if (s.on_time === true) return s.award === "won" ? "Win" : "Success";
  return s.on_time === false ? "Timing: not on time" : "Timing unverified";
}
export function workflowUrgency(
  s: WorkflowState,
  op: Opportunity,
  now = Date.now(),
): WorkflowView["urgency"] {
  if (
    s.deadline_conflict ||
    !op.deadlineSource ||
    !instant.safeParse(op.deadline).success
  )
    return "unverified";
  const end = Date.parse(op.deadline!);
  if (end <= now) return "elapsed";
  if (
    (s.source_cutoff_at && Date.parse(s.source_cutoff_at) <= now) ||
    (s.due_soon_hours !== null && end - now <= s.due_soon_hours * 3600000)
  )
    return "due_soon";
  return "time_remaining";
}
export function workflowQueue(
  s: WorkflowState,
  urgency: WorkflowView["urgency"],
  quoteCurrent: boolean,
  packageReady: boolean,
  now = Date.now(),
): WorkflowQueue {
  if (s.on_time !== null && s.submission !== "submitted") return "needs-review";
  if (s.award === "won")
    return workflowAchievement(s) === "Win" ? "wins" : "needs-review";
  if (["lost", "cancelled"].includes(s.award)) return "closed";
  if (s.submission === "submitted") return "submitted";
  if (urgency === "elapsed") return "dead";
  if (s.disposition === "axed")
    return s.exit_reason === "not_interested"
      ? "not-interested"
      : s.exit_reason === "no_source"
        ? "no-source"
        : s.exit_reason === "doa"
          ? "doa"
          : "closed";
  if (s.disposition === "capture" || s.disposition === "closed")
    return s.disposition;
  if (s.review_hold || s.disposition === "hold") return "needs-review";
  if (s.disposition === "intake") return "intake";
  if (
    s.interest !== "interested" ||
    s.sourcing === "failed" ||
    urgency === "unverified"
  )
    return "needs-review";
  if (s.sourcing === "complete_verified" && quoteCurrent) {
    if (packageReady && s.pricing === "approved") return "ready";
    if (s.benchmark === "award_comparison_reviewed") return "benchmarked";
    if (
      s.negotiation_window_verified &&
      s.negotiation_until &&
      Date.parse(s.negotiation_until) > now &&
      s.price_freeze_at &&
      Date.parse(s.price_freeze_at) > now &&
      urgency === "time_remaining"
    )
      return "optimize";
    return "sourced";
  }
  return urgency === "due_soon" ? "due-soon" : "sourcing";
}
export const taskStates = [
  "suggested",
  "ready",
  "in_progress",
  "waiting_external",
  "blocked",
  "done",
  "cancelled",
] as const;
export const taskSchema = z.object({
  taskId: z.uuid(),
  expectedRevision: z.number().int().min(0),
  title: z.string().trim().min(3).max(240),
  owner: z.string().trim().max(240),
  state: z.enum(taskStates),
  nextAction: z.string().trim().min(3).max(8000),
  dueAt: nullableTime,
  timezone: z.string().min(1).max(100),
  dependencyIds: z.array(z.uuid()).max(50),
  evidenceIds: z.array(z.uuid()).max(50),
  contact: z.string().max(240),
  promisedAt: nullableTime,
  followUpAt: nullableTime,
  reason: z.string().trim().min(3).max(8000),
});
export type WorkflowTask = z.infer<typeof taskSchema> & {
  id: string;
  opportunityId: string;
  revision: number;
  actor: string;
  createdAt: string;
};
