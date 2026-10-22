import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "workflows/fred-background-delivery-review/workflow.json");
const outputPath = path.join(root, ".work-artifact/Script-to-Storyboard-Delivery.json");
const workflow = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const generatedNodeNames = [
  "Record Storyboard Process",
  "Prepare Storyboard CSV",
  "Upload Storyboard CSV to Google Drive",
  "Build Process Log Entry",
  "Append Process Log to Google Sheets",
  "Return Process Log Result"
];
workflow.nodes = workflow.nodes.filter(node => !generatedNodeNames.includes(node.name));
for (const name of generatedNodeNames) delete workflow.connections?.[name];
const workbookId = "1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg";
const outputFolderId = "153VPM-IBR1T5UIq-TthqtpklyAGwi-UU";
const processLogSheetId = "2026102121";
const n8nWorkflowId = "KNBiOwM2a2SXvgK2";
const origins = [
  "https://script-to-storyboard-six.vercel.app",
  "https://script-to-storyboard-66zqtjejz-rayvin-gianan-s-projects.vercel.app",
  "https://script-to-storyboard-rh9j2ogz2-rayvin-gianan-s-projects.vercel.app",
  "https://script-to-storyboard-rj8si3nam-rayvin-gianan-s-projects.vercel.app",
  "https://script-to-storyboard-2936gb8xd-rayvin-gianan-s-projects.vercel.app",
  "https://script-to-storyboard-git-codex-5b7cab-rayvin-gianan-s-projects.vercel.app"
];
const originList = origins.join(",");
const originExpression = "={{ " + JSON.stringify(origins) + ".includes($('Record Storyboard Process').first().json.headers?.origin) ? $('Record Storyboard Process').first().json.headers.origin : '" + origins[0] + "' }}";

const findNode = name => workflow.nodes.find(node => node.name === name);
const sheetsCredential = structuredClone(findNode("Append Feedback to Google Sheets").credentials);
const driveCredential = structuredClone(findNode("Upload Background to Google Drive").credentials);

findNode("Build Notification Payload").parameters.jsCode = String.raw`function parseRequest(source) {
  let body = source?.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  for (const candidate of [source?.rawBody, source?.data, source?.payload]) {
    if (typeof candidate === 'string') { try { const parsed = JSON.parse(candidate); if (parsed && typeof parsed === 'object') return parsed; } catch {} }
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  }
  return source && typeof source === 'object' ? source : {};
}
const hook = $('Notify Editing Team').first().json || {};
const req = parseRequest(hook);
const rows = $input.all().map(item => item.json);
const settings = {};
for (const row of rows) {
  const key = String(row.Setting ?? row.setting ?? '').trim();
  if (key) settings[key] = String(row.Value ?? row.value ?? '').trim();
}
const email = settings.editingTeamEmail || '';
const images = Array.isArray(req.images) ? req.images.filter(image => image && typeof image === 'object') : [];
const jobId = String(req.jobId || ('job-' + Date.now().toString(36))).trim().slice(0, 100);
const title = String(req.title || 'Storyboard').trim().slice(0, 120);
const folderId = settings.teamDriveFolderId || '153VPM-IBR1T5UIq-TthqtpklyAGwi-UU';
const storyboardDriveUrl = String(req.storyboardDriveUrl || '').trim();
const storyboardFileName = String(req.storyboardFileName || 'storyboard.csv').trim().slice(0, 120);
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
if (!images.length) return [{ json: { ok: false, ready: false, statusCode: 400, error: 'No background images were included.' } }];
if (images.some(image => !String(image.driveFileId || image.fileId || '').trim() || !String(image.driveUrl || image.webViewLink || '').trim())) return [{ json: { ok: false, ready: false, statusCode: 409, error: 'Every background must finish its Google Drive upload before editors are notified.' } }];
if (!storyboardDriveUrl) return [{ json: { ok: false, ready: false, statusCode: 409, error: 'The storyboard CSV must be saved to Google Drive before editors are notified.' } }];
if (!validEmail) return [{ json: { ok: true, ready: false, notificationSent: false, status: 'recipient_missing', jobId, title, reason: 'Fill in editingTeamEmail on the Workflow Settings sheet to enable email notifications.' } }];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let date = new Date(req.processedAt || Date.now());
if (!Number.isFinite(date.getTime())) date = new Date();
const processedDate = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
const imageList = images.map(image => {
  const name = String(image.fileName || image.name || image.backgroundId || 'Background');
  const url = String(image.driveUrl || image.webViewLink || '');
  const scenes = Array.isArray(image.sceneNumbers) ? image.sceneNumbers.join(', ') : String(image.sceneNumbers || '');
  return '<li><a href="' + escapeHtml(url) + '">' + escapeHtml(name) + '</a>' + (scenes ? ' — scenes ' + escapeHtml(scenes) : '') + '</li>';
}).join('');
const folderUrl = String(req.driveFolderUrl || ('https://drive.google.com/drive/folders/' + encodeURIComponent(folderId)));
const fileManifest = JSON.stringify(images.map(image => ({ backgroundId: image.backgroundId || '', sceneNumbers: image.sceneNumbers || [], driveFileId: image.driveFileId || image.fileId || '', fileName: image.fileName || image.name || '', driveUrl: image.driveUrl || image.webViewLink || '' })));
const message = '<p>Storyboard and background delivery for <strong>' + escapeHtml(title) + '</strong>.</p>' +
  '<p>Processed on ' + escapeHtml(processedDate) + ' (Asia/Manila).</p>' +
  '<p><a href="' + escapeHtml(storyboardDriveUrl) + '">Download the storyboard CSV (' + escapeHtml(storyboardFileName) + ')</a></p>' +
  '<p>Generated background images:</p><ol>' + imageList + '</ol>' +
  '<p><a href="' + escapeHtml(folderUrl) + '">Open the shared Google Drive folder</a></p>';
return [{ json: { ok: true, ready: true, jobId, title, processedAt: date.toISOString(), processedDate, storyboardFileName, storyboardDriveUrl, sendTo: email, subject: title + ' — storyboard and backgrounds ready', message, fileCount: images.length, targetFolderId: folderId, fileManifest, emailRecipient: email, folderUrl } }];`;

