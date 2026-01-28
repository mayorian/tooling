/**
 * apptool.js — Prompt Validator (robust init + null-safe bindings)
 * - Highlights appear in the PREVIEW panel (textarea can't highlight inside itself).
 * - Fill ERROR / WARN / WARNBIT arrays with words/phrases to detect.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Leave these empty — you will fill them:
  const ERROR = [];
  const WARN = [];
  const WARNBIT = [];

  // ---------- Required DOM ids ----------
  const IDS = {
    input: "promptInput",
    charCount: "charCount",
    wordCount: "wordCount",
    tokenEstimate: "tokenEstimate",
    preview: "preview",
    log: "log",
    btnValidate: "btnValidate",
    btnCopy: "btnCopy",
    btnClear: "btnClear",
    toast: "toast",
  };

  // ---------- Get DOM safely ----------
  const el = {};
  const missing = [];

  for (const [key, id] of Object.entries(IDS)) {
    el[key] = document.getElementById(id);
    if (!el[key]) missing.push(id);
  }

  if (missing.length) {
    console.error("Prompt Validator: Missing element id(s):", missing);
    console.error("Fix your index.html to include these exact ids.");
    // Don't crash — just show a visible hint if possible
    if (document.body) {
      const msg = document.createElement("div");
      msg.style.cssText =
        "max-width:900px;margin:20px auto;padding:12px 14px;border:1px solid #f55;border-radius:12px;background:rgba(255,0,0,.08);color:#fff;font-family:system-ui";
      msg.innerHTML =
        "<strong>Prompt Validator cannot start.</strong><br/>Missing element id(s): " +
        missing.map((x) => `<code>${escapeHtml(x)}</code>`).join(", ");
      document.body.prepend(msg);
    }
    return;
  }

  // ---------- Toast ----------
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), 1200);
  }

  // ---------- Helpers ----------
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeSpaces(s) {
    return String(s).replace(/\s+/g, " ").trim();
  }

  function getWordList(text) {
    const m = String(text).match(/[A-Za-z0-9]+(?:[’'\-][A-Za-z0-9]+)*/g);
    return m ? m : [];
  }

  function estimateTokens(text) {
    const chars = String(text).length;
    return Math.max(0, Math.round(chars / 4));
  }

  function buildPatterns(list) {
    return (Array.isArray(list) ? list : [])
      .filter(Boolean)
      .map((x) => normalizeSpaces(x))
      .filter((x) => x.length > 0)
      .map((raw) => {
        const escaped = escapeRegex(raw);
        const isSingleWord = !/\s/.test(raw);
        const pattern = isSingleWord
          ? `\\b${escaped}\\b`
          : escaped.replace(/\s+/g, "\\s+");
        return { raw, regex: new RegExp(pattern, "gi") };
      });
  }

  function countMatches(text, patterns) {
    const counts = new Map();
    for (const p of patterns) {
      const m = String(text).match(p.regex);
      counts.set(p.raw, m ? m.length : 0);
    }
    return counts;
  }

  function topRepeatedWords(words) {
    const stop = new Set([
      "the","a","an","and","or","but","to","of","in","on","for","with","is","are","was","were",
      "be","as","at","by","it","this","that","these","those","i","you","we","they","he","she",
      "them","us","our","your","my","me","from","not","do","does","did"
    ]);
    const freq = new Map();
    for (const w of words) {
      const lw = w.toLowerCase();
      if (lw.length < 3) continue;
      if (stop.has(lw)) continue;
      freq.set(lw, (freq.get(lw) || 0) + 1);
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }

  function longestWord(words) {
    let best = "";
    for (const w of words) if (w.length > best.length) best = w;
    return best;
  }

  function highlightPreview(text, groups) {
    let html = escapeHtml(text);

    // Priority so ERROR wins visually
    const priority = ["ERROR", "WARN", "WARNBIT"];
    for (const level of priority) {
      for (const p of groups[level].patterns) {
        html = html.replace(p.regex, (match) => {
          const cls =
            level === "ERROR" ? "err" : level === "WARN" ? "warn" : "warnbit";
          return `<mark class="${cls}" title="${level}">${match}</mark>`;
        });
      }
    }
    return html || "";
  }

  // ---------- Live counts ----------
  function updateLiveCounts() {
    const text = el.input.value || "";
    const words = getWordList(text);

    el.charCount.textContent = String(text.length);
    el.wordCount.textContent = String(words.length);
    el.tokenEstimate.textContent = String(estimateTokens(text));
  }

  // ---------- Validate ----------
  function validate() {
    const text = el.input.value || "";

    if (!text.trim()) {
      el.preview.textContent = "";
      el.log.innerHTML =
        'Nothing to validate yet. Paste a prompt above and click <strong>Validate</strong>.';
      return;
    }

    const groups = {
      ERROR: { patterns: buildPatterns(ERROR) },
      WARN: { patterns: buildPatterns(WARN) },
      WARNBIT: { patterns: buildPatterns(WARNBIT) },
    };

    const counts = {
      ERROR: countMatches(text, groups.ERROR.patterns),
      WARN: countMatches(text, groups.WARN.patterns),
      WARNBIT: countMatches(text, groups.WARNBIT.patterns),
    };

    const totalByGroup = {
      ERROR: [...counts.ERROR.values()].reduce((a, b) => a + b, 0),
      WARN: [...counts.WARN.values()].reduce((a, b) => a + b, 0),
      WARNBIT: [...counts.WARNBIT.values()].reduce((a, b) => a + b, 0),
    };
    const grandTotal =
      totalByGroup.ERROR + totalByGroup.WARN + totalByGroup.WARNBIT;

    // Preview highlight
    el.preview.innerHTML = highlightPreview(text, groups);

    // Extra stats
    const words = getWordList(text);
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
    const readingTimeSec = Math.max(1, Math.round((words.length / 200) * 60));
    const top3 = topRepeatedWords(words);
    const longest = longestWord(words);

    const makeList = (map, label) => {
      const items = [...map.entries()].filter(([, c]) => c > 0);
      if (items.length === 0)
        return `<div><strong>${label}:</strong> <span class="ok">none</span></div>`;

      const colorName =
        label === "ERROR" ? "red" : label === "WARN" ? "orange" : "yellow";

      return `
        <div><strong>${label}:</strong> found <strong>${
        items.reduce((s, [, c]) => s + c, 0)
      }</strong> match(es) (${colorName})</div>
        <ul>
          ${items
            .sort((a, b) => b[1] - a[1])
            .map(
              ([term, c]) =>
                `<li><strong>${escapeHtml(term)}</strong> — ${c}×</li>`
            )
            .join("")}
        </ul>
      `;
    };

    const top3Html = top3.length
      ? `<ul>${top3
          .map(([w, c]) => `<li><strong>${escapeHtml(w)}</strong> — ${c}×</li>`)
          .join("")}</ul>`
      : `<div><span class="ok">No repeated keywords detected</span> (excluding common words).</div>`;

    el.log.innerHTML = `
      <div>
        Detected <strong>${grandTotal}</strong> flagged item(s) in total.
        ${grandTotal === 0 ? ` <span class="ok">Looks clean.</span>` : ``}
      </div>
      <div style="margin-top:10px; display:grid; gap:10px;">
        <div>${makeList(counts.ERROR, "ERROR")}</div>
        <div>${makeList(counts.WARN, "WARN")}</div>
        <div>${makeList(counts.WARNBIT, "WARNBIT")}</div>
      </div>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:14px 0;" />

      <div><strong>Extra stats (for humans):</strong></div>
      <ul>
        <li>Unique words: <strong>${uniqueWords}</strong></li>
        <li>Estimated reading time: <strong>${readingTimeSec}s</strong></li>
        <li>Longest word: <strong>${escapeHtml(longest || "—")}</strong></li>
        <li>Top repeated keywords:</li>
      </ul>
      <div style="margin-left:18px">${top3Html}</div>
    `;
  }

  // ---------- Buttons ----------
  el.btnValidate.addEventListener("click", validate);

  el.btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el.input.value || "");
      showToast("Copied to clipboard ✅");
    } catch {
      // fallback
      el.input.focus();
      el.input.select();
      document.execCommand("copy");
      showToast("Copied (fallback) ✅");
    }
  });

  el.btnClear.addEventListener("click", () => {
    el.input.value = "";
    updateLiveCounts();
    el.preview.textContent = "";
    el.log.textContent = "Click Validate to see results.";
    showToast("Cleared 🧼");
  });

  el.input.addEventListener("input", updateLiveCounts);

  // Init
  updateLiveCounts();
  el.preview.textContent = "";
  el.log.textContent = "Click Validate to see results.";
});
