const SAMPLE_SCRIPT = [
  "Your phone buzzes in your pocket. You reach for it. Nothing. No text, no call, no notification.",
  "Almost everyone has felt this, and it has a name: phantom vibration syndrome. Your brain predicts the signals that matter most, so a tiny muscle twitch or a shift of fabric can feel like a phone alert.",
  "The fix is to give your attention a break. The more you expect a notification, the more likely your brain is to invent one."
].join("\n\n");
const MAX_SCRIPT_LENGTH = 30000;
const MAX_BACKGROUND_IMAGES = 6;
const $ = id => document.getElementById(id);
const els = {
  form: $("generate-form"),
  script: $("script-input"),
  scriptCount: $("script-count"),
  generateButton: $("generate-button"),
  generateLabel: $("generate-button-label"),
  sampleButton: $("load-sample"),
  progressWrap: $("progress-wrap"),
  progressCopy: $("progress-copy"),
  progressValue: $("progress-value"),
  progressFill: $("progress-fill"),
  notice: $("notice-bar"),
  noticeCopy: $("notice-copy"),
  resultCount: $("result-count"),
  resultSummary: $("result-summary"),
  imageGrid: $("image-grid"),
  emptyState: $("empty-state"),
  storyboardDisclosure: $("storyboard-disclosure"),
  storyboardCount: $("storyboard-count"),
  downloadStoryboard: $("download-storyboard"),
  downloadBackgrounds: $("download-backgrounds"),
  backgroundsDownloadStatus: $("backgrounds-download-status"),
  notifyEditors: $("notify-editors"),
  deliveryStatus: $("delivery-status"),
  themeToggle: $("theme-toggle")
};
const state = { busy: false, notificationBusy: false, images: [], imageObjectUrls: [], storyboardCsv: "", title: "", jobId: "", processedAt: "", storyboardDriveUrl: "", driveFolderUrl: "" };

function setTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  els.themeToggle.setAttribute("aria-label", label);
  els.themeToggle.title = label;
  if (persist) {
    try { localStorage.setItem("storyboardTheme", theme); } catch {}
  }
}

function updateInputState() {
  const length = els.script.value.length;
  els.scriptCount.textContent = length.toLocaleString() + " / " + MAX_SCRIPT_LENGTH.toLocaleString();
  els.generateButton.disabled = state.busy || state.notificationBusy || length < 20 || length > MAX_SCRIPT_LENGTH;
  updateDownloadBackgroundsButton();
  updateNotifyButton();
}

function updateNotifyButton() {
  if (!els.notifyEditors) return;
  const completed = state.images.filter(image => image.previewUrl);
  const allSaved = completed.length > 0 && completed.every(image => image.driveFileId) && Boolean(state.storyboardDriveUrl);
  els.notifyEditors.disabled = state.busy || state.notificationBusy || !allSaved;
}

function updateDownloadBackgroundsButton() {
  const downloadable = state.images.filter(image => image.downloadBlob instanceof Blob).length;
  els.downloadBackgrounds.disabled = state.busy || downloadable === 0;
  els.downloadBackgrounds.textContent = downloadable > 0
    ? "Download all backgrounds (" + downloadable + ")"
    : state.busy ? "Images are generating…" : "Download backgrounds (.zip)";
}

function setNotice(message, isError) {
  els.notice.hidden = !message;
  els.notice.classList.toggle("is-error", Boolean(isError));
  els.noticeCopy.textContent = message || "";
}

function setProgress(copy, percent, label, active) {
  els.progressWrap.hidden = false;
  els.progressCopy.textContent = copy;
  els.progressValue.textContent = label;
  const safePercent = Math.max(0, Math.min(100, percent));
  els.progressFill.style.width = safePercent + "%";
  els.progressFill.parentElement.setAttribute("aria-valuenow", String(Math.round(safePercent)));
  els.progressFill.classList.toggle("is-active", Boolean(active));
}

