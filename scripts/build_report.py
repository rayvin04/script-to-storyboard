from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = Path(__file__).resolve().parent.parent / "docs" / "Freds_Storyboard_Analysis.docx"
INK = "202A3B"
MUTED = "647084"
CORAL = "EF674D"
YELLOW = "FFD166"
PALE = "FFF4D8"
BLUE = "EAF6FC"
GREEN = "EAF5E7"
LIGHT = "F5F7FA"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_margins(cell, top=100, start=130, bottom=100, end=130):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color="D6DCE4", size="6"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def add_hyperlink(paragraph, text, url, color=CORAL):
    part = paragraph.part
    rid = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), rid)
    run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    c = OxmlElement("w:color")
    c.set(qn("w:val"), color)
    rpr.append(c)
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rpr.append(u)
    run.append(rpr)
    text_node = OxmlElement("w:t")
    text_node.text = text
    run.append(text_node)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_page_field(paragraph):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instruction = OxmlElement("w:instrText")
    instruction.set(qn("xml:space"), "preserve")
    instruction.text = " PAGE "
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    display = OxmlElement("w:t")
    display.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instruction, separate, display, end])


def set_run(run, size=10.5, color=INK, bold=False, italic=False, font="Aptos"):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run.bold = bold
    run.italic = italic
    return run


def add_text(paragraph, text, size=10.5, color=INK, bold=False, italic=False):
    return set_run(paragraph.add_run(text), size, color, bold, italic)


