(() => {
  const base = "https://n8n.47-131-239-128.sslip.io/webhook";
  const generateRoute = base + "/fred-image-generation-stage-1";
  const backgroundRoute = base + "/fred-generate-background";
  const driveUploadRoute = base + "/fred-save-background-to-drive";
  // Planning should finish quickly; each image gets its own bounded request.
  const PLAN_TIMEOUT_MS = 180000;
  const IMAGE_TIMEOUT_MS = 360000;

  async function postJson(route, body, timeoutMs = PLAN_TIMEOUT_MS) {
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
        const isRateLimited = /quota exceeded|too many requests|rate_limit_exceeded|http 429/i.test(String(message || "")) || response.status === 429;
        if (isRateLimited) {
          message = route === backgroundRoute
            ? "OpenRouter rate-limited image generation. The batch stopped here; wait before starting another image request."
            : "Fred's reference sheets hit Google's read limit. Wait about a minute, then submit the script again. No image requests were sent.";
        }
        const requestError = new Error(message || "Workflow request failed (HTTP " + response.status + ").");
        if (isRateLimited && route === backgroundRoute) requestError.stopBatch = true;
        throw requestError;
      }
      return data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        const timeoutError = new Error("The n8n request did not return within " + Math.ceil(timeoutMs / 60000) + " minute(s). No automatic retry was sent; check the matching execution before retrying because image generation may still finish.");
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
      return postJson(generateRoute, { title, script, mode: "planOnly" }, PLAN_TIMEOUT_MS);
    },
    generateBackground(payload) {
      return postJson(backgroundRoute, { ...payload, mode: "single" }, IMAGE_TIMEOUT_MS);
    },
    saveBackground(payload) {
      return postJson(driveUploadRoute, payload, 180000);
    }
  };
})();
