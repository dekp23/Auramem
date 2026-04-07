// ==========================================
// 1. SENSORY ENGINES (Standard US Nurse Voice)
// ==========================================
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
    voices = synth.getVoices();
}
loadVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99]; // C Major Chord
        notes.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.setValueAtTime(f, ctx.currentTime + (i * 0.1));
            g.gain.setValueAtTime(0.1, ctx.currentTime + (i * 0.1));
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(ctx.currentTime + (i * 0.1)); osc.stop(ctx.currentTime + 0.7);
        });
    } catch (e) { console.log("Audio blocked"); }
}

function speakAura(text) {
    synth.cancel();
    // Filter AI actions and clean text
    const cleanText = text.replace(/\*.*?\*/g, '').trim();
    const utter = new SpeechSynthesisUtterance(cleanText);
    
    // THE ACCENT EXORCIST
    // 1. Blacklist for all non-American international voices
    const blacklist = ['sweden', 'sverige', 'scotland', 'uk', 'great britain', 'ireland', 'hazel', 'george', 'india'];
    
    // 2. Look for the best American "Nurse" voice
    const bestVoice = voices.find(v => v.name.includes('Zira')) // Standard Windows US Female
                   || voices.find(v => v.name.includes('Aria')) // High-quality Natural US
                   || voices.find(v => v.name.includes('Google US English'))
                   || voices.find(v => v.lang === 'en-US' && !blacklist.some(b => v.name.toLowerCase().includes(b)))
                   || voices[0];

    utter.voice = bestVoice;
    utter.lang = 'en-US'; // Hard lock to US English
    utter.rate = 0.8;      // Calm, measured speed
    utter.pitch = 1.0; 
    
    console.log("Speaking with: " + bestVoice.name);
    synth.speak(utter);
}

// ==========================================
// 2. CHAT SYSTEM
// ==========================================
async function sendChat() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-messages');
    const msg = input.value.trim(); if(!msg) return;
    
    box.innerHTML += `<div class="p-3 bg-white/60 rounded-2xl mb-2 text-right shadow-sm"><b>You:</b> ${msg}</div>`;
    input.value = "";
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });

    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    box.innerHTML += `<div class="p-3 bg-blue-500/10 rounded-2xl mb-2 text-sky-900 shadow-sm font-medium"><b>Aura:</b> ${data.reply}</div>`;
    
    speakAura(data.reply);
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
}

function startVoice() {
    const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    rec.onresult = (e) => { document.getElementById('chat-input').value = e.results[0][0].transcript; sendChat(); };
    rec.start();
}

// ==========================================
// 3. WORD SEARCH (Yellow + Chime)
// ==========================================
function startWordSearch() {
    const grid = [['S','U','N','X','Y','Z','A','B'],['C','A','L','M','D','E','F','G'],['S','K','Y','H','I','J','K','L'],['B','L','U','E','M','N','O','P'],['A','R','T','Q','R','S','T','U'],['V','W','X','Y','Z','A','B','C'],['D','E','F','G','H','I','J','K'],['L','M','N','O','P','Q','R','S']];
    
    const gridHTML = grid.map((row, r) => row.map((l, c) => `
        <div onclick="wsCellClick(this,'${l}')" 
             class="w-10 h-10 bg-white flex items-center justify-center font-bold rounded-lg cursor-pointer border border-sky-100 shadow-sm transition-all text-xl">
             ${l}
        </div>
    `).join('')).join('');

    showModal("Nature Search", `
        <div class="mb-4 text-sky-700 font-bold text-xl">Find: SUN, CALM, SKY, BLUE</div>
        <div class="grid grid-cols-8 gap-2 mx-auto" style="width:fit-content;">${gridHTML}</div>
    `);
}

function wsCellClick(el, letter) {
    if (el.style.background.includes('rgb(253, 224, 71)')) return; // Already found

    if ("SUNCALMSKYBLUE".includes(letter)) {
        el.style.background = '#fde047'; // Success Yellow
        el.style.color = '#713f12';
        el.style.transform = 'scale(1.1)';
        playChime();
    } else {
        el.style.background = '#fee2e2'; // Brief Error Red
        setTimeout(() => el.style.background = 'white', 300);
    }
}

// ==========================================
// 4. CROSSWORD (Yellow + Chime)
// ==========================================
function startCrossword() {
    const p = { q: "The color of the ocean", a: "BLUE" };
    const inputs = p.a.split('').map((_, i) => `
        <input id="x-${i}" maxlength="1" autocomplete="off"
               class="w-14 h-18 text-center text-4xl font-bold border-4 border-sky-100 rounded-2xl outline-none transition-all"
               oninput="if(this.value) document.getElementById('x-${i+1}')?.focus()"
               onkeydown="if(event.key==='Backspace' && !this.value) { const prev = document.getElementById('x-${i-1}'); if(prev) { prev.value=''; prev.focus(); } }">
    `).join('');

    showModal("Daily Puzzle", `
        <p class="text-2xl mb-6 text-sky-800 font-medium">${p.q}</p>
        <div class="flex justify-center gap-2 mb-8">${inputs}</div>
        <button onclick="checkX('${p.a}')" class="btn-main w-full py-4 text-2xl shadow-xl">Check Answer</button>
    `);
    setTimeout(() => document.getElementById('x-0')?.focus(), 200);
}

function checkX(answer) {
    let guess = "";
    for(let i=0; i<answer.length; i++) { guess += (document.getElementById('x-'+i).value || "").toUpperCase(); }
    
    if(guess === answer) {
        playChime();
        for(let i=0; i<answer.length; i++) {
            const el = document.getElementById('x-'+i);
            el.style.background = '#fde047'; // Turn boxes yellow
            el.style.color = '#713f12';
        }
        setTimeout(() => { alert("Wonderful! You got it right."); closeModal(); }, 600);
    } else {
        alert("Not quite, dear. Try again.");
    }
}

// ==========================================
// 5. FACE MATCH & MODALS
// ==========================================
function startFaceMatch() {
    const data = JSON.parse(document.getElementById('memory-vault').textContent);
    if(!data || data.length === 0) return alert("Add family photos in settings first!");
    const p = data[Math.floor(Math.random() * data.length)];
    const choices = [p.name, "A Friend", "Neighbor"].sort(() => Math.random() - 0.5);
    
    showModal("Who is this?", `
        <img src="${p.image_url}" class="w-56 h-56 rounded-full mx-auto mb-8 border-8 border-white shadow-2xl object-cover">
        <div class="grid gap-4">
            ${choices.map(c => `<button class="btn-main text-2xl py-4" onclick="handleFaceAns('${c}','${p.name}')">${c}</button>`).join('')}
        </div>
    `);
}

function handleFaceAns(choice, actual) {
    if (choice === actual) { playChime(); alert("Correct!"); closeModal(); }
    else { alert("That is " + actual + ". They love you very much."); closeModal(); }
}

function showModal(t, h) {
    const m = document.createElement('div'); m.id = "aura-modal";
    m.className = "fixed inset-0 z-[999] flex items-center justify-center bg-sky-900/80 backdrop-blur-md p-4";
    m.innerHTML = `<div class="card p-10 max-w-lg w-full text-center bg-white/95 shadow-2xl animate-fade-in" style="border-radius:40px;"><h2 class="text-4xl font-bold mb-6 text-sky-950">${t}</h2><div id="modal-content">${h}</div><button onclick="closeModal()" class="mt-8 text-slate-400 underline font-bold">Close Game</button></div>`;
    document.body.appendChild(m);
}
function closeModal() { const m = document.getElementById('aura-modal'); if(m) m.remove(); }