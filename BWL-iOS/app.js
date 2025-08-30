/* BWL-App/app.js – Hauptlogik der Lern-App
   - Lädt Fragen aus zentralen JSON-Dateien
   - Implementiert Lern- und Prüfungsmodus
   - Bietet Cache-Refresh-Funktionalität
*/

document.addEventListener('DOMContentLoaded', () => {
  const UI = {
    btnRefresh: document.getElementById("btn-refresh"),
    chkExternal: document.querySelector("#showExternal"),
    btnLearn: document.getElementById("btnLearn"),
    btnTest: document.getElementById("btnTest"),
    list: document.getElementById("list"),
    question: null,
    answers: null,
    feedback: null,
    nextButton: null,
  };

  const CACHE_BUSTER = () => `t=${Date.now()}`;
  const QUESTION_FILES = {
    internal: '../questions_all_completed_marked_filled.json',
    external: '../external_teacher_questions_marked_filled.json'
  };

  let allQuestions = [];
  let currentQuestions = [];
  let currentQuestionIndex = 0;
  let mode = 'learn'; // 'learn' or 'test'
  let userExamAnswers = new Map();

  async function hardUpdate() {
    try {
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      if (navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Hard update error:", e);
    }
    location.replace(location.pathname + `?refresh=${Date.now()}`);
  }

  async function loadJson(url) {
    try {
      const response = await fetch(`${url}?${CACHE_BUSTER()}`, { cache: "reload" });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load JSON from ${url}:`, error);
      return [];
    }
  }

  async function buildQuestionPool() {
    const loadInternal = loadJson(QUESTION_FILES.internal);
    const loadExternal = UI.chkExternal.checked ? loadJson(QUESTION_FILES.external) : Promise.resolve([]);
    const [internalQs, externalQs] = await Promise.all([loadInternal, loadExternal]);
    allQuestions = [...internalQs, ...externalQs];

    const seen = new Set();
    const unique = [];
    for (const q of allQuestions) {
      if (!q || typeof q.question_text !== 'string') continue;
      const key = q.question_text.toLowerCase().replace(/\s+/g, " ").trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(q);
      }
    }
    allQuestions = unique;
    console.log(`Loaded ${allQuestions.length} unique questions.`);
    return allQuestions;
  }

  function showStartScreen() {
    UI.list.innerHTML = '';

    let historyHtml = '<h3>Letzte Versuche</h3><p>Noch keine Prüfungen absolviert.</p>';
    try {
      const history = JSON.parse(localStorage.getItem('bwl-exam-history') || '[]');
      if (history.length > 0) {
        historyHtml = '<h3>Letzte Versuche</h3><ul style="list-style: none; padding: 0;">';
        history.forEach(res => {
          historyHtml += `
            <li style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
              <span>${new Date(res.date).toLocaleString('de-DE')}</span>
              <span><strong>${res.score}/${res.total}</strong> (${res.grade})</span>
            </li>`;
        });
        historyHtml += '</ul>';
      }
    } catch (e) {
      console.error("Could not read exam history", e);
      historyHtml = '<h3>Letzte Versuche</h3><p>Fehler beim Laden des Verlaufs.</p>';
    }

    const startDivId = 'start-screen';
    let startDiv = document.getElementById(startDivId);
    if (!startDiv) {
      startDiv = document.createElement('div');
      startDiv.id = startDivId;
      document.querySelector('.row').insertAdjacentElement('afterend', startDiv);
    }

    startDiv.innerHTML = `
      <div class="card">
        <h2>Willkommen!</h2>
        <p>Wähle einen Modus, um zu starten.</p>
        <p>Aktuell sind ${allQuestions.length} Fragen geladen.</p>
      </div>
      <div class="card">
        ${historyHtml}
      </div>`;
  }

  function renderQuestion() {
    if (currentQuestions.length === 0 || currentQuestionIndex >= currentQuestions.length) {
      UI.list.innerHTML = `<div class="card"><p>Lernmodus beendet. Gut gemacht!</p></div>`;
      showStartScreen();
      return;
    }

    const q = currentQuestions[currentQuestionIndex];
    let answerHtml = '';
    const questionType = q.type || 'single_choice';

    switch (questionType) {
      case 'single_choice':
      case 'true_false': {
        const options = q.possible_answers || (questionType === 'true_false' ? ['true', 'false'] : []);
        options.forEach(opt => {
          answerHtml += `<button class="opt" data-answer="${opt}">${opt}</button>`;
        });
        break;
      }
      case 'multiple_choice':
        q.possible_answers.forEach(opt => {
          answerHtml += `<button class="opt multiple" data-answer="${opt}">${opt}</button>`;
        });
        answerHtml += `<button id="checkMultiAnswer" class="primary" style="margin-top: 10px;">Antwort prüfen</button>`;
        break;
      default:
        answerHtml = `<p><i>Fragentyp '${questionType}' wird noch nicht unterstützt.</i></p>`;
    }

    UI.list.innerHTML = `
      <div class="card">
        <div id="question" style="font-weight: bold; margin-bottom: 12px;">${q.question_text}</div>
        <div id="answers">${answerHtml}</div>
        <div id="feedback" style="margin-top: 12px; border-left: 3px solid #ccc; padding-left: 10px; display: none;"></div>
        <button id="nextButton" style="margin-top: 10px; display: none;">Nächste Frage</button>
      </div>`;

    UI.answers = document.getElementById("answers");
    UI.feedback = document.getElementById("feedback");
    UI.nextButton = document.getElementById("nextButton");

    if (questionType === 'single_choice' || questionType === 'true_false') {
      UI.answers.querySelectorAll('.opt').forEach(btn => {
        btn.addEventListener('click', () => handleSingleAnswer(btn, q));
      });
    } else if (questionType === 'multiple_choice') {
      UI.answers.querySelectorAll('.opt.multiple').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('selected');
        });
      });
      document.getElementById('checkMultiAnswer').addEventListener('click', () => handleMultipleAnswer(q));
    }

    UI.nextButton.onclick = () => {
      currentQuestionIndex++;
      renderQuestion();
    };
  }

  function showFeedback(q) {
    if (q.explanation) {
      UI.feedback.innerHTML = `<strong>Begründung:</strong> ${q.explanation}`;
      UI.feedback.style.display = 'block';
    }
    UI.nextButton.style.display = 'block';
    UI.answers.querySelectorAll('.opt, #checkMultiAnswer').forEach(b => b.disabled = true);
  }

  function handleSingleAnswer(btn, question) {
    const selectedAnswer = btn.dataset.answer;
    const correctAnswer = String(question.correct_answer);

    if (selectedAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
      btn.classList.add('correct');
    } else {
      btn.classList.add('wrong');
      const correctBtn = UI.answers.querySelector(`.opt[data-answer="${correctAnswer}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
    }
    showFeedback(question);
  }

  function handleMultipleAnswer(question) {
    const selectedAnswers = new Set(
      Array.from(UI.answers.querySelectorAll('.opt.selected')).map(btn => btn.dataset.answer)
    );
    const correctAnswers = new Set(question.correct_answer);

    let allCorrect = true;
    UI.answers.querySelectorAll('.opt').forEach(btn => {
      const answer = btn.dataset.answer;
      const wasSelected = selectedAnswers.has(answer);
      const isCorrect = correctAnswers.has(answer);

      if (wasSelected && isCorrect) {
        btn.classList.add('correct');
      } else if (wasSelected && !isCorrect) {
        btn.classList.add('wrong');
        allCorrect = false;
      } else if (!wasSelected && isCorrect) {
        btn.classList.add('missed');
        allCorrect = false;
      }
    });

    if (selectedAnswers.size !== correctAnswers.size) allCorrect = false;

    UI.feedback.innerHTML = allCorrect
      ? '<strong>Perfekt!</strong> Alle Antworten sind korrekt. <br><br>'
      : '<strong>Leider nicht ganz richtig.</strong> Schau dir die markierten Antworten an. <br><br>';

    showFeedback(question);
  }

  function triggerFireworks() {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }

  function exportResultAsJson(result) {
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pruefungsergebnis-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function saveAndDisplayExamResults(score, total) {
    const percentage = (score / total) * 100;
    let grade = '';
    let message = '';

    if (percentage >= 91) {
      grade = 'Note 1 (Sehr Gut)';
      message = 'Hervorragend! Du bist ein echter Experte!';
      triggerFireworks();
    } else if (percentage >= 81) {
      grade = 'Note 2 (Gut)';
      message = 'Starke Leistung! Du bist auf dem besten Weg.';
    } else if (percentage >= 67) {
      grade = 'Note 3 (Befriedigend)';
      message = 'Gut gemacht, das sitzt schon ganz gut.';
    } else if (percentage >= 50) {
      grade = 'Note 4 (Genügend)';
      message = 'Knapp, aber bestanden. Wiederhole die unsicheren Themen.';
    } else {
      grade = 'Note 5 (Nicht Genügend)';
      message = 'Das war leider nichts. Nutze den Lernmodus und versuch es erneut!';
    }

    const result = {
      date: new Date().toISOString(),
      score,
      total,
      percentage: percentage.toFixed(2),
      grade,
      questions: currentQuestions.map(q => ({ id: q.id, question_text: q.question_text })),
      answers: Object.fromEntries(userExamAnswers)
    };

    try {
      const history = JSON.parse(localStorage.getItem('bwl-exam-history') || '[]');
      history.unshift(result);
      localStorage.setItem('bwl-exam-history', JSON.stringify(history.slice(0, 10)));
    } catch (e) {
      console.error("Could not save exam history to localStorage", e);
    }

    const mailtoSubject = "BWL Prüfungsergebnis";
    const mailtoBody = `Hallo,\n\nhier ist mein Prüfungsergebnis:\n\n- Score: ${score} / ${total}\n- Prozentsatz: ${percentage.toFixed(0)}%\n- Note: ${grade}\n\nViele Grüße`;
    const mailtoLink = `mailto:roland.simmer@me.com?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;

    UI.list.innerHTML = `
      <div class="card">
        <h2>Prüfungsergebnis</h2>
        <p>Du hast <strong>${score} von ${total}</strong> Fragen richtig beantwortet.</p>
        <p style="font-size: 1.2em; font-weight: bold;">Das entspricht ${percentage.toFixed(0)}%.</p>
        <h3>${grade}</h3>
        <p><em>${message}</em></p>
        <div class="row" style="margin-top: 20px; justify-content: center;">
          <button id="backToStart" class="primary">Zurück zum Start</button>
          <button id="exportJson">Als JSON exportieren</button>
          <a href="${mailtoLink}" class="button-link" id="sendMail">Per Mail senden</a>
        </div>
      </div>`;

    if (!document.getElementById('button-link-style')) {
      const style = document.createElement('style');
      style.id = 'button-link-style';
      style.innerHTML = `.button-link { text-decoration: none; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--line); background: #EEF2FF; color: #111827; cursor: pointer; }`;
      document.head.appendChild(style);
    }

    document.getElementById('backToStart').onclick = showStartScreen;
    document.getElementById('exportJson').onclick = () => exportResultAsJson(result);
  }

  function finishExam() {
    let score = 0;
    for (const question of currentQuestions) {
      const userAnswers = userExamAnswers.get(question.id) || new Set();
      const correctAnswers = new Set([question.correct_answer].flat().map(String));
      const userAnswersAsStrings = new Set(Array.from(userAnswers).map(String));

      if (question.type === 'multiple_choice') {
        if (userAnswersAsStrings.size === correctAnswers.size && [...userAnswersAsStrings].every(a => correctAnswers.has(a))) {
          score++;
        }
      } else {
        const userAnswer = userAnswersAsStrings.values().next().value;
        if (userAnswer && correctAnswers.has(userAnswer)) score++;
      }
    }
    saveAndDisplayExamResults(score, currentQuestions.length);
  }

  async function startApp() {
    await buildQuestionPool();
    showStartScreen();
  }

  function startLearnMode() {
    mode = 'learn';
    currentQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
    currentQuestionIndex = 0;
    renderQuestion();
  }

  function startTestMode() {
    mode = 'test';
    currentQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
    currentQuestionIndex = 0;
    userExamAnswers.clear();

    if (currentQuestions.length < 10) {
      alert("Nicht genügend Fragen für eine Prüfung verfügbar. Bitte lade mehr Fragen.");
      showStartScreen();
      return;
    }
    renderQuestion();
  }

  function saveAnswerAndProceed() {
    const q = currentQuestions[currentQuestionIndex];
    const selectedAnswers = new Set();
    UI.answers.querySelectorAll('.opt.selected').forEach(btn => {
      selectedAnswers.add(btn.dataset.answer);
    });
    userExamAnswers.set(q.id, selectedAnswers);

    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
      renderQuestion();
    } else {
      finishExam();
    }
  }

  function handleAnswerInTestMode(btn, question) {
    if (question.type === 'multiple_choice') {
      btn.classList.toggle('selected');
    } else {
      UI.answers.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }
  }

  const originalRenderQuestion = renderQuestion;
  renderQuestion = function () {
    if (mode === 'test') {
      if (currentQuestionIndex >= currentQuestions.length) {
        finishExam();
        return;
      }

      const q = currentQuestions[currentQuestionIndex];
      let answerHtml = '';
      const questionType = q.type || 'single_choice';

      const options = q.possible_answers || (questionType === 'true_false' ? ['true', 'false'] : []);
      options.forEach(opt => {
        answerHtml += `<button class="opt" data-answer="${opt}">${opt}</button>`;
      });

      const progress = `Frage ${currentQuestionIndex + 1} von ${currentQuestions.length}`;
      const nextButtonText = (currentQuestionIndex === currentQuestions.length - 1) ? 'Prüfung beenden' : 'Nächste Frage';

      UI.list.innerHTML = `
        <div class="card">
          <div style="text-align: center; color: #6B7280; margin-bottom: 12px;">${progress}</div>
          <div id="question" style="font-weight: bold; margin-bottom: 12px;">${q.question_text}</div>
          <div id="answers">${answerHtml}</div>
          <button id="nextButton" class="primary" style="margin-top: 20px;">${nextButtonText}</button>
        </div>`;

      UI.answers = document.getElementById("answers");
      UI.answers.querySelectorAll('.opt').forEach(btn => {
        btn.addEventListener('click', () => handleAnswerInTestMode(btn, q));
      });
      document.getElementById('nextButton').onclick = saveAnswerAndProceed;

    } else {
      originalRenderQuestion.apply(this, arguments);
    }
  };

  UI.btnRefresh.onclick = hardUpdate;
  UI.btnLearn.onclick = startLearnMode;
  UI.btnTest.onclick = startTestMode;
  UI.chkExternal.onchange = () => {
    console.log("Checkbox changed, reloading questions...");
    startApp();
  };

  startApp();
});