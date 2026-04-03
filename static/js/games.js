// --- AUDIO ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSuccessChime() {
    [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + (i * 0.1));
        g.gain.setValueAtTime(0.1, audioCtx.currentTime + (i * 0.1));
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + (i * 0.1)); osc.stop(audioCtx.currentTime + 0.7);
    });
}

// --- VOICE ENGINE ---
function speakNurturing(id) {
    const text = document.getElementById(id).innerText;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utter.voice = voices.find(v => v.name.includes('Natural') || v.name.includes('Aria')) || voices[0];
    utter.rate = 0.72; utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
}

// --- ANALYTICS ---
function logGame(type, accuracy, start) {
    fetch('/log_game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ type, accuracy, time: (Date.now() - start)/1000 })
    });
}

// --- GAMES ---
function startFaceMatch(m) {
    const startTime = Date.now();
    if (typeof m === 'string') m = JSON.parse(m);
    if (!m.length) return alert("Add memories first!");
    const p = m[Math.floor(Math.random() * m.length)];
    const choices = [p.name, "Friend", "Relative"].sort(() => Math.random() - 0.5);
    
    showModal("Who is this?", `
        <img src="${p.image_url}" style="width:240px;height:240px;border-radius:50%;object-fit:cover;margin:auto;border:10px solid white;display:block;margin-bottom:2rem;">
        <div class="grid gap-4">${choices.map(c => `<button class="btn-main text-2xl" onclick="finishFace('${c}','${p.name}',${startTime})">${c}</button>`).join('')}</div>
    `);
}
function finishFace(s,a,t) { 
    const correct = s === a;
    if(correct) playSuccessChime();
    logGame('FaceMatch', correct ? 100 : 0, t);
    alert(correct ? "Wonderful!" : "That is " + a);
    closeModal();
}

// Word Search Logic (Integrated Selection + Sound)
let wsSelected = [];
function startWordSearch() {
    const startTime = Date.now();
    const words = ["SUN", "BLUE", "CALM", "SKY", "WAVE"].sort(() => Math.random() - 0.5);
    const size = 8; let grid = Array(size).fill().map(() => Array(size).fill(''));
    words.forEach(w => {
        let placed = false;
        while(!placed) {
            const v = Math.random() > 0.5;
            let r = Math.floor(Math.random() * (v ? size - w.length : size));
            let c = Math.floor(Math.random() * (v ? size : size - w.length));
            let can = true;
            for(let i=0; i<w.length; i++) if(grid[v?r+i:r][v?c:c+i] !== '') can = false;
            if(can) { for(let i=0; i<w.length; i++) grid[v?r+i:r][v?c:c+i] = w[i]; placed = true; }
        }
    });
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    grid = grid.map(row => row.map(char => char || abc[Math.floor(Math.random() * 26)]));
    wsSelected = [];
    showModal("Nature Search", `
        <p class="mb-4 text-xl">Find: ${words.map(w => `<span id="ws-${w}">${w}</span>`).join(', ')}</p>
        <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;width:320px;margin:auto;">
            ${grid.map((row,r) => row.map((l,c) => `<div id="c-${r}-${c}" onclick="wsClick(this,'${l}','${words.join(',')}',${startTime})" style="width:36px;height:36px;background:#f0f9ff;display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;border-radius:4px;">${l}</div>`).join('')).join('')}
        </div>
    `);
}

function wsClick(el, l, all, start) {
    if(el.style.background === 'rgb(253, 224, 71)') return;
    el.style.background = el.style.background === 'rgb(14, 165, 233)' ? '#f0f9ff' : '#0ea5e9';
    el.style.color = el.style.background === 'rgb(14, 165, 233)' ? 'white' : 'black';
    wsSelected = el.style.background === 'rgb(14, 165, 233)' ? [...wsSelected, {el, l}] : wsSelected.filter(x => x.el !== el);
    
    const str = wsSelected.map(s => s.l).join('');
    all.split(',').forEach(w => {
        if(str === w || str === w.split('').reverse().join('')) {
            playSuccessChime();
            wsSelected.forEach(i => { i.el.style.background = '#fde047'; i.el.style.color = '#713f12'; });
            document.getElementById('ws-'+w).style.textDecoration = 'line-through';
            wsSelected = [];
        }
    });
}

// Crossword with Backspace + AutoFocus
function startCrossword() {
    const start = Date.now();
    const p = {q: "Color of the sky", a: "BLUE"};
    showModal("Mini Crossword", `
        <p class="text-2xl mb-6">${p.q}</p>
        <div class="flex justify-center gap-2 mb-6">
            ${p.a.split('').map((_,i) => `<input id="x-${i}" oninput="if(this.value)document.getElementById('x-${i+1}')?.focus()" onkeydown="if(event.key==='Backspace'&&!this.value)document.getElementById('x-${i-1}')?.focus()" class="w-16 h-20 text-center text-4xl font-bold border-4 border-sky-800 rounded-xl" maxlength="1">`).join('')}
        </div>
        <button class="btn-main w-full" onclick="checkX('${p.a}',${start})">Check</button>
    `);
    setTimeout(() => document.getElementById('x-0').focus(), 100);
}
function checkX(a,s) {
    let g = ""; a.split('').forEach((_,i) => g += document.getElementById('x-'+i).value.toUpperCase());
    if(g === a) { playSuccessChime(); logGame('Crossword', 100, s); alert("Correct!"); closeModal(); }
}

function showModal(t, h) {
    const m = document.createElement('div'); m.id = "modal";
    m.style = "position:fixed;inset:0;background:rgba(3,105,161,0.9);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(10px);padding:20px;";
    m.innerHTML = `<div class="card p-10 max-w-lg w-full text-center"><h2 class="text-4xl font-bold mb-6 text-sky-900">${t}</h2>${h}<button onclick="closeModal()" class="mt-8 text-slate-500 underline">Close</button></div>`;
    document.body.appendChild(m);
}
function closeModal() { document.getElementById('modal').remove(); }