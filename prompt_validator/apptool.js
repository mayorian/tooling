document.addEventListener("DOMContentLoaded", () => {

  // ===== YOUR ARRAYS =====
  const ERROR = [];
  const WARN = [];
  const WARNBIT = [];

  // ===== DOM =====
  const elInput = document.getElementById("promptInput");
  const elCharCount = document.getElementById("charCount");
  const elWordCount = document.getElementById("wordCount");
  const elTokenEstimate = document.getElementById("tokenEstimate");
  const elPreview = document.getElementById("preview");
  const elLog = document.getElementById("log");

  const btnValidate = document.getElementById("btnValidate");
  const btnCopy = document.getElementById("btnCopy");
  const btnClear = document.getElementById("btnClear");

  // 🔴 SAFETY CHECK (optional but useful)
  if (!btnValidate || !btnCopy || !btnClear) {
    console.error("One or more buttons not found in DOM");
    return;
  }

  // ===== EVENT LISTENERS =====
  btnValidate.addEventListener("click", validate);
  btnCopy.addEventListener("click", copyText);
  btnClear.addEventListener("click", clearAll);

  elInput.addEventListener("input", updateLiveCounts);

  // ===== FUNCTIONS =====
  function updateLiveCounts() {
    const text = elInput.value || "";
    elCharCount.textContent = text.length;
    elWordCount.textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
    elTokenEstimate.textContent = Math.round(text.length / 4);
  }

  function validate() {
    // validation logic
  }

  function copyText() {
    navigator.clipboard.writeText(elInput.value || "");
  }

  function clearAll() {
    elInput.value = "";
    elPreview.textContent = "";
    elLog.textContent = "";
    updateLiveCounts();
  }

  updateLiveCounts();
});
