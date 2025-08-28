// ===== Backend config (read from HTML) =====
const { ENDPOINT, KEY } = (window.TL_CFG || {});
if (!ENDPOINT || !KEY) {
  console.warn("Missing ENDPOINT/KEY. Set meta tags + TL_CFG in HTML.");
}

// ===== Backend helpers =====
async function fetchEventsFromBackend() {
  const url = new URL(ENDPOINT);
  url.searchParams.set("key", KEY);
  url.searchParams.set("action", "events");
  const res  = await fetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error || "events_failed");
  return data;
}

async function logPlayToBackend(ids, result = "") {
  const url = new URL(ENDPOINT);
  url.searchParams.set("key", KEY);
  url.searchParams.set("action", "play");
  url.searchParams.set("ids", ids.join(","));
  if (result) url.searchParams.set("result", result);

  const res = await fetch(url, { method: "GET" });
  try {
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "play_failed");
    return data;
  } catch {
    const txt = await res.text();
    if (txt.trim() !== "ok") throw new Error("play_failed: " + txt);
    return { ok: true };
  }
}

/* === All Events pool (local) === */
const ALL_EVENTS = [

  { id:"phone76", title:"First Telephone", year:1876, hint:"First invention of the telephone", img:"images/Tell.svg" },
  { id:"tv54", title:"First Color TV Broadcast", year:1954, hint:"First television in color", img:"images/TV.svg" },
  { id:"mac84", title:"Apple Macintosh", year:1984, hint:"GUI & mouse popularized", img:"images/Apple.png" },
  { id:"www91", title:"World Wide Web",  year:1991, hint:"The modern web begins",  img:"images/World.png" },
  { id:"google98", title:"Google Founded", year:1998, hint:"Search revolution",     img:"images/Google.svg" },
  { id:"msn99", title:"MSN Messenger", year:1999, hint:"Instant messaging era", img:"images/msn.svg" },
  { id:"fb04", title:"Facebook Launch",   year:2004, hint:"Mainstream social media",img:"images/facebook.png" },
  { id:"bb05", title:"BlackBerry Smartphone", year:2005, hint:"BBM era", img:"images/blackb.svg" },
  { id:"iphone07", title:"First iPhone",  year:2007, hint:"Smartphone era",         img:"images/frist.png" },
  { id:"chatgpt22", title:"ChatGPT Launch",year:2022, hint:"Generative AI",         img:"images/ChatG.png" }
];


/* Pick N random events */
function pickRandomEvents(n=6) {
  return [...ALL_EVENTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, n);
}

/* Default events for current round */
let EVENTS = pickRandomEvents();
let DID_LOAD_FROM_BACKEND = false;

/* DOM elements */
const startBtn  = document.getElementById('startBtn');
const startEl   = document.getElementById('start');
const gameEl    = document.getElementById('game');
const trayEl    = document.getElementById('tray');
const feedback  = document.getElementById('feedback');
const checkBtn  = document.getElementById('checkBtn');
const resetBtn  = document.getElementById('resetBtn');

/* Shuffle helper */
function shuffle(a){ 
  return a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]); 
}

/* Create card */
function makeCard(e){
  const div = document.createElement('div');
  div.className = 'cardItem';
  div.dataset.id = e.id;
  div.innerHTML = `
    <div class="chip"></div>
    <img src="${e.img}" alt="${e.title}" class="card-icon" />
    <div class="title">${e.title}</div>
    <div class="hint">${e.hint}</div>
  `;
  return div;
}

/* Build years row dynamically */
function buildYearsRow(events) {
  const yearsRow = document.getElementById('yearsRow');
  yearsRow.innerHTML = `<div class="timeline"></div>`; // reset
  const sorted = [...events].sort((a,b) => a.year - b.year);

  sorted.forEach(ev => {
    const wrapper = document.createElement('div');
    wrapper.className = 'year-wrapper';
    wrapper.innerHTML = `
      <div class="slot"><span class="ph">Drop here</span></div>
      <div class="year-point">${ev.year}</div>
    `;
    yearsRow.appendChild(wrapper);
  });
}

/* Populate game board */
function populate(){
  trayEl.innerHTML = '';
  feedback.style.display = "none";
  checkBtn.disabled = true;

  buildYearsRow(EVENTS); 
  shuffle([...EVENTS]).forEach(e => trayEl.appendChild(makeCard(e))); 

  setupDnD();
  adjustTimeline();
}

/* Update check button */
function updateCheckButton() {
  const slots = document.querySelectorAll('.slot');
  const allFilled = Array.from(slots).every(s => s.dataset.id && s.dataset.id !== "");
  checkBtn.disabled = !allFilled;
}

