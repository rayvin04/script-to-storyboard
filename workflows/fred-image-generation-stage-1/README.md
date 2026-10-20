# Earlier single-image export

This folder preserves the image-only version exported before the full-script storyboard planner was added. `workflow.json` and `workflow-before-script-planning.json` are historical snapshots, **not** the current published export. They show how one image generation call was verified.

The current workflow keeps this same n8n workflow ID, `QRPeaK5ayX9ZC5Zx`, but now has two actions on one webhook: one full script planning call, then up to 10 separate one-image calls. See [`../fred-script-to-backgrounds-simple/README.md`](../fred-script-to-backgrounds-simple/README.md) for the current design.

Do not import or activate these snapshots alongside the live workflow without changing the webhook path. Credentials are saved in n8n and are not embedded in these files.
