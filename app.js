let players = [];
let active = {heim:[], gast:[]};
let tempActive = {heim:[], gast:[]};
let log = [];
let period = "Q1";
let gameRunning = false;
let jb = false, fb = false;

// Bonus buttons
const jbBtn = document.getElementById("jbBtn");
const fbBtn = document.getElementById("fbBtn");

// Team color inputs
const heimColor = document.getElementById("heimColor");
const gastColor = document.getElementById("gastColor");

jbBtn.onclick = () => { jb = !jb; jbBtn.classList.toggle("active", jb); };
fbBtn.onclick = () => { fb = !fb; fbBtn.classList.toggle("active", fb); };

function saveState(){
  localStorage.setItem("rbb_state", JSON.stringify({
    players, active, tempActive, log, period, gameRunning,
    nameHeim: nameHeim.value,
    nameGast: nameGast.value,
    heimColor: heimColor.value,
    gastColor: gastColor.value
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

  heimColor.value = data.heimColor || "#4caf50";
  gastColor.value = data.gastColor || "#2196f3";

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

  // Prevent duplicate numbers
  if(players.some(pl => pl.team === t && pl.num === n)){
    alert("Diese Nummer ist in diesem Team bereits vergeben.");
    return;
  }

  players.push({num:n, pts:calcPts(p), team:t, jb, fb});

  // Sort players by number
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

  // Apply team colors
  heimTeam.style.borderColor = heimColor.value;
  gastTeam.style.borderColor = gastColor.value;

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

  players.filter(p => p.team === team).forEach(p => {
    const e = document.createElement("div");
    e.className = "player";

    // Game view: player selection
    if(!setup){
      e.onclick = () => togglePlayer(team, p.num);

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

function togglePlayer(team, num){
  const list = tempActive[team];

  if(list.includes(num)){
    tempActive[team] = list.filter(n => n !== num);
  } else {
    if(tempActive[team].length >= 5){
      alert("Maximal 5 Spieler gleichzeitig.");
      return;
    }
    tempActive[team].push(num);
  }

  animateTeamFlash(team);
  updateTeamStatus(team);
  render();
}

function animateTeamFlash(team){
  const box = document.getElementById(team + "Team");
  box.style.transition = "background-color .3s ease";
  box.style.backgroundColor = "rgba(255,255,0,0.3)";
  setTimeout(() => {
    box.style.backgroundColor = "";
  }, 300);
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
}

function confirmChange(team){
  active[team] = [...tempActive[team]];

  log.push({
    time: new Date().toLocaleTimeString(),
    period,
    team,
    lineup: active[team]
  });

  animateTeamFlash(team);
  saveState();
  render();
}

function undoChange(team){
  tempActive[team] = [...active[team]];
  updateTeamStatus(team);
  render();
}

function adminReset(){
  if(!confirm("Return to setup without deleting players?")) return;

  localStorage.removeItem("rbb_state");

  gameRunning = false;
  period = "Q1";
  active = {heim:[], gast:[]};
  tempActive = {heim:[], gast:[]};
  log = [];

  gameView.classList.add("hidden");
  setupView.classList.remove("hidden");

  render();
}

function endGame(){
  if(!confirm("End game and download CSV?")) return;

  let csv = "Time;Period;Team;Players\n";
  log.forEach(l => {
    csv += `${l.time};${l.period};${l.team};${l.lineup.join(",")}\n`;
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
  a.download = "history.csv";
  a.click();

  localStorage.removeItem("rbb_state");
  location.reload();
}

loadState();
