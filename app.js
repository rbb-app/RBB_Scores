/* ============================================================
   RBB SCORES – stabile Version (Basis repariert)
   ============================================================ */

let players = [];
let active = { heim: [], gast: [] };
let tempActive = { heim: [], gast: [] };
let log = [];
let period = "Q1";
let gameRunning = false;

let jb = false, fb = false;

/* ------------------------------------------------------------
   DOM-Referenzen
------------------------------------------------------------ */
const jbBtn = document.getElementById("jbBtn");
const fbBtn = document.getElementById("fbBtn");
const num = document.getElementById("num");
const pts = document.getElementById("pts");
const teamSelect = document.getElementById("teamSelect");
const nameHeim = document.getElementById("nameHeim");
const nameGast = document.getElementById("nameGast");

const heimTitle = document.getElementById("heimTitle");
const gastTitle = document.getElementById("gastTitle");
const heimTitleSetup = document.getElementById("heimTitleSetup");
const gastTitleSetup = document.getElementById("gastTitleSetup");

const setupView = document.getElementById("setupView");
const gameView = document.getElementById("gameView");

const realStartBtn = document.getElementById("realStartBtn");
const endQuarterBtn = document.getElementById("endQuarterBtn");
const nextQuarterBtn = document.getElementById("nextQuarterBtn");
const gameStatus = document.getElementById("gameStatus");

/* ------------------------------------------------------------
   Teamnamen dynamisch aktualisieren
------------------------------------------------------------ */
nameHeim.addEventListener("input", render);
nameGast.addEventListener("input", render);

/* ------------------------------------------------------------
   Bonus-Buttons
------------------------------------------------------------ */
jbBtn.onclick = () => {
  jb = !jb;
  jbBtn.classList.toggle("active", jb);
};

fbBtn.onclick = () => {
  fb = !fb;
  fbBtn.classList.toggle("active", fb);
};

/* ------------------------------------------------------------
   State speichern / laden
------------------------------------------------------------ */
function saveState() {
  localStorage.setItem("rbb_state", JSON.stringify({
    players, active, tempActive, log, period, gameRunning,
    nameHeim: nameHeim.value,
    nameGast: nameGast.value
  }));
}

function loadState() {
  const s = localStorage.getItem("rbb_state");
  if (!s) {
    render();
    updateTimeline();
    return;
  }

  const data = JSON.parse(s);

  players = data.players || [];
  active = data.active || { heim: [], gast: [] };
  tempActive = data.tempActive || { heim: [], gast: [] };
  log = data.log || [];
  period = data.period || "Q1";
  gameRunning = data.gameRunning || false;

  nameHeim.value = data.nameHeim || "";
  nameGast.value = data.nameGast || "";

  render();
  updateTimeline();
}

/* ------------------------------------------------------------
   Setup-Validierung
------------------------------------------------------------ */
function validateSetup() {
  if (!nameHeim.value.trim() || !nameGast.value.trim()) {
    alert("Bitte Teamnamen eingeben.");
    return false;
  }
  return true;
}

/* ------------------------------------------------------------
   Punkteberechnung mit Bonus
------------------------------------------------------------ */
function calcPts(p) {
  if (jb && fb) return p - 2;
  if (jb) return p - 1;
  if (fb) return p - 1.5;
  return p;
}

/* ------------------------------------------------------------
   Spieler hinzufügen
------------------------------------------------------------ */
function addPlayer() {
  const n = +num.value;
  const p = parseFloat(pts.value);
  const t = teamSelect.value;

  // Nummer 0 erlauben
  if (isNaN(n) || isNaN(p)) {
    alert("Bitte Nummer und Punkte auswählen.");
    return;
  }

  if (players.some(pl => pl.team === t && pl.num === n)) {
    alert("Diese Nummer ist in diesem Team bereits vergeben.");
    return;
  }

  players.push({ num: n, pts: calcPts(p), team: t, jb, fb });
  players.sort((a, b) => a.num - b.num);

  num.value = "";
  pts.value = "";
  jb = fb = false;
  jbBtn.classList.remove("active");
  fbBtn.classList.remove("active");

  render();
  saveState();
}

/* ------------------------------------------------------------
   Render-Funktion
------------------------------------------------------------ */
function render() {
  heimTitle.textContent = nameHeim.value || "Home";
  gastTitle.textContent = nameGast.value || "Guest";
  heimTitleSetup.textContent = nameHeim.value || "Home";
  gastTitleSetup.textContent = nameGast.value || "Guest";

  // Dropdown dynamisch aktualisieren
  const optHeim = document.querySelector('#teamSelect option[value="heim"]');
  const optGast = document.querySelector('#teamSelect option[value="gast"]');
  if (optHeim) optHeim.textContent = nameHeim.value || "Home";
  if (optGast) optGast.textContent = nameGast.value || "Guest";

  renderList("heim", "heimPlayersSetup", true);
  renderList("gast", "gastPlayersSetup", true);
  renderList("heim", "heimPlayers", false);
  renderList("gast", "gastPlayers", false);

  updateTeamStatus("heim");
  updateTeamStatus("gast");

  saveState();
}

