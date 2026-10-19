// Selected stage and Opportunity definitions only.
export const stages = [
  "New",
  "Deep Dive",
  "Needs Research",
  "Sourcing",
  "Waiting for Quotes",
  "Go/No-Go",
  "Pricing",
  "Proposal in Progress",
  "Red-Team Review",
  "Ready for Approval",
  "Ready to Submit",
  "Submitted",
  "Won",
  "Lost",
  "Cancelled",
  "No-Bid",
] as const;
export type Stage = (typeof stages)[number];
export interface Opportunity {
  itemName?: string;
  deliveryDestination?: string;
  receivingParty?: string;
  samNoticeId?: string;
  samSnapshotId?: string;
  id: string;
  title: string;
  solicitation: string;
  agency: string;
  setAside: string;
  deadline: string | null;
  sourceTimezone: string;
  deadlineSource: string;
  value: number | null;
  lane: string;
  notes: string;
  stage: Stage;
  demo: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
