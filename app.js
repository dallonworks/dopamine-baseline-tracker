/* ======================================================================
   dopamine‑baseline‑check  •  app.js
   ----------------------------------------------------------------------
   • Stores up to 9 test results (timestamp, score, answers[25])
   • Trend chart: click a bullet to open that run’s Q&A in a new tab
   • Baseline (0) line shows tooltip and tracks cursor
   ====================================================================== */

/* ---------- 0.  Cookie helpers -------------------------------------- */
function setCookie(name, value, days = 365) {
  const d = new Date(); d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}
function getCookie(name) {
  const p = name + "=";
  const hit = document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith(p));
  return hit ? decodeURIComponent(hit.slice(p.length)) : "";
}

/* ---------- 1.  Question bank -------------------------------------- */
const questions = [
  { id: 1,  text: "Right now my physical ENERGY feels…",              opts:["Sluggish","Steady","Bouncy"] },
  { id: 2,  text: "Urge to MOVE or fidget…",                          opts:["Low","Average","Can’t sit still"] },
  { id: 3,  text: "How I felt getting up this morning…",              opts:["Slow & foggy","Normal","Wide‑awake fast"] },
  { id: 4,  text: "Body temperature sense…",                          opts:["Cool","Neutral","Warm / slightly sweaty"] },
  { id: 5,  text: "Need for CAFFEINE so far today…",                  opts:["Stronger","Typical","Haven’t wanted any"] },
  { id: 6,  text: "Starting a boring task feels…",                    opts:["Ugh, later","OK","I’ll start now"] },
  { id: 7,  text: "Once started I STICK with tasks…",                 opts:["Quit easily","Average","Laser‑locked"] },
  { id: 8,  text: "Desire to try something NEW…",                     opts:["Prefer familiar","No preference","Craving novelty"] },
  { id: 9,  text: "I’m jumping between tasks…",                       opts:["Hardly","Some","A lot"] },
  { id:10,  text: "Small reward now vs bigger later…",                opts:["Take it now","Depends","Happy to wait"] },
  { id:11,  text: "Overall MOOD tone…",                               opts:["Flat / down","Fine","Upbeat"] },
  { id:12,  text: "Irritability…",                                    opts:["Touchy","Usual","Extra patient"] },
  { id:13,  text: "Social drive (talking, messaging)…",               opts:["Withdrawn","Normal","Very chatty"] },
  { id:14,  text: "Pleasure from small wins…",                        opts:["Barely notice","Normal","Feels great"] },
  { id:15,  text: "Craving comfort FOOD…",                            opts:["High","Normal","Low"] },
  { id:16,  text: "Urge to check phone / socials…",                   opts:["Constant tug","Normal","Rare"] },
  { id:17,  text: "Snacking on sweets / chips today…",                opts:["More than usual","Normal","Less"] },
  { id:18,  text: "Interest in SEX / romance thoughts…",              opts:["Down","Normal","Elevated"] },
  { id:19,  text: "Impulse to BUY stuff online…",                     opts:["Strong","Typical","Little"] },
  { id:20,  text: "Desire for fast media / gaming…",                  opts:["High","Normal","Low"] },
  { id:21,  text: "Ability to FOCUS on one thing…",                   opts:["Drifts fast","Average","Sustained"] },
  { id:22,  text: "Creative idea FLOW…",                              opts:["Stuck","Normal","Pouring out"] },
  { id:23,  text: "Working memory (hold a number)…",                  opts:["Slips quickly","Normal","Feels sharp"] },
  { id:24,  text: "Sense of TIME passing…",                           opts:["Dragging","Normal","Flies"] },
  { id:25,  text: "Mental FATIGUE right now…",                        opts:["Heavy","Moderate","Light"] }
];

