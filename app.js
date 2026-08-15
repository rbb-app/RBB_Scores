let players = [];
let active = {heim:[], gast:[]};
let tempActive = {heim:[], gast:[]};
let log = [];
let period = "Q1";
let gameRunning = false;
let jb = false, fb = false;

const jbBtn = document.getElementById("jbBtn");
const fbBtn = document.getElementById("fbBtn");

jbBtn.onclick = () => { jb = !jb; jbBtn.classList.toggle("active", jb); };
fbBtn.onclick = () => { fb = !fb; fbBtn.classList.toggle("active", fb); };

function saveState(){
  localStorage.setItem("rbb_state", JSON.stringify({
    players, active, tempActive, log, period, gameRunning,
    nameHeim: nameHeim.value,
    nameGast: nameGast.value
  }));
}

function loadState(){
  const s = localStorage.getItem("rbb_state");
  if(!s) return;
  const data = JSON.parse(s);

  players = data.players || [];
  active = data.active || {heim:[], gast:[]};
  tempActive = data.tempActive || {heim:[], gast:[]};
  log = data.log || [];
  period = data.period || "Q1";
  gameRunning = data.gameRunning || false;

  nameHeim.value = data.nameHeim || "";
  nameGast.value = data.nameGast || "";

  render();
}

function calcPts(p){
  if(jb && fb) return p - 2;
  if(jb) return p - 1;
  if(fb) return p - 1.5;
  return p;
}

function addPlayer(){
  const n = +num.value;
  const p = parseFloat(pts.value);
  const t = teamSelect.value;

  if(!n || isNaN(p)) return;

  if(players.some(pl => pl.team === t && pl.num === n)){
    alert("Diese Nummer ist in diesem Team bereits vergeben.");
    return;
  }

  players.push({num:n, pts:calcPts(p), team:t, jb, fb});

  players.sort((a, b) => a.num - b.num);

  num.value = "";
  pts.value = "";
  jb = fb = false;
  jbBtn.classList.remove("active");
  fbBtn.classList.remove("active");

  render();
  saveState();
}

function render(){
  heimTitle.textContent = nameHeim.value || "Home";
  gastTitle.textContent = nameGast.value || "Guest";
  heimTitleSetup.textContent = nameHeim.value || "Home";
  gastTitleSetup.textContent = nameGast.value || "Guest";

  // ⭐ Dropdown dynamisch aktualisieren
  const optHeim = document.querySelector('#teamSelect option[value="heim"]');
  const optGast = document.querySelector('#teamSelect option[value="gast"]');

  optHeim.textContent = nameHeim.value || "Home";
  optGast.textContent = nameGast.value || "Guest";

  // ⭐ Pulse Animation
  const sel = document.getElementById("teamSelect");
  sel.classList.add("pulse");
  setTimeout(() => sel.classList.remove("pulse"), 300);

  renderList("heim", "heimPlayersSetup", true);
  renderList("gast", "gastPlayersSetup", true);
  renderList("heim", "heimPlayers", false);
  renderList("gast", "gastPlayers", false);

  updateTeamStatus("heim");
  updateTeamStatus("gast");

  saveState();
}

function renderList(team, target, setup){
  const d = document.getElementById(target);
  d.innerHTML = "";

  const teamPlayers = players.filter(p => p.team === team);

  teamPlayers.forEach((p, index) => {
    const e = document.createElement("div");
    e.className = "player";

    if(!setup){
      e.onclick = () => togglePlayer(team, p.num, index);
      if(tempActive[team].includes(p.num)){
        e.classList.add("active");
      }
    }

    e.innerHTML = `#${p.num}<br>${p.pts.toFixed(1)}`;

    if(p.fb) e.innerHTML += `<div class="bonus fb">FB</div>`;
    if(p.jb) e.innerHTML += `<div class="bonus jb">JB</div>`;

    if(setup){
      e.innerHTML += `<div class="remove" onclick="removePlayer(${p.num}, '${p.team}')">×</div>`;
    }

    d.appendChild(e);
  });
}

