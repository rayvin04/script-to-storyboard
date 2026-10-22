# Workflow Architecture

The live demo uses two connected n8n workflows. The browser sends the complete script to the generation workflow first. It then asks for each selected background separately and sequentially.

## Workflow A Storyboard and Background Generation

1. Validate the full script and derive the working title from its first non-empty line.
2. Read planner context and relevant approved storyboard examples from Google Sheets.
3. Use the text model to create the complete storyboard CSV and up to six distinct background descriptions.
4. Request one full-frame background image per description from the configured image model.
5. Call the delivery workflow for each generated image so the PNG is stored in Google Drive.
6. Return the complete storyboard, generated images, and Drive links to the web interface.

## Workflow B Drive Delivery and Notifications

The generation workflow calls this workflow to upload each PNG and return its Drive file link. The UI also uses the delivery workflow when the operator selects Notify editing team. That action uploads the storyboard CSV to the same output folder, appends a process record to the Process Log sheet, and sends an email to the configured recipient.

## Services

- n8n runs the workflow logic and JavaScript transformation nodes.
- OpenAI GPT-5 mini through Vercel AI Gateway plans the storyboard.
- OpenAI GPT Image 2.5 Flare through OpenRouter generates the backgrounds.
- Google Sheets provides examples, planner context, settings, and process logging.
- Google Drive stores approved reference images and generated assets.
- Gmail sends the handoff email.
- Vercel hosts the web interface.

## Request behavior

The storyboard is requested once. Background requests are issued one at a time with separate timeouts. The browser does not automatically retry timed-out image requests, to avoid accidental duplicate generation. If the page reports a timeout or server error, inspect the matching n8n execution before submitting the same script again.
