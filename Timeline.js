/* === Events data (cards) === */
const EVENTS = [
  { id:"mac84", title:"Apple Macintosh", year:1984, hint:"GUI & mouse popularized", img:"images/Apple.png" },
  { id:"www91", title:"World Wide Web",  year:1991, hint:"The modern web begins", img:"images/World.png" },
  { id:"google98", title:"Google Founded", year:1998, hint:"Search revolution", img:"images/Google.svg" },
  { id:"fb04", title:"Facebook Launch", year:2004, hint:"Mainstream social media", img:"images/facebook.png" },
  { id:"iphone07", title:"First iPhone", year:2007, hint:"Smartphone era", img:"images/frist.png" },
  { id:"chatgpt22", title:"ChatGPT Launch", year:2022, hint:"Generative AI", img:"images/ChatG.png" }
];

/* Correct chronological order (by year) */
const YEARS_ORDER = [...EVENTS].sort((a,b)=>a.year-b.year).map(e=>e.year);

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

/* Create a draggable card */
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

/* Reset the game board */
function populate(){
  trayEl.innerHTML='';
  feedback.style.display = "none";
  checkBtn.disabled = true; // زر check يبدأ مقفول
  shuffle([...EVENTS]).forEach(e => trayEl.appendChild(makeCard(e)));
}

/* تحديث حالة زر Check */
function updateCheckButton() {
  const slots = document.querySelectorAll('.slot');
  const allFilled = Array.from(slots).every(s => s.dataset.id && s.dataset.id !== "");
  checkBtn.disabled = !allFilled;
}

/* Setup drag-and-drop logic */
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
        if(ph) ph.remove(); // ⬅️ احذف placeholder

        // ⛔️ امنع أكثر من كارد واحد
        if(evt.to.children.length > 1){
          evt.from.appendChild(evt.item); // رجّع الكارد مكانه

          // ✅ إذا الـ slot فاضي رجّع placeholder
          if(evt.to.children.length === 0){
            evt.to.innerHTML = `<span class="ph">Drop here</span>`;
          }
          return;
        }

        evt.to.classList.add('filled');
        evt.to.dataset.id = evt.item.dataset.id;

        // ✨ غيّر الدائرة
        const yearPoint = evt.to.parentElement.querySelector('.year-point');
        if(yearPoint) yearPoint.classList.add('filled');

        updateCheckButton();
      },

      onRemove:(evt)=>{
        if(evt.from.children.length === 0){
          evt.from.classList.remove('filled');
          evt.from.dataset.id='';
          evt.from.innerHTML = `<span class="ph">Drop here</span>`; // ✅ رجّع النص

          const yearPoint = evt.from.parentElement.querySelector('.year-point');
          if(yearPoint) yearPoint.classList.remove('filled');
        }
        updateCheckButton();
      }
    });
  });
}


/* Check correctness */
function checkOrder(){
  const slots = document.querySelectorAll('.slot');
  slots.forEach(s=>{
    const card = s.querySelector('.cardItem');
    if(card) {
      card.classList.remove('wrong','correct');

      // 🧹 نرجع المحتوى الطبيعي
      const title = card.querySelector('.title');
      const hint = card.querySelector('.hint');
      const correction = card.querySelector('.correction');
      const chip = card.querySelector('.chip');

      if(correction) correction.remove();
      if(title) title.style.display = "block";
      if(hint) hint.style.display = "block";
      if(chip) chip.style.background = "linear-gradient(90deg, var(--brand-4), var(--brand-2))"; // نرجع الأزرق العادي
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
      if(chip) chip.style.background = "linear-gradient(90deg, var(--good), #6ee7b7)"; // أخضر متدرج
    } else {
      card.classList.add('wrong');
      wrong.push(i);

      // ✨ أخفي النصوص الأصلية
      const title = card.querySelector('.title');
      const hint = card.querySelector('.hint');
      if(title) title.style.display = "none";
      if(hint) hint.style.display = "none";

      // ✨ غير لون اللاين للأحمر
      if(chip) chip.style.background = "linear-gradient(90deg, #ef4444, #f87171)";

      // ✨ أضف التصحيح مكانها
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

}



/* Event listeners */
startBtn.addEventListener('click',()=>{
  startEl.style.display='none';
  gameEl.style.display='flex';

  document.getElementById('logoBar').style.display = 'none';

  populate();
  setupDnD();
});

checkBtn.addEventListener('click', checkOrder);

resetBtn.addEventListener('click', ()=>{
  document.querySelectorAll('.slot').forEach(slot=>{
    slot.innerHTML = `<span class="ph">Drop here</span>`;
    slot.classList.remove('filled', 'wrong', 'correct');
    slot.dataset.id = '';

    const yearPoint = slot.parentElement.querySelector('.year-point');
    if(yearPoint) yearPoint.classList.remove("filled"); // ✨ رجّع الدائرة
  });

  feedback.style.display = "none";
  feedback.innerHTML = "";

  populate();
  setupDnD();
});