function togglePlayer(team, num, index){
  const list = tempActive[team];

  if(list.includes(num)){
    tempActive[team] = list.filter(n => n !== num);
  } else {
    if(tempActive[team].length >= 5){
      alert("Maximal 5 Spieler gleichzeitig.");
      return;
    }

    const ptsAfter = tempActive[team]
      .concat([num])
      .map(n => players.find(p => p.num === n && p.team === team)?.pts || 0)
      .reduce((a,b) => a+b, 0);

    if(ptsAfter > 14.5){

      const playerEl = document.querySelector(`#${team}Players .player:nth-child(${index+1})`);
      if(playerEl){
        playerEl.style.transition = "background-color .3s ease";
        playerEl.style.backgroundColor = "rgba(255,0,0,0.6)";
        setTimeout(() => {
          playerEl.style.backgroundColor = "";
        }, 300);
      }

      const box = document.getElementById(team + "Team");
      box.style.transition = "background-color .3s ease";
      box.style.backgroundColor = "rgba(255,0,0,0.3)";
      setTimeout(() => {
        box.style.backgroundColor = "";
      }, 300);

      alert("Diese Aufstellung ist nicht möglich (14.5 Punkte überschritten).");
      return;
    }

    tempActive[team].push(num);
  }

  updateTeamStatus(team);
  render();
}

function updateTeamStatus(team){
  const pts = tempActive[team]
    .map(n => players.find(p => p.num === n && p.team === team)?.pts || 0)
    .reduce((a,b) => a+b, 0);

  const box = document.getElementById(team + "Team");

  if(pts > 14.5){
    box.classList.add("fail");
    box.classList.remove("ok");
  } else {
    box.classList.add("ok");
    box.classList.remove("fail");
  }

  document.getElementById(team + "Status").textContent =
    `Total: ${pts.toFixed(1)} / 14.5`;
}

function updateTimeline(){
  const order = ["Q1","Q2","Q3","Q4","OT"];
  const currentIndex = order.indexOf(period);

  document.querySelectorAll("#periodTimeline div").forEach((el, i) => {
    el.style.opacity = "1";
    el.style.fontWeight = "normal";
    el.style.background = "var(--card)";
    el.style.borderRadius = "10px";
    el.style.padding = "6px 10px";

    if(i < currentIndex){
      el.style.background = "rgba(76,175,80,0.25)";
      el.style.fontWeight = "bold";
    }

    if(i === currentIndex){
      el.style.background = "rgba(33,150,243,0.35)";
      el.style.fontWeight = "bold";
    }

    if(i > currentIndex){
      el.style.opacity = "0.5";
    }
  });
}

function removePlayer(num, team){
  players = players.filter(p => !(p.num === num && p.team === team));
  render();
  saveState();
}

function startGame(){
  setupView.classList.add("hidden");
  gameView.classList.remove("hidden");
  saveState();
}

function startRealGame(){
  gameRunning = true;
  gameStatus.innerHTML = `<strong>Game Running - ${period}</strong>`;
  realStartBtn.classList.add("hidden");
  endQuarterBtn.classList.remove("hidden");
  saveState();
  updateTimeline();
}

function endQuarter(){
  gameRunning = false;
  gameStatus.innerHTML = `<strong>${period} ended</strong>`;
  endQuarterBtn.classList.add("hidden");
  nextQuarterBtn.classList.remove("hidden");
  saveState();
}

function nextQuarter(){
  const order = ["Q1","Q2","Q3","Q4","OT"];
  let i = order.indexOf(period);
  if(i < order.length - 1) period = order[i+1];

  document.querySelectorAll(".periods div").forEach(d => {
    d.classList.toggle("active", d.dataset.p === period);
  });

  gameRunning = true;
  gameStatus.innerHTML = `<strong>Game Running - ${period}</strong>`;
  nextQuarterBtn.classList.add("hidden");
  endQuarterBtn.classList.remove("hidden");

  saveState();
  updateTimeline();
}

function adminReset(){
  if(!confirm("Return to setup without deleting players?")) return;

  localStorage.removeItem("rbb_state");

  game
