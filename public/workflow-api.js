(() => {
  const base = "https://n8n.47-131-239-128.sslip.io/webhook";
  const generateRoute = base + "/fred-image-generation-stage-1";
  const driveUploadRoute = base + "/fred-save-background-to-drive";
  // Keep the UI request bounded and avoid duplicate image charges on retries.
  const REQUEST_TIMEOUT_MS = 900000;

  async function postJson(route, body, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(route, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (response.status >= 500) {
          const error = new Error("n8n returned an HTML/server error (HTTP " + response.status + "). The host may have timed out; check the matching execution before retrying.");
          error.stopBatch = true;
          throw error;
        }
        throw new Error("n8n returned unreadable data (HTTP " + response.status + ").");
      }
      if (!response.ok || data.ok === false) {
        let message = typeof data.error === "string" ? data.error : data.error && data.error.message;
        if (/quota exceeded|too many requests|rate_limit_exceeded|http 429/i.test(String(message || ""))) {
          message = "Fred's reference sheets hit Google's read limit. Wait about a minute, then submit the script again. No image requests were sent.";
        }
        const requestError = new Error(message || "Workflow request failed (HTTP " + response.status + ").");
        throw requestError;
      }
      return data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        const timeoutError = new Error("The webhook did not return within " + Math.ceil(timeoutMs / 60000) + " minute(s). No automatic retry was sent. Check n8n and Google Drive before retrying, because the upload may have completed.");
        timeoutError.stopBatch = true;
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        const connectionError = new Error("Could not reach the n8n webhook. The host may be unavailable or may have closed the request. No automatic retry was sent; check the matching n8n execution before resubmitting, since a slow request may still finish.");
        connectionError.stopBatch = true;
        throw connectionError;
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.storyboardWorkflow = {
    generate(title, script) {
      return postJson(generateRoute, { title, script });
    },
    saveBackground(payload) {
      return postJson(driveUploadRoute, payload, 180000);
    }
  };
})();
