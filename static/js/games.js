// ==========================================
// 1. SENSORY ENGINES (Standard US Nurse Voice)
// ==========================================
const synth = window.speechSynthesis;
let voices = [];

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
}

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

async function recordActivity(eventType, metadata = {}) {
    try {
        await fetch('/api/activity', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken()},
            body: JSON.stringify({event_type: eventType, metadata})
        });
    } catch (error) {
        console.warn('Activity tracking unavailable', error);
    }
}

function safeImageUrl(value) {
    try {
        const url = new URL(value, window.location.origin);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

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
    
    box.insertAdjacentHTML('beforeend', `<div class="p-3 bg-white/60 rounded-2xl mb-2 text-right shadow-sm"><b>You:</b> ${escapeHtml(msg)}</div>`);
    input.value = "";
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });

    let data;
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken()},
            body: JSON.stringify({ message: msg })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Chat request failed');
    } catch (error) {
        box.insertAdjacentHTML('beforeend', `<div role="alert" class="p-3 bg-red-100 rounded-2xl mb-2 text-red-800">${escapeHtml(error.message)}</div>`);
        return;
    }
    box.insertAdjacentHTML('beforeend', `<div class="p-3 bg-blue-500/10 rounded-2xl mb-2 text-sky-900 shadow-sm font-medium"><b>Aura:</b> ${escapeHtml(data.reply)}</div>`);
    
    speakAura(data.reply);
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
}

function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        alert("Voice input is not supported in this browser.");
        return;
    }
    const rec = new Recognition();
    rec.onresult = (e) => { document.getElementById('chat-input').value = e.results[0][0].transcript; sendChat(); };
    rec.start();
}

// ==========================================
// 3. WORD SEARCH (Yellow + Chime)
// ==========================================
function startWordSearch() {
    const size = 8;
    const bank = [
        'CALM', 'PEACE', 'SUN', 'SKY', 'BLUE', 'SMILE', 'KIND',
        'HOPE', 'LIGHT', 'BLOOM', 'BIRD', 'WARM', 'CLOUD', 'WATER'
    ];
    const requestedWords = shuffle([...bank]).slice(0, 4);
    const directions = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1]
    ];
    const grid = Array.from({length: size}, () => Array(size).fill(''));
    const placements = {};

    for (const word of requestedWords) {
        let placed = false;
        for (let attempt = 0; attempt < 200 && !placed; attempt++) {
            const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);
            const cells = [...word].map((letter, index) => [
                row + dr * index, col + dc * index, letter
            ]);
            if (cells.every(([r, c, letter]) =>
                r >= 0 && r < size && c >= 0 && c < size &&
                (!grid[r][c] || grid[r][c] === letter)
            )) {
                cells.forEach(([r, c, letter]) => { grid[r][c] = letter; });
                placements[word] = cells.map(([r, c]) => `${r},${c}`);
                placed = true;
            }
            const words = Object.keys(placements);
        }
    }
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (!grid[row][col]) {
                grid[row][col] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }
    window.wordSearchState = {placements, found: new Set(), selected: []};
    const gridHTML = grid.map((row, r) => row.map((letter, c) => `
        <button type="button" onclick="wsCellClick(this,${r},${c})"
             class="w-10 h-10 bg-white flex items-center justify-center font-bold rounded-lg cursor-pointer border border-sky-100 shadow-sm transition-all text-xl"
             aria-label="Letter ${letter}, row ${r + 1}, column ${c + 1}">
             ${letter}
        </button>
    `).join('')).join('');

    showModal("Nature Search", `
        <div class="mb-4 text-sky-700 font-bold text-xl">Find: ${words.join(', ')}</div>
        <div id="word-search-status" class="mb-4" role="status" aria-live="polite">Select each word one letter at a time.</div>
        <div class="grid grid-cols-8 gap-2 mx-auto" style="width:fit-content;">${gridHTML}</div>
    `);
}