/* ---------- 2.  Guidance blocks ------------------------------------ */
const guidance = {
  high:  { heading:"You’re ABOVE baseline",
           explainer:"Your dopamine tone looks elevated—restless energy, novelty craving, or mild agitation may be present.",
           actions:["Schedule 20 min of screen‑free quiet time.","Swap caffeine or sugary drinks for water.","Take a slow walk focusing on breathing.","Avoid doom‑scrolling for the next few hours."]},
  homeo: { heading:"In the HOMEOSTATIC zone",
           explainer:"You’re near your personal set‑point. Focus and motivation are balanced—keep doing what you’re doing!",
           actions:["Stick with your current sleep and exercise rhythm.","Use 90‑min focus blocks or Pomodoros.","Take a 2‑min gratitude pause to reinforce stability."]},
  low:   { heading:"You’re BELOW baseline",
           explainer:"Markers suggest a dip—lethargy, low drive, or stronger cravings for quick hits.",
           actions:["Get sunlight or bright‑lamp exposure for 10‑15 min.","Do 5‑10 min of moderate cardio.","Break tasks into tiny wins and celebrate each.","Aim for 30 min earlier bedtime tonight."]}
};

/* ---------- 3.  State & DOM refs ---------------------------------- */
let currentQ = 0, numericScores = [], answerIdxs = [], chartInst;

const introCard    = document.getElementById("intro-card");
const questionCard = document.getElementById("question-card");
const resultCard   = document.getElementById("result-card");

const qNumberEl   = document.getElementById("q-number");
const qTextEl     = document.getElementById("q-text");
const progressEl  = document.getElementById("progress");
const buttonsWrap = questionCard.querySelector(".buttons");

const scoreCtx   = document.getElementById("score-chart");
const stateHead  = document.getElementById("state-heading");
const stateExpl  = document.getElementById("state-explainer");
const actionList = document.getElementById("action-list");

const beginBtn   = document.getElementById("begin");
const restartBtn = document.getElementById("restart");
const prevBtn    = document.getElementById("prevResults");

const baselineTip = document.getElementById("baselineTip");

const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* ---------- 4.  History helpers ----------------------------------- */
function readHistory(){ try{return JSON.parse(getCookie("dopamineHistory")||"[]");}catch{return[];} }
function writeHistory(arr){ setCookie("dopamineHistory",JSON.stringify(arr)); }

/* ---------- 5.  Quiz flow ----------------------------------------- */
function startTest(){
  currentQ = 0;
  numericScores = [];
  answerIdxs = [];
  hide(resultCard); hide(introCard); show(questionCard);
  renderQuestion();
}

function renderQuestion(){
  const q = questions[currentQ];
  qNumberEl.textContent = `Question ${q.id} / 25`;
  qTextEl.textContent   = q.text;

  buttonsWrap.innerHTML = "";
  [-1,0,1].forEach((val,i)=>{
    const btn = document.createElement("button");
    btn.dataset.score = val;     // numeric score
    btn.dataset.idx   = i;       // answer index 0/1/2
    btn.textContent   = q.opts[i];
    buttonsWrap.appendChild(btn);
  });

  progressEl.textContent = `Progress: ${currentQ + 1} / 25`;
}

function handleAnswer(target){
  const score   = Number(target.dataset.score);
  const ansIdx  = Number(target.dataset.idx);
  numericScores.push(score);
  answerIdxs.push(ansIdx);

  if (++currentQ < questions.length) renderQuestion();
  else finishTest();
}

function finishTest(){
  const total = numericScores.reduce((a,b)=>a+b,0);
  const history = readHistory();
  history.push({ ts: Date.now(), score: total, ans: answerIdxs });
  history.sort((a,b)=>a.ts-b.ts);
  writeHistory(history.slice(-9));

  hide(questionCard);
  renderResult(readHistory());
  show(resultCard);
  show(prevBtn);
}

/* ---------- 6.  Open run details in new tab ----------------------- */
function openRunDetails(runObj){
  const htmlLines = [
    "<!doctype html><html><head><meta charset='utf-8'><title>Dopamine Check‑In – run details</title>",
    "<style>body{font-family:system-ui,sans-serif;padding:1rem 2rem;max-width:800px;margin:auto;}",
    "h1{font-size:1.4rem;margin:0 0 1rem;}table{width:100%;border-collapse:collapse;}th,td{padding:.4rem .6rem;}",
    "tr:nth-child(odd){background:#f6f8f9;}th{background:#0066ff;color:#fff;text-align:left;}</style></head><body>",
    `<h1>Run from ${new Date(runObj.ts).toLocaleString()}</h1>`,
    `<p>Total score: <strong>${runObj.score}</strong></p>`,
    "<table><tr><th>#</th><th>Question</th><th>Your answer</th></tr>"
  ];

  runObj.ans.forEach((idx,i)=>{
    htmlLines.push(`<tr><td>${i+1}</td><td>${questions[i].text}</td><td>${questions[i].opts[idx]}</td></tr>`);
  });

  htmlLines.push("</table></body></html>");
  const newWin = window.open("", "_blank");
  newWin.document.write(htmlLines.join(""));
  newWin.document.close();
}

