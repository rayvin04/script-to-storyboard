const SAMPLE_TITLE = "Why Your Brain Invents Phantom Phone Vibrations";
const SAMPLE_SCRIPT = `Your phone buzzes in your pocket. You reach for it. Nothing. No text, no call, no notification. Almost everyone has felt this, and it has a name: phantom vibration syndrome.\n\nYour brain is a prediction machine, constantly scanning for signals that matter. After thousands of checks, it starts treating every tiny muscle twitch or shift of fabric as a possible phone notification. The sensation feels real, even though the phone never moved.\n\nThe fix is simple: give your attention a break. The more you expect a notification, the more likely your brain is to invent one.`;
const MAX_SCRIPT_LENGTH = 30000;
const BATCH_LIMIT = 10;
const STATUS_POLL_INTERVAL_MS = 12000;
const STATUS_RETRY_BASE_MS = 15000;
const STATUS_RETRY_MAX_MS = 60000;
const JOB_STORAGE_KEY = "fredStoryboardJobId";
const DELIVERY_STORAGE_KEY = "fredStoryboardDeliveredJobId";
const DEFERRED_NOTE = "This is the full storyboard. More background plates remain for a later batch.";

const $ = id => document.getElementById(id);
const els = {
  title: $("title-input"), script: $("script-input"), count: $("script-count"),
  themeToggle: $("theme-toggle"), mode: $("mode-label"), plan: $("plan-button"), planLabel: $("plan-button-label"),
  progress: $("progress-wrap"), progressCopy: $("progress-copy"), progressValue: $("progress-value"), progressFill: $("progress-fill"),
  notice: $("notice-bar"), noticeCopy: $("notice-copy"), empty: $("workspace-empty"), results: $("results-section"),
  boardCount: $("board-count"), subtitle: $("board-subtitle"), summary: $("job-summary"), deferred: $("deferred-callout"), deferredCopy: $("deferred-copy"),
  first: $("generate-first"), firstCount: $("first-batch-count"), next: $("generate-next"), nextCount: $("next-batch-count"),
  retry: $("retry-failed"), downloadCsv: $("download-csv"), downloadSvg: $("download-svg"), downloadImages: $("download-images"),
  deliver: $("send-to-editors"), deliverLabel: $("send-to-editors-label"),
  batchStatus: $("batch-status"), backgrounds: $("background-grid"), backgroundCount: $("background-count-label"),
  table: $("storyboard-table-body"), sceneCount: $("scene-count-label"), footer: $("footer-status-copy"), jobId: $("footer-job-id"),
  stepPlan: $("step-plan"), stepImages: $("step-images"), stepExport: $("step-export"),
};

