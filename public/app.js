const SAMPLE_SCRIPT = [
  "Phantom Phone Vibration",
  "Ever reach for your phone because you felt a buzz, only to find nothing happened? Your brain can mistake a tiny muscle twitch or a fabric shift for a notification. It is a harmless false alarm: your attention is already waiting for the next ping.",
  "",
  "Pins and Needles",
  "That prickly feeling often shows up after pressure temporarily squeezes a nerve. Once the pressure lifts, the nerve starts sending signals again, and your skin may tingle while everything settles.",
  "",
  "Eye Twitching",
  "A small eyelid flutter is commonly linked to tiredness, stress, caffeine, or eye strain. The tiny muscle is usually just being over-responsive; it often fades with rest.",
].join("\n");


const els = {
  script: document.getElementById("script-input"),
  count: document.getElementById("script-count"),
  sceneCount: document.getElementById("scene-count"),
  grid: document.getElementById("frame-grid"),
  boardCount: document.getElementById("board-count"),
  downloadAll: document.getElementById("download-all"),
  subtitle: document.getElementById("board-subtitle"),
  footer: document.getElementById("footer-status-copy"),
  mode: document.getElementById("mode-label"),
  build: document.getElementById("build-button"),
  buildLabel: document.getElementById("build-button-label"),
  progress: document.getElementById("progress-wrap"),
  progressCopy: document.getElementById("progress-copy"),
  progressValue: document.getElementById("progress-value"),
  progressFill: document.getElementById("progress-fill"),
  message: document.getElementById("message-dialog"),
  themeToggle: document.getElementById("theme-toggle"),
  notice: document.getElementById("notice-bar"),
  noticeCopy: document.getElementById("notice-copy"),
};

function setTheme(theme, persist = false) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  const isDark = selectedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  document.documentElement.dataset.theme = selectedTheme;
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeToggle.setAttribute("aria-label", label);
  els.themeToggle.title = label;
  document.querySelector('meta[name="theme-color"]').content = isDark ? "#1a2230" : "#fff7e8";

  if (persist) {
    try {
      localStorage.setItem("storyboardTheme", selectedTheme);
    } catch {
      // The current-page toggle still works when browser storage is unavailable.
    }
  }
}

let requestedScenes = 5;
let currentScenes = [];
let activeRequestId = "";
let isBuilding = false;
let feedback = readStoredFeedback();

function readStoredFeedback() {
  try {
    return JSON.parse(localStorage.getItem("storyboardFeedback") || "{}");
  } catch {
    return {};
  }
}

function feedbackKey(scene) {
  return (scene.requestId || activeRequestId || "preview") + ":" + scene.id;
}