function hideProgress() {
  els.progressWrap.hidden = true;
  els.progressFill.classList.remove("is-active");
  els.progressFill.style.width = "0%";
}

function setBusy(isBusy) {
  state.busy = isBusy;
  els.script.disabled = isBusy;
  els.sampleButton.disabled = isBusy;
  updateNotifyButton();
  els.generateLabel.textContent = isBusy ? "Building storyboard & backgrounds…" : "Create storyboard & backgrounds";
  updateInputState();
}

function clearResults() {
  state.imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
  state.imageObjectUrls = [];
  state.images = [];
  state.storyboardCsv = "";
  state.title = "";
  state.jobId = "";
  state.processedAt = "";
  state.storyboardDriveUrl = "";
  state.driveFolderUrl = "";
  els.imageGrid.querySelectorAll(".image-card").forEach(card => card.remove());
  els.emptyState.hidden = false;
  els.resultCount.textContent = "0 / " + MAX_BACKGROUND_IMAGES;
  els.resultSummary.textContent = "The storyboard and its scene-specific background images will appear here.";
  els.storyboardDisclosure.hidden = true;
  els.storyboardCount.textContent = "0 scenes";
  els.downloadStoryboard.disabled = true;
  els.notifyEditors.disabled = true;
  els.notifyEditors.textContent = "Notify editing team";
  els.deliveryStatus.hidden = true;
  els.deliveryStatus.textContent = "";
  els.deliveryStatus.classList.remove("is-error");
  els.backgroundsDownloadStatus.hidden = true;
  els.backgroundsDownloadStatus.textContent = "";
  els.backgroundsDownloadStatus.classList.remove("is-error");
  updateDownloadBackgroundsButton();
}

function sceneLabel(sceneNumbers) {
  if (!Array.isArray(sceneNumbers) || sceneNumbers.length === 0) return "Scene not specified";
  const clean = sceneNumbers.map(Number).filter(Number.isFinite);
  if (clean.length === 0) return "Scene not specified";
  return clean.length === 1 ? "Scene " + clean[0] : "Scenes " + clean.join(", ");
}

function titleFromScript(script) {
  const firstLine = String(script || "").split(/\r?\n/).map(line => line.trim()).find(Boolean) || "Untitled storyboard";
  if (firstLine.length <= 120 && !/[.!?]$/.test(firstLine)) return firstLine;
  const sentence = firstLine.match(/^.{1,180}?[.!?](?:\s|$)/u)?.[0]?.trim();
  return (sentence || firstLine).slice(0, 120);
}

function storyboardFilename(title) {
  const slug = String(title || "storyboard")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return (slug || "storyboard") + "-storyboard.csv";
}

