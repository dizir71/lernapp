const $ = sel => document.querySelector(sel);
let MODE='learn', dataInt=[], dataExt=[];

function isStandaloneIOS(){
  return (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
}

async function loadJSON(url){
  const r = await fetch(url, {cache:'no-cache'});
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

async function init(){
  $('#btnLearn').onclick = ()=>{ MODE='learn'; $('#modePill').textContent='Modus: Lernen'; render(); };
  $('#btnTest').onclick  = ()=>{ MODE='test';  $('#modePill').textContent='Modus: Prüfen'; render(); };
  $('#showExternal').onchange = render;
  $('#btnRefresh').onclick = ()=>location.reload();
  $('#btnInfo').onclick = ()=>$('#info').style.display='block';
  $('#btnCloseInfo').onclick = ()=>$('#info').style.display='none';

  $('#standalonePill').textContent = 'Status: ' + (isStandaloneIOS() ? 'Homescreen' : 'Browser');
  if(!isStandaloneIOS()){ $('#info').style.display='block'; }

  try{
    [dataInt, dataExt] = await Promise.all([
      loadJSON('questions_all_completed_marked.json?v=ios1'),
      loadJSON('external_teacher_questions_marked.json?v=ios1')
    ]);
  }catch(e){
    const li = document.createElement('li');
    li.className='card';
    li.textContent='Fehler beim Laden der JSON-Dateien. Lege beide Dateien in denselben Ordner wie index.html.';
    $('#list').appendChild(li);
    return;
  }
  render();
}

function isCorrect(it, ans){
  return Array.isArray(it.correct_answer) ? it.correct_answer.includes(ans) : it.correct_answer === ans;
}

function render(){
  const showExt = $('#showExternal').checked;
  const items = showExt ? [...dataInt, ...dataExt] : [...dataInt];
  const list = $('#list'); list.innerHTML = '';

  items.forEach(it=>{
    const li = document.createElement('li'); li.className='card';
    li.style.background = it.ui?.question_background || 'var(--card)';

    const head = document.createElement('div'); head.className='row';
    const badge = document.createElement('span'); badge.className='badge';
    badge.textContent = it.origin === 'external_teacher' ? 'Extern' : 'Intern';
    badge.style.background = it.ui?.badge_color || '#3949ab';
    head.appendChild(badge);

    if(it.duplicate_group){
      const d = document.createElement('span'); d.className='pill';
      d.textContent = it.is_duplicate ? 'Duplikat' : 'Original';
      head.appendChild(d);
    }
    li.appendChild(head);

    const q = document.createElement('div'); q.style.fontWeight='700'; q.style.margin='6px 0';
    q.textContent = it.question_text || '(ohne Frage)'; li.appendChild(q);

    if(MODE==='learn'){
      if(it.type==='single_choice' || it.type==='multiple_choice'){
        const ul = document.createElement('ul'); ul.style.margin='0 0 6px 16px';
        (it.possible_answers||[]).forEach(a=>{
          const li2 = document.createElement('li'); li2.textContent=a;
          if(isCorrect(it,a)) li2.style.textDecoration='underline';
          ul.appendChild(li2);
        });
        li.appendChild(ul);
      } else if(it.type==='true_false'){
        const p=document.createElement('p'); p.textContent='R/F: '+String(it.correct_answer); li.appendChild(p);
      } else if(it.type==='matching'){
        const tbl=document.createElement('table'); tbl.style.width='100%';
        (it.correct_matches||it.correct_answer||[]).forEach(([L,R])=>{
          const tr=document.createElement('tr'); tr.innerHTML=`<td>${L}</td><td style="width:30px;text-align:center">⇔</td><td>${R}</td>`;
          tbl.appendChild(tr);
        }); li.appendChild(tbl);
      } else {
        const p=document.createElement('p'); p.textContent='Antwort: '+(Array.isArray(it.correct_answer)?it.correct_answer.join(', '):it.correct_answer);
        li.appendChild(p);
      }
    } else {
      if(it.type==='single_choice' || it.type==='multiple_choice'){
        (it.possible_answers||[]).forEach(a=>{
          const o=document.createElement('div'); o.className='opt'; o.textContent=a;
          o.onclick=()=>{ o.classList.add(isCorrect(it,a)?'correct':'wrong'); };
          li.appendChild(o);
        });
      } else if(it.type==='true_false'){
        ['true','false'].forEach(a=>{
          const o=document.createElement('div'); o.className='opt'; o.textContent=a;
          o.onclick=()=>{ o.classList.add(isCorrect(it,a)?'correct':'wrong'); };
          li.appendChild(o);
        });
      } else {
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Lösung anzeigen';
        const p=document.createElement('p');
        btn.onclick=()=>{ p.textContent='Antwort: '+(Array.isArray(it.correct_answer)?it.correct_answer.join(', '):it.correct_answer); };
        li.appendChild(btn); li.appendChild(p);
      }
    }

    $('#list').appendChild(li);
  });
}

init();

