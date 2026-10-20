(() => {
  const base = "https://n8n-rayv-742595626609.herokuapp.com/webhook";
  // One Generate click always plans first, then calls this same workflow once
  // per background. The action field marks the internal pipeline stage only.
  const route = base + "/fred-image-generation-stage-1";
  const PLAN_TIMEOUT_MS = 300000;
  const IMAGE_TIMEOUT_MS = 180000;

  async function postJson(url, body, timeoutMs) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
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
          const error = new Error("n8n returned an HTML/server error (HTTP " + response.status + "). Wait for the host to recover, then check the matching execution before retrying.");
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
        const timeoutError = new Error("The workflow timed out after " + Math.round(timeoutMs / 1000) + " seconds. No automatic retry was sent, to avoid duplicate image charges. Check the n8n execution before retrying.");
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
    plan(script) {
      return postJson(route, { action: "plan", script }, PLAN_TIMEOUT_MS);
    },
    generateBackground(background) {
      return postJson(route, {
        action: "image",
        background: background.backgroundPrompt || background.background,
        backgroundId: background.backgroundId,
        sceneNumbers: background.sceneNumbers || []
      }, IMAGE_TIMEOUT_MS);
    }
  };
})();
