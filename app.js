(() => {
  const WEBHOOK_URL = "https://n8n.47-131-239-128.sslip.io/webhook/script-to-storyboard-portfolio-v1";
  const MAX_LENGTH = 30000;
  const COLUMNS = ["Scene", "Timecode", "Narration", "Visual Concept", "Setting", "Illustration Elements", "Direction Notes"];
  const SAMPLE = `Why Bridges Need Expansion Joints\n\nA bridge carries heavy traffic while the weather changes around it. On a hot day, sunlight warms the steel deck. As the steel gets warmer, its particles move more and spread slightly farther apart. The whole bridge grows by a small amount.\n\nOn a cold day, the steel contracts again. Engineers leave narrow expansion joints between sections so the deck has room to move without buckling. The gap may look small, but it helps the bridge handle years of changing temperatures.\n\nThose joints turn a tiny change in the length of steel into a manageable movement in the structure.`;

  const $ = (id) => document.getElementById(id);
  const form = $("storyboard-form");
  const scriptInput = $("script-input");
  const count = $("script-count");
  const createButton = $("create-button");
  const buttonLabel = $("button-label");
  const sampleButton = $("load-sample");
  const downloadButton = $("download-csv");
  const notice = $("notice");
  const warning = $("warning");
  const progress = $("progress");
  const progressLabel = $("progress-label");
  const emptyState = $("empty-state");
  const summary = $("result-summary");
  const tableWrap = $("table-wrap");
  const sceneRows = $("scene-rows");
  const resultBadge = $("result-badge");
  const tableHint = $("table-hint");
  const driveLink = $("drive-link");
  const themeToggle = $("theme-toggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let busy = false;
  let downloadCsv = "";
  let resultTitle = "";

  function applyTheme(theme, persist = false) {
    const dark = theme === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} mode`);
    themeToggle.title = `Switch to ${dark ? "light" : "dark"} mode`;
    themeColor.content = dark ? "#121c2a" : "#edf2f4";
    if (persist) {
      try { localStorage.setItem("script-to-storyboard-theme", dark ? "dark" : "light"); } catch { /* Theme still applies for this visit. */ }
    }
  }

  function setInputState() {
    const length = scriptInput.value.length;
    count.textContent = `${length.toLocaleString()} / ${MAX_LENGTH.toLocaleString()}`;
    createButton.disabled = busy || length < 20 || length > MAX_LENGTH;
  }

  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.hidden = !message;
    notice.classList.toggle("is-error", isError);
  }

  function setBusy(value) {
    busy = value;
    scriptInput.disabled = value;
    sampleButton.disabled = value;
    buttonLabel.textContent = value ? "Planning the storyboard…" : "Create storyboard";
    progress.hidden = !value;
    progressLabel.textContent = "Reading the full script and planning scene beats…";
    setInputState();
  }

  function deriveTitle(script) {
    const firstLine = script.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (firstLine) return firstLine.replace(/^[#>*\s]+/, "").replace(/[.?!:;]+$/, "").trim().slice(0, 120) || "Untitled storyboard";
    const firstSentence = script.trim().match(/^.{1,120}?[.!?](?:\s|$)/s);
    return (firstSentence?.[0] || script.trim().slice(0, 120)).trim().replace(/[.?!]+$/, "") || "Untitled storyboard";
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const character = text[i];
      if (quoted) {
        if (character === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (character === '"') quoted = false;
        else cell += character;
      } else if (character === '"') quoted = true;
      else if (character === ",") { row.push(cell); cell = ""; }
      else if (character === "\n") {
        row.push(cell.replace(/\r$/, ""));
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
        cell = "";
      } else cell += character;
    }
    if (cell.length || row.length) {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
    }
    if (rows.length < 2) return [];
    const headers = rows.shift().map((header) => header.trim());
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  function normalizedKey(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function getValue(scene, aliases) {
    const entries = Object.entries(scene || {});
    const wanted = aliases.map(normalizedKey);
    const found = entries.find(([key]) => wanted.includes(normalizedKey(key)));
    return found ? String(found[1] ?? "") : "";
  }

  function cleanScene(scene, index) {
    return {
      Scene: getValue(scene, ["Scene", "sceneNumber"]) || String(index + 1),
      Timecode: getValue(scene, ["Timecode", "timecode"]),
      Narration: getValue(scene, ["Narration", "narration"]),
      "Visual Concept": getValue(scene, ["Visual Concept", "visualConcept"]),
      Setting: getValue(scene, ["Setting", "setting"]),
      "Illustration Elements": getValue(scene, ["Illustration Elements", "illustrationElements"]),
      "Direction Notes": getValue(scene, ["Direction Notes", "directionNotes"]),
    };
  }

  function unwrapPayload(payload) {
    let value = payload;
    for (let i = 0; i < 6; i += 1) {
      if (typeof value === "string") {
        try { value = JSON.parse(value); continue; } catch { return { storyboardCsv: value }; }
      }
      if (Array.isArray(value)) {
        const nested = value.find((item) => item?.json || item?.body || item?.storyboardCsv) ?? value[0];
        if (nested === undefined) break;
        value = nested.json ?? nested.body ?? nested;
        continue;
      }
      if (value && typeof value === "object") {
        if (value.json && typeof value.json === "object") { value = value.json; continue; }
        if (value.body && typeof value.body === "object") { value = value.body; continue; }
      }
      break;
    }
    return value && typeof value === "object" ? value : {};
  }

  function getScenes(payload) {
    const data = unwrapPayload(payload);
    const csv = data.storyboardCsv || data.csv || data.csvContent || "";
    if (typeof csv === "string" && csv.trim()) return { data, csv, scenes: parseCsv(csv).map(cleanScene) };
    const source = data.scenes || data.storyboard?.scenes || data.output?.scenes || [];
    const scenes = Array.isArray(source) ? source.map(cleanScene) : [];
    return { data, csv: "", scenes };
  }

  function escapeCsv(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function makeCsv(scenes) {
    return [COLUMNS.map(escapeCsv).join(","), ...scenes.map((scene) => COLUMNS.map((column) => escapeCsv(scene[column])).join(","))].join("\r\n");
  }

  function slugify(value) {
    return String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "storyboard";
  }

  function render(payload, originalScript) {
    const { data, csv, scenes } = getScenes(payload);
    if (!scenes.length) throw new Error("The workflow finished but returned no scene rows. Check the matching n8n execution.");
    sceneRows.replaceChildren();
    for (const scene of scenes) {
      const tr = document.createElement("tr");
      for (const column of COLUMNS) {
        const td = document.createElement("td");
        td.textContent = String(scene[column] ?? "").trim() || "—";
        tr.appendChild(td);
      }
      sceneRows.appendChild(tr);
    }
    resultTitle = String(data.title || data.scriptTitle || deriveTitle(originalScript)).trim();
    $("story-title").textContent = resultTitle;
    $("scene-count").textContent = `${scenes.length} ${scenes.length === 1 ? "scene" : "scenes"}`;
    $("word-count").textContent = `${originalScript.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words`;
    downloadCsv = csv || makeCsv(scenes);
    const savedFolder = data.driveSave?.folderUrl;
    const savedFile = data.driveSave?.url;
    driveLink.href = savedFile || savedFolder || "#";
    driveLink.hidden = !(data.driveSave?.ok && (savedFile || savedFolder));
    warning.textContent = data.narrationWarning || "";
    warning.hidden = !data.narrationWarning;
    summary.hidden = false;
    tableWrap.hidden = false;
    tableHint.hidden = false;
    emptyState.hidden = true;
    resultBadge.hidden = false;
    downloadButton.disabled = false;
    showNotice(`Storyboard complete — ${scenes.length} ${scenes.length === 1 ? "scene is" : "scenes are"} ready to review.`);
  }

  function download() {
    const blob = new Blob(["\ufeff", downloadCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(resultTitle)}-storyboard.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function submit(event) {
    event.preventDefault();
    const script = scriptInput.value.trim();
    if (busy || script.length < 20 || script.length > MAX_LENGTH) return;
    showNotice("");
    warning.hidden = true;
    emptyState.hidden = false;
    summary.hidden = true;
    tableWrap.hidden = true;
    tableHint.hidden = true;
    resultBadge.hidden = true;
    downloadButton.disabled = true;
    driveLink.hidden = true;
    sceneRows.replaceChildren();
    setBusy(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 240000);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ title: deriveTitle(script), script, mode: "storyboardOnly" }),
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error(`n8n returned unreadable data (HTTP ${response.status}). Check the matching workflow execution.`); }
      if (!response.ok || data?.ok === false) {
        const message = typeof data?.error === "string" ? data.error : data?.error?.message;
        throw new Error(message || `Workflow request failed (HTTP ${response.status}). Check n8n for details.`);
      }
      render(data, script);
    } catch (error) {
      emptyState.hidden = true;
      if (error?.name === "AbortError") showNotice("Storyboard planning did not finish within four minutes. Check n8n before resubmitting; the run may still be active.", true);
      else if (error instanceof TypeError) showNotice("Could not reach the storyboard workflow. Check that the portfolio webhook is active and allows this site in its CORS settings.", true);
      else showNotice(error?.message || "Storyboard creation failed. Check the n8n execution details.", true);
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  scriptInput.addEventListener("input", setInputState);
  form.addEventListener("submit", submit);
  sampleButton.addEventListener("click", () => {
    scriptInput.value = SAMPLE;
    scriptInput.dispatchEvent(new Event("input", { bubbles: true }));
    scriptInput.focus();
  });
  downloadButton.addEventListener("click", download);
  themeToggle.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
  applyTheme(document.documentElement.dataset.theme || "light");
  setInputState();
})();
