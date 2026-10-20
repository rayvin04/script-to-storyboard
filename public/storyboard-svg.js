(function attachStoryboardSvgExporter(global) {
  "use strict";

  const PALETTE = ["#ffd166", "#8fd0ef", "#a7d99f", "#c7b4f4", "#ef9a83"];
  const WIDTH = 1280;
  const PAGE_X = 44;
  const CARD_WIDTH = WIDTH - PAGE_X * 2;
  const COLUMN_GAP = 18;
  const COLUMN_WIDTH = (CARD_WIDTH - COLUMN_GAP * 2) / 3;

  function cleanText(value) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .trim();
  }

  function xmlEscape(value) {
    return cleanText(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    })[char]);
  }

  function wrapLines(value, maxCharacters) {
    const cleaned = cleanText(value);
    if (!cleaned) return ["—"];
    const paragraphs = cleaned.split("\n");
    const lines = [];
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("—");
        continue;
      }
      let line = "";
      for (const word of words) {
        if (word.length > maxCharacters) {
          if (line) lines.push(line), line = "";
          for (let index = 0; index < word.length; index += maxCharacters) {
            const part = word.slice(index, index + maxCharacters);
            if (part.length === maxCharacters) lines.push(part);
            else line = part;
          }
          continue;
        }
        if (line && `${line} ${word}`.length > maxCharacters) {
          lines.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) lines.push(line);
    }
    return lines.length ? lines : ["—"];
  }

  function fieldBlock(label, value, x, y, maxCharacters) {
    const lines = wrapLines(value, maxCharacters);
    const lineHeight = 19;
    const body = lines.map((line, index) =>
      `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${xmlEscape(line || " ")}</tspan>`
    ).join("");
    return {
      height: 18 + lines.length * lineHeight + 12,
      markup: `<text x="${x}" y="${y}" class="field-label">${xmlEscape(label.toUpperCase())}</text><text x="${x}" y="${y + 22}" class="field-copy">${body}</text>`,
    };
  }

  function sceneCard(scene, index, y, backgroundById) {
    const x = PAGE_X;
    const sceneNumber = Number(scene.sceneNumber ?? scene.scene) || index + 1;
    const backgroundId = cleanText(scene.backgroundId || "Unassigned") || "Unassigned";
    const plate = backgroundById.get(backgroundId);
    const plateStatus = cleanText(plate?.status || scene.backgroundImageStatus || "pending").replaceAll("_", " ").toUpperCase();
    const timestamp = cleanText(scene.timestamp) || "Timestamp not supplied";
    const headerHeight = 58;
    const contentY = y + headerHeight + 21;
    const cols = [x + 18, x + 18 + COLUMN_WIDTH + COLUMN_GAP, x + 18 + (COLUMN_WIDTH + COLUMN_GAP) * 2];
    const maxCharacters = 48;
    const groups = [
      [
        ["Voiceover", scene.voiceover],
        ["What's happening", scene.whatsHappening],
      ],
      [
        ["Background plate", scene.background],
        ["Animator notes · characters & props", scene.handDrawnCharactersAndProps],
      ],
      [
        ["On-screen text", scene.onScreenText],
        ["Transitions / motion", scene.transitionsMotion],
      ],
    ];
    const columns = groups.map((fields, columnIndex) => {
      let cursorY = contentY;
      const markup = fields.map(([label, value]) => {
        const block = fieldBlock(label, value, cols[columnIndex], cursorY, maxCharacters);
        cursorY += block.height;
        return block.markup;
      }).join("");
      return { height: cursorY - contentY, markup };
    });
    const contentHeight = Math.max(...columns.map(column => column.height));
    const cardHeight = headerHeight + 22 + contentHeight + 18;
    const band = PALETTE[index % PALETTE.length];
    const statusFill = plateStatus === "COMPLETED" ? "#def2d8" : plateStatus === "FAILED" ? "#ffe0dc" : "#f1eddf";
    const markup = [
      `<rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${cardHeight}" rx="17" fill="#fffdf7" stroke="#202a3b" stroke-width="2"/>`,
      `<path d="M${x + 17} ${y}h${CARD_WIDTH - 34}a17 17 0 0 1 17 17v41H${x}V${y + 17}a17 17 0 0 1 17-17z" fill="${band}"/>`,
      `<circle cx="${x + 36}" cy="${y + 29}" r="17" fill="#202a3b"/>`,
      `<text x="${x + 36}" y="${y + 34}" text-anchor="middle" class="scene-number">${xmlEscape(String(sceneNumber).padStart(2, "0"))}</text>`,
      `<text x="${x + 66}" y="${y + 25}" class="scene-heading">Scene ${xmlEscape(sceneNumber)}</text>`,
      `<text x="${x + 66}" y="${y + 43}" class="scene-time">${xmlEscape(timestamp)}</text>`,
      `<rect x="${x + CARD_WIDTH - 210}" y="${y + 14}" width="190" height="30" rx="15" fill="${statusFill}" stroke="#202a3b" stroke-width="1.2"/>`,
      `<text x="${x + CARD_WIDTH - 195}" y="${y + 34}" class="plate-badge">${xmlEscape(`${backgroundId} · ${plateStatus}`)}</text>`,
      columns.map(column => column.markup).join("")
    ].join("");
    return { markup, height: cardHeight };
  }

  function buildStoryboardSvg({ title, jobId, scenes, backgrounds } = {}) {
    const sceneList = Array.isArray(scenes) ? scenes : [];
    if (!sceneList.length) throw new Error("There are no storyboard scenes to export yet.");
    const backgroundById = new Map((Array.isArray(backgrounds) ? backgrounds : []).map(item => [item.backgroundId, item]));
    const pageTitle = cleanText(title) || "Fred's Storyboard";
    const headerHeight = 160;
    const gap = 18;
    let cursorY = headerHeight;
    const cards = sceneList.map((scene, index) => {
      const card = sceneCard(scene || {}, index, cursorY, backgroundById);
      cursorY += card.height + gap;
      return card.markup;
    });
    const footerY = cursorY + 4;
    const totalHeight = footerY + 82;
    const completed = backgroundById.size
      ? Array.from(backgroundById.values()).filter(item => String(item.status).toLowerCase() === "completed").length
      : sceneList.filter(scene => String(scene.backgroundImageStatus).toLowerCase() === "completed").length;
    const deferred = backgroundById.size
      ? Array.from(backgroundById.values()).filter(item => String(item.status).toLowerCase() === "deferred").length
      : sceneList.filter(scene => String(scene.backgroundImageStatus).toLowerCase() === "deferred").length;
    const uniqueCount = backgroundById.size || new Set(sceneList.map(scene => scene.backgroundId).filter(Boolean)).size;
    const meta = `${sceneList.length} scenes  ·  ${uniqueCount} unique background plates  ·  ${completed} ready  ·  ${deferred} deferred`;
    const remainingNote = deferred > 0
      ? `This is the full storyboard. More background plates remain for a later batch (${deferred} deferred).`
      : "This is the full storyboard. All planned background plates are available in this export.";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${totalHeight}" viewBox="0 0 ${WIDTH} ${totalHeight}" role="img" aria-labelledby="title description">
  <title id="title">${xmlEscape(pageTitle)} — Storyboard</title>
  <desc id="description">A visual storyboard export with all scene beats and background plate assignments. Characters, props, text, and motion remain animator notes and are not part of generated background images.</desc>
  <style>
    text { font-family: Lexend, Arial, sans-serif; fill: #202a3b; }
    .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 2px; fill: #536174; }
    .title { font-size: 32px; font-weight: 900; letter-spacing: -.5px; }
    .meta { font-size: 13px; font-weight: 700; fill: #536174; }
    .note { font-size: 12px; fill: #647084; }
    .scene-number { font-size: 12px; font-weight: 900; fill: #fffdf7; }
    .scene-heading { font-size: 17px; font-weight: 900; }
    .scene-time { font-size: 11px; fill: #455166; }
    .plate-badge { font-size: 10px; font-weight: 800; }
    .field-label { font-size: 10px; font-weight: 900; letter-spacing: .8px; fill: #58667a; }
    .field-copy { font-size: 13px; font-weight: 500; }
    .footer { font-size: 11px; fill: #647084; }
  </style>
  <rect width="100%" height="100%" fill="#fff7e8"/>
  <circle cx="1188" cy="44" r="42" fill="#ffd166" opacity=".38"/>
  <text x="${PAGE_X}" y="35" class="eyebrow">FRED'S STORYBOARD LAB  ·  BACKGROUND-FIRST PLAN</text>
  <text x="${PAGE_X}" y="82" class="title">${xmlEscape(pageTitle)}</text>
  <text x="${PAGE_X}" y="111" class="meta">${xmlEscape(meta)}</text>
  <text x="${PAGE_X}" y="136" class="note">Background plates only. Animators draw characters, props, overlays, and motion. Job ${xmlEscape(jobId || "local export")}.</text>
  ${cards.join("\n  ")}
  <line x1="${PAGE_X}" y1="${footerY}" x2="${WIDTH - PAGE_X}" y2="${footerY}" stroke="#202a3b" stroke-opacity=".22"/>
  <text x="${PAGE_X}" y="${footerY + 24}" class="footer">${xmlEscape(remainingNote)}</text>
  <text x="${PAGE_X}" y="${footerY + 48}" class="footer">The SVG is a visual review copy. Download the CSV for the structured source data.</text>
</svg>`;
  }

  global.storyboardSvgExporter = { buildStoryboardSvg };
})(window);
