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

const N8N_PRODUCTION_WEBHOOK_URL = "https://n8n-rayv-742595626609.herokuapp.com/webhook/script-to-storyboard";

const DEMO_SCENES = [
  {
    id: "scene-01",
    title: "The phantom phone buzz",
    narration: "Your brain can mistake a tiny muscle twitch or a shift in your clothes for a notification.",
    prompt: "A person pauses at a desk after feeling a phantom phone vibration; show a gentle buzz cue near a pocket.",
    tag: "body signal",
    art: "phone",
  },
  {
    id: "scene-02",
    title: "Pins and needles",
    narration: "Pressure can temporarily squeeze a nerve. As the signal settles, the skin may tingle.",
    prompt: "A friendly character sits on one foot and notices a light tingling sensation in the toes.",
    tag: "nerve signal",
    art: "tingle",
  },
  {
    id: "scene-03",
    title: "The eyelid flutter",
    narration: "Tiredness, stress, caffeine, or eye strain can make a tiny eyelid muscle flutter.",
    prompt: "A tired but friendly character has a tiny eyelid twitch, shown with two small motion marks.",
    tag: "muscle twitch",
    art: "eye",
  },
  {
    id: "scene-04",
    title: "A tiny brain zap",
    narration: "The sensation can feel sudden and strange, like a quick spark that is gone in a moment.",
    prompt: "A character pauses as a small harmless spark-shaped thought appears beside the head.",
    tag: "quick sensation",
    art: "spark",
  },
];

