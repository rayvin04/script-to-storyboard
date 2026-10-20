const SAMPLE_PROMPT = "A young brown-skinned man with a large rounded head and a dark green shirt sits on a green sofa in a warm yellow living room. He glances down at a quiet smartphone in his hand with a puzzled expression after feeling a phantom pocket vibration. Simple room, one potted plant, one clear action, wide 16:9 composition.";

const els = {
  prompt: document.getElementById("script-input"),
  count: document.getElementById("script-count"),
  grid: document.getElementById("frame-grid"),
  download: document.getElementById("download-all"),
  subtitle: document.getElementById("board-subtitle"),
  footer: document.getElementById("footer-status-copy"),
  mode: document.getElementById("mode-label"),
  build: document.getElementById("build-button"),
  buildLabel: document.getElementById("build-button-label"),
  progress: document.getElementById("progress-wrap"),
  progressCopy: document.getElementById("progress-copy"),
  progressValue: document.getElementById("progress-value"),
  progressFill: document.getElementById("progress-fill"),
  themeToggle: document.getElementById("theme-toggle"),
  notice: document.getElementById("notice-bar"),
  noticeCopy: document.getElementById("notice-copy"),
};

let currentImage = null;
let isGenerating = false;

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
    try { localStorage.setItem("storyboardTheme", selectedTheme); } catch {}
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function renderEmpty() {
  els.grid.innerHTML = '<div class="empty-state"><div class="empty-illustration" aria-hidden="true">✦</div><div><h3>Your image will appear here</h3><p>Describe one scene, then generate a single reference-guided frame.</p></div></div>';
  els.download.disabled = true;
}

function renderPending() {
  els.grid.innerHTML = '<article class="frame-card"><div class="frame-topline"><span class="scene-tag">ONE IMAGE TEST</span><span class="scene-state">WORKING</span></div><div class="frame-art"><div class="image-failure"><span aria-hidden="true">✦</span><strong>Generating your image…</strong><small>Loading the supplied visual references and creating one frame.</small></div></div><h3 class="scene-caption">Your scene is in progress</h3><p class="scene-narration">This first test creates one low-quality image so we can confirm the full image path.</p></article>';
  els.download.disabled = true;
}

function renderFailure(message) {
  const safeMessage = escapeHtml(message);
  els.grid.innerHTML = '<article class="frame-card"><div class="frame-topline"><span class="scene-tag">ONE IMAGE TEST</span><span class="scene-state is-failed">FAILED</span></div><div class="frame-art"><div class="image-failure" role="status"><span aria-hidden="true">!</span><strong>Image not generated</strong><small>' + safeMessage + '</small></div></div><h3 class="scene-caption">Check the workflow result</h3><p class="scene-narration">The error above came back from the image-generation workflow.</p></article>';
  els.download.disabled = true;
}

function renderImage(result) {
  currentImage = result;
  const cost = Number.isFinite(Number(result.costUsd)) ? "$" + Number(result.costUsd).toFixed(6) : "single image";
  els.grid.innerHTML = '<article class="frame-card"><div class="frame-topline"><span class="scene-tag">SCENE 01</span><span class="scene-state">IMAGE READY</span></div><div class="frame-art"></div><h3 class="scene-caption">Generated storyboard frame</h3><p class="scene-narration">One low-quality 16:9 image, guided by Fred’s supplied character and background references.</p><div class="scene-meta"><span class="meta-pill">16:9 frame</span><span class="meta-pill">' + cost + ' generation cost</span></div></article>';
  const image = document.createElement("img");
  image.src = result.imageData;
  image.alt = "Generated storyboard scene in Fred’s reference style";
  els.grid.querySelector(".frame-art").replaceChildren(image);
  els.download.disabled = false;
}

function showError(error) {
  const message = error instanceof Error ? error.message : String(error);
  els.footer.textContent = message;
  els.noticeCopy.innerHTML = "<strong>Workflow message.</strong> " + escapeHtml(message);
  els.notice.classList.add("is-error");
  els.notice.hidden = false;
}