const state = {
  jobId: "", job: null, scenes: [], backgrounds: [], deliveredJobId: "",
  polling: false, pollTimer: null, isPlanning: false, isGenerating: false, isDelivering: false, pollFailures: 0,
  expectedBatchIds: [], seenBatchIds: new Set(), expectedBatchAt: 0,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function setTheme(theme, persist = false) {
  const selected = theme === "dark" ? "dark" : "light";
  const isDark = selected === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  document.documentElement.dataset.theme = selected;
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeToggle.setAttribute("aria-label", label);
  els.themeToggle.title = label;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = isDark ? "#1a2230" : "#fff7e8";
  if (persist) {
    try { localStorage.setItem("storyboardTheme", selected); } catch {}
  }
}

function updateCount() {
  els.count.textContent = `${els.script.value.length.toLocaleString()} / ${MAX_SCRIPT_LENGTH.toLocaleString()}`;
  if (els.script.value.trim()) els.script.removeAttribute("aria-invalid");
}

function setProgress(copy, value, percent, loading = false) {
  els.progress.hidden = false;
  els.progressCopy.textContent = copy;
  els.progressValue.textContent = value;
  els.progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  els.progressFill.classList.toggle("is-loading", loading);
}

function hideProgress() {
  els.progress.hidden = true;
  els.progressFill.classList.remove("is-loading");
}

function showNotice(message, type = "info") {
  els.noticeCopy.textContent = message;
  els.notice.classList.toggle("is-error", type === "error");
  els.notice.hidden = !message;
}

function setFooter(message) {
  els.footer.textContent = message;
}

function setWorkspaceVisible(hasJob) {
  els.empty.hidden = hasJob;
  els.results.hidden = !hasJob;
}

function stopPolling() {
  state.polling = false;
  if (state.pollTimer) window.clearTimeout(state.pollTimer);
  state.pollTimer = null;
}

function renderSummary(job) {
  const scenes = Number(job.sceneCount) || state.scenes.length;
  const backgrounds = Number(job.backgroundCount) || state.backgrounds.length;
  const generated = state.backgrounds.filter(item => item.status === "completed").length;
  const failed = state.backgrounds.filter(item => item.status === "failed").length;
  const deferred = state.backgrounds.filter(item => item.status === "deferred").length;
  const status = state.isPlanning ? "Planning" : state.isGenerating ? "Generating plates" : String(job.status || "Storyboard ready").replaceAll("_", " ");
  els.summary.innerHTML = [
    [scenes, "scenes planned"], [backgrounds, "unique backgrounds"], [generated, "plates ready"],
    [deferred, "deferred"], [failed, "failed"],
  ].map(([value, label]) => `<div class="summary-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("") +
    `<div class="summary-state"><span class="summary-state-dot ${state.isPlanning || state.isGenerating ? "is-working" : ""}"></span>${escapeHtml(status)}</div>`;
}

function renderBackgrounds() {
  const items = state.backgrounds;
  els.backgroundCount.textContent = `${items.length} ${items.length === 1 ? "plate" : "plates"}`;
  if (!items.length) {
    els.backgrounds.innerHTML = '<div class="background-empty">Background plates will appear here once the full storyboard is ready.</div>';
    return;
  }

  els.backgrounds.innerHTML = items.map(item => {
    const status = String(item.status || "pending").toLowerCase();
    const statusLabel = status === "completed" ? "READY" : status === "generating" ? "GENERATING" : status === "deferred" ? "LATER BATCH" : status === "failed" ? "FAILED" : "QUEUED";
    const image = status === "completed" && item.imageUrl
      ? `<img src="${escapeHtml(item.imageUrl)}" alt="Generated background plate ${escapeHtml(item.backgroundId)}" loading="lazy" />`
      : `<div class="plate-placeholder ${status === "generating" ? "is-generating" : ""}" role="img" aria-label="${escapeHtml(statusLabel.toLowerCase())} background plate"><span aria-hidden="true">${status === "failed" ? "!" : status === "deferred" ? "↗" : status === "generating" ? "✦" : "◌"}</span><strong>${escapeHtml(status === "failed" ? "Generation failed" : status === "deferred" ? "More plates remain" : status === "generating" ? "Creating background…" : "Ready for a batch")}</strong></div>`;
    const scenes = (item.sceneNumbers || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b).join(", ");
    const error = item.error ? `<p class="plate-error">${escapeHtml(item.error)}</p>` : "";
    const filename = status === "completed" ? `<small class="plate-filename">File: <code>${escapeHtml(item.imageFileName || plannedBackgroundFilename(item))}</code></small>` : "";
    const download = status === "completed" && item.imageUrl
      ? `<button class="plate-download" type="button" data-download-background="${escapeHtml(item.backgroundId)}">Download plate</button>` : "";
    const cost = Number(item.costUsd) > 0 ? `<span class="plate-cost">$${Number(item.costUsd).toFixed(4)}</span>` : "";
    return `<article class="background-card"><div class="background-card-top"><span class="background-id">${escapeHtml(item.backgroundId)}</span><span class="plate-status plate-status-${escapeHtml(status)}">${escapeHtml(statusLabel)}</span></div><div class="plate-art">${image}</div><div class="background-card-copy"><p>${escapeHtml(item.background || "Background setting pending")}</p><small>${scenes ? `Used in scene${scenes.includes(",") ? "s" : ""} ${escapeHtml(scenes)}` : "Not linked to a scene"}</small>${filename}${error}</div><div class="background-card-bottom">${cost}${download}</div></article>`;
  }).join("");
}

function renderScenes() {
  els.sceneCount.textContent = `${state.scenes.length} ${state.scenes.length === 1 ? "scene" : "scenes"}`;
  if (!state.scenes.length) {
    els.table.innerHTML = '<tr><td class="table-empty" colspan="9">The storyboard plan is being prepared. This page will update automatically.</td></tr>';
    return;
  }
  els.table.innerHTML = state.scenes.map(scene => {
    const status = String(scene.backgroundImageStatus || "pending").toLowerCase();
    const plateLabel = `${scene.backgroundId || "—"} · ${status}`;
    return `<tr>
      <td>${escapeHtml(scene.sceneNumber)}</td><td>${escapeHtml(scene.timestamp || "—")}</td>
      <td>${escapeHtml(scene.voiceover || "—")}</td><td>${escapeHtml(scene.whatsHappening || "—")}</td>
      <td>${escapeHtml(scene.background || "—")}</td><td>${escapeHtml(scene.handDrawnCharactersAndProps || "—")}</td>
      <td>${escapeHtml(scene.onScreenText || "—")}</td><td>${escapeHtml(scene.transitionsMotion || "—")}</td>
      <td><span class="table-plate-status plate-status-${escapeHtml(status)}">${escapeHtml(plateLabel)}</span></td>
    </tr>`;
  }).join("");
}

function updateActions(job) {
  const statuses = state.backgrounds.map(item => String(item.status || "pending").toLowerCase());
  const pending = state.backgrounds.filter(item => item.status === "pending");
  const deferred = state.backgrounds.filter(item => item.status === "deferred");
  const failed = state.backgrounds.filter(item => item.status === "failed");
  const completed = state.backgrounds.filter(item => item.status === "completed");
  const busy = state.isPlanning || state.isGenerating;
  const first = pending.slice(0, BATCH_LIMIT);
  els.firstCount.textContent = String(first.length);
  els.first.disabled = busy || first.length === 0;
  els.next.hidden = deferred.length === 0;
  els.nextCount.textContent = String(Math.min(deferred.length, BATCH_LIMIT));
  els.next.disabled = busy || deferred.length === 0;
  els.retry.hidden = failed.length === 0;
  els.retry.disabled = busy || failed.length === 0;
  els.downloadImages.disabled = busy || completed.length === 0;
  els.downloadCsv.disabled = !state.jobId || state.isPlanning;
  els.downloadSvg.disabled = !state.jobId || state.isPlanning || state.scenes.length === 0;
  const delivered = Boolean(state.jobId) && state.deliveredJobId === state.jobId;
  els.deliver.disabled = busy || state.isDelivering || completed.length === 0 || delivered;
  els.deliverLabel.textContent = state.isDelivering ? "Sending…" : delivered ? "Sent to editors" : "Send to editors";
  const hasDeferred = deferred.length > 0 || Number(job.deferredCount) > 0;
  els.deferred.hidden = !hasDeferred;
  if (hasDeferred) {
    const remaining = deferred.length || Number(job.deferredCount) || 0;
    els.deferredCopy.textContent = `${DEFERRED_NOTE} ${remaining} unique background ${remaining === 1 ? "plate remains" : "plates remain"} for a later batch.`;
  }
  const jobStatus = String(job.status || "").toLowerCase();
  els.boardCount.textContent = state.isPlanning ? "PLANNING" : state.isGenerating ? "GENERATING" : ["failed", "error", "crashed"].includes(jobStatus) ? "FAILED" : statuses.includes("failed") ? "REVIEW" : "READY";
}

function renderStatus(job) {
  state.job = job;
  state.scenes = Array.isArray(job.scenes) ? job.scenes : [];
  state.backgrounds = Array.isArray(job.backgrounds) ? job.backgrounds : [];
  const jobStatus = String(job.status || "").toLowerCase();
  const jobFailed = ["failed", "error", "crashed"].includes(jobStatus);
  state.isPlanning = jobStatus === "planning";
  const backgroundById = new Map(state.backgrounds.map(item => [item.backgroundId, String(item.status || "").toLowerCase()]));
  for (const id of state.expectedBatchIds) {
    if (backgroundById.get(id) === "generating") state.seenBatchIds.add(id);
  }
  const waitingTooLong = state.expectedBatchAt && Date.now() - state.expectedBatchAt > 30 * 60 * 1000;
  state.isGenerating = !jobFailed && !waitingTooLong && (state.backgrounds.some(item => String(item.status).toLowerCase() === "generating") || state.expectedBatchIds.some(id => {
    const status = backgroundById.get(id);
    if (status === "completed") return false;
    if (status === "failed") return !state.seenBatchIds.has(id) && Date.now() - state.expectedBatchAt < 45000;
    return true;
  }));
  setWorkspaceVisible(true);
  els.jobId.textContent = state.jobId ? `JOB ${state.jobId.slice(0, 8).toUpperCase()}` : "";
  els.subtitle.textContent = state.isPlanning
    ? "The full script is being divided into animator-ready scene beats."
    : `${Number(job.sceneCount) || state.scenes.length} scenes · ${Number(job.backgroundCount) || state.backgrounds.length} unique backgrounds · up to ${BATCH_LIMIT} plates per batch.`;
  renderSummary(job);
  renderBackgrounds();
  renderScenes();
  updateActions(job);
  els.stepPlan.classList.toggle("is-current", state.isPlanning || (!state.isGenerating && !state.backgrounds.some(item => item.status === "completed")));
  els.stepImages.classList.toggle("is-current", state.isGenerating || state.backgrounds.some(item => item.status === "completed"));
  els.stepExport.classList.toggle("is-current", !state.isPlanning && !state.isGenerating && state.scenes.length > 0);
  if (state.isPlanning) {
    setProgress("Creating the complete scene-by-scene storyboard…", "PLANNING", 36, true);
    setFooter("Planning the full script. No image credits are being used.");
  } else if (state.isGenerating) {
    const done = state.backgrounds.filter(item => item.status === "completed" || item.status === "failed").length;
    const total = state.backgrounds.filter(item => item.status === "generating" || item.status === "completed" || item.status === "failed").length;
    setProgress(`Generating background plates one at a time… ${done} of ${total} processed`, "GENERATING", total ? 20 + (done / total) * 75 : 50, true);
    setFooter("Background batch is running in n8n. This page will refresh as each plate is saved.");
  } else if (state.scenes.length) {
    hideProgress();
    const generated = state.backgrounds.filter(item => item.status === "completed").length;
    const failed = state.backgrounds.filter(item => item.status === "failed").length;
    setFooter(failed ? `${generated} background plates ready · ${failed} failed and available to retry.` : `${generated} of ${state.backgrounds.length} background plates ready.`);
  } else {
    hideProgress();
    if (jobFailed) setFooter(job.error || "Storyboard planning failed before any scenes were created.");
  }
}

function shouldKeepPolling(job) {
  return state.isPlanning || state.isGenerating;
}

async function pollOnce() {
  if (!state.jobId) return;
  try {
    const job = await window.storyboardWorkflow.status(state.jobId);
    if (job.ok === false) throw new Error(job.error || "Could not read this storyboard job.");
    state.pollFailures = 0;
    renderStatus(job);
    if (shouldKeepPolling(job)) {
      state.pollTimer = window.setTimeout(pollOnce, STATUS_POLL_INTERVAL_MS);
    } else {
      stopPolling();
      state.isPlanning = false;
      const timedOut = state.expectedBatchAt && Date.now() - state.expectedBatchAt > 30 * 60 * 1000;
      state.isGenerating = false;
      state.expectedBatchIds = [];
      state.seenBatchIds.clear();
      state.expectedBatchAt = 0;
      renderStatus(job);
      if (timedOut) showNotice("The batch did not reach a finished state within 30 minutes. Check the n8n execution before retrying.", "error");
      else if (["failed", "error", "crashed"].includes(String(job.status || "").toLowerCase())) showNotice(job.error || "Storyboard planning failed before any images were generated. Check the n8n execution details.", "error");
      else if (state.scenes.length) showNotice(job.batchNote || job.note || "The full storyboard is ready. Review the CSV, then generate background plates in batches of up to 10.");
    }
  } catch (error) {
    state.pollFailures += 1;
    if (state.pollFailures === 1) showNotice(error instanceof Error ? error.message : String(error), "error");
    setFooter("Could not refresh the job status. Retrying with a longer interval to let the workflow host recover…");
    if (state.pollFailures < 8) {
      const retryDelay = Math.min(STATUS_RETRY_MAX_MS, STATUS_RETRY_BASE_MS * (2 ** (state.pollFailures - 1)));
      state.pollTimer = window.setTimeout(pollOnce, retryDelay);
    }
    else {
      stopPolling();
      setFooter("Status polling stopped after repeated errors. Use the page refresh button to reconnect to this saved job.");
    }
  }
}

function startPolling(delay = 0) {
  stopPolling();
  state.polling = true;
  state.pollTimer = window.setTimeout(pollOnce, delay);
}

async function createStoryboard() {
  const script = els.script.value.trim();
  const title = els.title.value.trim();
  if (script.length < 40 || script.length > MAX_SCRIPT_LENGTH) {
    els.script.setAttribute("aria-invalid", "true");
    els.script.focus();
    showNotice(`Paste a complete script between 40 and ${MAX_SCRIPT_LENGTH.toLocaleString()} characters.`, "error");
    return;
  }
  if (state.isPlanning || state.isGenerating) return;
  state.isPlanning = true;
  state.jobId = "";
  state.deliveredJobId = "";
  try { localStorage.removeItem(DELIVERY_STORAGE_KEY); } catch {}
  state.expectedBatchIds = [];
  state.seenBatchIds.clear();
  state.expectedBatchAt = 0;
  state.scenes = [];
  state.backgrounds = [];
  els.plan.disabled = true;
  els.planLabel.textContent = "Starting storyboard…";
  els.mode.textContent = "PLANNING";
  els.subtitle.textContent = "Submitting the complete script to the storyboard planner.";
  showNotice("");
  setWorkspaceVisible(true);
  renderBackgrounds();
  renderScenes();
  setProgress("Starting the full storyboard plan…", "STARTING", 12, true);
  setFooter("Planning uses the text model. The image model is only used after review, for background plates.");
  try {
    const result = await window.storyboardWorkflow.plan(script, title);
    if (!result.jobId) throw new Error("The workflow accepted the request but did not return a job ID.");
    state.jobId = result.jobId;
    try { localStorage.setItem(JOB_STORAGE_KEY, state.jobId); } catch {}
    els.mode.textContent = "STORYBOARD JOB";
    els.jobId.textContent = `JOB ${state.jobId.slice(0, 8).toUpperCase()}`;
    setFooter("Full script accepted. Waiting for the complete storyboard plan…");
    startPolling(2200);
  } catch (error) {
    state.isPlanning = false;
    setWorkspaceVisible(false);
    hideProgress();
    showNotice(error instanceof Error ? error.message : String(error), "error");
    setFooter("Storyboard request failed. Check n8n and try again.");
  } finally {
    els.plan.disabled = false;
    els.planLabel.textContent = "Build full storyboard";
  }
}

async function generateBatch(items, label) {
  if (!state.jobId || state.isPlanning || state.isGenerating) return;
  const ids = [...new Set(items.map(item => typeof item === "string" ? item : item.backgroundId).filter(Boolean))].slice(0, BATCH_LIMIT);
  if (!ids.length) return;
  state.isGenerating = true;
  state.expectedBatchIds = ids;
  state.seenBatchIds.clear();
  state.expectedBatchAt = Date.now();
  updateActions(state.job || {});
  els.mode.textContent = "GENERATING PLATES";
  els.batchStatus.hidden = false;
  els.batchStatus.textContent = `${label}: ${ids.length} background ${ids.length === 1 ? "plate" : "plates"}. Images are generated sequentially and saved to private Drive storage.`;
  showNotice("");
  setProgress(`${label}: starting ${ids.length} background ${ids.length === 1 ? "plate" : "plates"}…`, "QUEUED", 12, true);
  try {
    const accepted = await window.storyboardWorkflow.generate(state.jobId, ids);
    if (accepted.ok === false) throw new Error(accepted.error || "n8n could not start this batch.");
    setFooter(`Batch accepted by n8n · ${ids.length} background ${ids.length === 1 ? "plate" : "plates"} queued.`);
    startPolling(2500);
  } catch (error) {
    state.isGenerating = false;
    state.expectedBatchIds = [];
    state.seenBatchIds.clear();
    state.expectedBatchAt = 0;
    updateActions(state.job || {});
    showNotice(error instanceof Error ? error.message : String(error), "error");
    setFooter("The image batch could not be started. You can retry when n8n is available.");
    hideProgress();
  }
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeFilename(value) {
  return String(value || "storyboard").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "storyboard";
}

function plannedBackgroundFilename(item) {
  const jobShort = safeFilename(String(state.jobId).split("-").pop().replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "job");
  const backgroundId = safeFilename(item?.backgroundId || "BG000");
  const scenes = [...new Set((item?.sceneNumbers || []).map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
  const labels = scenes.map(number => String(number).padStart(3, "0"));
  const scenePart = labels.length <= 4
    ? `SC-${labels.join("-") || "000"}`
    : `SC-${labels.slice(0, 4).join("-")}-PLUS-${String(labels.length - 4).padStart(2, "0")}`;
  const storedExtension = String(item?.imageFileName || "").match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const ext = storedExtension || (item?.imageMimeType === "image/jpeg" ? "jpg" : "png");
  return `fred-${jobShort}-${backgroundId}-${scenePart}.${ext}`;
}

function backgroundExtension(item) {
  const storedExtension = String(item?.imageFileName || "").match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return storedExtension || (item?.imageMimeType === "image/jpeg" ? "jpg" : "png");
}

function downloadStoryboardSvg() {
  if (!state.scenes.length) return;
  if (!window.storyboardSvgExporter?.buildStoryboardSvg) {
    showNotice("The SVG export helper did not load. Reload the page and try again.", "error");
    return;
  }
  try {
    const svg = window.storyboardSvgExporter.buildStoryboardSvg({
      title: state.job?.title || "Fred's Storyboard",
      jobId: state.jobId,
      scenes: state.scenes,
      backgrounds: state.backgrounds,
    });
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${safeFilename(state.job?.title || "fred-storyboard")}-storyboard.svg`);
    els.stepExport.classList.add("is-current");
    setFooter(`Visual storyboard SVG downloaded · ${state.scenes.length} scenes included.`);
  } catch (error) {
    showNotice(error instanceof Error ? error.message : String(error), "error");
    setFooter("The storyboard SVG could not be created.");
  }
}