function createImageCard(image, index) {
  const card = document.createElement("article");
  card.className = "image-card";

  const top = document.createElement("div");
  top.className = "image-card-top";
  const label = document.createElement("span");
  label.className = "image-card-index";
  label.textContent = image.backgroundId || "BACKGROUND " + String(index + 1).padStart(2, "0");
  const scenes = document.createElement("span");
  scenes.className = "image-card-scenes";
  scenes.textContent = sceneLabel(image.sceneNumbers);
  top.append(label, scenes);

  const preview = document.createElement(image.previewUrl ? "figure" : "div");
  preview.className = image.previewUrl ? "image-card-art" : "image-card-failure";
  if (image.previewUrl) {
    const img = document.createElement("img");
    img.src = image.previewUrl;
    img.alt = "Generated cartoon background for " + sceneLabel(image.sceneNumbers).toLowerCase();
    img.loading = "eager";
    preview.appendChild(img);
  } else {
    preview.textContent = "This background failed: " + String(image.error || "The workflow did not return an image.").slice(0, 280);
  }

  const caption = document.createElement("p");
  caption.className = "image-card-caption";
  caption.textContent = image.backgroundPrompt;

  const driveStatus = document.createElement("p");
  driveStatus.className = "image-card-drive-status";
  driveStatus.hidden = true;
  image.driveStatusEl = driveStatus;

  const feedbackRow = document.createElement("div");
  feedbackRow.className = "feedback-row image-feedback-row";
  const feedbackLabel = document.createElement("span");
  feedbackLabel.className = "feedback-label";
  feedbackLabel.textContent = "Rate this background";
  const feedbackUp = document.createElement("button");
  feedbackUp.type = "button";
  feedbackUp.className = "rate-button";
  feedbackUp.dataset.rating = "up";
  feedbackUp.setAttribute("aria-label", "Thumbs up for " + (image.backgroundId || "this background"));
  feedbackUp.setAttribute("aria-pressed", "false");
  feedbackUp.textContent = "👍";
  const feedbackDown = document.createElement("button");
  feedbackDown.type = "button";
  feedbackDown.className = "rate-button";
  feedbackDown.dataset.rating = "down";
  feedbackDown.setAttribute("aria-label", "Thumbs down for " + (image.backgroundId || "this background"));
  feedbackDown.setAttribute("aria-pressed", "false");
  feedbackDown.textContent = "👎";
  feedbackUp.addEventListener("click", () => submitFeedback(image, "up", feedbackUp, feedbackDown, feedbackStatus));
  feedbackDown.addEventListener("click", () => submitFeedback(image, "down", feedbackUp, feedbackDown, feedbackStatus));
  feedbackRow.append(feedbackLabel, feedbackUp, feedbackDown);
  feedbackRow.hidden = !image.previewUrl;

  const feedbackStatus = document.createElement("p");
  feedbackStatus.className = "image-card-feedback-status";
  feedbackStatus.hidden = true;
  image.feedbackStatusEl = feedbackStatus;
  image.feedbackButtons = [feedbackUp, feedbackDown];

  card.append(top, preview, caption, driveStatus, feedbackRow, feedbackStatus);
  return card;
}

function appendImage(image) {
  els.emptyState.hidden = true;
  const storedImage = { ...image };
  if (typeof storedImage.imageData === "string" && storedImage.imageData.startsWith("data:image/")) {
    const separator = storedImage.imageData.indexOf(",");
    if (separator < 0) throw new Error("The workflow returned an invalid image data URL.");
    const header = storedImage.imageData.slice(0, separator);
    const mimeType = header.match(/^data:([^;]+);base64$/i)?.[1] || storedImage.mimeType || "image/png";
    const encoded = storedImage.imageData.slice(separator + 1);
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let offset = 0; offset < binary.length; offset += 32768) {
      const end = Math.min(offset + 32768, binary.length);
      for (let index = offset; index < end; index += 1) bytes[index] = binary.charCodeAt(index);
    }
    storedImage.downloadBlob = new Blob([bytes], { type: mimeType });
    storedImage.previewUrl = URL.createObjectURL(storedImage.downloadBlob);
    state.imageObjectUrls.push(storedImage.previewUrl);
    delete storedImage.imageData;
  }
  state.images.push(storedImage);
  els.imageGrid.appendChild(createImageCard(storedImage, state.images.length - 1));
  if (storedImage.driveFileId) addDriveFileLink(storedImage, storedImage);
  else if (storedImage.driveUploadError) setImageDriveError(storedImage, storedImage.driveUploadError);
  const successfulImages = state.images.filter(item => item.previewUrl).length;
  els.resultCount.textContent = successfulImages + " / " + MAX_BACKGROUND_IMAGES;
  updateDownloadBackgroundsButton();
  updateNotifyButton();
}

