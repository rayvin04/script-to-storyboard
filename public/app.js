const SAMPLE_SCRIPT = [
  "Your phone buzzes in your pocket. You reach for it. Nothing. No text, no call, no notification.",
  "Almost everyone has felt this, and it has a name: phantom vibration syndrome. Your brain predicts the signals that matter most, so a tiny muscle twitch or a shift of fabric can feel like a phone alert.",
  "The fix is to give your attention a break. The more you expect a notification, the more likely your brain is to invent one."
].join("\n\n");
const MAX_SCRIPT_LENGTH = 30000;
const MAX_BACKGROUND_IMAGES = 10;
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
  storyboardBody: $("storyboard-body"),
  downloadStoryboard: $("download-storyboard"),
  deferredNote: $("deferred-note"),
  deferredCopy: $("deferred-copy"),
  themeToggle: $("theme-toggle")
};
const state = { busy: false, images: [], storyboardCsv: "" };

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
  els.generateButton.disabled = state.busy || length < 20 || length > MAX_SCRIPT_LENGTH;
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
  els.generateLabel.textContent = isBusy ? "Planning, then generating…" : "Create storyboard & backgrounds";
  updateInputState();
}

function clearResults() {
  state.images = [];
  state.storyboardCsv = "";
  els.imageGrid.querySelectorAll(".image-card").forEach(card => card.remove());
  els.emptyState.hidden = false;
  els.resultCount.textContent = "0 / " + MAX_BACKGROUND_IMAGES;
  els.resultSummary.textContent = "The storyboard and its scene-specific background images will appear here.";
  els.storyboardDisclosure.hidden = true;
  els.storyboardDisclosure.open = false;
  els.storyboardCount.textContent = "0 scenes";
  els.storyboardBody.replaceChildren();
  els.downloadStoryboard.disabled = true;
  els.deferredNote.hidden = true;
  els.deferredCopy.textContent = "";
}

function sceneLabel(sceneNumbers) {
  if (!Array.isArray(sceneNumbers) || sceneNumbers.length === 0) return "Scene not specified";
  const clean = sceneNumbers.map(Number).filter(Number.isFinite);
  if (clean.length === 0) return "Scene not specified";
  return clean.length === 1 ? "Scene " + clean[0] : "Scenes " + clean.join(", ");
}

function createImageCard(image, index) {
  const card = document.createElement("article");
  card.className = "image-card";

  const top = document.createElement("div");
  top.className = "image-card-top";
  const label = document.createElement("span");
  label.className = "image-card-index";
  label.textContent = "BACKGROUND " + String(index + 1).padStart(2, "0");
  const scenes = document.createElement("span");
  scenes.className = "image-card-scenes";
  scenes.textContent = sceneLabel(image.sceneNumbers);
  top.append(label, scenes);

  const figure = document.createElement("figure");
  figure.className = "image-card-art";
  const img = document.createElement("img");
  img.src = image.imageData;
  img.alt = "Generated cartoon background for " + sceneLabel(image.sceneNumbers).toLowerCase();
  img.loading = "eager";
  figure.appendChild(img);

  const caption = document.createElement("p");
  caption.className = "image-card-caption";
  caption.textContent = image.backgroundPrompt;

  card.append(top, figure, caption);
  return card;
}

function appendImage(image) {
  els.emptyState.hidden = true;
  state.images.push(image);
  els.imageGrid.appendChild(createImageCard(image, state.images.length - 1));
  els.resultCount.textContent = state.images.length + " / " + MAX_BACKGROUND_IMAGES;
}

function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.scenes) || !Array.isArray(plan.backgrounds)) {
    throw new Error("The planner response must include the complete storyboard and its background settings.");
  }
  if (typeof plan.storyboardCsv !== "string" || !plan.storyboardCsv) {
    throw new Error("The planner response did not include the storyboard CSV data.");
  }
  if (plan.backgrounds.length === 0) {
    throw new Error("The storyboard did not contain any usable Background descriptions. Check the planner's Background column.");
  }
  return plan.backgrounds.slice(0, MAX_BACKGROUND_IMAGES);
}

