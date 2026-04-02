// --- AUDIO: Nice Chime Sound (Shared across all games) ---
function playSuccessSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (Happy Major Chord)
        
        notes.forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.1));
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + (index * 0.1));
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5 + (index * 0.1));
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + (index * 0.1));
            osc.stop(audioCtx.currentTime + 0.6 + (index * 0.1));
        });
    } catch (e) {
        console.log("Audio not supported or blocked by browser.");
    }
}

// --- UTILITY: Create Game Modal ---
function createModal(title, contentHTML) {
    const overlay = document.createElement('div');
    overlay.id = "game-modal";
    overlay.style = "position:fixed; inset:0; background:rgba(3, 105, 161, 0.95); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; backdrop-filter:blur(10px); overflow-y:auto;";
    overlay.innerHTML = `
        <div style="background:white; padding:30px; border-radius:30px; text-align:center; max-width:600px; width:100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
            <h2 style="font-size:2rem; margin-bottom:20px; color:#0369a1; font-weight:bold;">${title}</h2>
            <div id="game-content" style="margin-bottom:20px;">${contentHTML}</div>
            <button onclick="document.getElementById('game-modal').remove()" style="background:#64748b; color:white; padding:12px 30px; border-radius:50px; border:none; cursor:pointer; font-size:1.1rem;">Close Game</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// --- GAME 1: Face Match ---
function startFaceMatch(memories) {
    if (typeof memories === 'string') { try { memories = JSON.parse(memories); } catch (e) {}}
    if (!memories || memories.length === 0) return alert("Add memories first!");
    const person = memories[Math.floor(Math.random() * memories.length)];
    let choices = [person.name, "A Friend", "Neighbor"].sort(() => Math.random() - 0.5);
    const html = `
        <img src="${person.image_url}" style="width:200px; height:200px; border-radius:50%; object-fit:cover; margin-bottom:20px; border:8px solid #e0f2fe;">
        <div style="display:grid; gap:10px;">
            ${choices.map(c => `<button onclick="checkFace('${c}', '${person.name}')" class="btn-main" style="font-size:1.4rem; padding:15px;">${c}</button>`).join('')}
        </div>
    `;
    createModal("Who is this?", html);
}
function checkFace(s, a) { 
    if (s === a) { playSuccessSound(); alert("Correct!"); }
    else { alert("That's " + a); }
    document.getElementById('game-modal').remove(); 
}

// --- GAME 2: Word Search (Selection + Sound) ---
let currentSelection = []; 
let foundWords = [];

function startWordSearch() {
    const wordList = ["SUN", "TREE", "BIRD", "FISH", "CALM", "BLUE", "WAVE", "SKY"].sort(() => Math.random() - 0.5).slice(0, 5);
    foundWords = []; currentSelection = [];
    const size = 8;
    let grid = Array(size).fill().map(() => Array(size).fill(''));
    
    wordList.forEach(word => {
        let placed = false;
        while (!placed) {
            const isVertical = Math.random() > 0.5;
            let r = Math.floor(Math.random() * (isVertical ? size - word.length : size));
            let c = Math.floor(Math.random() * (isVertical ? size : size - word.length));
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                if (grid[isVertical ? r + i : r][isVertical ? c : c + i] !== '') canPlace = false;
            }
            if (canPlace) {
                for (let i = 0; i < word.length; i++) { grid[isVertical ? r + i : r][isVertical ? c : c + i] = word[i]; }
                placed = true;
            }
        }
    });

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    grid = grid.map(row => row.map(char => char || alphabet[Math.floor(Math.random() * 26)]));

    const html = `
        <p style="margin-bottom:15px; color:#0369a1; font-size:1.2rem; font-weight:bold;">
            Find: ${wordList.map(w => `<span id="list-${w}">${w}</span>`).join(', ')}
        </p>
        <div style="display:grid; grid-template-columns: repeat(${size}, 1fr); gap:5px; max-width:350px; margin:auto; user-select:none;">
            ${grid.map((row, r) => row.map((letter, c) => `
                <div onclick="handleWSClick(this, '${letter}', '${wordList.join(',')}')"
                     style="width:38px; height:38px; border:1px solid #e0f2fe; display:flex; align-items:center; justify-content:center; font-weight:bold; background:#f0f9ff; border-radius:5px; cursor:pointer; transition:0.2s;">
                    ${letter}
                </div>
            `).join('')).join('')}
        </div>
        <button onclick="document.getElementById('game-modal').remove()" class="btn-main" style="margin-top:20px;">Exit Game</button>
    `;
    createModal("Nature Search", html);
}

function handleWSClick(el, letter, allWordsStr) {
    const allWords = allWordsStr.split(',');
    if (el.style.background === 'rgb(14, 165, 233)') { // Deselect Blue
        el.style.background = '#f0f9ff'; el.style.color = '#1e293b';
        currentSelection = currentSelection.filter(item => item.el !== el);
    } else if (el.style.background !== 'rgb(253, 224, 71)') { // Select Blue
        el.style.background = '#0ea5e9'; el.style.color = 'white';
        currentSelection.push({el, letter});
    }

    const selectedString = currentSelection.map(s => s.letter).join('');
    const reversedString = selectedString.split('').reverse().join('');

    allWords.forEach(word => {
        if ((selectedString === word || reversedString === word) && !foundWords.includes(word)) {
            playSuccessSound();
            foundWords.push(word);
            currentSelection.forEach(item => { item.el.style.background = '#fde047'; item.el.style.color = '#713f12'; });
            document.getElementById(`list-${word}`).style.textDecoration = 'line-through';
            currentSelection = [];
        }
    });
}

// --- GAME 3: Crossword (WITH SOUND & JUMP LOGIC) ---
function startCrossword() {
    const puzzles = [
        { q: "It is big, yellow, and in the sky", a: "SUN" },
        { q: "You use these to walk", a: "FEET" },
        { q: "Opposite of Cold", a: "HOT" },
        { q: "The color of the ocean", a: "BLUE" },
        { q: "A pet that barks", a: "DOG" }
    ];
    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    const html = `
        <div style="padding:20px;">
            <p style="font-size:1.5rem; color:#1e293b; margin-bottom:20px;"><b>Clue:</b> ${puzzle.q}</p>
            <div style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">
                ${puzzle.a.split('').map((_, i) => `
                    <input id="char-${i}" type="text" maxlength="1" autocomplete="off"
                           oninput="moveNext(this, ${i}, ${puzzle.a.length})"
                           onkeydown="moveBack(event, ${i})"
                           style="width:55px; height:65px; text-align:center; font-size:2.2rem; border:3px solid #0369a1; border-radius:12px; text-transform:uppercase; font-weight:bold;">
                `).join('')}
            </div>
            <button onclick="checkCrossword('${puzzle.a}')" class="btn-main" style="width:100%;">Check Answer</button>
        </div>
    `;
    createModal("Mini Crossword", html);
    setTimeout(() => document.getElementById('char-0').focus(), 100);
}

function moveNext(input, index, total) { if (input.value.length === 1 && index < total - 1) { document.getElementById(`char-${index + 1}`).focus(); } }
function moveBack(event, index) {
    if (event.key === "Backspace") {
        const currentInput = document.getElementById(`char-${index}`);
        if (currentInput.value === "" && index > 0) {
            const prevInput = document.getElementById(`char-${index - 1}`);
            prevInput.focus(); prevInput.value = ""; event.preventDefault();
        }
    }
}

function checkCrossword(answer) {
    let guess = "";
    for(let i=0; i<answer.length; i++) { guess += document.getElementById(`char-${i}`).value.toUpperCase(); }
    if (guess === answer) {
        playSuccessSound(); // PLAY SOUND ON CROSSWORD WIN
        alert("Correct! Excellent memory.");
        document.getElementById('game-modal').remove();
    } else {
        alert("Not quite! Try again.");
    }
}

// Voice Synthesis
function speakOrientation() {
    const text = document.getElementById('orientation-content').innerText;
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.8; 
    synth.speak(utter);
}