function validateStoryboardResponse(result) {
  if (!result || result.ok !== true) {
    throw new Error(result && typeof result.error === "string" ? result.error : "The workflow did not return a completed storyboard.");
  }
  if (typeof result.storyboardCsv !== "string" || !result.storyboardCsv) {
    throw new Error("The workflow did not return the complete storyboard CSV.");
  }
  const expectedHeader = '"Scene","Timestamp","Voiceover","What\'s happening","Background","Hand-drawn characters & props","On-screen text","Transitions/Motion"';
  const actualHeader = result.storyboardCsv.split(/\r?\n/, 1)[0];
  if (actualHeader !== expectedHeader) {
    throw new Error("The workflow returned a CSV with unexpected columns.");
  }
  if (!Array.isArray(result.selectedBackgrounds)) {
    throw new Error("The workflow did not return the selected background settings.");
  }
  if (result.selectedBackgrounds.length === 0) {
    throw new Error("The complete storyboard did not include any usable background settings.");
  }
  if (result.selectedBackgrounds.length > MAX_BACKGROUND_IMAGES) {
    throw new Error("The workflow selected more than " + MAX_BACKGROUND_IMAGES + " backgrounds. The batch limit was exceeded.");
  }
  for (const background of result.selectedBackgrounds) {
    if (!background || typeof background.backgroundId !== "string" || !Array.isArray(background.sceneNumbers) || typeof background.backgroundPrompt !== "string") {
      throw new Error("A selected background is missing its prompt or scene identity.");
    }
  }
  return result;
}

function validateBackgroundResponse(result, expectedBackgroundId) {
  if (!result || result.ok !== true) {
    throw new Error(result && typeof result.error === "string" ? result.error : "The workflow did not return a generated background.");
  }
  if (result.backgroundId !== expectedBackgroundId || !Array.isArray(result.sceneNumbers)) {
    throw new Error("The generated image did not match its storyboard background identity.");
  }
  if (typeof result.imageData !== "string" || !result.imageData.startsWith("data:image/")) {
    throw new Error("The workflow did not return a displayable image.");
  }
  return result;
}

function showStoryboardCsv(sceneCount, csvText) {
  const count = Number(sceneCount);
  els.storyboardCount.textContent = (Number.isFinite(count) && count > 0 ? count + (count === 1 ? " scene" : " scenes") : "Full storyboard") + " · CSV ready";
  state.storyboardCsv = csvText;
  els.downloadStoryboard.disabled = false;
  els.storyboardDisclosure.hidden = false;
}