/* Drag & Drop setup */
function setupDnD(){
  new Sortable(trayEl,{
    group:{name:'cards', pull:true, put:true},  
    sort:false, 
    animation:150 
  });

  document.querySelectorAll('.slot').forEach(slot=>{
    new Sortable(slot,{
      group:{name:'cards', pull:true, put:true}, 
      sort:false, 
      animation:150,

      onAdd:(evt)=>{
        const ph = evt.to.querySelector('.ph');
        if(ph) ph.remove();
        if(evt.to.children.length > 1){
          evt.from.appendChild(evt.item);
          if(evt.to.children.length === 0){
            evt.to.innerHTML = `<span class="ph">Drop here</span>`;
          }
          return;
        }
        evt.to.classList.add('filled');
        evt.to.dataset.id = evt.item.dataset.id;
        const yearPoint = evt.to.parentElement.querySelector('.year-point');
        if(yearPoint) yearPoint.classList.add('filled');
        updateCheckButton();
      },

      onRemove:(evt)=>{
        if(evt.from.children.length === 0){
          evt.from.classList.remove('filled');
          evt.from.dataset.id='';
          evt.from.innerHTML = `<span class="ph">Drop here</span>`;
          const yearPoint = evt.from.parentElement.querySelector('.year-point');
          if(yearPoint) yearPoint.classList.remove('filled');
        }
        updateCheckButton();
      }
    });
  });
}

/* Check order */
async function checkOrder(){
  const slots = document.querySelectorAll('.slot');
  slots.forEach(s=>{
    const card = s.querySelector('.cardItem');
    if(card) {
      card.classList.remove('wrong','correct');
      const title = card.querySelector('.title');
      const hint = card.querySelector('.hint');
      const correction = card.querySelector('.correction');
      const chip = card.querySelector('.chip');
      if(correction) correction.remove();
      if(title) title.style.display = "block";
      if(hint) hint.style.display = "block";
      if(chip) chip.style.background = "linear-gradient(90deg, var(--brand-4), var(--brand-2))";
    }
  });

  const correctOrder = [...EVENTS].sort((a,b)=>a.year-b.year);
  const correctIds = correctOrder.map(e=>e.id);
  const current = Array.from(slots).map(s=>s.dataset.id||null);

  let wrong=[];
  current.forEach((id,i)=>{
    const card = slots[i].querySelector('.cardItem');
    if(!card) return;
    const chip = card.querySelector('.chip');
    if(id === correctIds[i]){
      card.classList.add('correct');
      if(chip) chip.style.background = "linear-gradient(90deg, var(--good), #6ee7b7)";
    } else {
      card.classList.add('wrong');
      wrong.push(i);
      const title = card.querySelector('.title');
      const hint = card.querySelector('.hint');
      if(title) title.style.display = "none";
      if(hint) hint.style.display = "none";
      if(chip) chip.style.background = "linear-gradient(90deg, #ef4444, #f87171)";
      const correctEvent = correctOrder[i];
      const correction = document.createElement('div');
      correction.className = 'correction';
      correction.innerHTML = `Should be: <strong>${correctEvent.title}</strong> • ${correctEvent.year}`;
      card.appendChild(correction);
    }
  });

  feedback.style.display = "block";
  if(wrong.length===0){
    feedback.innerHTML = `<img src="images/Suc.png" alt="Correct!" class="result-img success">`;
  } else {
    feedback.innerHTML = `<img src="images/wrong1.png" alt="Wrong!" class="result-img fail">`;
  }

  try {
    const ids = current;
    const pct = Math.round(((EVENTS.length - wrong.length) / EVENTS.length) * 100);
    const result = (pct === 100) ? "win" : "loss";
    await logPlayToBackend(ids, result);
    checkBtn.disabled = true;
  } catch (e) {
    console.warn("Could not log play:", e.message || e);
  }
}

/* Timeline adjust */
function adjustTimeline() {
  const timeline = document.querySelector('.timeline');
  const circles = document.querySelectorAll('.year-point');
  if (!timeline || circles.length < 2) return;

  const first = circles[0].getBoundingClientRect();
  const last  = circles[circles.length - 1].getBoundingClientRect();
  const parent = timeline.parentElement.getBoundingClientRect();

  const left = (first.left + first.width / 2) - parent.left;
  const width = (last.left + last.width / 2) - (first.left + first.width / 2);
  timeline.style.left = `${left}px`;
  timeline.style.width = `${width}px`;

  const circleCenter = first.top + (first.height / 2) - parent.top;
  const lineCenter = circleCenter - (timeline.offsetHeight / 2);
  timeline.style.top = `${lineCenter}px`;
}

/* Event listeners */
startBtn.addEventListener('click', async ()=>{
  startEl.style.display='none';
  gameEl.style.display='flex';
  document.getElementById('logoBar').style.display = 'none';

  try {
    const { events } = await fetchEventsFromBackend();
    if (Array.isArray(events) && events.length) {
      const localById = Object.fromEntries(ALL_EVENTS.map(e => [e.id, e]));
      EVENTS = events.map(e => ({
        ...e,
        img:  (e.img  !== undefined ? e.img  : localById[e.id]?.img)  || "images/placeholder.png",
        hint: (e.hint !== undefined ? e.hint : localById[e.id]?.hint) || ""
      }));
      DID_LOAD_FROM_BACKEND = true;
    } else {
      EVENTS = pickRandomEvents();
    }
  } catch (err) {
    console.warn("Using local EVENTS fallback:", err.message || err);
    EVENTS = pickRandomEvents();
  }

  populate();
});

checkBtn.addEventListener('click', checkOrder);

resetBtn.addEventListener('click', ()=>{
  EVENTS = pickRandomEvents();
  populate();
});

window.addEventListener('load', adjustTimeline);
window.addEventListener('resize', adjustTimeline);




