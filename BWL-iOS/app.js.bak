// BWL-iOS/app.js
let MODE = "learn";
let dataInternal = [], dataExternal = [];
let quizQuestions = [], quizIndex = 0, score = 0;

// Hilfsfunktionen
const $ = sel => document.querySelector(sel);
function isCorrect(it, ans){
  return Array.isArray(it.correct_answer) ? it.correct_answer.includes(ans) : it.correct_answer === ans;
}
function shuffle(arr){ return arr.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }
function now(){ return new Date().toLocaleString(); }

// Notenberechnung
function calcGrade(points,total){
  const percent = Math.round(points/total*100);
  let grade;
  if (percent>=91) grade="Sehr gut (1)";
  else if (percent>=75) grade="Gut (2)";
  else if (percent>=60) grade="Befriedigend (3)";
  else if (percent>=50) grade="Genügend (4)";
  else grade="Nicht genügend (5)";
  return {percent, grade};
}

// Motivationsnachrichten
const messages = {
  veryGood:["Fantastisch!","Überragend!","Spitzenklasse! 🎉"],
  good:["Gut gemacht!","Super Leistung!","Weiter so!"],
  fail:["Nicht aufgeben!","Üben lohnt sich!","Nächstes Mal klappt's!"]
};
function randomMsg(type){ const m=messages[type]; return m[Math.floor(Math.random()*m.length)]; }

// Speicherung
function saveResult(res){
  const history = JSON.parse(localStorage.getItem("bwl_results_ios")||"[]");
  history.push(res);
  localStorage.setItem("bwl_results_ios",JSON.stringify(history));
}
function loadHistory(){ return JSON.parse(localStorage.getItem("bwl_results_ios")||"[]"); }

// GitHub Upload (jede Prüfung einzeln in results/)
async function uploadResult(res){
  if (typeof CONFIG==="undefined"){ alert("CONFIG.js fehlt."); return; }
  const fileName=`results/result_${Date.now()}.json`;
  const url=`https://api.github.com/repos/${CONFIG.githubUser}/${CONFIG.repo}/contents/${fileName}`;
  const content=btoa(JSON.stringify(res,null,2));
  const resp=await fetch(url,{
    method:"PUT",
    headers:{
      "Authorization":`token ${CONFIG.token}`,
      "Accept":"application/vnd.github+json"
    },
    body:JSON.stringify({message:"Add result",content})
  });
  if(!resp.ok) alert("Upload fehlgeschlagen"); else alert("Ergebnis auf GitHub gespeichert.");
}