findNode("Validate Feedback").parameters.jsCode = String.raw`function parseRequest(source) {
  let body = source?.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  for (const candidate of [source?.rawBody, source?.data, source?.payload]) {
    if (typeof candidate === 'string') { try { const parsed = JSON.parse(candidate); if (parsed && typeof parsed === 'object') return parsed; } catch {} }
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  }
  return source && typeof source === 'object' ? source : {};
}
const source = $('Record Background Feedback').first().json || {};
const req = parseRequest(source);
const rating = String(req.rating || '').trim().toLowerCase();
const backgroundId = String(req.backgroundId || '').trim().slice(0, 80);
const jobId = String(req.jobId || '').trim().slice(0, 100);
const sceneNumbers = Array.isArray(req.sceneNumbers) ? [...new Set(req.sceneNumbers.map(Number).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b) : [];
if (!['up', 'down'].includes(rating) || !backgroundId) return [{ json: { ok: false, statusCode: 400, error: 'A valid backgroundId and rating (up or down) are required.' } }];
return [{ json: { ok: true, createdAt: new Date().toISOString(), jobId, title: String(req.title || '').trim().slice(0, 120), backgroundId, sceneNumbers: sceneNumbers.join(', '), rating, comment: String(req.comment || '').trim().slice(0, 1000), driveFileId: String(req.driveFileId || '').trim(), driveUrl: String(req.driveUrl || '').trim(), source: 'script-to-storyboard-ui' } }];`;

// The notification workflow reads the CSV's Drive link from the delivery payload.
const statusNode = findNode("Return Notification Status");
statusNode.parameters.responseBody = "={{ $json }}";
const resultNode = findNode("Return Notification Result");
resultNode.parameters.responseBody = "={{ { ok: true, notificationSent: true, recipient: $('Build Notification Payload').first().json.sendTo, fileCount: $('Build Notification Payload').first().json.fileCount, title: $('Build Notification Payload').first().json.title, jobId: $('Build Notification Payload').first().json.jobId } }}";
findNode("Notify Editing Team").parameters.options.allowedOrigins = originList;
findNode("Record Background Feedback").parameters.options.allowedOrigins = originList;
statusNode.parameters.options.responseHeaders.entries[0].value = "={{ " + JSON.stringify(origins) + ".includes($('Notify Editing Team').first().json.headers?.origin) ? $('Notify Editing Team').first().json.headers.origin : '" + origins[0] + "' }}";
resultNode.parameters.options.responseHeaders.entries[0].value = "={{ " + JSON.stringify(origins) + ".includes($('Notify Editing Team').first().json.headers?.origin) ? $('Notify Editing Team').first().json.headers.origin : '" + origins[0] + "' }}";
findNode("Return Feedback Status").parameters.options.responseHeaders.entries[0].value = "={{ " + JSON.stringify(origins) + ".includes($('Record Background Feedback').first().json.headers?.origin) ? $('Record Background Feedback').first().json.headers.origin : '" + origins[0] + "' }}";
findNode("Return Feedback Saved").parameters.options.responseHeaders.entries[0].value = "={{ " + JSON.stringify(origins) + ".includes($('Record Background Feedback').first().json.headers?.origin) ? $('Record Background Feedback').first().json.headers.origin : '" + origins[0] + "' }}";

