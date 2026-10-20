(() => {
  const endpoint = "https://n8n-rayv-742595626609.herokuapp.com/webhook/fred-image-generation-stage-1";

  async function generate(prompt) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ prompt }),
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error("n8n returned an unreadable response (HTTP " + response.status + ")."); }
      if (!response.ok || data.ok === false) {
        throw new Error(typeof data.error === "string" ? data.error : data.error?.message || "Image generation failed (HTTP " + response.status + ").");
      }
      if (typeof data.imageData !== "string" || !data.imageData.startsWith("data:image/")) {
        throw new Error("The workflow finished without returning a displayable image.");
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Image generation took longer than 90 seconds. Check the n8n execution before retrying.");
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.storyboardWorkflow = { generate };
})();

