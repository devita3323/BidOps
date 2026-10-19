import { z } from "zod";
export const requirementStates = [
  "Open",
  "Evidence Needed",
  "Response Drafted",
  "Review Required",
  "Satisfied",
  "Not Satisfied",
  "Not Applicable",
  "Waiver / Clarification Required",
  "In Progress",
  "Blocked",
] as const;
export const evidenceStates = [
  "Missing",
  "Unverified",
  "Verified",
  "Conflict",
  "Not Applicable",
] as const;
export const complianceDetailsSchema = z
  .object({
    importance: z.enum(["Unknown", "Mandatory", "Advisory"]),
    clin: z.string().trim().max(80),
    owner: z.string().trim().max(240),
    requiredResponse: z.string().trim().max(12000),
    proposedResponse: z.string().trim().max(12000),
    responseLocation: z.string().trim().max(240),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .strict();
export type ComplianceDetails = z.infer<typeof complianceDetailsSchema> & {
  evidenceState: (typeof evidenceStates)[number];
};
export function validateComplianceReview(
  status: (typeof requirementStates)[number],
  details: ComplianceDetails | undefined,
  evidence: string,
) {
  if (!details || !["Satisfied", "Not Applicable"].includes(status)) return;
  if (details.importance === "Unknown")
    throw new Error(
      "Classify this requirement as Mandatory or Advisory before completing its review.",
    );
  if (evidence.trim().length < 5)
    throw new Error("Record the verified evidence or applicability rationale.");
  if (
    status === "Satisfied" &&
    (details.evidenceState !== "Verified" ||
      !details.owner ||
      details.requiredResponse.length < 3 ||
      details.proposedResponse.length < 3 ||
      !details.responseLocation)
  )
    throw new Error(
      "A satisfied structured requirement needs a responsible owner, required and proposed responses, response location and Verified evidence. Confidence alone cannot satisfy it.",
    );
  if (status === "Not Applicable" && details.evidenceState !== "Not Applicable")
    throw new Error(
      "Record the evidence state as Not Applicable and explain why the requirement does not apply.",
    );
}
