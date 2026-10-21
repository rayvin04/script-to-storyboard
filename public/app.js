const SAMPLE_SCRIPT = [
  "Your phone buzzes in your pocket. You reach for it. Nothing. No text, no call, no notification.",
  "Almost everyone has felt this, and it has a name: phantom vibration syndrome. Your brain predicts the signals that matter most, so a tiny muscle twitch or a shift of fabric can feel like a phone alert.",
  "The fix is to give your attention a break. The more you expect a notification, the more likely your brain is to invent one."
].join("\n\n");
const MAX_SCRIPT_LENGTH = 30000;
const MAX_BACKGROUND_IMAGES = 9;
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
  saveToDrive: $("save-to-drive"),
  driveStatus: $("drive-status"),
  deferredNote: $("deferred-note"),
  deferredCopy: $("deferred-copy"),
  themeToggle: $("theme-toggle")
};
const state = { busy: false, driveBusy: false, images: [], imageObjectUrls: [], storyboardCsv: "", title: "" };

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
  els.generateButton.disabled = state.busy || state.driveBusy || length < 20 || length > MAX_SCRIPT_LENGTH;
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
  els.saveToDrive.disabled = isBusy || state.driveBusy || !state.images.some(image => image.previewUrl && !image.driveFileId);
  els.generateLabel.textContent = isBusy ? "Building storyboard & backgrounds…" : "Create storyboard & backgrounds";
  updateInputState();
}

function clearResults() {
  state.imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
  state.imageObjectUrls = [];
  state.images = [];
  state.storyboardCsv = "";
  state.title = "";
  els.imageGrid.querySelectorAll(".image-card").forEach(card => card.remove());
  els.emptyState.hidden = false;
  els.resultCount.textContent = "0 / " + MAX_BACKGROUND_IMAGES;
  els.resultSummary.textContent = "The storyboard and its scene-specific background images will appear here.";
  els.storyboardDisclosure.hidden = true;
  els.storyboardCount.textContent = "0 scenes";
  els.downloadStoryboard.disabled = true;
  els.saveToDrive.disabled = true;
  els.saveToDrive.textContent = "Save backgrounds to Google Drive";
  els.driveStatus.hidden = true;
  els.driveStatus.textContent = "";
  els.deferredNote.hidden = true;
  els.deferredCopy.textContent = "";
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

  card.append(top, preview, caption, driveStatus);
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
    storedImage.previewUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    state.imageObjectUrls.push(storedImage.previewUrl);
    delete storedImage.imageData;
  }
  state.images.push(storedImage);
  els.imageGrid.appendChild(createImageCard(storedImage, state.images.length - 1));
  const successfulImages = state.images.filter(item => item.previewUrl).length;
  els.resultCount.textContent = successfulImages + " / " + MAX_BACKGROUND_IMAGES;
  els.saveToDrive.disabled = state.busy || state.driveBusy || successfulImages === 0;
}

function validateResponse(result) {
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
  if (!Array.isArray(result.images)) {
    throw new Error("The workflow response did not include the generated background results.");
  }
  if (result.images.length > MAX_BACKGROUND_IMAGES) {
    throw new Error("The workflow returned more than " + MAX_BACKGROUND_IMAGES + " backgrounds. The batch limit was exceeded.");
  }
  for (const image of result.images) {
    if (!image || typeof image.backgroundId !== "string" || !Array.isArray(image.sceneNumbers)) {
      throw new Error("An image result is missing its background or scene identity.");
    }
    if (image.imageData !== undefined && (typeof image.imageData !== "string" || !image.imageData.startsWith("data:image/"))) {
      throw new Error("An image result did not contain a displayable image.");
    }
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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not prepare the background image for Drive."));
    reader.onerror = () => reject(new Error("Could not read the background image from the preview."));
    reader.readAsDataURL(blob);
  });
}

function setDriveStatus(message, isError = false) {
  els.driveStatus.hidden = !message;
  els.driveStatus.classList.toggle("is-error", Boolean(isError));
  els.driveStatus.textContent = message || "";
}

