(() => {
  'use strict';

  const testMode = false;
  const storageKey = `gk-tangwald-v1-${testMode ? 'test' : 'unterricht'}`;
  const organisms = [
    { id: 'kelp', name: 'Riesentang', file: 'riesentang', level: '1', food: 'Riesentang baut mit Licht aus Kohlenstoffdioxid und Wasser organische Stoffe auf. Seeigel und Abalone fressen Tang.' },
    { id: 'urchin', name: 'Seeigel', file: 'seeigel', level: '2', food: 'Der Seeigel frisst Riesentang. Er wird vom Seeotter und vom Sonnenblumen-Seestern gefressen.' },
    { id: 'abalone', name: 'Abalone', file: 'abalone', level: '2', food: 'Die Abalone ist eine Meeresschnecke. Sie frisst Tang und wird in unserem Ausschnitt vom Seeotter gefressen.' },
    { id: 'star', name: 'Sonnenblumen-Seestern', file: 'sonnenblumen-seestern', level: '3', food: 'Der Sonnenblumen-Seestern frisst in unserem Ausschnitt Seeigel.' },
    { id: 'otter', name: 'Seeotter', file: 'seeotter', level: '3', food: 'Der Seeotter frisst Seeigel und Abalonen.' }
  ];
  const byId = Object.fromEntries(organisms.map(organism => [organism.id, organism]));
  const correctEdges = ['kelp>urchin', 'urchin>otter', 'kelp>abalone', 'abalone>otter', 'urchin>star'];
  const cardOrder = ['star', 'abalone', 'kelp', 'otter', 'urchin'].map(id => byId[id]);
  const classification = [['1', 'Produzent'], ['2', 'Konsument 1. Ordnung'], ['3', 'Konsument 2. Ordnung']];
  const bands = [['3', 'Konsumenten 2. Ordnung'], ['2', 'Konsumenten 1. Ordnung'], ['1', 'Produzenten']];
  const steps = [
    ['Start', 'Wer ernährt wen im Tangwald?', 'Übertrage das Wiesenbeispiel auf einen Tangwald und erweitere das Modell um den organischen Abbau.'],
    ['Zuordnung', 'Wer gehört zu welcher Trophieebene?', 'Ordne die fünf Lebewesen anhand ihrer Ernährung zu.'],
    ['Das Netz', 'Verbinde den Tangwald', 'Zeichne die Nahrungspfeile zwischen den Lebewesen auf den drei Trophieebenen.'],
    ['Abbau', 'Was geschieht mit den Resten?', 'Ergänze die Rolle der Destruenten im Ökosystem.'],
    ['Sicherung', 'Dein Nahrungsnetz im Überblick', '']
  ];
  const initialState = () => ({ step: 0, done: Array(steps.length).fill(false), levels: {}, edges: [], decay: {} });
  const stateFields = ['step', 'done', 'levels', 'edges', 'decay'];
  let state = initialState();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && [steps.length, 7].includes(saved.done?.length)) {
      for (const field of stateFields) state[field] = saved[field] ?? state[field];
      if (saved.done.length === 7) {
        // Carry forward the former trophic assignments and any saved network or decay answers.
        state.step = [0, 1, 2, 2, 1, 3, 4][saved.step] ?? 0;
        const classified = organisms.every(organism => state.levels[organism.id] === organism.level);
        state.done = [saved.done[0], classified, saved.done[3], saved.done[5], saved.done[6]];
      }
      state.step = Number.isInteger(state.step) ? Math.max(0, Math.min(steps.length - 1, state.step)) : 0;
      state.edges = Array.isArray(state.edges) ? [...new Set(state.edges.filter(edge => {
        if (typeof edge !== 'string') return false;
        const [from, to, extra] = edge.split('>');
        return !extra && from !== to && Object.hasOwn(byId, from) && Object.hasOwn(byId, to);
      }))] : [];
    }
  } catch { /* Ein unlesbarer lokaler Lernstand startet mit leeren Eingaben. */ }

  const el = id => document.getElementById(id);
  const image = organism => `<img src="assets/organismen/${organism.file}.png" alt="">`;
  const name = id => byId[id].name;
  const edgeText = edge => edge.split('>').map(name).join(' → ');
  const unlocked = index => testMode || index === 0 || state.done.slice(0, index).every(Boolean);
  let selectedFood = null;
  let resetUntil = 0;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch {
      if (!el('storageWarning')) {
        const warning = document.createElement('p');
        warning.id = 'storageWarning';
        warning.textContent = 'Der Browser kann deinen Lernstand gerade nicht speichern. Lass diese Seite geöffnet und lade am Ende dein Protokoll herunter.';
        document.body.prepend(warning);
      }
    }
  }

  function chrome() {
    el('nav').innerHTML = steps.map(([short], index) => `<button type="button" data-step="${index}" class="${index === state.step ? 'active' : ''} ${state.done[index] ? 'done' : ''}" ${unlocked(index) ? '' : 'disabled'} ${index === state.step ? 'aria-current="step"' : ''}>${short}</button>`).join('');
    el('nav').querySelectorAll('button').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.step))));
    el('progress').textContent = `Schritt ${state.step + 1} von ${steps.length}`;
    el('title').textContent = steps[state.step][1];
    el('lead').textContent = steps[state.step][2];
  }

  function go(index) {
    if (!unlocked(index)) return;
    state.step = index;
    selectedFood = null;
    save();
    chrome();
    [renderStart, renderRoles, renderNetwork, renderDecay, renderSummary][index]();
    if (testMode && index > 0 && index < steps.length - 1) {
      const tools = document.createElement('div');
      tools.className = 'test-tools';
      tools.innerHTML = '<button type="button" id="example">Beispiel einsetzen (Testmodus)</button>';
      el('content').append(tools);
      el('example').addEventListener('click', fillExample);
    }
    window.scrollTo({ top: 0 });
  }

  function result(text, correct = false) {
    const box = el('feedback');
    box.className = `feedback${correct ? '' : ' warn'}`;
    box.innerHTML = `<p>${text}</p>`;
    if (correct) {
      state.done[state.step] = true;
      save();
      chrome();
      if (state.step < steps.length - 1) {
        box.innerHTML += '<button class="primary" id="next" type="button">Weiter</button>';
        el('next').addEventListener('click', () => go(state.step + 1));
      }
    }
  }

  function controls(label) {
    return `<div class="actions"><button type="button" class="primary" id="check">${label}</button></div><div id="feedback" role="status" aria-live="polite"></div>`;
  }

  function select(id, options, value, attributes = '') {
    return `<select id="${id}" ${attributes}><option value="">Bitte auswählen</option>${options.map(([key, text]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${text}</option>`).join('')}</select>`;
  }

  function bindSelects(field) {
    el('content').querySelectorAll('[data-answer]').forEach(input => input.addEventListener('change', () => {
      state[field][input.dataset.answer] = input.value;
      state.done[state.step] = false;
      chrome();
      save();
      if (el('feedback')) { el('feedback').className = ''; el('feedback').textContent = ''; }
    }));
  }

  function renderStart() {
    el('content').innerHTML = `<div class="hero"><div><img src="assets/tangwald-detritus.png" alt="Illustration eines Tangwalds mit lebendem Tang und organischen Resten am Meeresboden"><p class="caption">Tangwald an der Pazifikküste · KI-Illustration</p></div><div><h2>Von der Wiese in den Tangwald</h2><p>An der Tafel habt ihr Nahrungspfeile, Nahrungsnetze und Trophieebenen an einem Wiesenbeispiel besprochen. Wende dieses Wissen jetzt auf fünf Lebewesen im Tangwald an.</p><p>Ordne die Arten ihren Trophieebenen zu und baue das Nahrungsnetz auf. Alle nötigen Ernährungsangaben findest du bei den Aufgaben.</p><p>Danach erarbeitest du eine neue Frage: Was geschieht mit abgestorbenen Organismen und Ausscheidungen? Erweitere dein Modell um den <strong>organischen Abbau</strong>.</p><p>Deine schriftlichen Erklärungen sicherst du auf dem Arbeitsblatt. Im Programm bearbeitest du Zuordnungen und erhältst Rückmeldungen.</p><p class="small">Etwa 35–45 Minuten einschließlich Sicherung · Einzel- oder Partnerarbeit</p><button class="primary" id="begin" type="button">Tangwald erkunden</button></div></div>`;
    el('begin').addEventListener('click', () => { state.done[0] = true; go(1); });
  }

  function renderRoles() {
    el('content').innerHTML = `<div class="cards">${cardOrder.map(organism => `<article class="organism">${image(organism)}<h3>${organism.name}</h3><p>${organism.food}</p>${select(`role-${organism.id}`, classification, state.levels[organism.id], `data-answer="${organism.id}" aria-label="Trophieebene von ${organism.name}"`)}</article>`).join('')}</div><details class="help"><summary>Begriffe aus der Tafelphase</summary><p>Produzenten bauen organische Stoffe durch Fotosynthese auf. Konsumenten 1. Ordnung fressen Produzenten. Konsumenten 2. Ordnung fressen Konsumenten 1. Ordnung.</p></details>${controls('Zuordnung prüfen')}`;
    bindSelects('levels');
    el('check').addEventListener('click', () => {
      const wrong = organisms.filter(organism => state.levels[organism.id] !== organism.level);
      if (wrong.length) result(`Prüfe die Zuordnung von ${wrong.map(organism => organism.name).join(', ')}. Überlege, welche Nahrung die Tiere in diesem Modell aufnehmen.`);
      else result('Die Zuordnung stimmt. Riesentang ist der Produzent. Seeigel und Abalone sind Konsumenten 1. Ordnung. Sonnenblumen-Seestern und Seeotter sind Konsumenten 2. Ordnung.', true);
    });
  }

  function board(readOnly = false) {
    const tag = readOnly ? 'div' : 'button';
    const rows = bands.map(([level, label]) => {
      const cards = organisms.filter(organism => organism.level === level).map(organism => {
        const attributes = readOnly ? '' : `type="button" aria-label="${organism.name} für Nahrungspfeil wählen" aria-pressed="false"`;
        return `<${tag} class="node" data-node="${organism.id}" ${attributes}>${image(organism)}<span>${organism.name}</span></${tag}>`;
      }).join('');
      return `<section class="trophic-band" data-level="${level}"><div class="band-label"><span>${level}. Trophieebene</span><strong>${label}</strong></div><div class="band-cards">${cards}</div></section>`;
    }).join('');
    return `<div class="board" id="board" aria-label="Nahrungsnetz mit drei Trophieebenen">${rows}<svg id="arrows" aria-hidden="true"><defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#287f83"/></marker></defs><g id="paths"></g>${readOnly ? '' : '<path id="draftArrow" class="draft-arrow"></path>'}</svg></div>`;
  }

  function center(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function cardAnchor(rect, dx, dy, gap = 0) {
    const point = center(rect);
    const distance = Math.hypot(dx, dy);
    if (!distance) return point;
    const factor = Math.min(rect.width / 2 / Math.abs(dx), rect.height / 2 / Math.abs(dy)) + gap / distance;
    return { x: point.x + factor * dx, y: point.y + factor * dy };
  }

  function drawEdges() {
    const diagram = el('board');
    if (!diagram) return;
    const layer = el('arrows');
    const bounds = layer.getBoundingClientRect();
    layer.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const group = el('paths');
    group.replaceChildren();
    const boundsOf = id => diagram.querySelector(`[data-node="${id}"]`).getBoundingClientRect();
    const coords = point => `${point.x - bounds.left},${point.y - bounds.top}`;
    for (const edge of state.edges) {
      const [from, to] = edge.split('>');
      const start = boundsOf(from);
      const end = boundsOf(to);
      const a = center(start);
      const b = center(end);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (state.edges.includes(`${to}>${from}`)) {
        mid.x -= dy * .18;
        mid.y += dx * .18;
      }
      const source = cardAnchor(start, mid.x - a.x, mid.y - a.y, 1);
      const target = cardAnchor(end, mid.x - b.x, mid.y - b.y, 4);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${coords(source)} Q${coords(mid)} ${coords(target)}`);
      path.setAttribute('stroke', '#287f83');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('fill', 'none');
      path.setAttribute('marker-end', 'url(#tip)');
      group.append(path);
    }
  }

  function bindArrowDrawing(diagram) {
    const layer = el('arrows');
    const draft = el('draftArrow');
    let drag = null;
    let suppressClick = false;

    function cardAt(event) {
      const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('button[data-node]');
      return card && diagram.contains(card) ? card : null;
    }

    function finishDrag() {
      drag?.target?.classList.remove('drop-target');
      draft.removeAttribute('d');
      drag = null;
    }

    diagram.addEventListener('pointerdown', event => {
      const card = event.target.closest('button[data-node]');
      if (!card || !event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      drag = { card, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      card.setPointerCapture(event.pointerId);
    });

    diagram.addEventListener('pointermove', event => {
      if (drag?.pointerId !== event.pointerId) return;
      if (!drag.active) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
        drag.active = true;
        selectFood(drag.card);
      }
      drag.target?.classList.remove('drop-target');
      const target = cardAt(event);
      drag.target = target === drag.card ? null : target;
      drag.target?.classList.add('drop-target');
      const rect = drag.card.getBoundingClientRect();
      const point = center(rect);
      const dx = event.clientX - point.x;
      const dy = event.clientY - point.y;
      if (Math.abs(dx) <= rect.width / 2 && Math.abs(dy) <= rect.height / 2) {
        draft.removeAttribute('d');
        return;
      }
      const source = cardAnchor(rect, dx, dy);
      const bounds = layer.getBoundingClientRect();
      draft.setAttribute('d', `M${source.x - bounds.left},${source.y - bounds.top} L${event.clientX - bounds.left},${event.clientY - bounds.top}`);
    });

    diagram.addEventListener('pointerup', event => {
      if (drag?.pointerId !== event.pointerId) return;
      const { active, card } = drag;
      const target = active ? cardAt(event) : null;
      finishDrag();
      if (!active) return;
      suppressClick = true;
      clearSelection();
      if (target && target !== card) addEdge(card.dataset.node, target.dataset.node);
    });

    function cancelDrag(event) {
      if (drag?.pointerId !== event.pointerId) return;
      finishDrag();
      clearSelection();
    }
    diagram.addEventListener('pointercancel', cancelDrag);
    diagram.addEventListener('lostpointercapture', cancelDrag);
    diagram.addEventListener('keydown', event => {
      if (event.key === 'Escape') clearSelection();
    });

    diagram.addEventListener('click', event => {
      const card = event.target.closest('button[data-node]');
      if (!card || (suppressClick && event.detail > 0)) return;
      const id = card.dataset.node;
      if (selectedFood === null) {
        selectFood(card);
      } else {
        if (selectedFood !== id) addEdge(selectedFood, id);
        clearSelection();
      }
    });
  }

  function renderNetwork() {
    el('content').innerHTML = `<div class="lesson"><p><strong>Ziehe von der Nahrung zum Konsumenten.</strong> Der Pfeil bedeutet „wird gefressen von“. Du kannst auch beide Karten nacheinander antippen oder anklicken.</p></div><div class="network-grid"><div><div id="selection" class="status" aria-live="polite">Wähle eine Art als Nahrung.</div>${board()}</div><aside><h2>Ernährungsangaben</h2><ul class="food-list">${organisms.slice(1).map(organism => `<li>${organism.food}</li>`).join('')}</ul><p class="small">Zeige die fünf angegebenen Nahrungsbeziehungen. Der Ausschnitt enthält eine Auswahl realer Beziehungen.</p><details class="help"><summary>Hilfe für den nächsten Pfeil</summary><p id="edgeHint"></p></details><h3>Deine Verbindungen</h3><p class="small">Klicke eine Verbindung an, um sie zu entfernen.</p><div class="edge-list" id="edgeList"></div>${controls('Nahrungsnetz prüfen')}</aside></div>`;
    bindArrowDrawing(el('board'));
    el('check').addEventListener('click', () => {
      const wrong = state.edges.filter(edge => !correctEdges.includes(edge));
      const missing = correctEdges.filter(edge => !state.edges.includes(edge));
      if (wrong.length) {
        const [from, to] = wrong[0].split('>');
        result(correctEdges.includes(`${to}>${from}`) ? `Bei ${name(from)} und ${name(to)} ist der Pfeil umgekehrt. Er muss von der Nahrung zum Konsumenten zeigen. Entferne die Verbindung und setze sie neu.` : `Prüfe ${edgeText(wrong[0])} anhand der Ernährungsangaben. Diese Beziehung gehört nicht zu unserem Ausschnitt.`);
      } else if (missing.length) result(`Deine ${state.edges.length} Verbindung${state.edges.length === 1 ? ' ist' : 'en sind'} richtig. Es fehlen noch ${missing.length}. Nutze die Ernährungsangaben oder die Hilfe.`);
      else result('Dein Netz ist vollständig. Der Seeigel ist Nahrung für zwei Arten, und der Seeotter hat zwei Beutearten. Mehrere Nahrungsketten sind dadurch miteinander verbunden.', true);
    });
    updateNetwork();
  }

  function selectFood(card) {
    clearSelection();
    selectedFood = card.dataset.node;
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    el('selection').textContent = `${name(selectedFood)} ist als Nahrung gewählt. Wähle jetzt den Konsumenten.`;
  }

  function clearSelection() {
    selectedFood = null;
    document.querySelectorAll('[data-node]').forEach(button => { button.classList.remove('selected'); button.setAttribute('aria-pressed', 'false'); });
    el('selection').textContent = 'Wähle eine Art als Nahrung.';
  }

  function addEdge(from, to) {
    const edge = `${from}>${to}`;
    if (!state.edges.includes(edge)) state.edges.push(edge);
    save();
    el('feedback').textContent = '';
    el('feedback').className = '';
    updateNetwork();
  }

  function updateNetwork() {
    el('edgeList').innerHTML = state.edges.length ? state.edges.map(edge => `<button type="button" data-edge="${edge}" aria-label="Verbindung ${edgeText(edge)} entfernen">${edgeText(edge)} ×</button>`).join('') : '<p class="small">Noch keine Verbindung.</p>';
    document.querySelectorAll('[data-edge]').forEach(button => button.addEventListener('click', () => {
      state.edges = state.edges.filter(edge => edge !== button.dataset.edge);
      save();
      el('feedback').textContent = '';
      el('feedback').className = '';
      updateNetwork();
    }));
    const missing = correctEdges.find(edge => !state.edges.includes(edge));
    el('edgeHint').textContent = missing ? `Suche diese Beziehung in den Angaben: ${name(missing.split('>')[1])} frisst ${name(missing.split('>')[0])}. Von wem muss der Pfeil ausgehen?` : 'Alle fünf erwarteten Pfeile sind gesetzt. Prüfe noch, ob zusätzliche Pfeile zu den Angaben passen.';
    requestAnimationFrame(drawEdges);
  }

  function renderDecay() {
    const questions = [
      ['process', 'Was bedeutet Mineralisierung?', [['small', 'Tote Tangteile werden nur in kleinere Stücke zerlegt.'], ['convert', 'Organische Stoffe werden zu anorganischen Stoffen abgebaut.']]],
      ['origin', 'Von welchen Ebenen kann abgestorbenes Material stammen?', [['all', 'Von Produzenten und allen Konsumentenebenen.'], ['last', 'Nur von der obersten Konsumentenebene.']]],
      ['minerals', 'Was können Produzenten aus dem Abbau wieder aufnehmen?', [['nutrients', 'Freigesetzte mineralische Nährstoffe.'], ['light', 'Die bei der Zellatmung abgegebene Wärme als Licht.']]],
      ['energy', 'Was geschieht mit einem Teil der aufgenommenen Energie?', [['cycle', 'Er kehrt vollständig zum Tang zurück.'], ['heat', 'Er wird bei Lebensvorgängen schließlich als Wärme abgegeben.']]]
    ];
    el('content').innerHTML = `<div class="lesson"><p>Von allen Lebewesen gelangen tote Reste und Ausscheidungen in den <strong>Detritus</strong>, das tote organische Material. Kleine Tiere wie Flohkrebse fressen und zerkleinern es. Solche Tiere heißen <strong>Detritivoren</strong>.</p><p><strong>Destruenten</strong> wie Bakterien und Pilze bauen organische Stoffe ab. Die Umwandlung organischer Stoffe in anorganische Stoffe heißt <strong>Mineralisierung</strong>. Dabei werden mineralische Nährstoffe frei, die Produzenten wieder aufnehmen können. Bakterien und Pilze können auch direkt an abgestorbenem Material tätig werden; eine vorherige Zerkleinerung durch Tiere ist nicht zwingend nötig. Bei der Zellatmung entstehen außerdem Kohlenstoffdioxid und Wasser. Ein Teil der Energie wird als Wärme an die Umgebung abgegeben.</p></div><div class="stages"><div class="stage"><img class="mini" src="assets/organismen/tangdetritus.png" alt="Tangreste">Tote Reste aus allen Trophieebenen</div><div class="stage"><img class="mini" src="assets/organismen/detritivoren.png" alt="Flohkrebs und Borstenwurm">Zerkleinerung und Abbau durch Tiere, Bakterien und Pilze</div><div class="stage">Freigesetzte Mineralstoffe stehen Produzenten erneut zur Verfügung.</div></div>${questions.map(([id, prompt, choices]) => `<div class="question"><h3>${prompt}</h3><div class="choices">${choices.map(([value, label]) => `<label><input type="radio" name="${id}" value="${value}" ${state.decay[id] === value ? 'checked' : ''}>${label}</label>`).join('')}</div></div>`).join('')}${controls('Abbauweg prüfen')}`;
    document.querySelectorAll('input[type=radio]').forEach(input => input.addEventListener('change', () => { state.decay[input.name] = input.value; save(); }));
    el('check').addEventListener('click', () => {
      if (state.decay.process !== 'convert') result('Zerkleinerung allein ist noch keine Mineralisierung. Entscheidend ist die Umwandlung organischer Stoffe in anorganische Stoffe.');
      else if (state.decay.origin !== 'all') result('Auch Produzenten und Pflanzenfresser sterben ab. Ihr Material wird ebenfalls abgebaut.');
      else if (state.decay.minerals !== 'nutrients') result('Suche im Text nach den Stoffen, die beim Abbau frei werden und von Produzenten wieder aufgenommen werden.');
      else if (state.decay.energy !== 'heat') result('Beachte die Zellatmung und die Wärmeabgabe. Für neue Fotosynthese wird wieder Licht benötigt.');
      else result('Destruenten verwerten Material aus allen Trophieebenen. Mineralstoffe werden erneut nutzbar. Die Wärmeabgabe ist ein Grund dafür, dass ständig neue Energie ins Ökosystem gelangen muss.', true);
    });
  }

  function decayDiagram() {
    return `<section class="ecosystem-diagram" aria-label="Nahrungsnetz und organischer Abbau im Tangwald">
      <div class="feeding-panel">
        <h2>Nahrungsnetz</h2>
        ${board(true)}
      </div>
      <div class="decay-panel">
        <h2>Organischer Abbau</h2>
        <p class="diagram-input">Tote Reste und Ausscheidungen aus allen drei Trophieebenen</p>
        <div class="matter-arrow" aria-hidden="true">↓</div>
        <div class="decay-card decay-detritus">
          <img src="assets/organismen/tangdetritus.png" alt="">
          <div><strong>Detritus</strong><span>Totes organisches Material</span></div>
        </div>
        <div class="decay-branches">
          <div>
            <div class="matter-arrow" aria-hidden="true">↓</div>
            <div class="decay-card decay-group">
              <img src="assets/organismen/detritivoren.png" alt="">
              <strong>Detritivoren</strong>
              <span>Flohkrebse und andere Tiere fressen und zerkleinern Detritus.</span>
            </div>
          </div>
          <div>
            <div class="matter-arrow" aria-hidden="true">↓</div>
            <div class="decay-card decay-group">
              <strong>Destruenten</strong>
              <span>Bakterien und Pilze bauen organische Stoffe ab und mineralisieren sie.</span>
            </div>
            <div class="matter-arrow" aria-hidden="true">↓</div>
            <div class="decay-card decay-minerals" id="mineralOutput">
              <strong>Mineralische Nährstoffe</strong>
              <span>Werden vom Riesentang aufgenommen.</span>
            </div>
          </div>
        </div>
      </div>
      <svg class="mineral-route" aria-hidden="true">
        <defs><marker id="mineralTip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#79501f"/></marker></defs>
        <path id="mineralPath"></path>
      </svg>
    </section>
    <p class="diagram-legend"><span class="food-key">→</span> Nahrung zum Konsumenten <span class="matter-key">⇢</span> Mineralische Nährstoffe zurück zum Riesentang</p>
    ${state.edges.length ? `<details class="help"><summary>Nahrungspfeile als Liste</summary><ul class="summary-list">${state.edges.map(edge => `<li>${edgeText(edge)}</li>`).join('')}</ul></details>` : ''}`;
  }

  function drawMineralRoute() {
    const path = el('mineralPath');
    if (!path) return;
    const bounds = path.ownerSVGElement.getBoundingClientRect();
    const source = el('mineralOutput').getBoundingClientRect();
    const target = document.querySelector('.feeding-panel [data-node="kelp"]').getBoundingClientRect();
    const a = { x: center(source).x - bounds.left, y: source.bottom - bounds.top };
    const b = { x: center(target).x - bounds.left, y: target.bottom - bounds.top + 5 };
    const bottom = Math.max(a.y, b.y) + 14;
    path.setAttribute('d', `M${a.x},${a.y} V${bottom} H${b.x} V${b.y}`);
  }

  function renderSummary() {
    el('content').innerHTML = `${decayDiagram()}
      <div class="actions">
        <button id="export" class="primary" type="button">Zuordnungen herunterladen</button>
        <button id="print" type="button">Ergebnisse drucken</button>
      </div>`;
    el('export').addEventListener('click', exportResults);
    el('print').addEventListener('click', () => window.print());
    requestAnimationFrame(() => {
      drawEdges();
      drawMineralRoute();
    });
  }

  function exportResults() {
    const levels = { '1': 'Produzent · 1. Trophieebene', '2': 'Konsument 1. Ordnung · 2. Trophieebene', '3': 'Konsument 2. Ordnung · 3. Trophieebene' };
    const decay = { convert: 'Mineralisierung: organische zu anorganischen Stoffen', small: 'Nur Zerkleinerung', all: 'Material aus allen Ebenen', last: 'Nur von der obersten Ebene', nutrients: 'Mineralische Nährstoffe', light: 'Wärme als Licht', cycle: 'Energie kehrt vollständig zurück', heat: 'Wärmeabgabe an die Umgebung' };
    const lines = ['Tangwald vernetzt – Q2 Biologie GK', `Modus: ${testMode ? 'Testvorschau' : 'Unterricht'}`, '', 'Meine Rollen und Trophieebenen', ...organisms.map(organism => `${organism.name}: ${levels[state.levels[organism.id]] || 'offen'}`), '', 'Meine Nahrungspfeile', ...state.edges.map(edgeText), '', 'Meine Angaben zum Abbau', ...['process', 'origin', 'minerals', 'energy'].map(id => decay[state.decay[id]] || 'offen'), '', 'Schriftliche Sicherung: auf dem Arbeitsblatt'];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Nahrungsnetz_GK_Protokoll.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fillExample() {
    switch (state.step) {
      case 1: state.levels = Object.fromEntries(organisms.map(organism => [organism.id, organism.level])); break;
      case 2: state.edges = [...correctEdges]; break;
      case 3: state.decay = { process: 'convert', origin: 'all', minerals: 'nutrients', energy: 'heat' }; break;
    }
    go(state.step);
    el('check').click();
  }

  el('reset').addEventListener('click', () => {
    if (Date.now() < resetUntil) {
      state = initialState();
      resetUntil = 0;
      el('reset').textContent = 'Neu beginnen';
      go(0);
    } else {
      resetUntil = Date.now() + 6000;
      el('reset').textContent = 'Lernstand wirklich löschen?';
      setTimeout(() => { if (Date.now() >= resetUntil) el('reset').textContent = 'Neu beginnen'; }, 6100);
    }
  });
  el('info').addEventListener('click', () => el('infoDialog').showModal());
  el('closeInfo').addEventListener('click', () => el('infoDialog').close());
  window.addEventListener('resize', () => {
    drawEdges();
    drawMineralRoute();
  });
  if (!unlocked(state.step)) state.step = Math.max(0, state.done.findIndex(done => !done));
  go(state.step);
})();
