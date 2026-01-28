/**
 * Prompt Validator
 * - Fill these arrays with words/phrases you want to detect.
 * - Matching is case-insensitive.
 * - For single words we use word boundaries (safer).
 * - For multi-word phrases we match the phrase as-is (with flexible whitespace).
 */

// ✅ Leave these empty - you will fill them:
const ERROR = [];
const WARN = [];
const WARNBIT = [];

// ----------------------------
// DOM
// ----------------------------
const elInput = document.getElementById("promptInput");
const elCharCount = document.getElementById("charCount");
const elWordCount = document.getElementById("wordCount");
const elTokenEstimate = document.getElementById("tokenEstimate");
const elPreview = document.getElementById("preview");
const elLog = document.getElementById("log");

const btnValidate = document.getElementById("btnValidate");
const btnCopy = document.getElementById("btnCopy");
const btnClear = document.getElementById("btnClear");

const elToast = document.getElementById("toast");

// ----------------------------
// Helpers
// ----------------------------
function showToast(message) {
  elToast.textContent = message;
  elToast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => elToast.classList.remove("show"), 1200);
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

function getWordList(text) {
  // A practical word splitter: letters/numbers with internal ' or -
  const matches = text.match(/[A-Za-z0-9]+(?:[’'\-][A-Za-z0-9]+)*/g);
  return matches ? matches : [];
}

function estimateTokens(text) {
  // Rough estimate many people use: ~4 chars per token in English
  // (works decently for quick stats)
  const chars = text.length;
  return Math.max(0, Math.round(chars / 4));
}

function buildPatterns(list) {
  // Returns array of { raw, regex } objects
  return list
    .filter(Boolean)
    .map(x => normalizeSpaces(String(x)))
    .filter(x => x.length > 0)
    .map(raw => {
      const escaped = escapeRegex(raw);

      // If it's a single "word-ish" entry, use word boundaries.
      // Otherwise treat as phrase and allow flexible whitespace.
      const isSingleWord = !/\s/.test(raw);

      const pattern = isSingleWord
        ? `\\b${escaped}\\b`
        : escaped.replace(/\s+/g, "\\s+");

      return {
        raw,
        regex: new RegExp(pattern, "gi"),
      };
    });
}

function countMatches(text, patterns) {
  // returns map raw -> count
  const counts = new Map();
  for (const p of patterns) {
    const m = text.match(p.regex);
    counts.set(p.raw, m ? m.length : 0);
  }
  return counts;
}

function topRepeatedWords(words) {
  // tiny "interesting stat": top repeated words excluding basic stopwords
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

  const sorted = [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 3);
  return sorted;
}

function longestWord(words) {
  let best = "";
  for (const w of words) {
    if (w.length > best.length) best = w;
  }
  return best;
}

// Highlight using a safe approach:
// 1) Escape HTML
// 2) Apply replacements on the escaped text
//    (works well for preview; textarea remains plain)
function highlightPreview(text, groups) {
  let html = escapeHtml(text);

  // Apply in priority order to reduce "lower severity overrides higher severity"
  // We still can get nested marking if overlapping phrases exist.
  // If you want strict non-overlap later, we can upgrade to a range-based highlighter.
  const priority = ["ERROR", "WARN", "WARNBIT"];

  for (const level of priority) {
    for (const p of groups[level].patterns) {
      // We run regex over the unescaped text, but replace in escaped HTML:
      // To keep it consistent, we build a regex that matches the escaped version too.
      // Easiest practical approach: run on escaped HTML with same regex,
      // since escaping doesn't change letters/spaces.
      html = html.replace(p.regex, (match) => {
        const cls = level === "ERROR" ? "err" : level === "WARN" ? "warn" : "warnbit";
        return `<mark class="${cls}" title="${level}">${match}</mark>`;
      });
    }
  }

  return html.length ? html : "";
}

function updateLiveCounts() {
  const text = elInput.value || "";
  const chars = text.length;
  const words = getWordList(text).length;
  const tokens = estimateTokens(text);

  elCharCount.textContent = String(chars);
  elWordCount.textContent = String(words);
  elTokenEstimate.textContent = String(tokens);
}

// ----------------------------
// Validate action
// ----------------------------
function validate() {
  const text = elInput.value || "";

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

  // Totals
  const totalByGroup = {
    ERROR: [...counts.ERROR.values()].reduce((a,b)=>a+b, 0),
    WARN: [...counts.WARN.values()].reduce((a,b)=>a+b, 0),
    WARNBIT: [...counts.WARNBIT.values()].reduce((a,b)=>a+b, 0),
  };
  const grandTotal = totalByGroup.ERROR + totalByGroup.WARN + totalByGroup.WARNBIT;

  // Preview highlight
  elPreview.innerHTML = highlightPreview(text, groups);

  // Interesting stats
  const words = getWordList(text);
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const readingTimeSec = Math.max(1, Math.round((words.length / 200) * 60)); // 200 wpm
  const top3 = topRepeatedWords(words);
  const longest = longestWord(words);

  // Build log
  if (!text.trim()) {
    elLog.innerHTML = `Nothing to validate yet. Paste a prompt above and click <strong>Validate</strong>.`;
    return;
  }

  const makeList = (map, label) => {
    const items = [...map.entries()].filter(([,c]) => c > 0);
    if (items.length === 0) return `<div><strong>${label}:</strong> <span class="ok">none</span></div>`;

    const cls = label === "ERROR" ? "err" : label === "WARN" ? "warn" : "warnbit";
    const colorName = label === "ERROR" ? "red" : label === "WARN" ? "orange" : "yellow";

    return `
      <div><strong>${label}:</strong> found <strong>${items.reduce((s,[,c])=>s+c,0)}</strong> match(es) (${colorName})</div>
      <ul>
        ${items
          .sort((a,b)=>b[1]-a[1])
          .map(([term,c]) => `<li><strong>${escapeHtml(term)}</strong> — ${c}×</li>`)
          .join("")}
      </ul>
    `;
  };

  const top3Html = top3.length
    ? `<ul>${top3.map(([w,c]) => `<li><strong>${escapeHtml(w)}</strong> — ${c}×</li>`).join("")}</ul>`
    : `<div><span class="ok">No repeated keywords detected</span> (excluding common words).</div>`;

  elLog.innerHTML = `
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

// ----------------------------
// Button actions
// ----------------------------
btnValidate.addEventListener("click", validate);

btnCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(elInput.value || "");
    showToast("Copied to clipboard ✅");
  } catch {
    // Fallback
    elInput.select();
    document.execCommand("copy");
    showToast("Copied (fallback) ✅");
  }
});

btnClear.addEventListener("click", () => {
  elInput.value = "";
  updateLiveCounts();
  elPreview.textContent = "";
  elLog.textContent = "Click Validate to see results.";
  showToast("Cleared 🧼");
});

// Live stats
elInput.addEventListener("input", updateLiveCounts);

// Init
updateLiveCounts();
elPreview.textContent = "";