async function downloadCsv() {
  if (!state.jobId) return;
  els.downloadCsv.disabled = true;
  setFooter("Requesting the storyboard CSV from n8n…");
  try {
    const blob = await window.storyboardWorkflow.downloadCsv(state.jobId);
    downloadBlob(blob, `${safeFilename(state.job?.title || "fred-storyboard")}.csv`);
    els.stepExport.classList.add("is-current");
    setFooter("Full storyboard CSV downloaded from the workflow.");
  } catch (error) {
    showNotice(error instanceof Error ? error.message : String(error), "error");
    setFooter("CSV download failed. Check the n8n execution and try again.");
  } finally {
    els.downloadCsv.disabled = !state.jobId || state.isPlanning;
  }
}

async function downloadOneBackground(item) {
  if (!item?.imageUrl) return;
  const blob = await window.storyboardWorkflow.downloadImage(item.imageUrl);
  const ext = backgroundExtension(item);
  const serverName = String(item.imageFileName || "").replace(/[\\/\0]/g, "-");
  const base = serverName.replace(/\.(?:png|jpe?g|webp)$/i, "");
  downloadBlob(blob, `${safeFilename(base || plannedBackgroundFilename(item).replace(/\.[^.]+$/, ""))}.${ext}`);
}

async function downloadAllBackgrounds() {
  const ready = state.backgrounds.filter(item => item.status === "completed" && item.imageUrl);
  if (!ready.length) return;
  if (!window.JSZip) {
    showNotice("The ZIP helper did not load. Download each completed plate from its card instead.", "error");
    return;
  }
  els.downloadImages.disabled = true;
  const zip = new window.JSZip();
  try {
    for (let index = 0; index < ready.length; index += 1) {
      const item = ready[index];
      setFooter(`Adding background ${index + 1} of ${ready.length} to the download…`);
      const blob = await window.storyboardWorkflow.downloadImage(item.imageUrl);
      const ext = backgroundExtension(item);
      const serverName = String(item.imageFileName || "").replace(/[\\/\0]/g, "-");
      const base = serverName.replace(/\.(?:png|jpe?g|webp)$/i, "");
      zip.file(`${safeFilename(base || plannedBackgroundFilename(item).replace(/\.[^.]+$/, ""))}.${ext}`, blob);
    }
    const archive = await zip.generateAsync({ type: "blob" });
    downloadBlob(archive, `${safeFilename(state.job?.title || "fred-storyboard")}-backgrounds.zip`);
    setFooter(`${ready.length} generated background ${ready.length === 1 ? "plate" : "plates"} downloaded as a ZIP.`);
  } catch (error) {
    showNotice(error instanceof Error ? error.message : String(error), "error");
    setFooter("The image ZIP could not be created. Individual downloads are still available on each plate.");
  } finally {
    els.downloadImages.disabled = state.isGenerating || ready.length === 0;
  }
}

