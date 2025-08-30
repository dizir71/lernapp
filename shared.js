/* shared.js – Gekapselte, gemeinsame Logik für die Lern-App */

class LernApp {
    constructor(ui_elements) {
        this.UI = ui_elements;
        this.allQuestions = [];
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.mode = 'learn';
        this.userExamAnswers = new Map();
        this.QUESTION_FILES = {
            internal: './questions_all_completed_marked_filled.json',
            external: './external_teacher_questions_marked_filled.json'
        };
    }

    _CACHE_BUSTER = () => `t=${Date.now()}`;

    async _loadJson(url) {
        try {
            const response = await fetch(url + `?${this._CACHE_BUSTER()}`, { cache: "reload" });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to load JSON from ${url}:`, error);
            return [];
        }
    }

    async _buildQuestionPool() {
        const loadInternal = this._loadJson(this.QUESTION_FILES.internal);
        const loadExternal = this.UI.chkExternal.checked ? this._loadJson(this.QUESTION_FILES.external) : Promise.resolve([]);
        const [internalQs, externalQs] = await Promise.all([loadInternal, loadExternal]);
        this.allQuestions = [...internalQs, ...externalQs];
        const seen = new Set();
        this.allQuestions = this.allQuestions.filter(q => {
            if (!q || typeof q.question_text !== 'string') return false;
            const key = q.question_text.toLowerCase().replace(/\s+/g, " ").trim();
            if (key && !seen.has(key)) {
                seen.add(key);
                return true;
            }
            return false;
        });
    }

    _showStartScreen() {
        this.UI.list.innerHTML = '';
        let historyHtml = '<h3>Letzte Versuche</h3><p>Noch keine Prüfungen absolviert.</p>';
        try {
            const history = JSON.parse(localStorage.getItem('bwl-exam-history') || '[]');
            if (history.length > 0) {
                historyHtml = '<h3>Letzte Versuche</h3><ul style="list-style: none; padding: 0;">';
                history.forEach(res => {
                    historyHtml += `<li style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;"><span>${new Date(res.date).toLocaleString('de-DE')}</span><span><strong>${res.score}/${res.total}</strong> (${res.grade})</span></li>`;
                });
                historyHtml += '</ul>';
            }
        } catch (e) { console.error("Could not read exam history", e); }
        let startDiv = document.getElementById('start-screen');
        if (!startDiv) {
            startDiv = document.createElement('div');
            startDiv.id = 'start-screen';
            this.UI.list.closest('.row')?.insertAdjacentElement('afterend', startDiv);
        }
        startDiv.innerHTML = `<div class="card"><h2>Willkommen!</h2><p>Wähle einen Modus, um zu starten.</p><p>Aktuell sind ${this.allQuestions.length} Fragen geladen.</p></div><div class="card">${historyHtml}</div>`;
    }

    _renderQuestion() {
        if (this.currentQuestionIndex >= this.currentQuestions.length) {
            if (this.mode === 'test') this._finishExam();
            else this._showStartScreen();
            return;
        }

        const q = this.currentQuestions[this.currentQuestionIndex];
        let answerHtml = '';
        let questionTextHtml = q.question_text;
        const questionType = q.type || 'single_choice';

        switch (questionType) {
            case 'single_choice':
            case 'true_false':
                (q.possible_answers || (q.type === 'true_false' ? ['true', 'false'] : [])).forEach(opt => answerHtml += `<button class="opt" data-answer="${opt}">${opt}</button>`);
                break;
            case 'multiple_choice':
                q.possible_answers.forEach(opt => answerHtml += `<button class="opt multiple" data-answer="${opt}">${opt}</button>`);
                break;
            case 'calculation':
                answerHtml = `<input type="text" id="answer-input" class="opt" placeholder="Antwort eingeben...">`;
                break;
            case 'fill_in_the_blank':
                 questionTextHtml = q.question_text.replace(/_{3,}/g, `<input type="text" id="answer-input" class="opt inline-input" placeholder="...">`);
                break;
            case 'sort':
                answerHtml = '<ul id="sortable-list" style="list-style: none; padding: 0;">';
                q.order_fields.forEach((field, index) => {
                    answerHtml += `<li class="opt" data-original-index="${index}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;"><span>${field}</span><div><button class="sort-btn up">↑</button><button class="sort-btn down">↓</button></div></li>`;
                });
                answerHtml += '</ul>';
                break;
            case 'matching':
                answerHtml = '<div id="matching-pairs">';
                const rightOptions = q.options_right.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                q.options_left.forEach(leftOpt => {
                    answerHtml += `<div class="matching-pair" style="display: flex; align-items: center; margin-bottom: 8px;"><span style="flex: 1;">${leftOpt}</span><select class="matching-select" data-left-option="${leftOpt}" style="flex: 1; margin-left: 10px;"><option value="">-- Bitte wählen --</option>${rightOptions}</select></div>`;
                });
                answerHtml += '</div>';
                break;
        }

        let actionButtonHtml = '';
        if (this.mode === 'learn') {
            if (questionType !== 'single_choice' && questionType !== 'true_false') actionButtonHtml = `<button id="checkAnswerBtn" class="primary">Antwort prüfen</button>`;
            actionButtonHtml += `<button id="nextButton" style="margin-top: 10px; display: none;">Nächste Frage</button>`;
        } else {
            const nextButtonText = (this.currentQuestionIndex === this.currentQuestions.length - 1) ? 'Prüfung beenden' : 'Nächste Frage';
            actionButtonHtml = `<button id="nextButton" class="primary" style="margin-top: 20px;">${nextButtonText}</button>`;
        }

        const progress = this.mode === 'test' ? `<div style="text-align: center; color: #6B7280; margin-bottom: 12px;">Frage ${this.currentQuestionIndex + 1} von ${this.currentQuestions.length}</div>` : '';
        this.UI.list.innerHTML = `<div class="card">${progress}<div id="question" style="font-weight: bold; margin-bottom: 12px;">${questionTextHtml}</div><div id="answers">${answerHtml}</div><div id="action-footer" style="margin-top: 10px;">${actionButtonHtml}</div><div id="feedback" style="margin-top: 12px; border-left: 3px solid #ccc; padding-left: 10px; display: none;"></div></div>`;

        this._attachQuestionListeners(q);
    }

    _attachQuestionListeners(q) {
        this.UI.answers = document.getElementById("answers");
        this.UI.feedback = document.getElementById("feedback");
        this.UI.nextButton = document.getElementById("nextButton");

        if (this.mode === 'learn') {
            if (q.type === 'single_choice' || q.type === 'true_false') {
                this.UI.answers.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => this._handleSingleAnswer(btn, q)));
            } else {
                document.getElementById('checkAnswerBtn')?.addEventListener('click', () => this._handleCheckAnswer(q));
            }
            if (q.type === 'multiple_choice') {
                this.UI.answers.querySelectorAll('.opt.multiple').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('selected')));
            }
            if (q.type === 'sort') {
                const list = document.getElementById('sortable-list');
                list.addEventListener('click', (e) => {
                    if (!e.target.matches('.sort-btn')) return;
                    const li = e.target.closest('li');
                    if (e.target.classList.contains('up') && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
                    else if (e.target.classList.contains('down') && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
                });
            }
            if(this.UI.nextButton) this.UI.nextButton.onclick = () => { this.currentQuestionIndex++; this._renderQuestion(); };
        } else {
            this._restoreTestAnswer(q);
            if (q.type === 'multiple_choice' || q.type === 'single_choice' || q.type === 'true_false') {
                 this.UI.answers.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => this._handleAnswerInTestMode(btn, q)));
            }
            if(this.UI.nextButton) this.UI.nextButton.onclick = () => this._saveAnswerAndProceed();
        }
    }

    _handleCheckAnswer(q) {
        switch(q.type) {
            case 'multiple_choice': this._handleMultipleAnswer(q); break;
            case 'calculation': case 'fill_in_the_blank': this._handleInputAnswer(q); break;
            case 'sort': this._handleSortAnswer(q); break;
            case 'matching': this._handleMatchingAnswer(q); break;
        }
    }

    _showFeedback(q) {
        let feedbackHtml = this.UI.feedback.innerHTML || '';
        if (q.explanation) feedbackHtml += (feedbackHtml ? '<br><br>' : '') + `<strong>Begründung:</strong> ${q.explanation}`;
        this.UI.feedback.innerHTML = feedbackHtml;
        if (this.UI.feedback.innerHTML) this.UI.feedback.style.display = 'block';
        if (this.UI.nextButton) this.UI.nextButton.style.display = 'block';
        this.UI.answers.querySelectorAll('button, input, select').forEach(el => el.disabled = true);
    }

    _handleSingleAnswer(btn, q) {
        const isCorrect = btn.dataset.answer.toLowerCase() === String(q.correct_answer).toLowerCase();
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            const correctBtn = this.UI.answers.querySelector(`.opt[data-answer="${q.correct_answer}"]`);
            if (correctBtn) correctBtn.classList.add('correct');
        }
        this._showFeedback(q);
    }

    _handleMultipleAnswer(q) {
        const selected = new Set(Array.from(this.UI.answers.querySelectorAll('.opt.selected')).map(b => b.dataset.answer));
        const correct = new Set(q.correct_answer);
        let allCorrect = true;
        this.UI.answers.querySelectorAll('.opt').forEach(btn => {
            const wasSelected = btn.classList.contains('selected');
            const isCorrect = correct.has(btn.dataset.answer);
            if (wasSelected && isCorrect) btn.classList.add('correct');
            else if (wasSelected && !isCorrect) { btn.classList.add('wrong'); allCorrect = false; }
            else if (!wasSelected && isCorrect) allCorrect = false;
        });
        if (selected.size !== correct.size) allCorrect = false;
        this.UI.feedback.innerHTML = allCorrect ? '<strong>Perfekt!</strong> Alle Antworten sind korrekt.' : '<strong>Leider nicht ganz richtig.</strong>';
        this._showFeedback(q);
    }

    _handleInputAnswer(q) {
        const input = document.getElementById('answer-input');
        const isCorrect = input.value.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
        input.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) this.UI.feedback.innerHTML = `<strong>Die richtige Antwort ist:</strong> ${q.correct_answer}`;
        this._showFeedback(q);
    }

    _handleSortAnswer(q) {
        const list = document.getElementById('sortable-list');
        const userAnswer = Array.from(list.querySelectorAll('li')).map(item => parseInt(item.dataset.originalIndex, 10));
        const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(q.correct_order);
        list.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            const correctOrderHtml = q.correct_order.map(i => `<li>${q.order_fields[i]}</li>`).join('');
            this.UI.feedback.innerHTML = `<strong>Die richtige Reihenfolge ist:</strong><ol>${correctOrderHtml}</ol>`;
        }
        this._showFeedback(q);
    }

    _handleMatchingAnswer(q) {
        const correctPairs = new Map(q.correct_matches);
        let allCorrect = true;
        document.querySelectorAll('.matching-select').forEach(select => {
            const isCorrect = select.value === correctPairs.get(select.dataset.leftOption);
            select.classList.add(isCorrect ? 'correct' : 'wrong');
            if (!isCorrect) allCorrect = false;
        });
        if (!allCorrect) this.UI.feedback.innerHTML = `<strong>Einige Zuordnungen waren nicht korrekt.</strong>`;
        this._showFeedback(q);
    }

    _triggerFireworks() {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
        function randomInRange(min, max) { return Math.random() * (max - min) + min; }
        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }

    _saveAndDisplayExamResults(score, total) {
        const percentage = (score / total) * 100;
        let grade = '', message = '';
        if (percentage >= 91) { grade = 'Note 1 (Sehr Gut)'; message = 'Hervorragend!'; this._triggerFireworks(); }
        else if (percentage >= 81) { grade = 'Note 2 (Gut)'; message = 'Starke Leistung!'; }
        else if (percentage >= 67) { grade = 'Note 3 (Befriedigend)'; message = 'Gut gemacht.'; }
        else if (percentage >= 50) { grade = 'Note 4 (Genügend)'; message = 'Bestanden, aber da ist noch Luft nach oben.'; }
        else { grade = 'Note 5 (Nicht Genügend)'; message = 'Das war leider nichts. Nutze den Lernmodus!'; }
        const result = { date: new Date().toISOString(), score, total, percentage: percentage.toFixed(2), grade };
        try {
            const history = JSON.parse(localStorage.getItem('bwl-exam-history') || '[]');
            history.unshift(result);
            localStorage.setItem('bwl-exam-history', JSON.stringify(history.slice(0, 10)));
        } catch (e) { console.error("Could not save exam history", e); }
        const mailtoBody = `Ergebnis: ${score}/${total} (${percentage.toFixed(0)}%) - Note: ${grade}`;
        const mailtoLink = `mailto:roland.simmer@me.com?subject=BWL Prüfungsergebnis&body=${encodeURIComponent(mailtoBody)}`;
        this.UI.list.innerHTML = `<div class="card"><h2>Prüfungsergebnis</h2><p>Du hast <strong>${score} von ${total}</strong> Fragen richtig. (${percentage.toFixed(0)}%)</p><h3>${grade}</h3><p><em>${message}</em></p><div class="row" style="margin-top: 20px; justify-content: center;"><button id="backToStart" class="primary">Zurück zum Start</button><a href="${mailtoLink}" class="button-link" id="sendMail">Per Mail senden</a></div></div>`;
        document.getElementById('backToStart').onclick = () => this._showStartScreen();
    }

    _handleAnswerInTestMode(btn, q) {
        if (q.type === 'multiple_choice') {
            btn.classList.toggle('selected');
        } else {
            this.UI.answers.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        }
    }

    _saveAnswerAndProceed() {
        const q = this.currentQuestions[this.currentQuestionIndex];
        let answerToSave;
        switch(q.type) {
            case 'single_choice': case 'true_false': case 'multiple_choice':
                answerToSave = new Set(Array.from(this.UI.answers.querySelectorAll('.opt.selected')).map(btn => btn.dataset.answer));
                break;
            case 'calculation': case 'fill_in_the_blank':
                answerToSave = document.getElementById('answer-input').value;
                break;
            case 'sort':
                answerToSave = Array.from(document.querySelectorAll('#sortable-list li')).map(item => parseInt(item.dataset.originalIndex, 10));
                break;
            case 'matching':
                answerToSave = Array.from(document.querySelectorAll('.matching-select')).map(s => [s.dataset.leftOption, s.value]);
                break;
        }
        this.userExamAnswers.set(q.id, answerToSave);
        this.currentQuestionIndex++;
        this._renderQuestion();
    }

    _restoreTestAnswer(q) {
        const savedAnswer = this.userExamAnswers.get(q.id);
        if (!savedAnswer) return;
        switch(q.type) {
            case 'single_choice': case 'true_false': case 'multiple_choice':
                this.UI.answers.querySelectorAll('.opt').forEach(btn => {
                    if (savedAnswer.has(btn.dataset.answer)) btn.classList.add('selected');
                });
                break;
            case 'calculation': case 'fill_in_the_blank':
                document.getElementById('answer-input').value = savedAnswer;
                break;
            case 'matching':
                savedAnswer.forEach(([leftOpt, rightOpt]) => {
                    const select = document.querySelector(`.matching-select[data-left-option="${leftOpt}"]`);
                    if (select) select.value = rightOpt;
                });
                break;
        }
    }

    _finishExam() {
        let score = 0;
        for (const question of this.currentQuestions) {
            const userAnswer = this.userExamAnswers.get(question.id);
            if (!userAnswer) continue;
            let isCorrect = false;
            switch(question.type) {
                case 'single_choice': case 'true_false': case 'fill_in_the_blank': case 'calculation':
                    isCorrect = String(userAnswer).toLowerCase() === String(question.correct_answer).toLowerCase();
                    break;
                case 'multiple_choice':
                    const correctAnswersMC = new Set(question.correct_answer);
                    isCorrect = userAnswer.size === correctAnswersMC.size && [...userAnswer].every(a => correctAnswersMC.has(a));
                    break;
                case 'sort':
                    isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correct_order);
                    break;
                case 'matching':
                    const correctMap = new Map(question.correct_matches);
                    const userMap = new Map(userAnswer);
                    isCorrect = userMap.size === correctMap.size && [...userMap.entries()].every(([key, val]) => correctMap.get(key) === val);
                    break;
            }
            if (isCorrect) score++;
        }
        this._saveAndDisplayExamResults(score, this.currentQuestions.length);
    }

    // ---- PUBLIC API ----

    startLearnMode() {
        this.mode = 'learn';
        this.currentQuestions = [...this.allQuestions].sort(() => 0.5 - Math.random());
        this.currentQuestionIndex = 0;
        this._renderQuestion();
    }

    startTestMode() {
        this.mode = 'test';
        this.currentQuestions = [...this.allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
        if(this.currentQuestions.length < 1) { alert("Keine Fragen geladen."); return; }
        this.currentQuestionIndex = 0;
        this.userExamAnswers.clear();
        this._renderQuestion();
    }

    _attachEventListeners() {
        this.UI.btnRefresh.addEventListener('click', () => this.hardUpdate());
        this.UI.btnLearn.addEventListener('click', () => this.startLearnMode());
        this.UI.btnTest.addEventListener('click', () => this.startTestMode());
        this.UI.chkExternal.addEventListener('change', () => this.init());
    }

    async init() {
        this._attachEventListeners();
        await this._buildQuestionPool();
        this._showStartScreen();
    }
}