// Download JSON
function downloadResult(res){
  const blob=new Blob([JSON.stringify(res,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="ergebnis.json"; a.click();
  URL.revokeObjectURL(url);
}

// Mail
function sendMail(res){
  const body=encodeURIComponent(
    `Prüfungsergebnis\nDatum: ${res.date}\nPunkte: ${res.score}/${res.total}\nNote: ${res.grade}\n\nFalsche Fragen:\n${res.wrong.join("\n")}`
  );
  window.location.href=`mailto:roland.simmer@me.com?subject=BWL Prüfungsergebnis&body=${body}`;
}

// Feuerwerk
function fireworks(){
  const c=document.createElement("div");
  c.style.position="fixed"; c.style.inset="0"; c.style.pointerEvents="none"; c.style.zIndex="9999";
  document.body.appendChild(c);
  for(let i=0;i<50;i++){
    const s=document.createElement("div");
    s.style.position="absolute"; s.style.width="6px"; s.style.height="6px";
    s.style.background=`hsl(${Math.random()*360},100%,50%)`;
    s.style.left=Math.random()*100+"%";
    s.style.top=Math.random()*100+"%";
    s.style.borderRadius="50%";
    c.appendChild(s);
    setTimeout(()=>s.remove(),1500+Math.random()*500);
  }
  setTimeout(()=>c.remove(),2000);
}

// Quiz
function startQuiz(){
  const items=($('#showExternal')?.checked ?? true) ? [...dataInternal,...dataExternal]:[...dataInternal];
  quizQuestions=shuffle(items).slice(0,10); quizIndex=0; score=0;
  renderQuiz();
}
function renderQuiz(){
  const list=$("#list"); list.innerHTML="";
  if(quizIndex>=quizQuestions.length){
    const res=calcGrade(score,quizQuestions.length);
    const resultObj={date:now(),score,total:quizQuestions.length,percent:res.percent,grade:res.grade,wrong:[]};
    quizQuestions.forEach((q,i)=>{ if(!q._correct) resultObj.wrong.push((i+1)+": "+q.question_text); });
    saveResult(resultObj);

    const card=document.createElement("div"); card.className="card";
    let msg=res.percent>=91?randomMsg("veryGood"):res.percent>=50?randomMsg("good"):randomMsg("fail");
    card.innerHTML=`<h2>Ergebnis</h2>
      <p>Richtig: ${score} von ${quizQuestions.length} → ${res.percent}%</p>
      <p>Note: ${res.grade}</p>
      <p>${msg}</p>
      <button id="btnRetry">Neue Prüfung</button>
      <button id="btnMail">Ergebnis an Lehrer senden</button>
      <button id="btnExport">JSON herunterladen</button>
      <button id="btnUpload">Auf GitHub speichern</button>
      <button id="btnHistory">Verlauf ansehen</button>`;
    list.appendChild(card);

    if(res.percent>=91) fireworks();

    $("#btnRetry").onclick=startQuiz;
    $("#btnMail").onclick=()=>sendMail(resultObj);
    $("#btnExport").onclick=()=>downloadResult(resultObj);
    $("#btnUpload").onclick=()=>uploadResult(resultObj);
    $("#btnHistory").onclick=showHistory;
    return;
  }
  const it=quizQuestions[quizIndex];
  const card=document.createElement("div"); card.className="card";
  card.innerHTML=`<div><b>Frage ${quizIndex+1} von ${quizQuestions.length}</b></div><p>${it.question_text}</p>`;
  (it.possible_answers||['true','false']).forEach(a=>{
    const o=document.createElement("div"); o.className="opt"; o.textContent=a;
    o.onclick=()=>{
      if(isCorrect(it,a)){o.classList.add("correct");score++; it._correct=true;}
      else{o.classList.add("wrong"); it._correct=false;}
      setTimeout(()=>{quizIndex++;renderQuiz();},600);
    };
    card.appendChild(o);
  });
  list.appendChild(card);
}

// Verlauf
function showHistory(){
  const hist=loadHistory(); const list=$("#list"); list.innerHTML="";
  if(!hist.length){ list.innerHTML="<p>Kein Verlauf vorhanden.</p>"; return; }
  hist.forEach(r=>{
    const div=document.createElement("div"); div.className="card";
    div.innerHTML=`<p>${r.date}: ${r.score}/${r.total} → ${r.percent}% → ${r.grade}</p>`;
    list.appendChild(div);
  });
}

// UI Bindings
function bindUI(){
  $("#btnLearn").onclick=()=>{MODE="learn";render();};
  $("#btnTest").onclick=()=>{MODE="test";startQuiz();};
  $("#btnRefresh").onclick=()=>location.reload();
  $("#btnInfo")?.addEventListener("click",()=>$("#info").style.display="block");
  $("#btnCloseInfo")?.addEventListener("click",()=>$("#info").style.display="none");
}
function render(){
  const list=$("#list"); list.innerHTML="";
  const items=($('#showExternal')?.checked ?? true) ? [...dataInternal,...dataExternal]:[...dataInternal];
  items.forEach(it=>{
    const card=document.createElement("div"); card.className="card";
    card.innerHTML=`<p><b>${it.question_text}</b></p>`;
    if(MODE==="learn"){
      const ul=document.createElement("ul");
      (it.possible_answers||[]).forEach(a=>{
        const li=document.createElement("li"); li.textContent=a;
        if(isCorrect(it,a)) li.style.textDecoration="underline";
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
    list.appendChild(card);
  });
}

// Init
async function init(){
  bindUI();
  try{
    const [intQ, extQ] = await Promise.all([
      fetch('questions_all_completed_marked.json').then(r=>r.json()),
      fetch('external_teacher_questions_marked.json').then(r=>r.json())
    ]);
    dataInternal=intQ; dataExternal=extQ;
    render();
  }catch(e){ console.error("Fehler beim Laden der Fragen",e); }
}
init();
