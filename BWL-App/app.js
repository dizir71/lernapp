/* BWL-App/app.js – Auto-Loader für alle JSONs im Verzeichnis
   – lädt alle *.json (außer manifest, sw, config)
   – bereinigt kaputte Fragen zur Laufzeit
   – Cache-Buster gegen Service-Worker-Altbestände
*/

const GITHUB_OWNER = "dizir71";
const GITHUB_REPO  = "lernapp";
const APP_DIR      = "BWL-App"; // Ordnername im Repo

const UI = {
  btnRefresh: document.getElementById("btn-refresh"),
  chkExternal: document.getElementById("chk-external"),
  modeLearn: document.getElementById("btn-learn"),
  modeExam:  document.getElementById("btn-exam"),
  question:  document.getElementById("question"),
  answers:   document.getElementById("answers"),
  title:     document.getElementById("app-title"),
};

const CACHE_BUSTER = () => `t=${Date.now()}`;

// ---- Service-Worker/Cache-Hard-Refresh ----
// In app.js hinzufügen oder ersetzen
async function hardUpdate() {
  try {
    // Service Worker Cache löschen
    if (window.caches) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }

    // Service Worker selbst deregistrieren
    if (navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // LocalStorage / SessionStorage leeren
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn("Hard update Fehler:", e);
  }

  // Seite hart neu laden
  location.replace(location.pathname + "?refresh=" + Date.now());
}

// Button anbinden
document.getElementById("btn-refresh").onclick = hardUpdate;

// ---- Dateiliste ermitteln ----
async function listJsonFiles() {
  // 1) files.json benutzen, wenn vorhanden
  try {
    const r = await fetch(`${APP_DIR}/files.json?${CACHE_BUSTER()}`, {cache:"reload"});
    if (r.ok) {
      const arr = await r.json();
      const files = arr.filter(x => typeof x === "string" && x.endsWith(".json"));
      if (files.length) return files.map(f => `${APP_DIR}/${f}`);
    }
  } catch {}

  // 2) GitHub API (unauthenticated, read-only)
  try {
    const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${APP_DIR}`;
    const r = await fetch(`${api}?${CACHE_BUSTER()}`);
    if (r.ok) {
      const list = await r.json();
      const files = list
        .filter(e => e.type === "file" && e.name.endsWith(".json"))
        .map(e => `${APP_DIR}/${e.name}`)
        // manifest/config/sw ausschließen
        .filter(p => !/manifest\.json$|config\.json$|config\.js$|^.*sw\.json$/i.test(p));
      if (files.length) return files;
    }
  } catch {}

  // 3) Fallback bekannte Dateien
  return [
    `${APP_DIR}/questions_all_completed_marked_final_ctx2_cleaned.json`,
    `${APP_DIR}/external_teacher_questions_marked_final_ctx2_cleaned.json`,
  ];
}

// ---- JSON laden mit Cache-Buster ----
async function loadJson(url) {
  const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}${CACHE_BUSTER()}`, {cache:"reload"});
  if (!r.ok) throw new Error(`Fetch failed ${url}`);
  return r.json();
}

// ---- Laufzeit-Bereinigung für unvollständige Fragen ----
function normalizeQuestion(q) {
  let t = (q.question_text || "").trim();

  const onlyLabel = /^(\*\*)?(Vor|Nach)teile(\*\*)?\s*[:：]?\s*[_\s,–-]*\??$/i.test(t);
  const onlyBlanks = /^[\*\s_-]*(_{2,}|\uFF3F{2,}|\u2013{2,})[\?]?$/i.test(t);
  const startsLabel = /^(\s*\*\*)?(Vor|Nach)teile(\*\*)?\s*[:：]/i.test(t);

  // Themenratgeber aus richtiger Antwort ableiten
  const mergedAns = Array.isArray(q.correct_answer) ? q.correct_answer.join(" ") : (q.correct_answer || "");
  const topicGuess = (() => {
    const s = mergedAns.toLowerCase();
    if (s.includes("stammeinlage") || s.includes("gesellschaftsvermögen")) return "der GmbH";
    if (s.includes("hauptversammlung") || s.includes("aufsichtsrat"))     return "der AG";
    if (s.includes("komplementär") || s.includes("kommanditist"))         return "der KG";
    if (s.includes("solidarisch") && s.includes("unbeschränkt"))           return "der OG";
    if (s.includes("rückvergütung"))                                      return "der Genossenschaft";
    if (s.includes("einzelunternehmer") || s.includes("privat-"))         return "des Einzelunternehmens";
    return "der Rechtsform";
  })();

  if (onlyLabel || onlyBlanks) {
    const want = (t.toLowerCase().includes("vor") ? "Vorteile" : "Nachteile");
    t = `${want} ${topicGuess}: Nennen Sie die wichtigsten Punkte.`;
  } else if (startsLabel && !/Nennen|Welche|Geben/i.test(t)) {
    const want = (t.toLowerCase().includes("vor") ? "Vorteile" : "Nachteile");
    t = `${want} ${topicGuess}: Nennen Sie die wichtigsten Punkte.`;
  }
  t = t.replace(/_{2,}/g, "…");
  return {...q, question_text: t};
}

// ---- Fragenpool aufbauen ----
async function buildQuestionPool() {
  const files = await listJsonFiles();
  const pools = [];
  for (const f of files) {
    try {
      const data = await loadJson(f);
      if (Array.isArray(data)) {
        data.forEach(q => pools.push(normalizeQuestion(q)));
      }
    } catch (e) {
      console.warn("Skip file", f, e);
    }
  }
  // Dubletten optional nach question_text bereinigen
  const seen = new Set();
  const unique = [];
  for (const q of pools) {
    const key = (q.question_text || "").toLowerCase().replace(/\s+/g," ").trim();
    if (key && !seen.has(key)) { seen.add(key); unique.push(q); }
  }
  return unique;
}

// ---- Minimaler UI-Flow (Lernen/Prüfen) ----
let ALL = [];
let mode = "learn";
let idx = 0;

function render() {
  const q = ALL[idx];
  UI.question.textContent = q ? q.question_text : "Keine Fragen geladen.";
  UI.answers.innerHTML = "";
  const options = q.possible_answers || [q.correct_answer].flat();
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.textContent = opt;
    btn.onclick = () => {
      if (mode === "learn") {
        btn.classList.add(
          [q.correct_answer].flat().some(a => String(a).toLowerCase() === String(opt).toLowerCase())
            ? "ok":"bad"
        );
      } else {
        // Prüfmodus: hier auswerten (dein vorhandener Code kann hier rein)
        btn.classList.add(
          [q.correct_answer].flat().some(a => String(a).toLowerCase() === String(opt).toLowerCase())
            ? "ok":"bad"
        );
      }
    };
    UI.answers.appendChild(btn);
  });
}

async function boot() {
  ALL = await buildQuestionPool();
  idx = 0;
  render();
}

// Events
if (UI.modeLearn) UI.modeLearn.onclick = () => { mode="learn"; render(); };
if (UI.modeExam)  UI.modeExam.onclick  = () => { mode="exam";  render(); };

// Start
boot();