const els = {
  script: document.getElementById("script-input"),
  count: document.getElementById("script-count"),
  sceneCount: document.getElementById("scene-count"),
  grid: document.getElementById("frame-grid"),
  boardCount: document.getElementById("board-count"),
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

let requestedScenes = 1;
let currentScenes = DEMO_SCENES.slice(0, requestedScenes).map((scene) => ({ ...scene, source: "demo" }));
const liveWebhook = N8N_PRODUCTION_WEBHOOK_URL;
let feedback = readStoredFeedback();

function readStoredFeedback() {
  try {
    return JSON.parse(localStorage.getItem("storyboardFeedback") || "{}");
  } catch {
    return {};
  }
}

function saveFeedback() {
  localStorage.setItem("storyboardFeedback", JSON.stringify(feedback));
  els.footer.textContent = "Feedback saved in this browser";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function artSvg(kind, sceneNumber) {
  let frame = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Illustrative storyboard frame">'
    + '<rect width="800" height="450" fill="#bfe5f5"/>'
    + '<circle cx="681" cy="78" r="43" fill="#ffd166"/>'
    + '<path d="M0 313 Q135 280 258 319 T520 309 T800 312 V450 H0Z" fill="#9cd48f" stroke="#1f293b" stroke-width="5"/>'
    + '<path d="M0 360 Q170 338 320 370 T650 355 T800 366 V450 H0Z" fill="#76bf79"/>'
    + '<path d="M45 314V186M45 227c-38-30-39-58-4-70 29 7 30 38 4 70Zm0 38c39-34 40-61 5-73-30 12-30 42-5 73Z" fill="#67ad70" stroke="#1f293b" stroke-width="5" stroke-linejoin="round"/>'
    + '<path d="M720 318V211M720 250c-36-30-34-57 1-66 30 9 29 40-1 66Zm0 41c38-32 39-58 5-72-30 10-32 41-5 72Z" fill="#67ad70" stroke="#1f293b" stroke-width="5" stroke-linejoin="round"/>'
    + '<path d="M252 318v-74l99-54 98 54v74Z" fill="#ffb29c" stroke="#1f293b" stroke-width="6" stroke-linejoin="round"/>'
    + '<path d="M238 247l113-76 113 76" fill="none" stroke="#1f293b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<rect x="330" y="260" width="43" height="58" rx="7" fill="#f9e3a8" stroke="#1f293b" stroke-width="5"/>'
    + '<path d="M387 318v-44h34v44" fill="#8fd0ef" stroke="#1f293b" stroke-width="5"/>'
    + '<ellipse cx="530" cy="327" rx="80" ry="20" fill="#3c694d" opacity=".25"/>'
    + '<path d="M466 280h98v44h-98z" fill="#ef674d" stroke="#1f293b" stroke-width="6" stroke-linejoin="round"/>'
    + '<path d="M477 280c0-30 75-30 75 0" fill="#8fd0ef" stroke="#1f293b" stroke-width="6"/>'
    + '<circle cx="515" cy="194" r="42" fill="#f2bd91" stroke="#1f293b" stroke-width="6"/>'
    + '<path d="M474 195c-4-46 22-64 58-47 19 9 25 22 25 40-19-9-31-18-40-32-7 18-21 30-43 39Z" fill="#393442" stroke="#1f293b" stroke-width="5" stroke-linejoin="round"/>'
    + '<circle cx="501" cy="198" r="4.5" fill="#1f293b"/><circle cx="527" cy="198" r="4.5" fill="#1f293b"/>'
    + '<path d="M506 217q10 9 20-1" fill="none" stroke="#1f293b" stroke-width="3.5" stroke-linecap="round"/>'
    + '<path d="M482 238v53m66-53v53M482 263l-30 29m96-28 28 17" fill="none" stroke="#1f293b" stroke-width="12" stroke-linecap="round"/>'
    + '<path d="M487 242q27-12 57 0v62h-57z" fill="' + (sceneNumber % 2 ? "#f5c84c" : "#72c9bd") + '" stroke="#1f293b" stroke-width="5" stroke-linejoin="round"/>'
    + '<path d="M493 302l-13 46m58-46 15 46" fill="none" stroke="#1f293b" stroke-width="11" stroke-linecap="round"/>'
    + '<path d="M477 349h20m55 0h20" fill="none" stroke="#1f293b" stroke-width="9" stroke-linecap="round"/>';

  if (kind === "phone") {
    frame += '<path d="M554 258q15-14 0-28m14 32q22-21 1-42m-238 43q-10-9 0-18" fill="none" stroke="#ef674d" stroke-width="7" stroke-linecap="round"/>'
      + '<rect x="565" y="254" width="22" height="38" rx="5" fill="#273246" stroke="#fffdf7" stroke-width="3"/>'
      + '<circle cx="576" cy="284" r="2" fill="#ffd166"/>';
  } else if (kind === "tingle") {
    frame += '<path d="M541 344q20-10 43 0m-35 12q16-8 32 0m-27 12q12-6 22 0" fill="none" stroke="#f8e38a" stroke-width="7" stroke-linecap="round"/>'
      + '<path d="m576 336 11-11m-8 27 15-7m-19 20 12 3" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round"/>';
  } else if (kind === "eye") {
    frame += '<path d="M553 187q16-12 29 0m-28 10q16-12 29 0" fill="none" stroke="#ef674d" stroke-width="5" stroke-linecap="round"/>'
      + '<path d="M492 201q10 4 18 0m11 0q11 4 19 0" fill="none" stroke="#1f293b" stroke-width="3.5" stroke-linecap="round"/>';
  } else {
    frame += '<path d="m569 166 9-16 9 16 17 3-13 11 3 17-16-9-15 9 3-17-13-11Z" fill="#ffd166" stroke="#1f293b" stroke-width="4" stroke-linejoin="round"/>'
      + '<path d="M578 217q12-10 23 0m-20 11q10-8 18 0" fill="none" stroke="#ef674d" stroke-width="4" stroke-linecap="round"/>';
  }

  return frame + '<path d="M0 0h800v450H0z" fill="none" stroke="#1f293b" stroke-width="5"/></svg>';
}

function frameMarkup(scene, index) {
  const rating = feedback[scene.id] ? feedback[scene.id].rating : "";
  const showComment = rating === "down";
  const imageBlock = scene.imageData
    ? '<img src="' + escapeHtml(scene.imageData) + '" alt="Generated scene ' + (index + 1) + '" />'
    : artSvg(scene.art || ["phone", "tingle", "eye", "spark"][index % 4], index);
  const safeTitle = escapeHtml(scene.title || ("Scene " + (index + 1)));
  const safeNarration = escapeHtml(scene.narration || scene.scriptExcerpt || "A visual beat from the supplied narration.");
  const safeTag = escapeHtml(scene.tag || "visual beat");
  const sceneId = escapeHtml(scene.id || ("scene-" + (index + 1)));
  const savedComment = escapeHtml(feedback[scene.id] ? feedback[scene.id].comment : "");

  return '<article class="frame-card" data-scene-id="' + sceneId + '">'
    + '<div class="frame-topline"><span class="scene-tag">SCENE ' + String(index + 1).padStart(2, "0") + '</span><span class="scene-state">' + (scene.source === "live" ? "AI IMAGE" : "STYLE PREVIEW") + '</span></div>'
    + '<div class="frame-art" data-art-frame>' + imageBlock + '</div>'
    + '<h3 class="scene-caption">' + safeTitle + '</h3>'
    + '<p class="scene-narration">' + safeNarration + '</p>'
    + '<div class="scene-meta"><span class="meta-pill">16:9 frame</span><span class="meta-pill">' + safeTag + '</span></div>'
    + '<div class="feedback-row"><span class="feedback-label">Does this beat work?</span>'
    + '<button class="rate-button" type="button" data-rating="up" data-id="' + sceneId + '" aria-label="Like scene ' + (index + 1) + '" aria-pressed="' + (rating === "up") + '">👍</button>'
    + '<button class="rate-button" type="button" data-rating="down" data-id="' + sceneId + '" aria-label="Needs changes for scene ' + (index + 1) + '" aria-pressed="' + (rating === "down") + '">👎</button></div>'
    + (showComment ? '<div class="comment-wrap"><textarea data-comment="' + sceneId + '" aria-label="What should change?" placeholder="What should change?">' + savedComment + '</textarea><button type="button" data-save-comment="' + sceneId + '">Save note</button></div>' : "")
    + '</article>';
}

function renderScenes() {
  if (!currentScenes.length) {
    els.grid.innerHTML = '<div class="empty-state"><div class="empty-illustration" aria-hidden="true">✦</div><div><h3>Your storyboard starts here</h3><p>Paste a script on the left, choose a small batch, then build a first visual pass.</p></div></div>';
  } else {
    els.grid.innerHTML = currentScenes.map(frameMarkup).join("");
  }
  els.boardCount.textContent = currentScenes.length + (currentScenes.length === 1 ? " frame" : " frames");
}

function updateCount() {
  els.count.textContent = els.script.value.length.toLocaleString() + " / 40,000";
}

function deriveLocalScenes(script, count) {
  const lines = script.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const paragraphs = [];
  let heading = "";
  let current = [];
  lines.forEach((line) => {
    const shortHeading = line.length < 70 && !/[.!?]$/.test(line);
    if (shortHeading) {
      if (current.length) paragraphs.push({ title: heading, text: current.join(" ") });
      heading = line;
      current = [];
    } else current.push(line);
  });
  if (current.length) paragraphs.push({ title: heading, text: current.join(" ") });
  const usable = paragraphs.length ? paragraphs : [{ title: "A new visual beat", text: script }];
  const selected = usable.slice(0, count);
  return selected.map((item, index) => ({
    id: "local-" + Date.now() + "-" + index,
    title: item.title || ["Open on the sensation", "Show what's happening", "Land the takeaway", "A closer look"][index % 4],
    narration: item.text.slice(0, 190),
    prompt: "A clear, friendly flat 2D cartoon storyboard frame illustrating: " + item.text.slice(0, 280),
    tag: ["body signal", "simple explanation", "takeaway"][index % 3],
    art: ["phone", "tingle", "eye", "spark"][index % 4],
    source: "demo",
  }));
}

function normalizeLiveResponse(data) {
  let result = data;
  if (Array.isArray(result) && result[0] && result[0].json) result = result[0].json;
  if (result && result.output && typeof result.output === "object") result = result.output;
  let scenes = result && Array.isArray(result.scenes) ? result.scenes : null;
  if (!scenes && result && Array.isArray(result.data)) scenes = result.data;
  if (!scenes) throw new Error("The webhook response did not include a scenes array.");
  return scenes.map((scene, index) => {
    const b64 = scene.imageBase64 || scene.image_base64 || scene.b64_json || "";
    const imageData = scene.imageData || scene.image_data || (b64 ? "data:image/png;base64," + b64 : "") || scene.imageUrl || scene.image_url || "";
    return {
      id: scene.id || scene.sceneId || scene.scene_id || ("live-" + index),
      title: scene.title || scene.visualBeat || scene.visual_beat || ("Scene " + (index + 1)),
      narration: scene.narration || scene.scriptExcerpt || scene.script_excerpt || scene.description || "",
      prompt: scene.imagePrompt || scene.image_prompt || "",
      tag: scene.tag || scene.purpose || "generated frame",
      imageData,
      source: imageData ? "live" : "demo",
      art: ["phone", "tingle", "eye", "spark"][index % 4],
    };
  });
}

async function buildStoryboard() {
  const script = els.script.value.trim();
  if (!script) {
    els.script.focus();
    els.footer.textContent = "Paste a script before building the storyboard";
    return;
  }
  if (script.length < 40) {
    els.footer.textContent = "Add a little more narration so the scene planner has enough context";
    return;
  }

  els.build.disabled = true;
  els.buildLabel.textContent = "Planning scenes…";
  els.progress.hidden = false;
  els.progressCopy.textContent = "Sending script to the storyboard workflow…";
  els.progressValue.textContent = "18%";
  els.progressFill.style.width = "18%";
  els.footer.textContent = "Connecting to the saved n8n workflow";

  try {
    if (liveWebhook) {
      els.progressValue.textContent = "38%";
      els.progressFill.style.width = "38%";
      const response = await fetch(liveWebhook, {
        method: "POST",
        // text/plain is a CORS-safelisted content type, so the browser sends
        // the POST directly instead of failing on an OPTIONS preflight.
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ script, maxScenes: requestedScenes, aspectRatio: "16:9" }),
      });
      if (!response.ok) throw new Error("n8n responded with status " + response.status + ".");
      const data = await response.json();
      currentScenes = normalizeLiveResponse(data);
      els.progressCopy.textContent = "Frames returned from n8n";
      els.progressValue.textContent = "100%";
      els.progressFill.style.width = "100%";
      els.subtitle.textContent = "Live response from your n8n workflow.";
      els.mode.textContent = "N8N CONNECTED";
      els.footer.textContent = currentScenes.length + " scene frames returned · review before sharing";
      document.getElementById("notice-bar").hidden = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
      els.progressValue.textContent = "62%";
      els.progressFill.style.width = "62%";
      els.progressCopy.textContent = "Arranging the storyboard preview…";
      await new Promise((resolve) => setTimeout(resolve, 350));
      currentScenes = deriveLocalScenes(script, requestedScenes);
      els.progressValue.textContent = "100%";
      els.progressFill.style.width = "100%";
      els.progressCopy.textContent = "Preview ready";
      els.subtitle.textContent = "Local style preview built from the pasted script.";
      els.footer.textContent = "Local demo mode · no model call or image charge";
    }
    renderScenes();
    document.getElementById("step-3").classList.add("is-current");
    document.getElementById("step-2").classList.add("is-done");
    window.setTimeout(() => { els.progress.hidden = true; }, 1300);
  } catch (error) {
    els.progressCopy.textContent = "Could not reach the workflow";
    els.progressValue.textContent = "!";
    els.progressFill.style.width = "100%";
    els.progressFill.style.background = "#bd5145";
    els.footer.textContent = error.message || "Connection failed";
  } finally {
    els.build.disabled = false;
    els.buildLabel.textContent = "Build storyboard";
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

function downloadFrame(scene, index) {
  if (scene.imageData) {
    const link = document.createElement("a");
    link.href = scene.imageData;
    link.download = "fred-storyboard-scene-" + String(index + 1).padStart(2, "0") + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  const markup = artSvg(scene.art || ["phone", "tingle", "eye", "spark"][index % 4], index);
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), "fred-storyboard-scene-" + String(index + 1).padStart(2, "0") + ".svg");
}

function exportPlan() {
  const payload = {
    title: "Fred's storyboard preview",
    createdAt: new Date().toISOString(),
    mode: liveWebhook ? "n8n" : "local-demo",
    styleGuide: "Flat 2D cartoon; loose bold black outlines; simple friendly faces; solid color fills; no text in image.",
    scenes: currentScenes.map((scene, index) => ({
      sceneNumber: index + 1,
      id: scene.id,
      title: scene.title,
      narration: scene.narration,
      imagePrompt: scene.prompt,
      feedback: feedback[scene.id] || null,
    })),
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "fred-storyboard-plan.json");
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
  requestedScenes = Math.min(3, requestedScenes + 1);
  els.sceneCount.textContent = requestedScenes;
});
els.build.addEventListener("click", buildStoryboard);
document.getElementById("download-all").addEventListener("click", () => currentScenes.forEach((scene, index) => window.setTimeout(() => downloadFrame(scene, index), index * 180)));
document.getElementById("export-plan").addEventListener("click", exportPlan);
document.getElementById("send-drive").addEventListener("click", () => els.message.showModal());
document.getElementById("dismiss-notice").addEventListener("click", () => { document.getElementById("notice-bar").hidden = true; });
els.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});

els.grid.addEventListener("click", (event) => {
  const ratingButton = event.target.closest("[data-rating]");
  if (ratingButton) {
    const id = ratingButton.dataset.id;
    const rating = ratingButton.dataset.rating;
    feedback[id] = { ...(feedback[id] || {}), rating, updatedAt: new Date().toISOString() };
    saveFeedback();
    renderScenes();
    return;
  }
  const saveButton = event.target.closest("[data-save-comment]");
  if (saveButton) {
    const id = saveButton.dataset.saveComment;
    const field = els.grid.querySelector('[data-comment="' + CSS.escape(id) + '"]');
    feedback[id] = { ...(feedback[id] || {}), rating: "down", comment: field ? field.value.trim() : "", updatedAt: new Date().toISOString() };
    saveFeedback();
    renderScenes();
  }
});

els.mode.textContent = "N8N WORKFLOW";
setTheme(document.documentElement.dataset.theme);
els.script.value = SAMPLE_SCRIPT;
updateCount();
renderScenes();

