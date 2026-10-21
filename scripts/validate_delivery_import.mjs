import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, ".work-artifact/Script-to-Storyboard-Delivery.json");
const workflow = JSON.parse(fs.readFileSync(file, "utf8"));
const byName = new Map(workflow.nodes.map(node => [node.name, node]));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
assert.equal(workflow.name, "Script to Storyboard — Delivery & Feedback");
assert.equal(byName.size, workflow.nodes.length, "Node names are unique");
for (const name of ["Record Storyboard Process", "Prepare Storyboard CSV", "Upload Storyboard CSV to Google Drive", "Build Process Log Entry", "Append Process Log to Google Sheets", "Return Process Log Result", "Email Editing Team", "Validate Feedback"]) {
  assert.ok(byName.has(name), "Missing node: " + name);
}
for (const node of workflow.nodes.filter(item => item.type === "n8n-nodes-base.code")) {
  assert.doesNotThrow(() => new AsyncFunction(node.parameters.jsCode), "Code node should parse: " + node.name);
}
const route = workflow.nodes.find(node => node.name === "Record Storyboard Process");
assert.equal(route.parameters.path, "fred-record-process");
assert.equal(route.parameters.httpMethod, "POST");
for (const node of [byName.get("Upload Storyboard CSV to Google Drive"), byName.get("Append Process Log to Google Sheets")]) {
  assert.ok(node.credentials && Object.keys(node.credentials).length, "Reused credential on " + node.name);
}
assert.equal(workflow.connections["Record Storyboard Process"].main[0][0].node, "Prepare Storyboard CSV");
assert.equal(workflow.connections["Append Process Log to Google Sheets"].main[0][0].node, "Return Process Log Result");

const csv = '"Scene","Timestamp","Voiceover","What\'s happening","Background","Hand-drawn characters & props","On-screen text","Transitions/Motion"\r\n"1","00:00-00:04","A full script sentence.","Show the location.","A clear single setting.","None","None","Hard cut."';
const triggerItem = { json: { body: JSON.stringify({ title: "How Coffee Beans Become Coffee", jobId: "job-test", processedAt: "2026-10-21T12:00:00.000Z", storyboardCsv: csv, images: [], driveFolderUrl: "https://drive.google.com/drive/folders/demo" }) } };
const input = { first: () => triggerItem };
const lookup = name => ({ first: () => ({ json: name === "Record Storyboard Process" ? triggerItem.json : {} }) });
const prepareNode = byName.get("Prepare Storyboard CSV");
const prepare = new AsyncFunction("$input", "$", "Buffer", prepareNode.parameters.jsCode);
const prepared = (await prepare.call({ helpers: { prepareBinaryData: async (bytes, fileName, mimeType) => ({ fileName, mimeType, bytes: bytes.toString("base64") }) } }, input, lookup, Buffer))[0];
assert.equal(prepared.json.storyboardFileName, "how-coffee-beans-become-coffee-storyboard.csv");
assert.equal(prepared.binary.data.mimeType, "text/csv");
const logBuilder = new AsyncFunction("$json", "$", byName.get("Build Process Log Entry").parameters.jsCode);
const logged = (await logBuilder.call({}, { id: "drive-file-id", webViewLink: "https://drive.google.com/file/d/drive-file-id/view" }, name => ({ first: () => ({ json: prepared.json }) })))[0];
assert.equal(Object.keys(logged.json).length, 12, "Process Log payload exactly matches its 12 headers");
assert.equal(logged.json.storyboardDriveUrl, "https://drive.google.com/file/d/drive-file-id/view");
console.log("Delivery workflow import is valid: " + workflow.nodes.length + " nodes; Code nodes parse; CSV upload/log route is connected and the 12-column record is shaped correctly.");
