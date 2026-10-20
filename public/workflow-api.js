(() => {
  const base = "https://n8n-rayv-742595626609.herokuapp.com/webhook/script-to-storyboard";

  async function request(suffix, options = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(base + suffix, { ...options, signal: controller.signal, cache: "no-store" });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error("n8n returned an unreadable response (HTTP " + response.status + "). Your saved batch can be recovered when the host is available."); }
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : data.error?.message || "Workflow request failed (HTTP " + response.status + ").");
      return data;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function post(suffix, body) {
    return request(suffix, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) });
  }

  async function file(suffix) {
    const response = await fetch(base + suffix, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "The workflow could not return this file (HTTP " + response.status + ").");
    }
    return response.blob();
  }

  window.storyboardWorkflow = {
    ready: () => request("-status?requestId=__capability_probe__"),
    start: (script, maxScenes, requestId) => post("", { script, maxScenes, requestId, aspectRatio: "16:9" }),
    status: requestId => request("-status?requestId=" + encodeURIComponent(requestId)),
    review: data => post("-feedback", data),
    csv: requestId => file("-csv?requestId=" + encodeURIComponent(requestId)),
    image: (requestId, sceneId) => file("-image?requestId=" + encodeURIComponent(requestId) + "&sceneId=" + encodeURIComponent(sceneId)),
  };
})();