function renderStoryboard(scenes, csvText) {
  const columns = [
    ["sceneNumber", "Scene"],
    ["timestamp", "Timestamp"],
    ["voiceover", "Voiceover"],
    ["whatsHappening", "What's happening"],
    ["background", "Background"],
    ["handDrawnCharactersAndProps", "Hand-drawn characters & props"],
    ["onScreenText", "On-screen text"],
    ["transitionsMotion", "Transitions/Motion"]
  ];
  const rows = scenes.map(scene => {
    const row = document.createElement("tr");
    for (const [key] of columns) {
      const cell = document.createElement("td");
      cell.textContent = scene && scene[key] != null && String(scene[key]).trim() ? String(scene[key]) : "—";
      row.appendChild(cell);
    }
    return row;
  });
  els.storyboardBody.replaceChildren(...rows);
  els.storyboardCount.textContent = scenes.length + (scenes.length === 1 ? " scene" : " scenes");
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
  link.download = "fred-storyboard.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  setProgress("Planning the full script into animator-style scenes…", 3, "PLANNING", true);

  let targetImages = [];
  let completed = 0;
  try {
    const plan = await window.storyboardWorkflow.plan(script);
    targetImages = validatePlan(plan);
    renderStoryboard(plan.scenes, plan.storyboardCsv);
    const sceneCount = Number(plan.totalScenes) || 0;
    const totalUnique = Number(plan.totalUniqueBackgrounds) || targetImages.length;
    const deferred = Number(plan.remainingBackgrounds) || 0;

    els.resultSummary.textContent =
      "Storyboard planned: " + sceneCount + " scene beats · " +
      totalUnique + " distinct backgrounds. Generating the first " + targetImages.length + " one by one.";
    if (deferred > 0) {
      els.deferredNote.hidden = false;
      els.deferredCopy.textContent = totalUnique + " unique settings were identified. This run creates " +
        targetImages.length + "; " + deferred + " remain for a later batch.";
    }

    for (let index = 0; index < targetImages.length; index += 1) {
      const background = targetImages[index];
      const label = sceneLabel(background.sceneNumbers);
      const percentBefore = Math.round((completed / targetImages.length) * 100);
      setProgress(
        "Generating background " + (index + 1) + " of " + targetImages.length + " · " + label,
        percentBefore,
        "IMAGE " + (index + 1) + " / " + targetImages.length,
        true
      );

      const result = await window.storyboardWorkflow.generateBackground(background);
      if (typeof result.imageData !== "string" || !result.imageData.startsWith("data:image/")) {
        throw new Error("n8n returned no displayable image for " + label + ". Check that the image response includes imageData.");
      }

      appendImage({
        backgroundId: background.backgroundId || "BG" + String(index + 1).padStart(3, "0"),
        sceneNumbers: background.sceneNumbers || [],
        backgroundPrompt: background.backgroundPrompt || background.background || "Custom-fit background plate",
        imageData: result.imageData,
        mimeType: result.mimeType || "image/png"
      });

      completed += 1;
      const percent = Math.round((completed / targetImages.length) * 100);
      setProgress(
      completed === targetImages.length ? "Storyboard complete · All selected backgrounds are ready." : completed + " of " + targetImages.length + " backgrounds ready.",
        percent,
        completed + " / " + targetImages.length,
        false
      );
      els.resultSummary.textContent = completed + " of " + targetImages.length +
        " backgrounds ready · " + sceneLabel(background.sceneNumbers) + " just finished.";
    }

    if (deferred > 0) {
      els.resultSummary.textContent = "Storyboard complete · " + completed + " backgrounds ready. " + deferred + " unique settings remain for a later batch.";
    } else {
      els.resultSummary.textContent = "Storyboard complete · " + completed + " scene-aware backgrounds are ready.";
    }
    setNotice("", false);
  } catch (error) {
    const message = error && typeof error.message === "string" ? error.message : "The workflow stopped unexpectedly.";
    const partial = completed > 0
      ? " " + completed + " image" + (completed === 1 ? " is" : "s are") + " ready; the remaining requests stopped."
      : "";
    setNotice(message + partial, true);
    els.resultSummary.textContent = completed > 0
      ? completed + " background" + (completed === 1 ? " is" : "s are") + " ready. The batch stopped after an error."
      : els.storyboardDisclosure.hidden
        ? "No storyboard or backgrounds were returned. Check the n8n workflow before retrying."
        : "The storyboard is ready, but no backgrounds were returned. Check the n8n workflow before retrying.";
    els.progressValue.textContent = completed + " / " + targetImages.length;
    els.progressFill.classList.remove("is-active");
    if (completed === 0) els.progressWrap.hidden = true;
  } finally {
    setBusy(false);
  }
}

els.script.addEventListener("input", updateInputState);
els.form.addEventListener("submit", generateFromScript);
els.downloadStoryboard.addEventListener("click", downloadStoryboard);
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