function updateCount() {
  els.count.textContent = els.prompt.value.length.toLocaleString() + " / 2,500";
}

async function generateImage() {
  const prompt = els.prompt.value.trim();
  if (prompt.length < 20 || prompt.length > 2500) {
    els.prompt.setAttribute("aria-invalid", "true");
    els.prompt.focus();
    showError("Enter a scene description between 20 and 2,500 characters.");
    return;
  }
  if (isGenerating) return;
  els.prompt.removeAttribute("aria-invalid");
  isGenerating = true;
  currentImage = null;
  els.build.disabled = true;
  els.download.disabled = true;
  els.buildLabel.textContent = "Generating one image…";
  els.mode.textContent = "GENERATING";
  els.subtitle.textContent = "Preparing the references and asking Flare for one image.";
  els.footer.textContent = "Generating one image with Fred’s supplied references…";
  els.notice.classList.remove("is-error");
  els.notice.hidden = true;
  els.progress.hidden = false;
  els.progressCopy.textContent = "Loading references and generating one image…";
  els.progressValue.textContent = "IN PROGRESS";
  els.progressFill.classList.add("is-loading");
  els.progressFill.style.width = "42%";
  els.grid.setAttribute("aria-busy", "true");
  renderPending();
  try {
    const result = await window.storyboardWorkflow.generate(prompt);
    renderImage(result);
    els.mode.textContent = "IMAGE READY";
    els.subtitle.textContent = "One image returned from the Stage 1 workflow.";
    els.footer.textContent = "Image ready · " + (Number.isFinite(Number(result.costUsd)) ? "$" + Number(result.costUsd).toFixed(6) + " generation cost" : "single image");
    els.progressCopy.textContent = "Image generated and returned to the UI.";
    els.progressValue.textContent = "DONE";
    els.progressFill.style.width = "100%";
  } catch (error) {
    renderFailure(error instanceof Error ? error.message : String(error));
    els.mode.textContent = "CHECK WORKFLOW";
    els.subtitle.textContent = "The image did not return. The workflow message has the error.";
    showError(error);
    els.progressCopy.textContent = "Image generation failed.";
    els.progressValue.textContent = "ERROR";
    els.progressFill.style.width = "100%";
  } finally {
    isGenerating = false;
    els.build.disabled = false;
    els.buildLabel.textContent = "Generate one image";
    els.progressFill.classList.remove("is-loading");
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

async function downloadImage() {
  if (!currentImage?.imageData) return;
  els.download.disabled = true;
  try {
    const response = await fetch(currentImage.imageData);
    const blob = await response.blob();
    const extension = currentImage.mimeType === "image/jpeg" ? "jpg" : "png";
    downloadBlob(blob, "fred-storyboard-scene-01." + extension);
    els.footer.textContent = "Image downloaded · " + (currentImage.mimeType || "PNG");
  } catch (error) {
    showError(error);
  } finally {
    els.download.disabled = !currentImage;
  }
}

document.getElementById("load-sample").addEventListener("click", () => {
  els.prompt.value = SAMPLE_PROMPT;
  updateCount();
  els.footer.textContent = "Sample scene loaded · edit it or generate as written";
  els.prompt.focus();
});
els.prompt.addEventListener("input", updateCount);
els.build.addEventListener("click", generateImage);
els.download.addEventListener("click", downloadImage);
els.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});
els.grid.addEventListener("error", event => {
  if (!(event.target instanceof HTMLImageElement)) return;
  currentImage = null;
  els.download.disabled = true;
  els.footer.textContent = "The workflow returned an image, but this browser could not display it.";
}, true);

els.mode.textContent = "IMAGE TEST";
els.notice.hidden = true;
els.progress.hidden = true;
els.download.disabled = true;
try { setTheme(localStorage.getItem("storyboardTheme") || document.documentElement.dataset.theme); }
catch { setTheme(document.documentElement.dataset.theme); }
els.prompt.value = SAMPLE_PROMPT;
updateCount();
renderEmpty();

