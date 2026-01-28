// =========================================================
// Utilities
// =========================================================
function uniqLower(arr){
  const out = [];
  const seen = new Set();
  for (const x of arr){
    const s = String(x).trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegex(s){
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildChunkedPhraseRegexes(phrases, chunkSize){
  const cleaned = uniqLower(phrases).filter(p => p.length >= 2 && p.length <= 120);
  const out = [];
  for (let i = 0; i < cleaned.length; i += chunkSize){
    const chunk = cleaned.slice(i, i + chunkSize).map(escapeRegex).join("|");
    out.push(new RegExp(`(^|[^\\w])(?:${chunk})(?=$|[^\\w])`, "gmi"));
  }
  return out;
}

// =========================================================
// Phrase DB
// =========================================================
const POLITENESS = [ /* celý zoznam bez zmeny */ ];
const APOLOGY = [ /* celý zoznam bez zmeny */ ];
const TIME_SOFTENERS = [ /* celý zoznam bez zmeny */ ];
const INDIRECT_ASKS = [ /* celý zoznam bez zmeny */ ];
const HEDGES = [ /* celý zoznam bez zmeny */ ];
const MODALS = [ /* celý zoznam bez zmeny */ ];
const VAGUE_FILLER = [ /* celý zoznam bez zmeny */ ];

const BAD_BASE  = [...POLITENESS, ...APOLOGY, ...TIME_SOFTENERS];
const WARN_BASE = [...INDIRECT_ASKS, ...HEDGES, ...MODALS, ...VAGUE_FILLER];

const BAD_PATTERNS  = buildChunkedPhraseRegexes(BAD_BASE, 140);
const WARN_PATTERNS = buildChunkedPhraseRegexes(WARN_BASE, 140);

const EXTRA_EXPLICIT = [
  /\bso(?:\s*\.{2,}|…)/gi,
  /\bif\s+you\s+have\s+a\s+time\b/gi
];

// =========================================================
// DOM refs
// =========================================================
const input = document.getElementById("input");
const highlighted = document.getElementById("highlighted");
const btnValidate = document.getElementById("btnValidate");
const btnCopy = document.getElementById("btnCopy");
const btnClear = document.getElementById("btnClear");

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const matchText = document.getElementById("matchText");

const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const toastIcon = document.getElementById("toastIcon");

// =========================================================
// UI helpers
// =========================================================
function showToast(message, icon="✨"){
  toastIcon.textContent = icon;
  toastText.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1400);
}

function setStatus(kind, text){
  statusDot.className = "dot " + (kind || "");
  statusText.textContent = text;
}

function countWords(text){
  const t = String(text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function updateCounts(){
  const text = input.value || "";
  document.getElementById("countsText").textContent =
    `${text.length.toLocaleString()} chars • ${countWords(text).toLocaleString()} words`;
}

function syncScroll(){
  highlighted.scrollTop = input.scrollTop;
  highlighted.scrollLeft = input.scrollLeft;
}

// =========================================================
// Highlight logic (nezmenené)
// =========================================================
function findMatchesByRegexes(text, regexes, cls){
  const hits = [];
  for (const re of regexes){
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null){
      const boundary = m[1] || "";
      hits.push({
        start: m.index + boundary.length,
        end: m.index + m[0].length,
        cls
      });
    }
  }
  return hits;
}

function findAllMatches(text){
  const hits = [];
  hits.push(...findMatchesByRegexes(text, BAD_PATTERNS, "bad"));
  hits.push(...findMatchesByRegexes(text, WARN_PATTERNS, "warn"));

  for (const re of EXTRA_EXPLICIT){
    let m;
    while ((m = re.exec(text)) !== null){
      hits.push({ start: m.index, end: m.index + m[0].length, cls: "warn" });
    }
  }
  return hits;
}

function mergeHits(hits){
  hits.sort((a,b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const h of hits){
    const last = out[out.length - 1];
    if (!last || h.start >= last.end) out.push({...h});
    else last.end = Math.max(last.end, h.end);
  }
  return out;
}

function buildHighlightedHtml(text, spans){
  let html = "", cursor = 0;
  for (const s of spans){
    html += escapeHtml(text.slice(cursor, s.start));
    html += `<mark class="${s.cls}">${escapeHtml(text.slice(s.start, s.end))}</mark>`;
    cursor = s.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html || "&nbsp;";
}

function validate(){
  const text = input.value || "";
  const spans = mergeHits(findAllMatches(text));
  highlighted.innerHTML = buildHighlightedHtml(text, spans);

  const bad = spans.filter(s => s.cls === "bad").length;
  const warn = spans.filter(s => s.cls === "warn").length;

  matchText.textContent = `${spans.length} issues (${bad} strong, ${warn} mild)`;

  if (!text.trim()) setStatus("", "Paste a prompt to validate.");
  else if (!spans.length) setStatus("ok", "Looks tight and direct.");
  else if (bad) setStatus("bad", "Remove red highlights.");
  else setStatus("warn", "Tighten yellow highlights.");

  showToast("Validated", "✅");
}

// =========================================================
// Events
// =========================================================
btnValidate.onclick = validate;
btnClear.onclick = () => {
  input.value = "";
  highlighted.textContent = "";
  updateCounts();
  setStatus("", "Cleared.");
};

btnCopy.onclick = async () => {
  await navigator.clipboard.writeText(input.value || "");
  showToast("Copied", "📋");
};

input.addEventListener("input", () => {
  updateCounts();
  highlighted.textContent = input.value;
});

input.addEventListener("scroll", syncScroll);

// Init
updateCounts();
setStatus("", "Not validated yet.");
