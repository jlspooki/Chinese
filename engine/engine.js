// Engine with scenarios + cheat sheet + flashcards + HSK vocab tracking

const state = {
  scenarios: {},      // { key: Scenario }
  currentKey: null,
  currentIndex: 0
};

// Elements
const menuEl = document.getElementById('menu');
const listEl = document.getElementById('scenario-list');
const gameEl = document.getElementById('game');
const sceneBox = document.getElementById('scene-box');
const backBtn = document.getElementById('backBtn');
const filterEl = document.getElementById('filter');
const gameHeader = document.getElementById('gameHeader');
const hskLevelEl = document.getElementById('hskLevel');


// HSK vocab
let hskVocab = [];

// Helpers
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// Load packs manifest then packs
async function loadPacks() {
  const manifest = await fetch('./packs/packs.json').then(r => r.json());
  for (const file of manifest.packs) {
    const pack = await fetch('./packs/' + file).then(r => r.json());
    Object.entries(pack.scenarios).forEach(([key, scenario]) => {
      scenario.pack = pack.title; // tag scenario with pack title
      state.scenarios[key] = scenario;
    });
  }
}

// Load HSK vocab
async function loadHSK(level) {
  if (level === "all") {
    const [hsk1, hsk2] = await Promise.all([
      fetch('./data/hsk1.json').then(r => r.json()),
      fetch('./data/hsk2.json').then(r => r.json())
    ]);
    hskVocab = [...hsk1, ...hsk2];
  } else {
    hskVocab = await fetch(`./data/hsk${level}.json`).then(r => r.json());
  }
  console.log("Loaded HSK", level, "length:", hskVocab.length);
}


// Render menu
function renderMenu() {
  listEl.innerHTML = '';
  const filter = filterEl.value;

  Object.entries(state.scenarios).forEach(([key, s]) => {
    if (filter !== 'all' && !s.hsk.includes(parseInt(filter,10))) return;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = s.title;
    btn.addEventListener('click', () => startScenario(key));
    listEl.appendChild(btn);
  });

  // Show HSK progress summary
  const summary = getProgressSummary();
  Object.keys(summary).forEach(level => {
    const div = document.createElement('div');
    div.textContent = `HSK ${level}: ${summary[level]} words seen`;
    listEl.appendChild(div);
  });

  hide(gameEl);
  show(menuEl);
}

function startScenario(key) {
  state.currentKey = key;
  state.currentIndex = 0;
  hide(menuEl);
  show(gameEl);
  hide(document.getElementById('hskTable'));
  renderScene();
}

function createLineBlock(zh, pinyin, en) {
  const wrap = document.createElement('div');
  wrap.className = 'line';
  const main = document.createElement('div');
  main.textContent = zh;

  const toggle = document.createElement('span');
  toggle.className = 'toggle';
  toggle.textContent = '[?]';

  const trans = document.createElement('div');
  trans.className = 'translation';
  trans.innerHTML = `<div>${pinyin}</div><div>${en}</div>`;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    trans.style.display = trans.style.display === 'block' ? 'none' : 'block';
  });

  main.appendChild(toggle);
  wrap.appendChild(main);
  wrap.appendChild(trans);
  return wrap;
}

function renderScene() {
  const s = state.scenarios[state.currentKey];
  if (!s) { returnToMenu(); return; }
  const scene = s.scenes[state.currentIndex];
  if (!scene) { endScenario(); return; }

  gameHeader.textContent = `${s.title} — 场景 ${state.currentIndex + 1} / ${s.scenes.length}`;

  sceneBox.innerHTML = '';
  // NPC line
  sceneBox.appendChild(createLineBlock(scene.npc.zh, scene.npc.pinyin, scene.npc.en));

  // Choices
  scene.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.textAlign = 'left';

    const label = document.createElement('div');
    label.textContent = choice.zh;

    const toggle = document.createElement('span');
    toggle.className = 'toggle';
    toggle.textContent = '[?]';

    const trans = document.createElement('div');
    trans.className = 'translation';
    trans.innerHTML = `<div>${choice.pinyin}</div><div>${choice.en}</div>`;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      trans.style.display = trans.style.display === 'block' ? 'none' : 'block';
    });

    label.appendChild(toggle);
    btn.appendChild(label);
    btn.appendChild(trans);

    btn.addEventListener('click', () => {
      if (choice.next === 'end' || choice.next === 'menu') {
        endScenario();
      } else if (typeof choice.next === 'number') {
        state.currentIndex = choice.next;
        renderScene();
      } else {
        endScenario();
      }
    });

    sceneBox.appendChild(btn);
  });
}
// ---- Cheat Sheet Functions ----
function buildCheatSheet(scenario) {
  const sheet = [];
  scenario.scenes.forEach(scene => {
    sheet.push(scene.npc);
    scene.choices.forEach(choice => sheet.push(choice));
  });
  return sheet;
}

