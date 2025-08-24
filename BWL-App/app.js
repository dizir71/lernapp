// BWL-App/app.js  — PC-Version

async function loadJSON(url){
  const r = await fetch(url, {cache:'no-cache'});
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

let MODE = 'learn';
let dataInternal = [], dataExternal = [];

function $(sel){ return document.querySelector(sel); }
function isCorrect(it, ans){
  return Array.isArray(it.correct_answer)
    ? it.correct_answer.includes(ans)
    : it.correct_answer === ans;
}

function bindUI(){
  $('#btnLearn')?.addEventListener('click', ()=>{ MODE='learn'; render(); });
  $('#btnTest')?.addEventListener('click',  ()=>{ MODE='test';  render(); });
  $('#showExternal')?.addEventListener('change', render);
  $('#btnRefresh')?.addEventListener('click', ()=>{
    if (window.caches) caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).finally(()=>location.reload());
    else location.reload();
  });
  $('#btnInstallLocal')?.addEventListener('click', ()=>{
    // Skripte können aus Browser nicht direkt ausgeführt werden. Download/Öffnen anbieten.
    alert('Windows-Installation: install_local.ps1 aus diesem Ordner mit Rechtsklick → „Mit PowerShell ausführen“ starten.');
    location.href = 'install_local.ps1';
  });
}

function render(){
  const showExternal = $('#showExternal')?.checked ?? true;
  const items = showExternal ? [...dataInternal, ...dataExternal] : [...dataInternal];
  const list = $('#list');
  if(!list) return;
  list.innerHTML = '';

  items.forEach(it=>{
    const card = document.createElement('li');
    card.className = 'card';
    card.style.background = it.ui?.question_background || '#0b142a';

    // Kopfzeile: Herkunft + Duplikatinfo
    const head = document.createElement('div');
    head.className = 'row';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = it.origin === 'external_teacher' ? 'Extern' : 'Intern';
    badge.style.background = it.ui?.badge_color || '#3949ab';
    head.appendChild(badge);

    if (it.duplicate_group){
      const dup = document.createElement('span');
      dup.className = 'pill';
      dup.textContent = it.is_duplicate ? 'Duplikat' : 'Original';
      head.appendChild(dup);
    }
    card.appendChild(head);

    // Frage
    const q = document.createElement('div');
    q.style.fontWeight = '700';
    q.style.margin = '6px 0';
    q.textContent = it.question_text || '(ohne Frage)';
    card.appendChild(q);

    // Antworten je Modus
    if (MODE === 'learn'){
      if (it.type === 'single_choice' || it.type === 'multiple_choice'){
        const ul = document.createElement('ul');
        (it.possible_answers || []).forEach(a=>{
          const li = document.createElement('li');
          li.textContent = a;
          if (isCorrect(it,a)) li.style.textDecoration = 'underline';
          ul.appendChild(li);
        });
        card.appendChild(ul);
      } else if (it.type === 'true_false'){
        const p = document.createElement('p');
        p.textContent = 'R/F: ' + String(it.correct_answer);
        card.appendChild(p);
      } else if (it.type === 'matching'){
        const tbl = document.createElement('table');
        (it.correct_matches || it.correct_answer || []).forEach(pair=>{
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${pair[0]}</td><td style="width:30px;text-align:center">⇔</td><td>${pair[1]}</td>`;
          tbl.appendChild(tr);
        });
        card.appendChild(tbl);
      } else {
        const p = document.createElement('p');
        p.textContent = 'Antwort: ' + (Array.isArray(it.correct_answer) ? it.correct_answer.join(', ') : it.correct_answer);
        card.appendChild(p);
      }
    } else { // MODE === 'test'
      if (it.type === 'single_choice' || it.type === 'multiple_choice'){
        (it.possible_answers || []).forEach(a=>{
          const o = document.createElement('div');
          o.className = 'opt';
          o.textContent = a;
          o.addEventListener('click', ()=>{
            o.classList.add(isCorrect(it,a) ? 'correct' : 'wrong');
          });
          card.appendChild(o);
        });
      } else if (it.type === 'true_false'){
        ['true','false'].forEach(a=>{
          const o = document.createElement('div');
          o.className = 'opt';
          o.textContent = a;
          o.addEventListener('click', ()=>{
            o.classList.add(isCorrect(it,a) ? 'correct' : 'wrong');
          });
          card.appendChild(o);
        });
      } else {
        const btn = document.createElement('button');
        btn.textContent = 'Lösung';
        btn.addEventListener('click', ()=>{
          p.textContent = 'Antwort: ' + (Array.isArray(it.correct_answer) ? it.correct_answer.join(', ') : it.correct_answer);
        });
        const p = document.createElement('p');
        card.appendChild(btn);
        card.appendChild(p);
      }
    }

    list.appendChild(card);
  });
}

async function init(){
  bindUI();
  // JSON laden
  try{
    const [intQ, extQ] = await Promise.all([
      loadJSON('questions_all_completed_marked.json?v=pc3'),
      loadJSON('external_teacher_questions_marked.json?v=pc3')
    ]);
    dataInternal = intQ;
    dataExternal = extQ;
  }catch(e){
    const list = $('#list');
    if (list){
      const li = document.createElement('li');
      li.className = 'card';
      li.textContent = 'Fehler beim Laden der Fragen. Lege beide JSONs in denselben Ordner wie index.html.';
      list.appendChild(li);
    }
    console.error(e);
    return;
  }

  // Service Worker registrieren
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  render();
}

init();

