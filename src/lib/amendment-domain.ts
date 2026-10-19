import { z } from "zod";
export const comparisonInput = z
  .object({
    opportunityId: z.uuid(),
    beforeId: z.uuid(),
    afterId: z.uuid(),
    beforeHash: z.string().regex(/^[a-f0-9]{64}$/),
    afterHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const comparisonReviewInput = z
  .object({
    comparisonId: z.uuid(),
    expectedDigest: z.string().length(64),
    expectedPreviousId: z.uuid().nullable(),
    disposition: z.enum(["Follow-up required", "Reviewed"]),
    reason: z.string().trim().min(10).max(4000),
    confirmed: z.literal(true),
  })
  .strict();
export interface RevisionLine {
  location: string;
  line: number;
  text: string;
}
export interface RevisionChange extends RevisionLine {
  kind: "Added" | "Removed";
  topics: string[];
}
export interface ReviewedRevisionFact {
  field: string;
  item: string;
  value: string;
  location: string;
  excerpt: string;
  factId: string;
  runId: string;
  reviewId: string;
}
export interface FactChange {
  field: string;
  item: string;
  before: ReviewedRevisionFact[];
  after: ReviewedRevisionFact[];
}
export interface AmendmentComparison {
  id: string;
  opportunityId: string;
  actor: string;
  createdAt: string;
  version: "comparison-v1";
  input: z.infer<typeof comparisonInput>;
  sources: { id: string; name: string; hash: string; textHash: string }[];
  evidenceDigest: string;
  changes: RevisionChange[];
  unchangedLines: number;
  factChanges: FactChange[];
  reviewedFacts: { before: number; after: number };
  affectedRequirements: {
    id: string;
    text: string;
    status: string;
    location: string;
  }[];
  warnings: string[];
}
export interface ComparisonReview {
  id: string;
  opportunityId: string;
  comparisonId: string;
  previousId: string | null;
  actor: string;
  createdAt: string;
  disposition: "Follow-up required" | "Reviewed";
  reason: string;
}
const topics: [string, RegExp][] = [
  [
    "Dates / deadlines",
    /\b(deadline|due|closing|date|amendment|acknowledg\w*)\b/i,
  ],
  [
    "CLIN / quantity / pricing",
    /\b(clin|subclin|quantity|quantities|qty|unit|price|pricing|cost|freight|tax)\b|\$\s*\d/i,
  ],
  [
    "Technical / product",
    /\b(specification|technical|salient|manufacturer|model|mpn|brand|equal|accessor\w*)\b/i,
  ],
  [
    "Delivery / performance",
    /\b(deliver\w*|destination|fob|lead time|install\w*|training|warranty|performance)\b/i,
  ],
  [
    "Clauses / eligibility",
    /\b(clause|far|dfars|taa|baa|buy american|889|cmmc|set.aside|eligib\w*)\b/i,
  ],
  [
    "Forms / submission",
    /\b(form|signature|certif\w*|represent\w*|submit\w*|submission|attachment|volume|page limit|filename)\b/i,
  ],
];
export function revisionLines(pages: { location: string; text: string }[]) {
  const result: RevisionLine[] = [];
  let chars = 0;
  for (const page of pages) {
    chars += page.text.length;
    if (chars > 500000)
      throw Error(
        "Comparison is limited to 500,000 extracted characters per source. Compare smaller source files.",
      );
    for (const [index, text] of page.text.split(/\r?\n/).entries()) {
      if (!text.trim()) continue;
      if (text.length > 8000 || result.length >= 2000)
        throw Error(
          "Comparison exceeds the 2,000-line or 8,000-character line limit. Review smaller source files.",
        );
      result.push({ location: page.location, line: index + 1, text });
    }
  }
  return result;
}
export function compareRevisionLines(
  before: RevisionLine[],
  after: RevisionLine[],
) {
  if (before.length > 2000 || after.length > 2000)
    throw Error("Too many comparison lines.");
  const width = after.length + 1;
  const lengths = new Uint16Array((before.length + 1) * width);
  for (let i = before.length - 1; i >= 0; i--)
    for (let j = after.length - 1; j >= 0; j--)
      lengths[i * width + j] =
        before[i].text === after[j].text
          ? lengths[(i + 1) * width + j + 1] + 1
          : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
  const changes: RevisionChange[] = [];
  const add = (kind: RevisionChange["kind"], line: RevisionLine) =>
    changes.push({
      ...line,
      kind,
      topics: topics
        .filter(([, pattern]) => pattern.test(line.text))
        .map(([name]) => name),
    });
  let i = 0,
    j = 0,
    unchangedLines = 0;
  while (i < before.length || j < after.length) {
    if (
      i < before.length &&
      j < after.length &&
      before[i].text === after[j].text
    ) {
      i++;
      j++;
      unchangedLines++;
    } else if (
      i < before.length &&
      (j === after.length ||
        lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])
    )
      add("Removed", before[i++]);
    else add("Added", after[j++]);
  }
  return { changes, unchangedLines };
}
export function compareRevisionFacts(
  before: ReviewedRevisionFact[],
  after: ReviewedRevisionFact[],
): FactChange[] {
  const keys = [
    ...new Set(
      [...before, ...after].map((f) => JSON.stringify([f.field, f.item])),
    ),
  ].sort();
  const values = (facts: ReviewedRevisionFact[]) =>
    JSON.stringify([...new Set(facts.map((f) => f.value))].sort());
  return keys.flatMap((key) => {
    const [field, item] = JSON.parse(key) as [string, string];
    const a = before.filter((f) => f.field === field && f.item === item),
      b = after.filter((f) => f.field === field && f.item === item);
    return values(a) === values(b)
      ? []
      : [{ field, item, before: a, after: b }];
  });
}