function renderCheatSheet(sheet) {
  const learnerLevel = filterEl.value === 'all' ? 99 : parseInt(filterEl.value,10);

  const table = document.createElement('table');
  table.border = "1";
  table.cellPadding = "6";
  table.style.marginTop = "16px";
  table.innerHTML = `
    <tr><th>Chinese</th><th>Pinyin</th><th>English</th><th>HSK</th></tr>
    ${sheet.map(line => {
      const highlight = line.hsk > learnerLevel ? ' style="color:red;font-weight:bold;"' : '';
      return `
        <tr${highlight}>
          <td>${line.zh}</td>
          <td>${line.pinyin}</td>
          <td>${line.en}</td>
          <td>${line.hsk}</td>
        </tr>
      `;
    }).join('')}
  `;
  sceneBox.appendChild(table);
}

// ---- Flashcards ----
let flashcards = [];
let flashIndex = 0;

function buildFlashcards(scenario) {
  flashcards = buildCheatSheet(scenario);
  flashIndex = 0;
}

function renderFlashcard() {
  sceneBox.innerHTML = '';

  if (flashIndex >= flashcards.length) {
    const done = document.createElement('div');
    done.className = 'line';
    done.textContent = "✅ All flashcards reviewed!";
    sceneBox.appendChild(done);

    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = '返回主菜单 (Return to Main Menu)';
    back.addEventListener('click', returnToMenu);
    sceneBox.appendChild(back);
    return;
  }

  const card = flashcards[flashIndex];

  const front = document.createElement('div');
  front.className = 'line';
  front.style.fontSize = '24px';
  front.style.textAlign = 'center';
  front.textContent = card.zh;
  sceneBox.appendChild(front);

  const reveal = document.createElement('button');
  reveal.className = 'btn';
  reveal.textContent = 'Show Answer';
  reveal.addEventListener('click', () => {
    const back = document.createElement('div');
    back.className = 'line';
    back.innerHTML = `<div>${card.pinyin}</div><div>${card.en}</div><div>HSK ${card.hsk}</div>`;
    sceneBox.appendChild(back);

    const next = document.createElement('button');
    next.className = 'btn';
    next.textContent = 'Next Card';
    next.addEventListener('click', () => {
      flashIndex++;
      renderFlashcard();
    });
    sceneBox.appendChild(next);
  });
  sceneBox.appendChild(reveal);
}
// ---- HSK Integration ----
function extractWordsFromLine(line) {
  const words = [];
  hskVocab.forEach(entry => {
    if (line.includes(entry.simplified)) {
      words.push(entry);
    }
  });
  return words;
}

// ---- HSK Table ----

function renderhskTable() {
  const container = document.getElementById('hskTable');
  if (!container) return;

  if (!hskVocab || hskVocab.length === 0) {
    container.innerHTML = "<p>No HSK data loaded.</p>";
    return;
  }

  const progress = JSON.parse(localStorage.getItem('progress') || '{}');

  const table = document.createElement('table');
  table.border = "1";
  table.cellPadding = "6";
  table.style.marginTop = "16px";
  table.innerHTML = `
    <tr>
      <th>Word</th>
      <th>Pinyin</th>
      <th>English</th>
      <th>HSK Level</th>
      <th>Status</th>
    </tr>
    ${hskVocab.map(w => {
      const seen = progress[w.simplified];
      return `
        <tr>
          <td>${w.simplified}</td>
          <td>${w.pinyin}</td>
          <td>${Array.isArray(w.meanings) ? w.meanings.join(', ') : w.meanings}</td>
          <td>${w.level}</td>
          <td>${seen ? "✅ Seen" : "⭐ New"}</td>
        </tr>
      `;
    }).join('')}
  `;

  container.innerHTML = "";
  container.appendChild(table);
}



