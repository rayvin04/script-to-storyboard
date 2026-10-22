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
  notifyEditors: $("notify-editors"),
  deliveryStatus: $("delivery-status"),
  themeToggle: $("theme-toggle")
};
const state = { busy: false, notificationBusy: false, notificationSent: false, images: [], imageObjectUrls: [], storyboardCsv: "", title: "", jobId: "", processedAt: "", storyboardDriveUrl: "", driveFolderUrl: "" };

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
  updateNotifyButton();
}

function updateNotifyButton() {
  if (!els.notifyEditors) return;
  const completed = state.images.filter(image => image.previewUrl);
  const allSaved = completed.length > 0 && completed.every(image => image.driveFileId && image.driveUrl);
  els.notifyEditors.disabled = state.busy || state.notificationBusy || state.notificationSent || !allSaved;
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
  state.notificationSent = false;
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
  if (storedImage.driveFileId) addDriveFileLink(storedImage, storedImage);
  else if (storedImage.driveUploadError) setImageDriveError(storedImage, storedImage.driveUploadError);
  const successfulImages = state.images.filter(item => item.previewUrl).length;
  els.resultCount.textContent = successfulImages + " / " + MAX_BACKGROUND_IMAGES;
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

async function notifyEditingTeam() {
  if (state.notificationBusy) return;
  const images = state.images.filter(image => image.previewUrl);
  if (!images.length || images.some(image => !image.driveFileId || !image.driveUrl)) {
    els.deliveryStatus.textContent = "Wait for the generated backgrounds to finish saving to Google Drive before notifying the team.";
    els.deliveryStatus.classList.add("is-error");
    els.deliveryStatus.hidden = false;
    return;
  }
  if (!state.storyboardCsv) {
    els.deliveryStatus.textContent = "The storyboard CSV is not ready yet.";
    els.deliveryStatus.classList.add("is-error");
    els.deliveryStatus.hidden = false;
    return;
  }

  state.notificationBusy = true;
  els.notifyEditors.textContent = "Preparing email…";
  updateNotifyButton();
  els.deliveryStatus.hidden = true;
  const processedAt = state.processedAt || new Date().toISOString();
  state.driveFolderUrl = "https://drive.google.com/drive/folders/153VPM-IBR1T5UIq-TthqtpklyAGwi-UU";
  let logResult = null;
  try {
    if (!state.storyboardDriveUrl) {
      logResult = await window.storyboardWorkflow.recordProcess({
        jobId: state.jobId,
        title: state.title,
        processedAt,
        status: state.images.length === images.length ? "complete" : "partial",
        sceneCount: Number(els.storyboardCount.textContent.match(/\d+/)?.[0]) || 0,
        uniqueBackgrounds: state.images.length,
        generatedCount: images.length,
        failedCount: state.images.length - images.length,
        storyboardFileName: storyboardFilename(state.title),
        storyboardCsv: state.storyboardCsv,
        driveFolderUrl: state.driveFolderUrl,
        images: images.map(image => ({
          backgroundId: image.backgroundId,
          sceneNumbers: image.sceneNumbers,
          fileName: image.fileName,
          driveFileId: image.driveFileId,
          driveUrl: image.driveUrl
        }))
      });
      if (!logResult || logResult.ok !== true) {
        throw new Error(logResult && (logResult.error || logResult.reason) || "Could not save the storyboard CSV to Google Drive.");
      }
      state.storyboardDriveUrl = String(logResult.storyboardDriveUrl || "");
      if (logResult.driveFolderUrl) state.driveFolderUrl = logResult.driveFolderUrl;
    }
    if (!state.storyboardDriveUrl) throw new Error(logResult && logResult.error || "Could not save the storyboard CSV to Google Drive.");

    els.notifyEditors.textContent = "Sending email…";
    const result = await window.storyboardWorkflow.notifyEditors({
      jobId: state.jobId,
      title: state.title,
      processedAt,
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
    if (!result || result.ok !== true) throw new Error(result && (result.error || result.reason) || "The delivery workflow did not confirm the email.");
    els.deliveryStatus.classList.remove("is-error");
    state.notificationSent = Boolean(result.notificationSent);
    els.deliveryStatus.textContent = result.notificationSent
      ? "Editing team notified at " + result.recipient + ". The email includes the script title, processing date, storyboard CSV, and background links."
      : result.reason || "The team email was not sent. Check editingTeamEmail in Workflow Settings.";
    els.deliveryStatus.hidden = false;
  } catch (error) {
    els.deliveryStatus.textContent = error && error.message ? error.message : "Could not notify the editing team.";
    els.deliveryStatus.classList.add("is-error");
    els.deliveryStatus.hidden = false;
  } finally {
    state.notificationBusy = false;
    els.notifyEditors.textContent = state.notificationSent ? "Team notified" : "Notify editing team";
    updateNotifyButton();
    updateInputState();
  }
}

async function generateFromScript(event) {
  event.preventDefault();
  if (state.busy) return;

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