function addDriveFileLink(image, result) {
  image.driveFileId = result.fileId;
  image.driveUrl = result.webViewLink || "https://drive.google.com/file/d/" + encodeURIComponent(result.fileId) + "/view";
  if (image.driveStatusEl) {
    image.driveStatusEl.hidden = false;
    image.driveStatusEl.textContent = "Saved · ";
    const link = document.createElement("a");
    link.href = image.driveUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = result.fileName || "Open in Drive";
    image.driveStatusEl.appendChild(link);
  }
}

async function saveBackgroundsToDrive() {
  if (state.driveBusy) return;
  const successfulImages = state.images.filter(image => image.previewUrl);
  const pendingImages = successfulImages.filter(image => !image.driveFileId);
  if (!pendingImages.length) {
    setDriveStatus(successfulImages.length ? "All generated backgrounds are already saved to Drive." : "Generate at least one background before saving to Drive.", successfulImages.length === 0);
    return;
  }

  state.driveBusy = true;
  els.saveToDrive.disabled = true;
  els.saveToDrive.textContent = "Saving backgrounds…";
  let savedThisRun = 0;
  let stoppedOnError = false;

  try {
    for (let index = 0; index < pendingImages.length; index += 1) {
      const image = pendingImages[index];
      setDriveStatus("Saving " + image.backgroundId + " to your Drive (" + (index + 1) + " of " + pendingImages.length + ")…");
      try {
        const response = await fetch(image.previewUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not read the generated background image.");
        const blob = await response.blob();
        const imageData = await blobToDataUrl(blob);
        const result = await window.storyboardWorkflow.saveBackground({
          title: state.title,
          backgroundId: image.backgroundId,
          sceneNumbers: image.sceneNumbers,
          backgroundPrompt: image.backgroundPrompt,
          mimeType: blob.type || image.mimeType || "image/png",
          imageData
        });
        if (!result || result.ok !== true || !result.fileId) throw new Error(result && result.error || "Google Drive did not confirm the saved file.");
        addDriveFileLink(image, result);
        savedThisRun += 1;
      } catch (error) {
        stoppedOnError = true;
        const detail = error && error.message ? error.message : "The upload failed.";
        setDriveStatus("Stopped at " + image.backgroundId + ": " + detail + " Check your Drive folder before retrying; the upload may have completed.", true);
        break;
      }
    }
  } finally {
    state.driveBusy = false;
    const allSaved = successfulImages.every(image => image.driveFileId);
    els.saveToDrive.textContent = allSaved ? "All backgrounds saved to Drive" : "Save remaining backgrounds to Drive";
    els.saveToDrive.disabled = allSaved || successfulImages.length === 0;
    if (!stoppedOnError) setDriveStatus("Saved " + (successfulImages.length - pendingImages.length + savedThisRun) + " of " + successfulImages.length + " backgrounds to Drive.");
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
  setProgress("Creating the complete storyboard, then up to nine backgrounds…", 8, "WORKING", true);
  try {
    const title = titleFromScript(script);
    state.title = title;
    const response = validateResponse(await window.storyboardWorkflow.generate(title, script));
    showStoryboardCsv(response.totalScenes, response.storyboardCsv);
    const totalUnique = Number(response.totalUniqueBackgrounds) || response.images.length;
    const deferred = Number(response.deferredBackgrounds) || 0;
    const completed = Number(response.generatedImageCount) || 0;
    const failed = Number(response.failedImageCount) || response.images.filter(image => !image.imageData).length;

    for (const image of response.images) {
      appendImage({
        backgroundId: image.backgroundId,
        sceneNumbers: image.sceneNumbers,
        backgroundPrompt: image.backgroundPrompt || "Custom-fit background plate",
        imageData: image.imageData,
        mimeType: image.mimeType || "image/png",
        error: image.error
      });
    }

    els.resultSummary.textContent = "Storyboard ready · " + completed + " of " + response.images.length + " backgrounds generated.";
    if (deferred > 0) {
      els.deferredNote.hidden = false;
      els.deferredCopy.textContent = totalUnique + " distinct settings were identified across the complete script. This run generated up to " +
        MAX_BACKGROUND_IMAGES + "; " + deferred + " remain for a later batch.";
    }
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
els.saveToDrive.addEventListener("click", saveBackgroundsToDrive);
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
