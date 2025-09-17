// Engine with cheat sheet + flashcards

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

// Helpers
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// Load packs manifest then packs
async function loadPacks() {
  const manifest = await fetch('./packs/packs.json').then(r => r.json());
  for (const file of manifest.packs) {
    const pack = await fetch('./packs/' + file).then(r => r.json());
    Object.entries(pack.scenarios).forEach(([key, scenario]) => {
      state.scenarios[key] = scenario;
    });
  }
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

  hide(gameEl);
  show(menuEl);
}

function startScenario(key) {
  state.currentKey = key;
  state.currentIndex = 0;
  hide(menuEl);
  show(gameEl);
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

// End scenario with cheat sheet + flashcards
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
  }
}

function returnToMenu() {
  state.currentKey = null;
  state.currentIndex = 0;
  renderMenu();
}

// Events
backBtn.addEventListener('click', returnToMenu);
filterEl.addEventListener('change', renderMenu);

// Bootstrap
(async function init() {
  await loadPacks();
  renderMenu();
})();