/* ------------------------------------------------------------
   Spielerlisten rendern
------------------------------------------------------------ */
function renderList(team, target, setup) {
  const d = document.getElementById(target);
  if (!d) return;

  d.innerHTML = "";

  const teamPlayers = players.filter(p => p.team === team);

  teamPlayers.forEach((p, index) => {
    const e = document.createElement("div");
    e.className = "player";

    if (!setup) {
      e.onclick = () => togglePlayer(team, p.num, index);
      if (tempActive[team].includes(p.num)) {
        e.classList.add("active");
      }
    }

    e.innerHTML = `#${p.num}<br>${p.pts.toFixed(1)}`;

    if (p.fb) e.innerHTML += `<div class="bonus fb">FB</div>`;
    if (p.jb) e.innerHTML += `<div class="bonus jb">JB</div>`;

    if (setup) {
      e.innerHTML += `<div class="remove" onclick="removePlayer(${p.num}, '${p.team}')">×</div>`;
    }

    d.appendChild(e);
  });
}

/* ------------------------------------------------------------
   Spieler aktivieren / deaktivieren
------------------------------------------------------------ */
function togglePlayer(team, num, index) {
  const list = tempActive[team];

  if (list.includes(num)) {
    tempActive[team] = list.filter(n => n !== num);
  } else {
    if (tempActive[team].length >= 5) {
      alert("Maximal 5 Spieler gleichzeitig.");
      return;
    }

    const ptsAfter = tempActive[team]
      .concat([num])
      .map(n => players.find(p => p.num === n && p.team === team)?.pts || 0)
      .reduce((a, b) => a + b, 0);

    if (ptsAfter > 14.5) {
      alert("Diese Aufstellung ist nicht möglich (14.5 Punkte überschritten).");
      return;
    }

    tempActive[team].push(num);
  }

  updateTeamStatus(team);
  render();
}

/* ------------------------------------------------------------
   Teamstatus aktualisieren
------------------------------------------------------------ */
function updateTeamStatus(team) {
  const ptsTotal = tempActive[team]
    .map(n => players.find(p => p.num === n && p.team === team)?.pts || 0)
    .reduce((a, b) => a + b, 0);

  const box = document.getElementById(team + "Team");
  const statusEl = document.getElementById(team + "Status");

  if (!box || !statusEl) return;

  box.classList.toggle("ok", ptsTotal <= 14.5);
  box.classList.toggle("fail", ptsTotal > 14.5);

  statusEl.textContent = `Total: ${ptsTotal.toFixed(1)} / 14.5`;
}

/* ------------------------------------------------------------
   Timeline aktualisieren
------------------------------------------------------------ */
function updateTimeline() {
  const items = document.querySelectorAll("#periodTimeline div");

  items.forEach(el => {
    el.classList.toggle("active", el.dataset.p === period);
  });
}

/* ------------------------------------------------------------
   Spieler entfernen
------------------------------------------------------------ */
function removePlayer(num, team) {
  players = players.filter(p => !(p.num === num && p.team === team));
  tempActive[team] = tempActive[team].filter(n => n !== num);
  render();
  saveState();
}

/* ------------------------------------------------------------
   Setup → Game View
------------------------------------------------------------ */
function startGame() {
  if (!validateSetup()) return;

  setupView.classList.add("hidden");
  gameView.classList.remove("hidden");

  saveState();
}

/* ------------------------------------------------------------
   Spiel starten
------------------------------------------------------------ */
function startRealGame() {
  gameRunning = true;

  active.heim = [...tempActive.heim];
  active.gast = [...tempActive.gast];

  log.push({
    time: new Date().toLocaleTimeString(),
    period,
    team: "heim",
    lineup: [...active.heim]
  });

  log.push({
    time: new Date().toLocaleTimeString(),
    period,
    team: "gast",
    lineup: [...active.gast]
  });

  gameStatus.innerHTML = `<strong>Game Running - ${period}</strong>`;
  realStartBtn.classList.add("hidden");
  endQuarterBtn.classList.remove("hidden");

  saveState();
  updateTimeline();
}

/* ------------------------------------------------------------
   Quarter beenden
------------------------------------------------------------ */
function endQuarter() {
  gameRunning = false;

  gameStatus.innerHTML = `<strong>${period} ended</strong>`;
  endQuarterBtn.classList.add("hidden");
  nextQuarterBtn.classList.remove("hidden");

  saveState();
}

/* ------------------------------------------------------------
   Nächstes Quarter starten
------------------------------------------------------------ */
function nextQuarter() {
  const order = ["Q1", "Q2", "Q3", "Q4", "OT"];
  let i = order.indexOf(period);

  if (i < order.length - 1) period = order[i + 1];

  document.querySelectorAll(".periods div").forEach(d => {
    d.classList.toggle("active", d.dataset.p === period);
  });

  gameRunning = true;

  active.heim = [...tempActive.heim];
  active.gast = [...tempActive.gast];

  log.push({
    time: new Date().toLocaleTimeString(),
    period,
    team: "heim",
    lineup: [...active.heim]
  });

  log.push({
    time: new Date().toLocaleTimeString(),
    period,
    team: "gast",
    lineup: [...active.gast]
  });

  gameStatus.innerHTML = `<strong>Game Running - ${period}</strong>`;
  nextQuarterBtn.classList.add("hidden");
  endQuarterBtn.classList.remove("hidden