def add_body(doc, text, after=5, before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.12
    add_text(p, text)
    return p


def add_bullet(doc, text, level=0):
    style = "List Bullet" if level == 0 else "List Bullet 2"
    p = doc.add_paragraph(style=style)
    p.paragraph_format.left_indent = Inches(0.22 + 0.18 * level)
    p.paragraph_format.first_line_indent = Inches(-0.13)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.06
    add_text(p, text, size=10)
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(5)
    add_text(p, text, size=17 if level == 1 else 12, color=INK if level == 1 else CORAL, bold=True)
    return p


def add_callout(doc, title, text, fill=PALE, accent=CORAL):
    table = doc.add_table(rows=1, cols=1)
    table.autofit = False
    table.columns[0].width = Inches(6.8)
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_shading(cell, fill)
    set_cell_margins(cell, top=145, start=190, bottom=135, end=190)
    set_table_borders(table, color=accent, size="9")
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(4)
    add_text(p, title, size=10, color=accent, bold=True)
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.line_spacing = 1.08
    add_text(p2, text, size=10.2, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def build_table(doc, headers, rows, widths, header_fill=INK, font_size=9.2):
    table = doc.add_table(rows=1, cols=len(headers))
    table.autofit = False
    for i, width in enumerate(widths):
        table.columns[i].width = Inches(width)
        cell = table.rows[0].cells[i]
        cell.width = Inches(width)
        set_cell_shading(cell, header_fill)
        set_cell_margins(cell, top=90, start=100, bottom=90, end=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        add_text(p, headers[i], size=8.5, color=WHITE, bold=True)
    set_repeat_table_header(table.rows[0])
    for row_index, row_data in enumerate(rows):
        cells = table.add_row().cells
        fill = WHITE if row_index % 2 == 0 else LIGHT
        for i, value in enumerate(row_data):
            cells[i].width = Inches(widths[i])
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_shading(cells[i], fill)
            set_cell_margins(cells[i], top=85, start=100, bottom=85, end=100)
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.02
            add_text(p, value, size=font_size, color=INK, bold=(i == 0))
    set_table_borders(table, color="D7DDE5", size="5")
    return table


def add_flow_table(doc):
    rows = [
        ("01  UI", "Paste script, choose 1–3 scenes, review returned frames."),
        ("02  WEBHOOK", "Receive request, validate size, create a job identifier."),
        ("03  SCENE PLANNER", "AI Agent + text model return structured beats and image prompts."),
        ("04  IMAGE PASS", "One Vercel Gateway image call per approved scene; return image data."),
        ("05  REVIEW", "Show progress, download frames, save local or shared feedback."),
    ]
    table = doc.add_table(rows=len(rows), cols=2)
    table.autofit = False
    table.columns[0].width = Inches(1.52)
    table.columns[1].width = Inches(5.28)
    for i, (label, desc) in enumerate(rows):
        left, right = table.rows[i].cells
        left.width = Inches(1.52)
        right.width = Inches(5.28)
        set_cell_margins(left, top=88, start=115, bottom=88, end=115)
        set_cell_margins(right, top=88, start=125, bottom=88, end=125)
        set_cell_shading(left, [YELLOW, BLUE, PALE, GREEN, "F1EAFB"][i])
        set_cell_shading(right, WHITE if i % 2 == 0 else LIGHT)
        p = left.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        add_text(p, label, size=8.5, bold=True)
        p = right.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        add_text(p, desc, size=9.2)
    set_table_borders(table, color="CBD3DD", size="5")
    return table


def add_source(doc, label, url, note=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Inches(0.05)
    add_text(p, label, size=9.2, bold=True)
    add_text(p, "  ")
    add_hyperlink(p, "Open reference", url)
    if note:
        add_text(p, "  " + note, size=8.7, color=MUTED)
    return p


def configure(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.68)
    section.bottom_margin = Inches(0.68)
    section.left_margin = Inches(0.82)
    section.right_margin = Inches(0.82)
    section.header_distance = Inches(0.32)
    section.footer_distance = Inches(0.32)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(INK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.1
    for name, size, color in (("Heading 1", 17, INK), ("Heading 2", 12, CORAL), ("Heading 3", 10.5, INK)):
        style = styles[name]
        style.font.name = "Aptos Display"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos Display")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.keep_with_next = True

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_text(header, "FRED  /  SCRIPT → STORYBOARD", size=8, color=MUTED, bold=True)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_text(footer, "REFERENCE ANALYSIS  •  19 OCT 2026     |     ", size=8, color=MUTED)
    add_page_field(footer)


def build_report():
    doc = Document()
    configure(doc)

    # Page 1: executive brief
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(22)
    p.paragraph_format.space_after = Pt(4)
    add_text(p, "PAID DEMO  /  BUILD BRIEF", size=9, color=CORAL, bold=True)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(7)
    add_text(p, "Fred's Script-to-\nStoryboard Demo", size=31, color=INK, bold=True)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(16)
    add_text(p, "Reference analysis • prototype architecture • phased build plan", size=12, color=MUTED)

    add_callout(
        doc,
        "THE FIRST USEFUL RESULT",
        "A user pastes a script, reviews a small storyboard plan, generates up to three consistent image frames, and downloads the results. The first provider call should generate one frame so we can confirm the Vercel route and actual spend before a batch.",
        fill=PALE,
    )
    add_heading(doc, "What Fred is asking for", 1)
    add_body(
        doc,
        "Fred wants a practical script-to-image automation: the script is split into scene beats, and the system generates a matching background image for each beat in a consistent art style. The aim is to make YouTube production faster by reducing repeated manual visual planning.",
    )
    add_heading(doc, "Recommendation", 2)
    add_bullet(doc, "Build the reviewer-facing UI and the n8n pipeline together, with the UI clearly marked as local preview until a live webhook is configured.")
    add_bullet(doc, "Treat the asteroid sample video as a pacing/style reference. Use the supplied body-glitch script and character folder for the first content test.")
    add_bullet(doc, "Keep the first run small: 1–3 scenes, one image per scene, manual approval before full-script batches.")

    add_callout(
        doc,
        "REFERENCE MISMATCH TO KEEP VISIBLE",
        "The supplied video is about an asteroid and the extinction of the dinosaurs. The supplied script and voiceover folder are about everyday body sensations. I interpret the video as a visual grammar/pacing reference, not the script to illustrate.",
        fill=BLUE,
        accent="3C7291",
    )
    add_body(doc, "Prepared for Rayvin to use as a build reference and to brief Fred. Source pages checked 19 October 2026.", after=0)

    # Page 2: editorial and script references
    doc.add_page_break()
    add_heading(doc, "1. Channel and script analysis", 1)
    add_body(doc, "The channels share an accessible explainer promise: take a broad or surprising topic and make it easy to follow through a clear hook, short sections, and visual changes that support the narration.")
    build_table(
        doc,
        ["Reference", "Observed format", "Use in this demo"],
        [
            ("EverythingProfessor", "“Complex things, simply explained”; list-style psychology, health, sleep, and general explainers.", "Audience packaging and pacing context."),
            ("Professor Historian", "Entertaining history explainers; list, mystery, and first-person framing.", "Shows the broader explainer brand."),
            ("WildlifeProfessor", "Animal behavior, capability, and survival topics.", "Adjacent channel context, not the first content."),
            ("EverythingProfessor Compilations", "Long compilations assembled around topic clusters.", "Potential later use for repeatable scene assets."),
        ],
        [1.55, 2.75, 2.5],
        font_size=8.7,
    )
    add_heading(doc, "Supplied script: 15 topic beats", 2)
    topics = [
        "Phantom phone vibration", "Pins and needles", "Eye twitching", "Brain zaps", "Ear ringing / tinnitus",
        "Skin crawling", "Unexplained goosebumps", "Random muscle twitching", "Dizziness on standing",
        "Stomach-drop feeling", "Lump-in-throat feeling", "Sharp chest / rib stitch", "Face flushing",
        "Heart palpitations", "Internal vibration sensation",
    ]
    for start in range(0, len(topics), 3):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.left_indent = Inches(0.12)
        add_text(p, "   •   ".join(topics[start:start + 3]), size=9.2)
    add_callout(
        doc,
        "SCRIPT VOICE",
        "Casual and wry, moving from a familiar sensation to a plain-language explanation, a relatable analogy, and a practical caveat. The image system should explain each beat without inventing medical facts or making it look like a diagnosis.",
        fill=GREEN,
        accent="4B8250",
    )
    add_body(doc, "An MP3 named audio_159655.mp3 is present in the script folder. I have not verified its timecodes or produced a transcript, so the first storyboard should segment from the supplied text only.", after=0)

    # Page 3: visual style
    doc.add_page_break()
    add_heading(doc, "2. Visual language and assets", 1)
    add_body(doc, "The character folder supports a deliberately simple illustrated style. Its strongest consistency cues are shape and outline, not tiny surface detail.")
    build_table(
        doc,
        ["Cue", "Observed reference trait", "Prompting implication"],
        [
            ("Characters", "Rounded heads, minimal eyes and mouths, stick-like limbs, familiar outfits.", "Use one approved character anchor repeatedly."),
            ("Linework", "Thick, slightly irregular black contour.", "Ask for hand-drawn outlines; avoid clean glossy vector polish."),
            ("Color", "Large, solid clothing and background fills.", "Use a small warm palette with a single focal accent."),
            ("Composition", "Front-facing, uncluttered poses; a few simple room or landscape props.", "One visual metaphor and one action per frame."),
            ("Format", "Sample video is 16:9 with frequent explanatory scenes.", "Generate 16:9 frames; keep captions out of the image."),
        ],
        [1.05, 2.85, 2.9],
        font_size=8.8,
    )
    add_heading(doc, "Style prompt foundation", 2)
    add_callout(
        doc,
        "LOCKED STYLE FOUNDATION",
        "Simple hand-drawn 2D explainer cartoon; bold irregular black outlines; flat warm solid colors; minimal expressive faces; clear silhouette; one visual metaphor per frame; uncluttered 16:9 composition; no lettering, captions, logos, photorealism, gradients, or excessive detail.",
        fill=PALE,
    )
    add_heading(doc, "Asset handling", 2)
    add_bullet(doc, "The shared folder contains 18 PNGs, including alternate women, a soldier, lifeguard, handyman, agents, businessmen, a professor, and a living-room scene.")
    add_bullet(doc, "Some thumbnails appear to use transparency or checkerboard preview backgrounds. Check alpha/crop before passing them into the image model.")
    add_bullet(doc, "Choose a single character/reference image per scene family; use the same reference in every generation where continuity matters.")
    add_bullet(doc, "The local prototype's SVG frames are newly drawn placeholders. They are not copied from Fred's character files and are not AI generations.")

    add_heading(doc, "UI direction", 2)
    add_body(doc, "The Shop Floor Agent screenshot shows Rayvin's useful “open a demo and try it now” pattern: a clear client label, short explanation, and one prominent interaction. The second screenshot suggests a playful orange/yellow cartoon mood. This UI combines that easy-to-try flow with an off-white canvas, ink outlines, coral/yellow/sky accents, and a storyboard grid.")
    add_body(doc, "Rayvin's portfolio and the Shop Floor Agent repository show a workflow-first approach: make a web UI for immediate use, keep n8n behind it, ground answers in structured data, and document the workflow. The same pattern fits this demo.", after=0)

    # Page 4: architecture and current n8n state
    doc.add_page_break()
    add_heading(doc, "3. First prototype architecture", 1)
    add_body(doc, "The UI sends one script request to n8n. n8n validates it, asks a text model to plan the scenes, calls the image model once per capped scene, and returns a single scene array for the UI to display.")
    add_flow_table(doc)
    add_heading(doc, "Proposed n8n nodes", 2)
    build_table(
        doc,
        ["Stage", "Node / responsibility"],
        [
            ("Input", "Webhook POST receives script, scene limit, aspect ratio."),
            ("Guardrail", "Code validates required text, input length, and maximum scene count."),
            ("Scene planning", "AI Agent with a text-capable Vercel AI Gateway Chat Model returns structured beats and image prompts."),
            ("Validation", "Code parses the JSON, checks scene fields, and emits no more than the selected count."),
            ("Image generation", "HTTP Request to Vercel's image-only endpoint; one prompt per scene, using the existing Gateway credential where n8n allows."),
            ("Response", "Code assembles scene metadata, image data, partial errors, and a job ID into the webhook response."),
            ("Failure handling", "A same-workflow error route normalizes provider errors for the UI. Rayvin chose this pattern."),
        ],
        [1.4, 5.4],
        font_size=8.9,
    )
    add_callout(
        doc,
        "CURRENT DRAFT NEEDS ONE MODEL-PORT CORRECTION",
        "The inactive n8n draft currently attaches openai/gpt-image-2.5-flare to a node typed as Vercel AI Gateway Chat Model. That node is a chat model port. Flare is image-only, so use a text model on the Agent and invoke Flare through the image-generation route.",
        fill=BLUE,
        accent="3C7291",
    )
    add_body(doc, "Keep the workflow inactive until the user manually verifies the credential, CORS/auth setup, image response shape, and a one-image cost.", after=0)

    # Page 5: feedback and reliability
    doc.add_page_break()
    add_heading(doc, "4. Feedback, delivery, and reliability", 1)
    add_heading(doc, "Feedback is retrieval, not automatic training", 2)
    add_body(doc, "A thumbs-up/down and a short comment are useful if stored with the exact scene prompt, style version, model, and any edit request. Later, retrieve a few approved examples for similar scenes and use their prompt patterns as context. This is feedback-guided retrieval; the model weights do not update after each comment.")
    build_table(
        doc,
        ["Prototype", "Next iteration", "Production-ready"],
        [
            ("Browser localStorage for ratings and notes; local export only.", "n8n Data Table or Postgres/Supabase for shared feedback.", "Search approved examples by scene type/style; retain prompt versions and audit history."),
            ("Local frame downloads and JSON scene-plan export.", "Google Drive folder export for editors.", "Job records, durable image objects, idempotent retry, resumable batches."),
            ("Visible success/error state in the UI.", "Choose an external success/failure notification channel.", "Async job IDs, polling, rate limits, spend caps, authenticated webhooks."),
        ],
        [2.05, 2.35, 2.4],
        font_size=8.4,
    )
    add_heading(doc, "Spend and safety controls", 2)
    add_bullet(doc, "Default to 1–3 images per first run. Do not include an automatic re-generation loop.")
    add_bullet(doc, "Generate one image, read the Vercel usage record, and only then increase the scene cap.")
    add_bullet(doc, "The model listing currently shows $5 per 1M input tokens and $30 per 1M output tokens. It is token-priced rather than a fixed per-image quote; resolution, image output, and references affect spend.")
    add_bullet(doc, "For public deployment, authenticate the webhook, restrict CORS to the UI domain, keep credentials server-side, and set a spend limit. Never put API keys in front-end code.")
    add_bullet(doc, "For the health script, keep narration facts and caveats unchanged; use neutral visual metaphors and no diagnostic text.")
    add_callout(
        doc,
        "ERROR AND COMPLETION BEHAVIOR",
        "Rayvin selected an error branch inside the same workflow. The first UI should show the completed state itself. External notification (Telegram, email, or another channel) can be chosen after Fred confirms where the editors want the alert.",
        fill=GREEN,
        accent="4B8250",
    )

    # Page 6: phases, estimate, sources
    doc.add_page_break()
    add_heading(doc, "5. Phased build and estimate", 1)
    build_table(
        doc,
        ["Phase", "Outcome", "Exit check"],
        [
            ("1. Prototype", "Cartoon storyboard UI; script entry; small scene plan; capped image pass; downloads; local review controls.", "One scene returns from n8n and is manually reviewed; no unexpected spend."),
            ("2. Useful demo", "Real previews, per-scene retry, shared feedback, Google Drive delivery, success/failure notification.", "Fred/editor can review and retrieve one complete batch."),
            ("3. Production", "Async jobs, auth/CORS, persistent status, spend guardrails, retry policy, monitoring, RAG over approved examples, runbook.", "Partial failures are recoverable and the process is documented."),
        ],
        [1.25, 3.25, 2.3],
        font_size=8.6,
    )
    add_heading(doc, "Time estimate for Fred", 2)
    add_callout(
        doc,
        "QUOTE-READY ESTIMATE",
        "“For a focused demo, I estimate 2–3 working days once the reference files and image provider are accessible: a small web UI, script-to-scene planning, up to three generated frames, downloads, and a review step. A polished team-ready version with Drive delivery, persistent feedback, retries, notifications, and deployment hardening would likely take another 3–5 working days.”",
        fill=PALE,
    )
    add_body(doc, "Estimate assumes the current Vercel AI Gateway credential can be used for the image endpoint, the Drive assets remain accessible, and the first demo needs only one output style and one aspect ratio. Provider, account, file permissions, and editorial feedback can shift the schedule.", after=5)
    add_heading(doc, "Open decisions after the prototype", 2)
    add_bullet(doc, "Which one character is the primary anchor for the body-glitch video?")
    add_bullet(doc, "Does Fred expect one background per script section, or several visual beats within each section?")
    add_bullet(doc, "Where should final images live: an existing Google Drive folder, Supabase Storage, or another team location?")
    add_bullet(doc, "Which channel should receive completion/failure alerts? The first prototype can rely on its visible UI status.")

    add_heading(doc, "Sources checked", 2)
    add_source(doc, "EverythingProfessor", "https://www.youtube.com/@EverythingProfessor")
    add_source(doc, "Professor Historian", "https://www.youtube.com/@TheHistorianProfessor")
    add_source(doc, "WildlifeProfessor", "https://www.youtube.com/@WildlifeProfessor")
    add_source(doc, "EverythingProfessor Compilations", "https://www.youtube.com/@EverythingProfessorComps")
    add_source(doc, "Sample video", "https://drive.google.com/file/d/1eRmvxfh5Ju4cOmTdWt4FSQCsohyM4ISW/view?usp=sharing")
    add_source(doc, "Script / voiceover folder", "https://drive.google.com/drive/u/1/folders/1q_BkGppDA4k189FXZxXewRWi9yJF_r4H")
    add_source(doc, "Character / style folder", "https://drive.google.com/drive/folders/1KLTxXSsptR9OguL30DCBLX72GX2rtUBo?usp=sharing")
    add_source(doc, "Portfolio and Shop Floor Agent", "https://rayvingianan.r4yv.tech/", "Repo: github.com/rayvin04/shop-floor-ai-rayvin-gianan")
    add_source(doc, "Vercel model listing and routing docs", "https://vercel.com/ai-gateway/models/gpt-image-2.5-flare", "Image endpoint: vercel.com/docs/ai-gateway/modalities/image-generation/openai")

    doc.core_properties.title = "Fred's Script-to-Storyboard Demo — Reference Analysis"
    doc.core_properties.subject = "Reference analysis, architecture, and phased build estimate"
    doc.core_properties.author = "Rayvin Gianan"
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build_report()