async function saveFeedback(scene) {
  const key = feedbackKey(scene);
  try { localStorage.setItem("storyboardFeedback", JSON.stringify(feedback)); } catch {}
  if (!scene.requestId) throw new Error("Generate a live image before submitting a review.");
  els.footer.textContent = "Saving your review to the workflow…";
  await window.storyboardWorkflow.review({ requestId: scene.requestId, sceneId: scene.id, ...feedback[key] });
  els.footer.textContent = "Review saved · the art Agents can read it for future scenes";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function frameMarkup(scene, index) {
  const review = feedback[feedbackKey(scene)] || {};
  const rating = review.rating || "";
  const showComment = rating === "down";
  const failed = scene.imageStatus === "failed" || scene.imageLoadError;
  const pending = !failed && !scene.imageData;
  const imageBlock = scene.imageData && !failed
    ? '<img src="' + escapeHtml(scene.imageData) + '" alt="Generated scene ' + (index + 1) + '" />'
    : failed
      ? '<div class="image-failure" role="status"><span aria-hidden="true">!</span><strong>' + (scene.imageLoadError ? 'Image could not load' : 'Image not generated') + '</strong><small>' + escapeHtml(scene.error || 'See the workflow message for details.') + '</small>' + (scene.imageLoadError ? '<button type="button" data-retry-image="' + escapeHtml(scene.id) + '">Reload image</button>' : '') + '</div>'
      : '<div class="image-failure" role="status"><span aria-hidden="true">✦</span><strong>Frame in progress</strong><small>The scene plan is ready. Waiting for its image.</small></div>';
  const safeTitle = escapeHtml(scene.title || ("Scene " + (index + 1)));
  const safeNarration = escapeHtml(scene.narration || scene.scriptExcerpt || "A visual beat from the supplied narration.");
  const safeTag = escapeHtml(scene.tag || "visual beat");
  const sceneId = escapeHtml(scene.id || ("scene-" + (index + 1)));
  const savedComment = escapeHtml(review.comment || "");

  return '<article class="frame-card" data-scene-id="' + sceneId + '">'
    + '<div class="frame-topline"><span class="scene-tag">SCENE ' + String(index + 1).padStart(2, "0") + '</span><span class="scene-state' + (failed ? ' is-failed' : '') + '">' + (failed ? "IMAGE UNAVAILABLE" : pending ? "IN PROGRESS" : "AI IMAGE") + '</span></div>'
    + '<div class="frame-art" data-art-frame>' + imageBlock + '</div>'
    + '<h3 class="scene-caption">' + safeTitle + '</h3>'
    + '<p class="scene-narration">' + safeNarration + '</p>'
    + (failed ? '<p class="scene-error" role="status">' + escapeHtml(scene.error || "The image provider did not return an image.") + '</p>' : "")
    + '<div class="scene-meta"><span class="meta-pill">16:9 frame</span><span class="meta-pill">' + safeTag + '</span></div>'
    + (!failed && !pending ? '<div class="feedback-row"><span class="feedback-label">Does the art style match?</span>'
    + '<button class="rate-button" type="button" data-rating="up" data-id="' + sceneId + '" aria-label="Like scene ' + (index + 1) + '" aria-pressed="' + (rating === "up") + '">👍</button>'
    + '<button class="rate-button" type="button" data-rating="down" data-id="' + sceneId + '" aria-label="Needs changes for scene ' + (index + 1) + '" aria-pressed="' + (rating === "down") + '">👎</button></div>'
    + (showComment ? '<div class="comment-wrap"><textarea data-comment="' + sceneId + '" aria-label="What should change?" placeholder="What should change?">' + savedComment + '</textarea><button type="button" data-save-comment="' + sceneId + '">Save note</button></div>' : "")
    + '<button class="text-button" type="button" data-download-scene="' + sceneId + '">Download image</button>' : "")
    + '</article>';
}

function renderScenes() {
  if (!currentScenes.length) {
    els.grid.innerHTML = '<div class="empty-state"><div class="empty-illustration" aria-hidden="true">✦</div><div><h3>Your storyboard starts here</h3><p>Paste a script on the left, choose a small batch, then build a first visual pass.</p></div></div>';
  } else {
    els.grid.innerHTML = currentScenes.map(frameMarkup).join("");
  }
  els.boardCount.textContent = currentScenes.length + (currentScenes.length === 1 ? " frame" : " frames");
  const canDownload = currentScenes.some((scene) => scene.imageStatus === "completed" && scene.imageData);
  els.downloadAll.disabled = !canDownload;
  els.downloadAll.title = canDownload ? "Download available storyboard frames" : "No generated images are available to download";
  document.getElementById("export-plan").disabled = !currentScenes.length || !activeRequestId;
}

function updateCount() {
  els.count.textContent = els.script.value.length.toLocaleString() + " / 30,000";
}

function normalizeLiveResponse(data) {
  let result = data;
  if (Array.isArray(result) && result[0] && result[0].json) result = result[0].json;
  if (result && result.output && typeof result.output === "object") result = result.output;
  let scenes = result && Array.isArray(result.scenes) ? result.scenes : null;
  if (!scenes && result && Array.isArray(result.data)) scenes = result.data;
  const topError = typeof result?.error === "string"
    ? result.error
    : result?.error?.message || result?.message || "";
  if (!scenes) throw new Error(topError || "The workflow response did not include a scenes array.");
  return scenes.map((scene, index) => {
    const b64 = scene.imageBase64 || scene.image_base64 || scene.b64_json || "";
    const imageData = scene.imageData || scene.image_data || (b64 ? "data:image/png;base64," + b64 : "") || scene.imageUrl || scene.image_url || "";
    const imageStatus = scene.imageStatus || scene.image_status || (imageData ? "completed" : "failed");
    return {
      ...scene,
      requestId: scene.requestId || result.requestId || activeRequestId,
      id: scene.id || scene.sceneId || scene.scene_id || ("live-" + index),
      title: scene.title || scene.visualBeat || scene.visual_beat || ("Scene " + (index + 1)),
      narration: scene.narration || scene.scriptExcerpt || scene.script_excerpt || scene.description || "",
      prompt: scene.imagePrompt || scene.image_prompt || "",
      tag: scene.tag || scene.purpose || "generated frame",
      imageData,
      imageStatus,
      error: typeof scene.error === "string" ? scene.error : scene.error?.message || topError,
      source: "live",
      art: ["phone", "tingle", "eye", "spark"][index % 4],
    };
  });
}

function rememberRequest(id) {
  try { localStorage.setItem("storyboardLastRequestId", id); } catch {}
}

function showWorkflowError(error) {
  const message = error instanceof Error ? error.message : String(error);
  els.footer.textContent = message;
  els.noticeCopy.innerHTML = "<strong>Workflow message.</strong> " + escapeHtml(message);
  els.notice.classList.add("is-error");
  els.notice.hidden = false;
}

async function followStoryboard(requestId) {
  let failures = 0;
  let previousSceneSignature = "";
  for (let attempt = 0; attempt < 150; attempt++) {
    let data;
    try {
      data = await window.storyboardWorkflow.status(requestId);
      failures = 0;
    } catch (error) {
      failures++;
      els.progressCopy.textContent = "Waiting for n8n to reconnect. Your batch is saved…";
      if (failures >= 5) throw new Error("n8n is unavailable. Click Resume saved batch to recover this job without generating again.");
      await new Promise(resolve => window.setTimeout(resolve, 6000));
      continue;
    }
    activeRequestId = data.requestId || requestId;
    if (Array.isArray(data.scenes) && data.scenes.length) {
      const signature = JSON.stringify(data.scenes);
      if (signature !== previousSceneSignature) {
        currentScenes = normalizeLiveResponse(data);
        renderScenes();
        previousSceneSignature = signature;
      }
    }
    const completed = data.completedCount || 0;
    const count = data.sceneCount || requestedScenes;
    const percent = data.status === "queued" ? 5 : data.status === "planning" ? 15 : Math.min(95, 25 + Math.round(70 * completed / count));
    els.progressValue.textContent = percent + "%";
    els.progressFill.style.width = percent + "%";
    els.progressCopy.textContent = data.status === "planning" ? "Studying Fred’s reference images and planning scenes…" : data.status === "queued" ? "Your storyboard is queued…" : completed + " of " + count + " images ready · generating with reference images";
    els.footer.textContent = "Saved batch · " + completed + " of " + count + " images ready";
    if (["completed", "partial", "failed"].includes(data.status)) {
      els.progressValue.textContent = "100%";
      els.progressFill.style.width = "100%";
      els.mode.textContent = data.status === "completed" ? "N8N CONNECTED" : "REVIEW REQUIRED";
      els.subtitle.textContent = "Storyboard and images from your n8n workflow.";
      els.progressCopy.textContent = completed + " of " + count + " images ready";
      const failed = currentScenes.find(scene => scene.imageStatus === "failed");
      if (data.status !== "completed") showWorkflowError(data.error || failed?.error || "Some frames did not finish. Check the workflow execution before retrying.");
      else {
        els.notice.hidden = true;
        els.footer.textContent = "All " + count + " images ready · review the style and download the workflow CSV";
      }
      document.getElementById("step-3").classList.add("is-current");
      document.getElementById("step-2").classList.add("is-done");
      return;
    }
    await new Promise(resolve => window.setTimeout(resolve, 4000));
  }
  throw new Error("This batch is taking longer than expected. Resume the saved batch to check its progress without paying for a new run.");
}

async function recoverStoryboard(id) {
  if (isBuilding) return;
  isBuilding = true;
  activeRequestId = id;
  els.build.disabled = true;
  els.buildLabel.textContent = "Loading saved batch…";
  els.progress.hidden = false;
  els.grid.setAttribute("aria-busy", "true");
  try {
    await followStoryboard(id);
    els.buildLabel.textContent = "Build storyboard";
    els.build.dataset.resume = "";
  } catch (error) {
    showWorkflowError(error);
    els.buildLabel.textContent = "Resume saved batch";
    els.build.dataset.resume = id;
  } finally {
    isBuilding = false;
    els.build.disabled = false;
    els.grid.setAttribute("aria-busy", "false");
  }
}

async function buildStoryboard() {
  if (els.build.dataset.resume) return recoverStoryboard(els.build.dataset.resume);
  const script = els.script.value.trim();
  if (script.length < 40 || script.length > 30000) {
    els.script.setAttribute("aria-invalid", "true");
    els.script.focus();
    showWorkflowError("Paste between 40 and 30,000 characters of narration.");
    return;
  }
  els.script.removeAttribute("aria-invalid");
  if (isBuilding) return;
  isBuilding = true;
  let submitted = false;
  els.build.disabled = true;
  els.buildLabel.textContent = "Planning your storyboard…";
  els.grid.setAttribute("aria-busy", "true");
  els.progress.hidden = false;
  els.progressFill.style.background = "";
  els.progressFill.style.width = "5%";
  els.progressCopy.textContent = "Starting a saved storyboard job…";
  els.notice.hidden = true;
  try {
    let capabilities;
    try { capabilities = await window.storyboardWorkflow.ready(); }
    catch { throw new Error("The updated n8n workflow is unavailable or has not been published yet. No image-generation request was sent."); }
    if (capabilities.workflowVersion !== "fred-visual-v3") throw new Error("The workflow needs its current version published before this UI can generate. No image-generation request was sent.");
    activeRequestId = "story-" + crypto.randomUUID();
    rememberRequest(activeRequestId);
    currentScenes = [];
    renderScenes();
    submitted = true;
    await window.storyboardWorkflow.start(script, requestedScenes, activeRequestId);
    await followStoryboard(activeRequestId);
    els.buildLabel.textContent = "Build storyboard";
    els.build.dataset.resume = "";
  } catch (error) {
    showWorkflowError(error);
    els.buildLabel.textContent = submitted ? "Resume saved batch" : "Build storyboard";
    els.build.dataset.resume = submitted ? activeRequestId : "";
  } finally {
    isBuilding = false;
    els.build.disabled = false;
    els.grid.setAttribute("aria-busy", "false");
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadFrame(scene, index) {
  if (scene.imageStatus !== "completed") return;
  const blob = await window.storyboardWorkflow.image(scene.requestId || activeRequestId, scene.id);
  const extension = blob.type.includes("jpeg") ? "jpg" : "png";
  downloadBlob(blob, "fred-storyboard-scene-" + String(index + 1).padStart(2, "0") + "." + extension);
}

async function exportPlan() {
  const button = document.getElementById("export-plan");
  button.disabled = true;
  els.footer.textContent = "Creating Fred’s storyboard CSV in n8n…";
  try {
    const blob = await window.storyboardWorkflow.csv(activeRequestId);
    downloadBlob(blob, "fred-storyboard-" + activeRequestId + ".csv");
    els.footer.textContent = "Storyboard CSV downloaded from n8n · 8 columns in Fred’s format";
  } catch (error) { showWorkflowError(error); }
  finally { button.disabled = !currentScenes.length; }
}

document.getElementById("load-sample").addEventListener("click", () => {
  els.script.value = SAMPLE_SCRIPT;
  updateCount();
  els.footer.textContent = "Fred's supplied body-glitch script sample loaded";
  els.script.focus();
});
els.script.addEventListener("input", updateCount);
document.getElementById("scene-minus").addEventListener("click", () => {
  requestedScenes = Math.max(1, requestedScenes - 1);
  els.sceneCount.textContent = requestedScenes;
});
document.getElementById("scene-plus").addEventListener("click", () => {
  requestedScenes = Math.min(5, requestedScenes + 1);
  els.sceneCount.textContent = requestedScenes;
});
els.build.addEventListener("click", buildStoryboard);
document.getElementById("download-all").addEventListener("click", async () => {
  els.downloadAll.disabled = true;
  try {
    for (let index = 0; index < currentScenes.length; index++) await downloadFrame(currentScenes[index], index);
    els.footer.textContent = "Available images downloaded from n8n";
  } catch (error) { showWorkflowError(error); }
  finally { renderScenes(); }
});
document.getElementById("export-plan").addEventListener("click", exportPlan);
document.getElementById("send-drive").addEventListener("click", () => els.message.showModal());
document.getElementById("dismiss-notice").addEventListener("click", () => { document.getElementById("notice-bar").hidden = true; });
els.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});

els.grid.addEventListener("click", async event => {
  const target = event.target.closest("[data-rating], [data-save-comment], [data-download-scene], [data-retry-image]");
  if (!target) return;
  const id = target.dataset.id || target.dataset.saveComment || target.dataset.downloadScene || target.dataset.retryImage;
  const scene = currentScenes.find(item => item.id === id);
  if (!scene) return;
  if (target.dataset.retryImage) {
    scene.imageLoadError = false;
    scene.imageData = scene.imageUrl + "&reload=" + Date.now();
    renderScenes();
    return;
  }
  target.disabled = true;
  try {
    if (target.dataset.downloadScene) return await downloadFrame(scene, currentScenes.indexOf(scene));
    const key = feedbackKey(scene);
    const previous = feedback[key] || {};
    const field = els.grid.querySelector('[data-comment="' + CSS.escape(id) + '"]');
    feedback[key] = { ...previous, rating: target.dataset.rating || previous.rating || "down", comment: field ? field.value.trim() : previous.comment || "", updatedAt: new Date().toISOString() };
    await saveFeedback(scene);
    renderScenes();
  } catch (error) { showWorkflowError(error); }
  finally { target.disabled = false; }
});

els.grid.addEventListener("input", event => {
  const id = event.target.dataset.comment;
  const scene = currentScenes.find(item => item.id === id);
  if (!scene) return;
  const key = feedbackKey(scene);
  feedback[key] = { ...(feedback[key] || {}), comment: event.target.value };
});

els.grid.addEventListener("error", event => {
  if (!(event.target instanceof HTMLImageElement)) return;
  const id = event.target.closest("[data-scene-id]")?.dataset.sceneId;
  const scene = currentScenes.find(item => item.id === id);
  if (!scene || scene.imageLoadError) return;
  scene.imageLoadError = true;
  scene.error = "The saved image is ready, but n8n did not serve it. Reload the image when the host is available.";
  renderScenes();
}, true);

els.mode.textContent = "N8N WORKFLOW";
els.sceneCount.textContent = requestedScenes;
els.notice.hidden = true;
setTheme(document.documentElement.dataset.theme);
els.script.value = SAMPLE_SCRIPT;
updateCount();
renderScenes();
try {
  const saved = localStorage.getItem("storyboardLastRequestId");
  if (saved) recoverStoryboard(saved);
} catch {}
