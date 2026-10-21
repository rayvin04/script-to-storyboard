import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "public/app.js");
const source = fs.readFileSync(appPath, "utf8");
const start = source.indexOf("const CRC32_TABLE = (() => {");
const end = source.indexOf("\nfunction addDriveFileLink", start);
assert.notEqual(start, -1, "ZIP implementation is present");
assert.notEqual(end, -1, "ZIP implementation boundary is present");

const context = { Blob, TextEncoder, Uint8Array, DataView };
vm.runInNewContext(source.slice(start, end) + "\nthis.buildZipForTest = createZip;", context);
const files = [
  { name: "2026-10-21-coffee-farm-bg001-scenes-01.png", blob: new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], { type: "image/png" }) },
  { name: "2026-10-21-coffee-roasting-bg002-scenes-02-03.png", blob: new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 4, 5, 6])], { type: "image/png" }) }
];
const archive = await context.buildZipForTest(files);
assert.equal(archive.type, "application/zip");
const archivePath = path.join(root, ".work-artifact/background-zip-check.zip");
fs.mkdirSync(path.dirname(archivePath), { recursive: true });
fs.writeFileSync(archivePath, Buffer.from(await archive.arrayBuffer()));
try {
  const output = execFileSync("python", ["-c", "import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps(z.namelist()))", archivePath], { encoding: "utf8" }).trim();
  assert.deepEqual(JSON.parse(output), files.map(file => file.name));
  console.log("ZIP integrity passed; all " + files.length + " named background images are present.");
} finally {
  fs.unlinkSync(archivePath);
}
