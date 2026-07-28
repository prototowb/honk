import test   from 'node:test';
import assert from 'node:assert/strict';

const { WORKFLOWS, listWorkflows, getWorkflow, formatWorkflow, formatWorkflows } = await import('../lib/workflows.js');
const { BRIEF_FIELDS } = await import('../lib/brief.js');

test('the library ships the three seed entries', () => {
  assert.deepEqual(listWorkflows().map(w => w.name), ['weekly-insight', 'product-update', 'engagement-spark']);
});

test('every required_input is a real brief_schema field key (schema symmetry)', () => {
  const keys = new Set(BRIEF_FIELDS.map(f => f.key));
  for (const w of WORKFLOWS) for (const k of w.required_inputs) {
    assert.ok(keys.has(k), `${w.name}: required_input "${k}" is not a brief field`);
  }
});

test('every defaults key is a real brief_schema field key', () => {
  const keys = new Set(BRIEF_FIELDS.map(f => f.key));
  for (const w of WORKFLOWS) for (const k of Object.keys(w.defaults)) {
    assert.ok(keys.has(k), `${w.name}: default "${k}" is not a brief field`);
  }
});

test('getWorkflow is case/whitespace tolerant and null on unknown', () => {
  assert.equal(getWorkflow(' Weekly-Insight ').name, 'weekly-insight');
  assert.equal(getWorkflow('nope'), null);
});

test('brief_schema gained the workflow field with library-derived options', () => {
  const f = BRIEF_FIELDS.find(x => x.key === 'workflow');
  assert.ok(f, 'workflow field missing from brief');
  assert.equal(f.required, false);
  assert.deepEqual(f.options, ['weekly-insight', 'product-update', 'engagement-spark', 'none']);
});

test('formatters render required-ness and delegability', () => {
  const one = formatWorkflow(getWorkflow('engagement-spark'));
  assert.match(one, /fully delegable/);
  const all = formatWorkflows(listWorkflows());
  assert.match(all, /never from the entry/);
  assert.match(all, /## weekly-insight/);
});