function markWordsAsSeen(words) {
  let progress = JSON.parse(localStorage.getItem('progress') || '{}');
  words.forEach(w => {
    if (!progress[w.simplified]) {
      progress[w.simplified] = { level: w.level, seen: true };
    }
  });
  localStorage.setItem('progress', JSON.stringify(progress));
}

function getProgressSummary() {
  const progress = JSON.parse(localStorage.getItem('progress') || '{}');
  const summary = {};
  Object.values(progress).forEach(w => {
    summary[w.level] = (summary[w.level] || 0) + 1;
  });
  return summary;
}

function renderWordList(sheet) {
  const allWords = [];
  sheet.forEach(line => {
    allWords.push(...extractWordsFromLine(line.zh));
  });

  // Deduplicate by simplified form
  const unique = {};
  allWords.forEach(w => { unique[w.simplified] = w; });
  const words = Object.values(unique);

  const progress = JSON.parse(localStorage.getItem('progress') || '{}');

  const table = document.createElement('table');
  table.border = "1";
  table.cellPadding = "6";
  table.style.marginTop = "16px";
  table.innerHTML = `
    <tr><th>Word</th><th>Pinyin</th><th>English</th><th>HSK</th><th>Status</th></tr>
    ${words.map(w => {
      const seen = progress[w.simplified] ? '✅ Seen' : '⭐ New';
      return `
        <tr>
          <td>${w.simplified}</td>
          <td>${w.pinyin}</td>
          <td>${Array.isArray(w.meanings) ? w.meanings[0] : w.meanings}</td>
          <td>${w.level}</td>
          <td>${seen}</td>
        </tr>
      `;
    }).join('')}
  `;
  sceneBox.appendChild(table);
}
// End scenario with cheat sheet + flashcards + HSK tracking
function endScenario() {
  const s = state.scenarios[state.currentKey];
  sceneBox.innerHTML = '';

  const done = document.createElement('div');
  done.className = 'line';
  done.innerHTML = `🎉 场景完成！<br><small>Completed: ${s ? s.title : ''}</small>`;
  sceneBox.appendChild(done);

  const replay = document.createElement('button');
  replay.className = 'btn';
  replay.textContent = '重玩本场景 (Replay this scenario)';
  replay.addEventListener('click', () => {
    state.currentIndex = 0;
    renderScene();
  });
  sceneBox.appendChild(replay);

  const back = document.createElement('button');
  back.className = 'btn';
  back.textContent = '返回主菜单 (Return to Main Menu)';
  back.addEventListener('click', returnToMenu);
  sceneBox.appendChild(back);

  const review = document.createElement('button');
  review.className = 'btn';
  review.textContent = '复习卡片 (Review Flashcards)';
  review.addEventListener('click', () => {
    buildFlashcards(s);
    renderFlashcard();
  });
  sceneBox.appendChild(review);

  // Build + render cheat sheet
  if (s) {
    const sheet = buildCheatSheet(s);
    renderCheatSheet(sheet);

    // HSK tracking
    sheet.forEach(line => {
      const words = extractWordsFromLine(line.zh);
      markWordsAsSeen(words);
    });
    renderWordList(sheet);
  }
}

function returnToMenu() {
  state.currentKey = null;
  state.currentIndex = 0;
  renderMenu();
  show(document.getElementById('hskTable'));
}

// Events
// Events
backBtn.addEventListener('click', returnToMenu);
filterEl.addEventListener('change', renderMenu);
hskLevelEl.addEventListener('change', async () => {
  await loadHSK(hskLevelEl.value);
  renderMenu();
  renderhskTable()
});


// Bootstrap
(async function init() {
  await loadPacks();
  await loadHSK(hskLevelEl.value); // load initial selection
  renderMenu();
  renderhskTable();
})();