async function sendToEditors() {
  if (!state.jobId || state.isDelivering || state.isPlanning || state.isGenerating) return;
  const ready = state.backgrounds.filter(item => item.status === "completed" && item.imageUrl);
  if (!ready.length) return;
  state.isDelivering = true;
  els.deliver.disabled = true;
  els.deliverLabel.textContent = "Sending…";
  showNotice("");
  setFooter(`Moving ${ready.length} completed background ${ready.length === 1 ? "plate" : "plates"} and notifying the editors. No image credits are used.`);
  try {
    const result = await window.storyboardWorkflow.deliver(state.jobId, state.job?.title || "");
    state.deliveredJobId = state.jobId;
    try { localStorage.setItem(DELIVERY_STORAGE_KEY, state.jobId); } catch {}
    const pending = Number(result.pendingBackgroundCount) || 0;
    const more = pending ? ` ${pending} other storyboard background ${pending === 1 ? "plate remains" : "plates remain"} for a later batch.` : " All storyboard backgrounds were included.";
    showNotice(`${result.movedCount} background ${result.movedCount === 1 ? "plate was" : "plates were"} moved to the team Drive folder and the editing team was notified.${more}`);
    setFooter(`Delivery complete · ${result.folderUrl}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(message, "error");
    setFooter("Delivery did not complete. Check the n8n execution before retrying.");
  } finally {
    state.isDelivering = false;
    updateActions(state.job || {});
  }
}

function loadSample() {
  els.title.value = SAMPLE_TITLE;
  els.script.value = SAMPLE_SCRIPT;
  updateCount();
  setFooter("Sample script loaded · edit it or build the storyboard as written.");
  els.script.focus();
}

$("load-sample").addEventListener("click", loadSample);
$("dismiss-notice").addEventListener("click", () => { els.notice.hidden = true; });
els.script.addEventListener("input", updateCount);
els.plan.addEventListener("click", createStoryboard);
els.first.addEventListener("click", () => generateBatch(state.backgrounds.filter(item => item.status === "pending").slice(0, BATCH_LIMIT), "First batch"));
els.next.addEventListener("click", () => generateBatch(state.backgrounds.filter(item => item.status === "deferred").slice(0, BATCH_LIMIT), "Next batch"));
els.retry.addEventListener("click", () => generateBatch(state.backgrounds.filter(item => item.status === "failed").slice(0, BATCH_LIMIT), "Retry failed plates"));
els.downloadCsv.addEventListener("click", downloadCsv);
els.downloadSvg.addEventListener("click", downloadStoryboardSvg);
els.downloadImages.addEventListener("click", downloadAllBackgrounds);
els.deliver.addEventListener("click", sendToEditors);
els.backgrounds.addEventListener("click", async event => {
  const button = event.target.closest("[data-download-background]");
  if (!button) return;
  const item = state.backgrounds.find(background => background.backgroundId === button.dataset.downloadBackground);
  if (!item) return;
  button.disabled = true;
  try { await downloadOneBackground(item); setFooter(`${item.backgroundId} downloaded.`); }
  catch (error) { showNotice(error instanceof Error ? error.message : String(error), "error"); }
  finally { button.disabled = false; }
});
els.backgrounds.addEventListener("error", event => {
  if (!(event.target instanceof HTMLImageElement)) return;
  event.target.alt = "Could not load this private background image. Try refreshing the job.";
  const placeholder = document.createElement("div");
  placeholder.className = "plate-placeholder";
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", "Image could not be loaded");
  placeholder.innerHTML = '<span aria-hidden="true">!</span><strong>Image could not load</strong>';
  event.target.replaceWith(placeholder);
}, true);
els.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});

try { setTheme(localStorage.getItem("storyboardTheme") || document.documentElement.dataset.theme); }
catch { setTheme(document.documentElement.dataset.theme); }
updateCount();
hideProgress();
els.notice.hidden = true;
els.results.hidden = true;
els.empty.hidden = false;
els.downloadCsv.disabled = true;
els.downloadSvg.disabled = true;
els.first.disabled = true;
els.downloadImages.disabled = true;
els.deliver.disabled = true;

try {
  const savedJobId = localStorage.getItem(JOB_STORAGE_KEY);
  if (savedJobId) {
    state.jobId = savedJobId;
    const savedDeliveredJobId = localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (savedDeliveredJobId === savedJobId) state.deliveredJobId = savedDeliveredJobId;
    state.isPlanning = true;
    setWorkspaceVisible(true);
    els.mode.textContent = "RECONNECTING";
    els.jobId.textContent = `JOB ${savedJobId.slice(0, 8).toUpperCase()}`;
    setProgress("Reconnecting to the saved storyboard job…", "LOADING", 35, true);
    startPolling(0);
  }
} catch {}