const processTrigger = {
  parameters: { path: "fred-record-process", httpMethod: "POST", responseMode: "responseNode", options: { allowedOrigins: originList } },
  id: randomUUID(), name: "Record Storyboard Process", type: "n8n-nodes-base.webhook", typeVersion: 2.1,
  position: [240, 1248], webhookId: randomUUID()
};
const prepareCsvCode = String.raw`function parseRequest(source) {
  let body = source?.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  for (const candidate of [source?.rawBody, source?.data, source?.payload]) {
    if (typeof candidate === 'string') { try { const parsed = JSON.parse(candidate); if (parsed && typeof parsed === 'object') return parsed; } catch {} }
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  }
  return source && typeof source === 'object' ? source : {};
}
const hook = $('Record Storyboard Process').first().json || {};
const req = parseRequest(hook);
const title = String(req.title || 'Storyboard').trim().slice(0, 120);
const csv = String(req.storyboardCsv || '');
const header = csv.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, '').split(',').map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')).join(',');
const expected = "Scene,Timestamp,Voiceover,What's happening,Background,Hand-drawn characters & props,On-screen text,Transitions/Motion";
if (!csv.trim() || Buffer.byteLength(csv, 'utf8') > 5 * 1024 * 1024) throw new Error('A complete storyboard CSV (up to 5 MB) is required.');
if (header !== expected) throw new Error('The storyboard CSV is missing the required eight columns in the expected order.');
const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'storyboard';
let fileName = String(req.storyboardFileName || (slug + '-storyboard.csv')).replace(/[\\/<>:"|?*\u0000-\u001f]/g, '-').trim().slice(0, 120);
if (!fileName.toLowerCase().endsWith('.csv')) fileName += '.csv';
let processedAt = new Date(req.processedAt || Date.now());
if (!Number.isFinite(processedAt.getTime())) processedAt = new Date();
const images = Array.isArray(req.images) ? req.images.filter(image => image && typeof image === 'object').map(image => ({ backgroundId: String(image.backgroundId || ''), sceneNumbers: Array.isArray(image.sceneNumbers) ? image.sceneNumbers : [], fileName: String(image.fileName || ''), driveFileId: String(image.driveFileId || ''), driveUrl: String(image.driveUrl || '') })) : [];
const folderUrl = String(req.driveFolderUrl || 'https://drive.google.com/drive/folders/153VPM-IBR1T5UIq-TthqtpklyAGwi-UU');
const metadata = { jobId: String(req.jobId || ('job-' + Date.now().toString(36))).slice(0, 100), title, processedAt: processedAt.toISOString(), status: String(req.status || 'complete').slice(0, 30), sceneCount: Math.max(0, Number(req.sceneCount) || 0), uniqueBackgrounds: Math.max(0, Number(req.uniqueBackgrounds) || 0), generatedCount: Math.max(0, Number(req.generatedCount) || images.length), failedCount: Math.max(0, Number(req.failedCount) || 0), storyboardFileName: fileName, driveFolderUrl: folderUrl, images };
const binary = await this.helpers.prepareBinaryData(Buffer.from(csv, 'utf8'), fileName, 'text/csv');
return [{ json: metadata, binary: { data: binary } }];`;
const prepareNode = {
  parameters: { language: "javaScript", jsCode: prepareCsvCode, mode: "runOnceForAllItems" },
  id: randomUUID(), name: "Prepare Storyboard CSV", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [464, 1248]
};
const uploadNode = {
  parameters: { name: "={{ $json.storyboardFileName }}", driveId: { __rl: true, mode: "list", value: "My Drive" }, folderId: { __rl: true, value: outputFolderId, mode: "id" }, options: {}, resource: "file", operation: "upload", inputDataFieldName: "data" },
  id: randomUUID(), name: "Upload Storyboard CSV to Google Drive", type: "n8n-nodes-base.googleDrive", typeVersion: 3,
  position: [688, 1248], credentials: driveCredential
};
const logCode = String.raw`const source = $('Prepare Storyboard CSV').first().json;
const fileId = String($json.id || '').trim();
if (!fileId) throw new Error('Google Drive did not return an ID for the storyboard CSV.');
const storyboardDriveUrl = String($json.webViewLink || ('https://drive.google.com/file/d/' + fileId + '/view'));
return [{ json: { processedAt: source.processedAt, jobId: source.jobId, title: source.title, status: source.status, sceneCount: source.sceneCount, uniqueBackgrounds: source.uniqueBackgrounds, generatedCount: source.generatedCount, failedCount: source.failedCount, storyboardFileName: source.storyboardFileName, storyboardDriveUrl, driveFolderUrl: source.driveFolderUrl, backgroundManifest: JSON.stringify(source.images) } }];`;
const logBuilderNode = {
  parameters: { language: "javaScript", jsCode: logCode, mode: "runOnceForAllItems" },
  id: randomUUID(), name: "Build Process Log Entry", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [912, 1248]
};
const processLogColumns = ["processedAt", "jobId", "title", "status", "sceneCount", "uniqueBackgrounds", "generatedCount", "failedCount", "storyboardFileName", "storyboardDriveUrl", "driveFolderUrl", "backgroundManifest"];
const appendLogNode = {
  parameters: {
    options: { handlingExtraData: "error", cellFormat: "RAW" },
    columns: { schema: processLogColumns.map(key => ({ id: key, type: ["sceneCount", "uniqueBackgrounds", "generatedCount", "failedCount"].includes(key) ? "number" : "string", display: true, displayName: key, required: false })), mappingMode: "autoMapInputData", value: {} },
    authentication: "oAuth2", resource: "sheet", operation: "append",
    sheetName: { __rl: true, value: processLogSheetId, mode: "list" },
    documentId: { __rl: true, value: workbookId, mode: "id" }
  },
  id: randomUUID(), name: "Append Process Log to Google Sheets", type: "n8n-nodes-base.googleSheets", typeVersion: 4.7,
  position: [1136, 1248], credentials: sheetsCredential
};
const responseBody = "={{ { ok: true, status: 'recorded', jobId: $('Build Process Log Entry').first().json.jobId, title: $('Build Process Log Entry').first().json.title, storyboardFileName: $('Build Process Log Entry').first().json.storyboardFileName, storyboardDriveUrl: $('Build Process Log Entry').first().json.storyboardDriveUrl, driveFolderUrl: $('Build Process Log Entry').first().json.driveFolderUrl } }}";
const responseNode = {
  parameters: { respondWith: "json", responseBody, options: { responseCode: 200, responseHeaders: { entries: [
    { value: originExpression, name: "Access-Control-Allow-Origin" },
    { value: "no-store", name: "Cache-Control" },
    { value: "application/json", name: "Content-Type" }
  ] }, enableStreaming: false } },
  id: randomUUID(), name: "Return Process Log Result", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.5,
  position: [1360, 1248]
};

workflow.nodes.push(processTrigger, prepareNode, uploadNode, logBuilderNode, appendLogNode, responseNode);
workflow.name = "Script to Storyboard — Delivery & Feedback";
workflow.id = n8nWorkflowId;
workflow.active = false;
workflow.connections[processTrigger.name] = { main: [[{ node: prepareNode.name, type: "main", index: 0 }]] };
workflow.connections[prepareNode.name] = { main: [[{ node: uploadNode.name, type: "main", index: 0 }]] };
workflow.connections[uploadNode.name] = { main: [[{ node: logBuilderNode.name, type: "main", index: 0 }]] };
workflow.connections[logBuilderNode.name] = { main: [[{ node: appendLogNode.name, type: "main", index: 0 }]] };
workflow.connections[appendLogNode.name] = { main: [[{ node: responseNode.name, type: "main", index: 0 }]] };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Prepared ".concat(workflow.nodes.length, " nodes for workflow ", workflow.name, " at ", outputPath));