function downloadStoryboard() {
  if (!state.storyboardCsv) return;
  const blob = new Blob(["\ufeff", state.storyboardCsv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = storyboardFilename(state.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function zipDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

async function createZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const centralParts = [];
  let localOffset = 0;
  const stamp = zipDateTime();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const checksum = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, stamp.time, true);
    localView.setUint16(12, stamp.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    parts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, stamp.time, true);
    centralView.setUint16(14, stamp.date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);
  return new Blob([...parts, ...centralParts, end], { type: "application/zip" });
}

function safeArchiveFileName(fileName, fallback) {
  const basename = String(fileName || fallback).replace(/\\/g, "/").split("/").pop();
  return basename.replace(/[<>:"|?*\u0000-\u001f]/g, "_").trim() || fallback;
}

async function downloadAllBackgrounds() {
  const images = state.images.filter(image => image.downloadBlob instanceof Blob);
  if (!images.length) return;
  els.downloadBackgrounds.disabled = true;
  els.backgroundsDownloadStatus.hidden = true;
  try {
    const usedNames = new Set();
    const files = images.map((image, index) => {
      const fallback = (image.backgroundId || "background-" + String(index + 1).padStart(2, "0")) + ".png";
      const base = safeArchiveFileName(image.fileName, fallback);
      let name = base;
      let suffix = 2;
      while (usedNames.has(name.toLowerCase())) {
        const dot = base.lastIndexOf(".");
        name = dot > 0 ? base.slice(0, dot) + "-" + suffix++ + base.slice(dot) : base + "-" + suffix++;
      }
      usedNames.add(name.toLowerCase());
      return { name, blob: image.downloadBlob };
    });
    const archive = await createZip(files);
    const url = URL.createObjectURL(archive);
    const link = document.createElement("a");
    const slug = storyboardFilename(state.title).replace(/-storyboard\.csv$/i, "") || "storyboard";
    link.href = url;
    link.download = slug + "-backgrounds.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    els.backgroundsDownloadStatus.textContent = files.length + " background image" + (files.length === 1 ? "" : "s") + " downloaded as a ZIP.";
    els.backgroundsDownloadStatus.classList.remove("is-error");
    els.backgroundsDownloadStatus.hidden = false;
  } catch (error) {
    els.backgroundsDownloadStatus.textContent = error && error.message ? error.message : "Could not package the background images.";
    els.backgroundsDownloadStatus.classList.add("is-error");
    els.backgroundsDownloadStatus.hidden = false;
  } finally {
    updateDownloadBackgroundsButton();
  }
}

function addDriveFileLink(image, result) {
  image.driveFileId = result.driveFileId || result.fileId;
  image.driveUrl = result.driveUrl || result.webViewLink || "https://drive.google.com/file/d/" + encodeURIComponent(image.driveFileId) + "/view";
  image.fileName = result.fileName || result.name || image.fileName;
  if (image.driveStatusEl) {
    image.driveStatusEl.hidden = false;
    image.driveStatusEl.textContent = "In Google Drive · ";
    const link = document.createElement("a");
    link.href = image.driveUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = image.fileName || "Open in Drive";
    image.driveStatusEl.appendChild(link);
  }
  updateNotifyButton();
}

function setImageDriveError(image, message) {
  if (!image.driveStatusEl) return;
  image.driveStatusEl.hidden = false;
  image.driveStatusEl.classList.add("is-error");
  image.driveStatusEl.textContent = "Drive upload failed · " + String(message || "Could not save this background.").slice(0, 240);
}

async function submitFeedback(image, rating, upButton, downButton, statusElement) {
  if (image.feedbackRating || image.feedbackBusy || !image.previewUrl) return;
  image.feedbackBusy = true;
  image.feedbackButtons?.forEach(button => { button.disabled = true; });
  statusElement.hidden = true;
  try {
    const result = await window.storyboardWorkflow.submitFeedback({
      jobId: state.jobId,
      title: state.title,
      backgroundId: image.backgroundId,
      sceneNumbers: image.sceneNumbers,
      driveFileId: image.driveFileId || "",
      driveUrl: image.driveUrl || "",
      rating,
      comment: ""
    });
    if (!result || result.ok !== true || result.status !== "recorded") throw new Error(result && result.error || "Google Sheets did not confirm the rating.");
    image.feedbackRating = rating;
    const selectedButton = rating === "up" ? upButton : downButton;
    selectedButton.setAttribute("aria-pressed", "true");
    statusElement.textContent = "Thanks — your rating was saved.";
    statusElement.classList.remove("is-error");
    statusElement.hidden = false;
  } catch (error) {
    image.feedbackBusy = false;
    image.feedbackButtons?.forEach(button => { button.disabled = false; });
    statusElement.textContent = error && error.message ? error.message : "Could not save the rating.";
    statusElement.classList.add("is-error");
    statusElement.hidden = false;
  }
}

async function notifyEditingTeam() {
  if (state.notificationBusy) return;
  const images = state.images.filter(image => image.previewUrl);
  if (!images.length || images.some(image => !image.driveFileId)) {
    els.deliveryStatus.textContent = "Wait for the backgrounds and storyboard CSV to finish saving to Drive before notifying editors.";
    els.deliveryStatus.classList.add("is-error");
    els.deliveryStatus.hidden = false;
    return;
  }
  if (!state.storyboardDriveUrl) {
    els.deliveryStatus.textContent = "The storyboard CSV has not been saved to Drive yet, so the team email is not ready.";
    els.deliveryStatus.classList.add("is-error");
    els.deliveryStatus.hidden = false;
    return;
  }
  state.notificationBusy = true;
  els.notifyEditors.textContent = "Sending notification…";
  updateNotifyButton();
  els.deliveryStatus.hidden = true;
  try {
    const result = await window.storyboardWorkflow.notifyEditors({
      jobId: state.jobId,
      title: state.title,
      processedAt: state.processedAt,
      storyboardFileName: storyboardFilename(state.title),
      storyboardDriveUrl: state.storyboardDriveUrl,
      driveFolderUrl: state.driveFolderUrl,
      images: images.map(image => ({
        backgroundId: image.backgroundId,
        sceneNumbers: image.sceneNumbers,
        fileName: image.fileName,
        driveFileId: image.driveFileId,
        driveUrl: image.driveUrl
      }))
    });
    if (!result || result.ok !== true) throw new Error(result && result.reason || result && result.error || "The delivery workflow did not confirm the notification.");
    els.deliveryStatus.classList.remove("is-error");
    if (result.notificationSent) {
      els.deliveryStatus.textContent = "Editors notified at " + result.recipient + ".";
    } else {
      els.deliveryStatus.textContent = result.reason || "Backgrounds are in Drive. Fill in editingTeamEmail on the Workflow Settings sheet to enable notifications.";
    }
    els.deliveryStatus.hidden = false;
  } catch (error) {
    els.deliveryStatus.textContent = error && error.message ? error.message : "Could not notify the editing team.";
    els.deliveryStatus.classList.add("is-error");
    els.deliveryStatus.hidden = false;
  } finally {
    state.notificationBusy = false;
    els.notifyEditors.textContent = "Notify editing team";
    updateNotifyButton();
    updateInputState();
  }
}

async function generateFromScript(event) {
  event.preventDefault();
  if (state.busy || state.driveBusy) return;

  const script = els.script.value.trim();
  if (script.length < 20) {
    setNotice("Paste a script with at least 20 characters.", true);
    els.script.focus();
    return;
  }
  if (script.length > MAX_SCRIPT_LENGTH) {
    setNotice("This script is over the 30,000-character limit.", true);
    return;
  }

  clearResults();
  setNotice("", false);
  setBusy(true);
  setProgress("Creating the complete storyboard…", 8, "PLANNING", true);
  try {
    const title = titleFromScript(script);
    const jobId = "job-" + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
    state.title = title;
    state.jobId = jobId;
    const plan = validateStoryboardResponse(await window.storyboardWorkflow.generate(title, script, jobId));
    state.jobId = plan.jobId || jobId;
    showStoryboardCsv(plan.totalScenes, plan.storyboardCsv);
    const backgrounds = plan.selectedBackgrounds;
    const totalUnique = Number(plan.totalUniqueBackgrounds) || backgrounds.length;
    let completed = 0;
    let failed = 0;

    for (let index = 0; index < backgrounds.length; index += 1) {
      const background = backgrounds[index];
      const progress = 12 + Math.round((index / Math.max(1, backgrounds.length)) * 82);
      setProgress("Generating " + background.backgroundId + " of " + backgrounds.length + "…", progress,
        (index + 1) + " / " + backgrounds.length, true);
      els.resultSummary.textContent = "Storyboard ready · Generating " + background.backgroundId + " (" + (index + 1) + " of " + backgrounds.length + ").";
      try {
        const image = validateBackgroundResponse(await window.storyboardWorkflow.generateBackground({
          title,
          backgroundId: background.backgroundId,
          sceneNumbers: background.sceneNumbers,
          backgroundPrompt: background.backgroundPrompt,
          jobId: state.jobId
        }), background.backgroundId);
        appendImage({
          backgroundId: image.backgroundId,
          sceneNumbers: image.sceneNumbers,
          backgroundPrompt: image.backgroundPrompt || background.backgroundPrompt,
          imageData: image.imageData,
          mimeType: image.mimeType || "image/png",
          jobId: state.jobId,
          driveFileId: image.driveFileId || image.fileId,
          driveUrl: image.driveUrl || image.webViewLink,
          fileName: image.fileName,
          driveUploadError: image.driveUploadError
        });
        completed += 1;
      } catch (error) {
        const message = error && typeof error.message === "string" ? error.message : "Image generation failed.";
        appendImage({
          backgroundId: background.backgroundId,
          sceneNumbers: background.sceneNumbers,
          backgroundPrompt: background.backgroundPrompt,
          error: message
        });
        failed += 1;
        if (error && error.stopBatch) {
          break;
        }
      }
      els.resultSummary.textContent = "Storyboard ready · " + completed + " of " + backgrounds.length + " backgrounds generated.";
    }

    state.processedAt = new Date().toISOString();
    state.driveFolderUrl = "https://drive.google.com/drive/folders/153VPM-IBR1T5UIq-TthqtpklyAGwi-UU";
    try {
      const logResult = await window.storyboardWorkflow.recordProcess({
        jobId: state.jobId,
        title,
        processedAt: state.processedAt,
        status: failed === 0 ? "complete" : "partial",
        sceneCount: Number(plan.totalScenes) || 0,
        uniqueBackgrounds: totalUnique,
        generatedCount: completed,
        failedCount: failed,
        storyboardFileName: storyboardFilename(title),
        storyboardCsv: plan.storyboardCsv,
        driveFolderUrl: state.driveFolderUrl,
        images: state.images.filter(image => image.previewUrl).map(image => ({
          backgroundId: image.backgroundId,
          sceneNumbers: image.sceneNumbers,
          fileName: image.fileName,
          driveFileId: image.driveFileId || "",
          driveUrl: image.driveUrl || ""
        }))
      });
      state.storyboardDriveUrl = String(logResult.storyboardDriveUrl || "");
      if (logResult.driveFolderUrl) state.driveFolderUrl = logResult.driveFolderUrl;
      if (!state.storyboardDriveUrl) throw new Error(logResult.error || "The workflow did not return a Drive link for the storyboard CSV.");
    } catch (error) {
      const logError = error && error.message ? error.message : "The CSV could not be saved to Drive or the run could not be logged.";
      els.backgroundsDownloadStatus.textContent = "Images are ready, but Drive could not save the storyboard CSV or log this run: " + logError;
      els.backgroundsDownloadStatus.classList.add("is-error");
      els.backgroundsDownloadStatus.hidden = false;
    }
    updateNotifyButton();
    setProgress(failed ? "Storyboard finished with image errors." : "Storyboard and background batch finished.", 100,
      completed + " ready · " + failed + " failed", false);
    if (failed > 0) setNotice(failed + " background" + (failed === 1 ? " failed" : "s failed") + ". The storyboard CSV and successful images are ready; failed scene identities are shown below.", true);
    else setNotice("", false);
  } catch (error) {
    const message = error && typeof error.message === "string" ? error.message : "The workflow stopped unexpectedly.";
    setNotice(message, true);
    els.resultSummary.textContent = "No complete response was returned. Check the n8n execution before retrying.";
    els.progressValue.textContent = "CHECK n8n";
    els.progressFill.classList.remove("is-active");
  } finally {
    setBusy(false);
  }
}

els.script.addEventListener("input", updateInputState);
els.form.addEventListener("submit", generateFromScript);
els.downloadStoryboard.addEventListener("click", downloadStoryboard);
els.downloadBackgrounds.addEventListener("click", downloadAllBackgrounds);
els.notifyEditors.addEventListener("click", notifyEditingTeam);
els.sampleButton.addEventListener("click", () => {
  els.script.value = SAMPLE_SCRIPT;
  updateInputState();
  els.script.focus();
});
els.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  setTheme(current === "dark" ? "light" : "dark", true);
});

updateInputState();
setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light", false);