/* ---------- 7.  Result / chart rendering -------------------------- */
function renderResult(history){
  if(!history.length) return;

  const latest = history.at(-1);
  const zone   = latest.score>=10?"high": latest.score<=-10?"low":"homeo";
  const g      = guidance[zone];
  stateHead.textContent = g.heading;
  stateExpl.textContent = g.explainer;
  actionList.innerHTML  = g.actions.map(a=>`<li>${a}</li>`).join("");

  const labels = history.map(h=>new Date(h.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  const data   = history.map(h=>h.score);
  const colors = history.map((h,i)=> i===history.length-1
       ? (zone==="high"?"#ff9800":zone==="low"?"#dd4b39":"#4caf50")
       : "#888");

  /* Plugin: baseline draw + hover tooltip */
  const baselinePlugin={
    id:"baselineHover",
    afterInit(chart){
      function move(e){
        if(!chart.$baselineY) return;
        const rect=chart.canvas.getBoundingClientRect();
        const y=e.clientY-rect.top;
        if(Math.abs(y-chart.$baselineY)<=6){
          baselineTip.classList.add("show"); baselineTip.classList.remove("hidden");
          baselineTip.style.left=`${e.clientX}px`;
          baselineTip.style.top =`${e.clientY}px`;
        }else{
          baselineTip.classList.remove("show");
        }
      }
      chart.canvas.addEventListener("mousemove",move);
      chart.canvas.addEventListener("mouseleave",()=>baselineTip.classList.remove("show"));
    },
    afterDraw(chart){
      const y0=chart.scales.y.getPixelForValue(0);
      chart.$baselineY=y0;
      const {ctx,scales:{x}}=chart;
      ctx.save(); ctx.strokeStyle="#9ecbff"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x.left,y0); ctx.lineTo(x.right,y0); ctx.stroke();
      ctx.restore();
    }
  };

  /* Build chart */
  if(chartInst) chartInst.destroy();
  chartInst = new Chart(scoreCtx, {
    type:"line",
    data:{
      labels,
      datasets:[{
        data,
        borderColor:"#ccc",
        fill:false,
        tension:0,
        pointBackgroundColor:colors,
        pointRadius:data.map((_,i)=>i===data.length-1?6:4)
      }]
    },
    options:{
      responsive:true,
      scales:{
        y:{min:-25,max:25,ticks:{stepSize:5}},
        x:{title:{display:true,text:"Today (oldest ↔ newest)"}}
      },
      plugins:{legend:{display:false},tooltip:{enabled:true}}
    },
    plugins:[baselinePlugin]
  });

  /* Make bullets clickable */
  chartInst.canvas.onclick = evt => {
    const pts = chartInst.getElementsAtEventForMode(evt, "nearest", {intersect:true}, true);
    if(!pts.length) return;
    const idx = pts[0].index;
    openRunDetails(history[idx]);
  };
}

/* ---------- 8.  Previous results view ----------------------------- */
const showPrev = () => {
  const h = readHistory();
  if(h.length){ hide(introCard); renderResult(h); show(resultCard); }
};

/* ---------- 9.  Event listeners ---------------------------------- */
beginBtn.addEventListener("click", startTest);
restartBtn.addEventListener("click", ()=>{ hide(resultCard); show(introCard); });
questionCard.addEventListener("click", e=>{
  if(e.target.dataset.score!==undefined) handleAnswer(e.target);
});
prevBtn.addEventListener("click", showPrev);

/* ----------10.  First‑load setup --------------------------------- */
if(readHistory().length) show(prevBtn);
