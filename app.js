/* ============================================================
   RBB SCORES – Optimierte Version (Option A + Option 2)
   UX-verbessert, kompatibel zur neuen index.html
   ============================================================ */

let players = [];
let active = { heim: [], gast: [] };       // tatsächliche Lineups pro Quarter
let tempActive = { heim: [], gast: [] };   // UI-Auswahl
let log = [];                              // History-Einträge
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

const confirmHeimBtn = document.getElementById("confirmHeimBtn");
const confirmGastBtn = document.getElementById("confirmGastBtn");


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

  // FIX: Nummer 0 erlauben
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

  // Pulse Animation
  teamSelect.classList.add("pulse");
  setTimeout(() => teamSelect.classList.remove("pulse"), 300);

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
  showConfirmButton(team);
}

function showConfirmButton(team) {
  if (team === "heim") {
    confirmHeimBtn.classList.remove("hidden");
  } else {
    confirmGastBtn.classList.remove("hidden");
  }
}

function confirmChange(team) {

  const ptsTotal = tempActive[team]
    .map(n => players.find(p => p.num === n && p.team === team)?.pts || 0)
    .reduce((a,b) => a+b, 0);

  if (ptsTotal > 14.5) {
    alert("Diese Aufstellung ist nicht möglich (14.5 Punkte überschritten).");
    return;
  }

  active[team] = [...tempActive[team]];

  log.push({
    time: new Date().toLocaleTimeString(),
    period,
    team,
    lineup: [...active[team]]
  });

  if (team === "heim") {
    confirmHeimBtn.classList.add("hidden");
  } else {
    confirmGastBtn.classList.add("hidden");
  }

  saveState();
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
    el.classList.remove("active");
  });

  if (gameRunning) {
    const current = document.querySelector(`#periodTimeline div[data-p="${period}"]`);
    if (current) current.classList.add("active");
  }
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
  endQuarterBtn.classList.remove("hidden");

  saveState();
  updateTimeline();
}

/* ------------------------------------------------------------
   End Game → History View (Option 2)
------------------------------------------------------------ */
function endGame() {
  showHistory();
}

/* ------------------------------------------------------------
   History anzeigen
------------------------------------------------------------ */
let historyView = null;

function showHistory() {
  if (!historyView) {
    historyView = document.createElement("div");
    historyView.id = "historyView";
    historyView.style.marginTop = "65px";

    historyView.innerHTML = `
      <h3 style="text-align:center;">History</h3>

      <table id="historyTable" style="width:100%;border-collapse:collapse;margin-top:20px;">
        <thead>
          <tr>
            <th>Time</th>
            <th>Team</th>
            <th>Players</th>
            <th>Total Pts</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div style="text-align:center;margin-top:20px;">
        <button onclick="backToGame()">⬅ Back to Game</button>
      </div>

      <div style="text-align:center;margin-top:10px;">
        <button class="danger-btn" onclick="finishGame()">Neues Spiel starten</button>
      </div>
    `;

    document.body.appendChild(historyView);
  }

  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";

  let lastPeriod = null;

  log.forEach(entry => {
    if (entry.period !== lastPeriod) {
      const sep = document.createElement("tr");
      sep.style.background = "rgba(0,0,0,0.08)";
      sep.style.fontWeight = "bold";
      sep.style.textAlign = "center";
      sep.innerHTML = `<td colspan="5">${entry.period}</td>`;
      tbody.appendChild(sep);
      lastPeriod = entry.period;
    }

    const totalPts = entry.lineup
      .map(num => players.find(p => p.num === num && p.team === entry.team)?.pts || 0)
      .reduce((a, b) => a + b, 0);

    const tr = document.createElement("tr");
    tr.style.background = entry.team === "heim"
      ? "rgba(33,150,243,0.15)"
      : "rgba(76,175,80,0.15)";

    const teamName = entry.team === "heim" ? nameHeim.value : nameGast.value;

    tr.innerHTML = `
      <td>${entry.time}</td>
      <td>${teamName}</td>
      <td>${entry.lineup.join(", ")}</td>
      <td>${totalPts.toFixed(1)}</td>
    `;

    tbody.appendChild(tr);
  });

  setupView.classList.add("hidden");
  gameView.classList.add("hidden");
  historyView.classList.remove("hidden");
}

/* ------------------------------------------------------------
   Zurück zum Spiel
------------------------------------------------------------ */
function backToGame() {
  historyView.classList.add("hidden");
  gameView.classList.remove("hidden");
}

/* ------------------------------------------------------------
   Neues Spiel starten (Option A – kompletter Reset)
------------------------------------------------------------ */
function finishGame() {
  if (!confirm("Neues Spiel starten? Alle Daten werden gelöscht.")) return;

  localStorage.removeItem("rbb_state");

  players = [];
  active = { heim: [], gast: [] };
  tempActive = { heim: [], gast: [] };
  log = [];
  period = "Q1";
  gameRunning = false;

  nameHeim.value = "";
  nameGast.value = "";

  if (historyView) historyView.remove();
  historyView = null;

  gameView.classList.add("hidden");
  setupView.classList.remove("hidden");

  render();
  updateTimeline();
}

/* ------------------------------------------------------------
   Initial Load
------------------------------------------------------------ */
loadState();
