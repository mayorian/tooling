document.addEventListener("DOMContentLoaded", () => {
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

  // Phrases with punctuation like "thanks," or "sorry!"
  // Boundary = start OR non-word char on left, and end OR non-word char on right
  // Left boundary is captured so we can compute correct "start" index for highlighting.
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
  // Phrase DB (full lists)
  // =========================================================
  const POLITENESS = [
    "hi", "hello", "dear", "lovely", "friend", "disturb",
    "maybe", "possible", "possibly", "if possible", "if at all possible", "might", "might be", "might work", "might help",
    "may", "may be", "may work", "may help", "perhaps", "maybe", "potentially", "conceivably",
    "likely", "probably", "presumably", "arguably", "more or less", "roughly", "approximately",
    "kind of", "sort of", "somewhat", "to some extent", "and so on", "and so forth", "etc.", "etcetera",
    "or something", "or whatever", "or anything like that",
    "please.","please","please!","pretty please","pretty please.","pretty please,",
    "kindly.","kindly,","kindly!","kindly please","kindly please.","kindly do","kindly do.",
    "if you would","if you would.","if you would,",
    "if you don’t mind","if you don't mind.","if you don't mind,",
    "if you wouldnt mind","if you wouldn't mind","if you wouldn't mind,",
    "if you could","if you could,","if you can,",
    "if it’s ok","if it's ok","if it's okay","if that’s okay","if that's okay",
    "if it’s alright","if it's alright","if that’s alright","if that's alright",
    "if that works","if that works for you","if that's fine","if thats fine",
    "thank you.","thank you,","thank you!","thank u","thx.","thx,","ty.","ty,",
    "thanks.","thanks,","thanks!","thanks a lot","thanks a ton","thanks so much",
    "thanks very much","thank you very much","thank you so much","many thanks!","many thanks,",
    "thanks in advance.","thanks in advance,",
    "much appreciated.","much appreciated!","much appreciated,",
    "greatly appreciated","greatly appreciated.","greatly appreciated,",
    "appreciate it.","appreciate it!","appreciate it,",
    "i appreciate it.","i appreciate it,","i really appreciate it",
    "i would appreciate it.","i would appreciate it,",
    "i'd appreciate it.","i'd appreciate it,",
    "i would really appreciate it","i’d really appreciate it",
    "really appreciate it","really appreciated","appreciated","appreciated.",
    "cheers.","cheers,","cheers!","cheers mate","cheers thanks",
    "many thanks in advance","many thanks in advance.","many thanks in advance,",
    "much obliged","much obliged.","much obliged,",
    "grateful","grateful.","grateful,","i’m grateful","im grateful","i am grateful",
    "i’d be grateful","i would be grateful","i would be grateful if",
    "would be appreciated","would be appreciated.","would be appreciated,",
    "thank you kindly","thank you kindly.","thank you kindly,",
    "with thanks","with thanks.","with thanks,",
    "thanks again","thanks again.","thanks again,",
    "thank you again","thank you again.","thank you again,",
    "appreciate your help","appreciate your help.","appreciate your help,",
    "thank you for your help","thank you for your help.","thank you for your help,",
    "thanks for your help","thanks for your help.","thanks for your help,",
    "thanks for helping","thanks for helping.","thanks for helping,",
    "much appreciated for this","much appreciated for this.","much appreciated for this,",
    "sorry, thanks","thanks & sorry","thanks and sorry", "sorry", "thank", "thanks","bother",
  ];

  const APOLOGY = [
    "sorry.","sorry,","sorry!","sorry about that","sorry about that.","sorry about that,",
    "sorry for that","sorry for that.","sorry for that,",
    "sorry for the trouble","sorry for the trouble.","sorry for the trouble,",
    "sorry for the inconvenience","sorry for the inconvenience.","sorry for the inconvenience,",
    "sorry for bothering","sorry for bothering.","sorry for bothering,",
    "sorry to ping","sorry to ping.","sorry to ping,",
    "sorry to bug you","sorry to bug you.","sorry to bug you,",
    "sorry to disturb","sorry to disturb.","sorry to disturb,",
    "apologies.","apologies,","apologies!","my apologies.","my apologies,","my apologies!",
    "i apologize.","i apologize,","i apologize!","i apologise.","i apologise,","i apologise!",
    "i am sorry.","i am sorry,","i am sorry!","i'm sorry.","i'm sorry,","i'm sorry!","im sorry.","im sorry,","im sorry!",
    "i am really sorry","i am so sorry","i am very sorry",
    "i'm really sorry","i'm so sorry","i'm very sorry",
    "im really sorry","im so sorry","im very sorry",
    "sorry to ask","sorry to ask.","sorry to ask,",
    "sorry to ask but","sorry to ask but,",
    "i'm sorry to ask","i'm sorry to ask.","i'm sorry to ask,",
    "i am sorry to ask","i am sorry to ask.","i am sorry to ask,",
    "i’m sorry to ask","i’m sorry to ask.","i’m sorry to ask,",
    "sorry for asking","sorry for asking.","sorry for asking,",
    "i hope it’s okay to ask","i hope it's okay to ask","hope it's ok to ask",
    "hope that's okay","hope thats okay","hope that’s okay",
    "i feel bad asking","i feel bad asking.","i feel bad asking,",
    "i hate to ask","i hate to ask.","i hate to ask,",
    "i hate to bother","i hate to bother.","i hate to bother,",
    "pardon the interruption","pardon the interruption.","pardon the interruption,",
    "excuse me","excuse me.","excuse me,",
    "excuse the interruption","excuse the interruption.","excuse the interruption,",
    "forgive me","forgive me.","forgive me,",
    "sorry for the ping","sorry for the ping.","sorry for the ping,",
    "sorry for the message","sorry for the message.","sorry for the message,",
    "apologies for the ping","apologies for the ping.","apologies for the ping,"
  ];

  const TIME_SOFTENERS = [
    "if you have some time","if you have any time","if you have a sec","if you have a second",
    "if you have a quick moment","if you have a spare minute","if you can spare a minute",
    "if you can spare a moment","if you can spare some time",
    "when you have a moment","when you have a minute","when you have a sec","when you have a second",
    "when you get a moment","when you get a minute","when you get a sec","when you get a second",
    "when you’re free","when you're free","when you are free",
    "if you’re free","if you're free","if you are free",
    "if you’re available","if you're available","if you are available",
    "if you have bandwidth","if you have capacity","if you have room",
    "whenever you have time","whenever you can","whenever possible",
    "at some point","at some point.","at some point,",
    "later if possible","today if possible","tomorrow if possible",
    "at your leisure","at your leisure.","at your leisure,",
    "when convenient","when convenient.","when convenient,",
    "whenever convenient","whenever convenient.","whenever convenient,",
    "if convenient","if convenient.","if convenient,",
    "if it is convenient","if it is convenient.","if it is convenient,",
    "as time permits","as time permits.","as time permits,",
    "at a convenient time","at a convenient time.","at a convenient time,",
    "at a time that suits you","at a time that suits you.","at a time that suits you,",
    "at your earliest opportunity","at your earliest opportunity.","at your earliest opportunity,",
    "at your earliest possible convenience","at your earliest possible convenience.",
    "at your convenience, please","at your convenience please",
    "no rush at all","no rush at all.","no rush at all,",
    "no pressure at all","no pressure at all.","no pressure at all,",
    "take your time.","take your time,","take your time!",
    "whenever you get a chance","whenever you get a chance.","whenever you get a chance,",
    "when you get a chance.","when you get a chance,",
    "if you find time","if you find time.","if you find time,",
    "if you get time","if you get time.","if you get time,",
    "whenever you have a moment","whenever you have a moment.","whenever you have a moment,",
    "when you have a chance","when you have a chance.","when you have a chance,",
    "at your convenience when possible","at your convenience when possible."
  ];

  const INDIRECT_ASKS = [
    "usual", "usually","to ask you", "I would like", "can","could","would","should","have the time", "have a time",
    "can you please","could you please","would you please","will you please",
    "can you kindly","could you kindly","would you kindly","will you kindly",
    "could you maybe","can you maybe","would you maybe",
    "could you possibly","can you possibly","would you possibly",
    "do you mind","do you mind?","do you mind if","do you mind if i",
    "would you mind","would you mind?","would you mind if","would you mind if you",
    "is there any chance","is there any chance you can","is there any chance you could",
    "any chance you might","any chance you would",
    "would it be possible for you to","would it be possible if you could",
    "is it possible for you to","is it possible you can","is it possible you could",
    "do you think you can","do you think you could","do you think you might",
    "i was wondering if you could","i was wondering if you can","i was wondering if you would",
    "i'm wondering if you could","im wondering if you could","i’m wondering if you could",
    "just wondering if you could","just checking if you could","just checking if",
    "i wanted to ask","i wanted to ask if","i want to ask","i want to ask if",
    "i’d like to know if","i'd like to know if",
    "could you help","could you help?","could you help me","could you help me with",
    "can you help","can you help?","can you help me","can you help me with",
    "would you be able to","are you able to"
  ];

  const HEDGES = [
    "maybe.","maybe,","perhaps.","perhaps,","possibly.","possibly,",
    "if possible.","if possible,","if at all possible","if at all possible.","if at all possible,",
    "as best you can","to the best of your ability",
    "try to","try and",
    "roughly.","approximately.","around","about","more or less.",
    "kind of.","sort of.","a bit.","just.","in general","generally",
    "i think","i guess","i suppose","probably","likely","hopefully",
    "if needed","if necessary","optionally"
  ];

  const MODALS = [
    "should.","should,","could.","could,","might.","might,","may.","may,",
    "you should","we should","it should",
    "you could","we could","it could",
    "you might","we might","it might",
    "it might be good to","it might be best to","it may be better to",
    "you might want to","you could try"
  ];

  const VAGUE_FILLER = [
    "something.","something","anything.","anything",
    "or something.","or something,","or whatever","etc.","and so on.",
    "and stuff","and things","you know","basically.","actually.",
    "whatever","things","stuff","and whatnot","some kind of","some sort of"
  ];

  // =========================================================
  // Classification
  // =========================================================
  const BAD_BASE  = [...POLITENESS, ...APOLOGY, ...TIME_SOFTENERS];
  const WARN_BASE = [...INDIRECT_ASKS, ...HEDGES, ...MODALS, ...VAGUE_FILLER];

  const BAD_PATTERNS  = buildChunkedPhraseRegexes(BAD_BASE, 140);
  const WARN_PATTERNS = buildChunkedPhraseRegexes(WARN_BASE, 140);

  const EXTRA_EXPLICIT = [
    /\bso(?:\s*\.{2,}|…)/gi,
    /\bif\s+you\s+have\s+a\s+time\b/gi
  ];

  // =========================================================
  // DOM
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

  if (!input || !highlighted || !btnValidate || !btnCopy || !btnClear) {
    console.error("Missing required DOM elements. Check IDs in HTML.");
    return;
  }

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
    const trimmed = String(text || "").trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function updateCounts(){
    const text = input.value || "";
    const chars = text.length;
    const words = countWords(text);
    const el = document.getElementById("countsText");
    if (el) el.textContent = `${chars.toLocaleString()} chars • ${words.toLocaleString()} words`;
  }

  function syncScroll(){
    highlighted.scrollTop = input.scrollTop;
    highlighted.scrollLeft = input.scrollLeft;
  }

  // =========================================================
  // Match finding
  // =========================================================
  function findMatchesByRegexes(text, regexes, cls){
    const hits = [];
    for (const re of regexes){
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null){
        const boundary = m[1] || "";
        const start = m.index + boundary.length;
        const end = m.index + m[0].length;
        hits.push({ start, end, cls });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    return hits;
  }

  function findAllMatches(text){
    const hits = [];
    hits.push(...findMatchesByRegexes(text, BAD_PATTERNS, "bad"));
    hits.push(...findMatchesByRegexes(text, WARN_PATTERNS, "warn"));

    for (const re of EXTRA_EXPLICIT){
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null){
        hits.push({ start: m.index, end: m.index + m[0].length, cls: "warn" });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }

    // heuristic: highlight '?' if requesty sentence
    const requesty = /\b(can|could|would|should|may|might)\s+you\b/i;
    const reQ = /[^.!?\n]*\?+/g;
    let qm;
    while ((qm = reQ.exec(text)) !== null) {
      const chunk = qm[0];
      if (requesty.test(chunk)) {
        const start = qm.index;
        for (let i = 0; i < chunk.length; i++) {
          if (chunk[i] === "?") hits.push({ start: start + i, end: start + i + 1, cls: "warn" });
        }
      }
    }

    return hits;
  }

  function mergeHits(hits){
    hits.sort((a,b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return b.end - a.end;
      if (a.cls === b.cls) return 0;
      return a.cls === "bad" ? -1 : 1;
    });

    const out = [];
    for (const h of hits){
      if (h.start < 0 || h.end <= h.start) continue;
      const last = out[out.length - 1];
      if (!last){ out.push({ ...h }); continue; }

      if (h.start >= last.end){
        out.push({ ...h });
        continue;
      }

      if (last.cls === h.cls){
        last.end = Math.max(last.end, h.end);
        continue;
      }

      const bad = (last.cls === "bad") ? last : h;
      const warn = (last.cls === "warn") ? last : h;

      if (warn.start < bad.start){
        warn.end = bad.start;
        if (warn.end > warn.start) out[out.length - 1] = warn;
        else out.pop();
        out.push({ ...bad });
      } else {
        out[out.length - 1] = { ...bad };
      }
    }

    const cleaned = [];
    for (const h of out){
      if (h.end <= h.start) continue;
      const last = cleaned[cleaned.length - 1];
      if (last && last.cls === h.cls && last.end === h.start) last.end = h.end;
      else cleaned.push(h);
    }
    return cleaned;
  }

  function buildHighlightedHtml(text, spans){
    if (!spans.length) return escapeHtml(text) || "&nbsp;";
    let html = "";
    let cursor = 0;
    for (const s of spans){
      const a = Math.max(0, s.start);
      const b = Math.min(text.length, s.end);
      if (a > cursor) html += escapeHtml(text.slice(cursor, a));
      html += `<mark class="${s.cls}">${escapeHtml(text.slice(a, b))}</mark>`;
      cursor = b;
    }
    if (cursor < text.length) html += escapeHtml(text.slice(cursor));
    return html || "&nbsp;";
  }

  // =========================================================
  // Render / Validate
  // =========================================================
  function renderPlain(){
    // dôležité: pri písaní musí byť text viditeľný (cez <pre>)
    const text = input.value || "";
    highlighted.textContent = text || "";
    if (!text) highlighted.innerHTML = "&nbsp;";
  }

  function validate(){
    const text = input.value || "";
    if (!text.trim()){
      highlighted.innerHTML = "&nbsp;";
      matchText.textContent = "0 issues";
      setStatus("", "Paste a prompt to validate.");
      return;
    }

    const spans = mergeHits(findAllMatches(text));
    highlighted.innerHTML = buildHighlightedHtml(text, spans);

    const badCount = spans.filter(s => s.cls === "bad").length;
    const warnCount = spans.filter(s => s.cls === "warn").length;
    const total = spans.length;

    matchText.textContent =
      `${total} issue${total === 1 ? "" : "s"} (${badCount} strong, ${warnCount} mild)`;

    if (total === 0) setStatus("ok", "Looks tight and direct.");
    else if (badCount > 0) setStatus("bad", "Remove red highlights for stronger prompts.");
    else setStatus("warn", "Tighten yellow highlights for more direct prompts.");

    showToast("Validated & highlighted", "✅");
  }

  // =========================================================
  // Events
  // =========================================================
  let validatedOnce = false;

  btnValidate.addEventListener("click", () => {
    validatedOnce = true;
    validate();
  });

  btnCopy.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(input.value || "");
      showToast("Copied to clipboard", "📋");
    }catch(e){
      input.focus(); input.select();
      document.execCommand("copy");
      showToast("Copied (fallback)", "📋");
    }
  });

  btnClear.addEventListener("click", () => {
    input.value = "";
    validatedOnce = false;
    updateCounts();
    highlighted.innerHTML = "&nbsp;";
    matchText.textContent = "0 issues";
    setStatus("", "Cleared.");
    showToast("Cleared", "🧹");
    input.focus();
  });

  input.addEventListener("input", () => {
    updateCounts();

    // vždy najprv ukáž plain text (aby si ho hneď videl)
    renderPlain();

    // ak už bolo validate aspoň raz, highlightuj live
    if (validatedOnce) validate();
  });

  input.addEventListener("scroll", syncScroll);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") btnClear.click();
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter"){
      validatedOnce = true;
      validate();
    }
  });

  // Init
  highlighted.innerHTML = "&nbsp;";
  updateCounts();
  setStatus("", "Not validated yet.");
});