function wsCellClick(el, row, col) {
    const key = `${row},${col}`;
    const state = window.wordSearchState;
    if (!state || state.found.has(key)) return;
    if (state.selected.includes(key)) {
        state.selected = state.selected.filter(cell => cell !== key);
        el.style.background = 'white';
        return;
    }
    state.selected.push(key);
    el.style.background = '#bae6fd';
    const match = Object.entries(state.placements).find(([, cells]) =>
        cells.length === state.selected.length &&
        (cells.every((cell, index) => cell === state.selected[index]) ||
         cells.slice().reverse().every((cell, index) => cell === state.selected[index]))
    );
    if (match) {
        state.found.add(match[0]);
        state.selected.forEach(cell => {
            const [r, c] = cell.split(',');
            document.querySelector(`[onclick="wsCellClick(this,${r},${c})"]`).style.background = '#fde047';
        });
        state.selected = [];
        playChime();
        const remaining = Object.keys(state.placements).length - state.found.size;
        document.getElementById('word-search-status').textContent =
            remaining ? `${remaining} word(s) remaining.` : 'Wonderful. You found every word.';
        if (!remaining) recordActivity('word_search_completed', {correct: true});
    } else if (!Object.values(state.placements).some(cells =>
        cells.slice(0, state.selected.length).every((cell, index) => cell === state.selected[index]) ||
        cells.slice().reverse().slice(0, state.selected.length).every((cell, index) => cell === state.selected[index])
    )) {
        state.selected.forEach(cell => {
            const [r, c] = cell.split(',');
            document.querySelector(`[onclick="wsCellClick(this,${r},${c})"]`).style.background = 'white';
        });
        state.selected = [];
        document.getElementById('word-search-status').textContent = 'That sequence is not a word. Try again.';
    }
}

function shuffle(items) {
    for (let index = items.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [items[index], items[swap]] = [items[swap], items[index]];
    }
    return items;
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
        recordActivity('crossword_completed', {correct: true});
        playChime();
        for(let i=0; i<answer.length; i++) {
            const el = document.getElementById('x-'+i);
            el.style.background = '#fde047'; // Turn boxes yellow
            el.style.color = '#713f12';
        }
        setTimeout(() => { alert("Wonderful! You got it right."); closeModal(); }, 600);
    } else {
        recordActivity('crossword_attempt', {correct: false});
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
    const actualName = escapeHtml(p.name);
    const choices = [p.name, "A Friend", "Neighbor"].sort(() => Math.random() - 0.5);
    const imageUrl = safeImageUrl(p.image_url);

    showModal("Who is this?", `
        <img src="${imageUrl}" alt="Memory photo" class="w-56 h-56 rounded-full mx-auto mb-8 border-8 border-white shadow-2xl object-cover">
        <div class="grid gap-4">
            ${choices.map(c => `<button class="btn-main text-2xl py-4" data-choice="${escapeHtml(c)}" data-actual="${actualName}" onclick="handleFaceAns(this.dataset.choice,this.dataset.actual)">${escapeHtml(c)}</button>`).join('')}
        </div>
    `);
}

function handleFaceAns(choice, actual) {
    const correct = choice === actual;
    recordActivity('face_match_completed', {correct});
    if (correct) { playChime(); alert("Correct!"); closeModal(); }
    else { alert("That is " + actual + ". They love you very much."); closeModal(); }
}

function showModal(t, h) {
    const m = document.createElement('div'); m.id = "aura-modal";
    m.className = "fixed inset-0 z-[999] flex items-center justify-center bg-sky-900/80 backdrop-blur-md p-4";
    m.innerHTML = `<div class="card p-10 max-w-lg w-full text-center bg-white/95 shadow-2xl animate-fade-in" style="border-radius:40px;"><h2 class="text-4xl font-bold mb-6 text-sky-950">${escapeHtml(t)}</h2><div id="modal-content">${h}</div><button onclick="closeModal()" class="mt-8 text-slate-400 underline font-bold">Close Game</button></div>`;
    document.body.appendChild(m);
}
function closeModal() { const m = document.getElementById('aura-modal'); if(m) m.remove(); }
