(() => {
  const base = "https://n8n-rayv-742595626609.herokuapp.com/webhook";
  const routes = {
    plan: `${base}/fred-storyboard-plan-v4`,
    generate: `${base}/fred-storyboard-generate-v4`,
    status: `${base}/fred-storyboard-status-v4`,
    csv: `${base}/fred-storyboard-csv-v4`,
  };

  async function requestJson(url, options = {}, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, cache: "no-store", signal: controller.signal });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error(`n8n returned unreadable data (HTTP ${response.status}).`); }
      if (!response.ok || data.ok === false) {
        const message = typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(message || `Workflow request failed (HTTP ${response.status}).`);
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("The workflow did not respond in time. Check its execution in n8n before submitting again.");
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function post(url, body) {
    return requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(body),
    });
  }

  async function download(url, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const text = await response.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        throw new Error(data.error || `Download failed (HTTP ${response.status}).`);
      }
      return response.blob();
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("The download timed out. Check the n8n execution and try again.");
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.storyboardWorkflow = {
    plan(script, title) { return post(routes.plan, { script, title }); },
    generate(jobId, backgroundIds) { return post(routes.generate, { jobId, backgroundIds }); },
    status(jobId) { return requestJson(`${routes.status}?jobId=${encodeURIComponent(jobId)}`); },
    downloadCsv(jobId) { return download(`${routes.csv}?jobId=${encodeURIComponent(jobId)}`); },
    downloadImage(url) { return download(url); },
  };
})();
