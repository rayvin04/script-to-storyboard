import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../workflows/script-to-storyboard/workflow.json', import.meta.url), 'utf8'));
const nodes = new Map(workflow.nodes.map(node => [node.name, node]));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const helpers = {
  prepareBinaryData: async (buffer, fileName, mimeType) => ({ data: buffer.toString('base64'), fileName, mimeType }),
};

async function run(name, input, previous = {}) {
  const fn = new AsyncFunction('$json', '$input', '$', nodes.get(name).parameters.jsCode);
  const lookup = key => ({ first: () => ({ json: previous[key] }), item: { json: previous[key] } });
  return fn.call({ helpers }, input, { all: () => [{ json: input }] }, lookup);
}

const scene = {
  id: 'scene-01', sceneNumber: 1, timestamp: '', narration: 'No text, no call.',
  whatHappening: 'He says "Nothing", then waits.\nSame phone.', background: 'Yellow room',
  handDrawnElements: 'Green-shirt character, phone', onScreenText: '', transitionsMotion: '',
  title: 'An empty notification', imageStatus: 'completed',
  imageData: 'data:image/jpeg;base64,' + Buffer.from('image-byte-fixture').toString('base64'),
};
const job = { requestId: 'story-workflow-check-20261020', sceneCount: 1, scenes: [scene], references: [{ dataUrl: 'private-reference-fixture' }] };
const row = { request_id: job.requestId, status: 'completed', result_json: JSON.stringify(job) };

const [csvItem] = await run('Create Fred Storyboard CSV', row);
const csv = Buffer.from(csvItem.binary.data.data, 'base64').toString('utf8');
assert.equal(csvItem.binary.data.mimeType, 'text/csv');
assert.ok(csv.startsWith('\uFEFF"Scene","Timestamp","Voiceover","What\'s happening","Background","Hand-drawn characters & props","On-screen text","Transitions/Motion"\r\n'));
assert.ok(csv.includes('"He says ""Nothing"", then waits.\nSame phone."'));
const hostile = structuredClone(job);
hostile.scenes[0].narration = '=HYPERLINK("https://example.com")';
const [safeCsv] = await run('Create Fred Storyboard CSV', { result_json: JSON.stringify(hostile) });
assert.ok(Buffer.from(safeCsv.binary.data.data, 'base64').toString('utf8').includes('"\'=HYPERLINK('));

const [status] = await run('Build Public Storyboard Status', row);
assert.equal(status.json.scenes[0].imageData, undefined);
assert.equal(status.json.references, undefined);
assert.ok(status.json.scenes[0].imageUrl.includes('-image?requestId='));
assert.equal(status.json.completedCount, 1);

const [image] = await run('Prepare Downloadable Image', row, { 'Storyboard Image Webhook': { query: { sceneId: 'scene-01' } } });
assert.equal(image.binary.data.mimeType, 'image/jpeg');
assert.equal(Buffer.from(image.binary.data.data, 'base64').toString(), 'image-byte-fixture');
const [missing] = await run('Prepare Downloadable Image', row, { 'Storyboard Image Webhook': { query: { sceneId: 'scene-05' } } });
assert.equal(missing.json.statusCode, 404);

const [repeat] = await run('Prepare Flare Image Tool Call', { result_json: JSON.stringify({ ...job, references: [{}, {}] }), request_id: job.requestId }, {
  'Flare Image Tool Input': { requestId: job.requestId, sceneId: 'scene-01', imagePrompt: 'Do not regenerate.' },
});
assert.equal(repeat.json.canGenerate, false);

assert.equal(nodes.get('Generate Fred Scene Image').parameters.workflowId.value, workflow.id);
assert.equal(nodes.get('Generate Scene Image').parameters.url, 'https://openrouter.ai/api/v1/images');
assert.equal(nodes.get('Generate Scene Image').retryOnFail, false);
for (const node of workflow.nodes) if (node.parameters.jsCode) new AsyncFunction('$json', '$input', '$', node.parameters.jsCode);
console.log('Passed: workflow CSV schema and escaping, spreadsheet formula guard, image byte/MIME delivery, status redaction, missing image, duplicate image guard, and same-workflow Flare tool. No provider calls.');
