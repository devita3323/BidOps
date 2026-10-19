// Added for the portfolio sample. Every record and source excerpt is synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyWorkflow, instant, workflowQueue, workflowAchievement, workflowUrgency } from '../src/lib/workflow-domain.ts';
import { complianceDetailsSchema, validateComplianceReview, type ComplianceDetails } from '../src/lib/compliance-domain.ts';
import { revisionLines, compareRevisionLines, compareRevisionFacts, type ReviewedRevisionFact } from '../src/lib/amendment-domain.ts';
import type { Opportunity } from '../src/lib/types.ts';

const now = Date.parse('2026-01-01T10:00:00Z');
const opportunity: Opportunity = {
  id:'00000000-0000-4000-8000-000000000001', title:'Synthetic training opportunity',
  solicitation:'DEMO-ONLY-001', agency:'Example Agency', setAside:'',
  deadline:'2026-01-02T10:00:00Z', deadlineSource:'Synthetic notice', sourceTimezone:'UTC',
  value:null, lane:'Example lane', notes:'Fictional fixture', stage:'New', demo:true,
  revision:1, createdAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z',
};
const details: ComplianceDetails = {
  importance:'Mandatory', clin:'DEMO-LINE', owner:'Example Reviewer',
  requiredResponse:'Describe the fictional warranty', proposedResponse:'Example response',
  responseLocation:'Synthetic section 1', confidence:1, evidenceState:'Unverified',
};

test('workflow begins with unknown outcomes', () => {
  const state = emptyWorkflow();
  assert.equal(state.submission, 'not_established');
  assert.equal(state.award, 'unknown');
  assert.equal(workflowAchievement(state), 'Submission not established');
});
test('invalid and ambiguous calendar timestamps are rejected', () => {
  for (const date of ['2026-02-30T10:00:00Z','2026-01-01','2026-01-01T10:00:00-00:00']) {
    assert.equal(instant.safeParse(date).success, false);
  }
  assert.equal(instant.safeParse('2028-02-29T10:00:00Z').success, true);
});
test('unverified deadlines and deadline conflicts retain review status', () => {
  const state = emptyWorkflow();
  assert.equal(workflowUrgency(state, {...opportunity, deadlineSource:''}, now), 'unverified');
  state.deadline_conflict = true;
  assert.equal(workflowUrgency(state, opportunity, now), 'unverified');
});
test('due-soon threshold and expired deadlines are distinct', () => {
  const state = emptyWorkflow();
  assert.equal(workflowUrgency(state, opportunity, now), 'time_remaining');
  state.due_soon_hours = 24;
  assert.equal(workflowUrgency(state, opportunity, now), 'due_soon');
  assert.equal(workflowUrgency(state, opportunity, now + 86400000), 'elapsed');
});
test('ready requires verified sourcing, current quote, package and approval', () => {
  const state = {...emptyWorkflow(), interest:'interested' as const, disposition:'active' as const,
    sourcing:'complete_verified' as const, pricing:'approved' as const};
  assert.equal(workflowQueue(state, 'time_remaining', true, true, now), 'ready');
  assert.equal(workflowQueue(state, 'time_remaining', false, true, now), 'sourcing');
  assert.equal(workflowQueue({...state, review_hold:true}, 'time_remaining', true, true, now), 'needs-review');
  assert.equal(workflowQueue(state, 'elapsed', true, true, now), 'dead');
});
test('submission timing and award are independent', () => {
  const state = {...emptyWorkflow(), submission:'submitted' as const, on_time:true};
  assert.equal(workflowAchievement({...state, award:'lost'}), 'Success');
  assert.equal(workflowQueue({...state, award:'lost'}, 'elapsed', false, false), 'closed');
  assert.equal(workflowAchievement({...state, award:'won'}), 'Win');
  assert.equal(workflowQueue({...state, award:'won', on_time:null}, 'elapsed', false, false), 'needs-review');
});
test('confidence cannot replace reviewed evidence', () => {
  assert.throws(() => validateComplianceReview('Satisfied', details, 'Synthetic evidence'), /Confidence alone/);
  assert.doesNotThrow(() => validateComplianceReview('Satisfied', {...details, evidenceState:'Verified'}, 'Synthetic evidence'));
  assert.throws(() => validateComplianceReview('Satisfied', {...details, evidenceState:'Verified', owner:''}, 'Synthetic evidence'));
});
test('not-applicable needs its own rationale and evidence state', () => {
  assert.throws(() => validateComplianceReview('Not Applicable', details, 'Synthetic rationale'));
  assert.doesNotThrow(() => validateComplianceReview('Not Applicable', {...details, evidenceState:'Not Applicable'}, 'Synthetic rationale'));
  assert.equal(complianceDetailsSchema.safeParse({...details, unexpected:true}).success, false);
});
test('known limitation: absent structured details bypass this local validator', () => {
  assert.doesNotThrow(() => validateComplianceReview('Satisfied', undefined, ''));
});
test('line comparison retains source location and change topics', () => {
  const before = revisionLines([{location:'Synthetic page 1', text:'Demo item\nQuantity 2'}]);
  const after = revisionLines([{location:'Synthetic page 1', text:'Demo item\nQuantity 3'}]);
  const diff = compareRevisionLines(before, after);
  assert.equal(diff.unchangedLines, 1);
  assert.deepEqual(diff.changes.map(c => c.kind), ['Removed','Added']);
  assert.equal(diff.changes[0].location, 'Synthetic page 1');
  assert.ok(diff.changes[1].topics.includes('CLIN / quantity / pricing'));
});
test('comparison rejects oversized text', () => {
  assert.throws(() => revisionLines([{location:'Synthetic page', text:'x'.repeat(8001)}]), /8,000/);
  assert.throws(() => revisionLines([{location:'Synthetic page', text:'x\n'.repeat(2001)}]), /2,000/);
});
test('fact comparison distinguishes changed values from duplicated facts', () => {
  const fact: ReviewedRevisionFact = {field:'quantity', item:'DEMO-LINE', value:'2', location:'Synthetic page',
    excerpt:'Quantity 2', factId:'synthetic-fact', runId:'synthetic-run', reviewId:'synthetic-review'};
  assert.deepEqual(compareRevisionFacts([fact], [fact, fact]), []);
  const changes = compareRevisionFacts([fact], [{...fact, value:'3'}]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after[0].value, '3');
});
