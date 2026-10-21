# Current Workflow Architecture

The UI makes one planning call for the complete script. It receives the complete storyboard CSV and up to six selected background descriptions. It then makes one image-generation request at a time, preserving the scene/background identity for each response. The delivery workflow saves each PNG to Drive and returns the image data plus Drive link for display.

## Separate workflow stages

1. **Storyboard and image generation** — `QRPeaK5ayX9ZC5Zx`; the complete script is retained, CSV columns are fixed, and up to six unique backgrounds are selected.
2. **Delivery and feedback** — `KNBiOwM2a2SXvgK2`; handles background file upload, editor email, image feedback, storyboard CSV upload, and the process ledger.

## Browser request behavior

The browser sends JSON as `text/plain;charset=UTF-8` to avoid unnecessary CORS preflights. Planning and image requests have separate timeouts. It never automatically retries a timed-out image request, preventing duplicate generation charges. Image requests are sequential and individually bounded.

## Persistence

All reference examples, settings, process rows, and feedback rows live in the shared Google Sheets workbook. All generated files live in Google Drive. No n8n Data Tables or workflow memory are used for storage.

## Validation

The planner checks that voiceover tokens cover the full submitted script in order, preserves or estimates timestamps, and emits the exact eight-column CSV header. Background images are separate full-frame plates; no split layouts are allowed.
