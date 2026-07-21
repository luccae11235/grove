import {
  SENSOR_LAYOUT,
  SENSOR_TRAINING_OPTIONS,
  createSensorTrainer,
  evaluateSensorPolicy,
  sensorInitialState,
} from "./sensor-mdp.js";

const trainButton = document.querySelector("#sensor-train");
const replayButton = document.querySelector("#sensor-replay");
const progress = document.querySelector("#sensor-progress");
const progressFill = document.querySelector("#sensor-progress-fill");
const progressLabel = document.querySelector("#sensor-progress-label");
const takeaway = document.querySelector("#sensor-takeaway");
const cards = {
  proxy: document.querySelector("#sensor-proxy-card"),
  aligned: document.querySelector("#sensor-aligned-card"),
};

const key = (position) => `${position.x},${position.y}`;
const walkable = new Set(SENSOR_LAYOUT.walkable.map(key));
let latestComparison = null;
let animationTimer = null;
let runId = 0;

function formatReward(value) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function sensorCell(x, y, state, recentStates) {
  const position = { x, y };
  const positionKey = key(position);
  const classes = ["sensor-cell"];
  let label = "";
  if (walkable.has(positionKey)) classes.push("road");
  if (x === 3 && y === 0) label = "SEGURA";
  if (recentStates.some((candidate) => key(candidate.position) === positionKey)) classes.push("safe-trail");
  if (positionKey === key(SENSOR_LAYOUT.start)) label = "S";
  if (positionKey === key(SENSOR_LAYOUT.destination)) { classes.push("destination"); label = "D"; }
  if (positionKey === key(SENSOR_LAYOUT.fragile)) { classes.push("fragile"); label = "FRÁGIL"; }
  if (positionKey === key(SENSOR_LAYOUT.switch)) { classes.push("switch"); label = "SW"; }
  const agent = key(state.position) === positionKey
    ? '<span class="sensor-agent" aria-hidden="true">A</span>'
    : "";
  const spoken = positionKey === key(SENSOR_LAYOUT.fragile) ? "piso frágil"
    : positionKey === key(SENSOR_LAYOUT.switch) ? "interruptor da câmera"
      : positionKey === key(SENSOR_LAYOUT.destination) ? "destino"
        : positionKey === key(SENSOR_LAYOUT.start) ? "início" : "célula";
  return `<div class="${classes.join(" ")}" role="gridcell" aria-label="${spoken}">${label}${agent}</div>`;
}

function renderBoard(mode, evaluation, step = evaluation ? evaluation.trace.length - 1 : 0) {
  const card = cards[mode];
  const trace = evaluation?.trace ?? [{ state: sensorInitialState() }];
  const traceStep = Math.min(step, trace.length - 1);
  const state = trace[traceStep].state;
  const recentStates = trace.slice(Math.max(0, traceStep - 10), traceStep + 1).map((entry) => entry.state);
  const cells = [];
  for (let y = 0; y < SENSOR_LAYOUT.height; y += 1) {
    for (let x = 0; x < SENSOR_LAYOUT.width; x += 1) cells.push(sensorCell(x, y, state, recentStates));
  }
  card.querySelector("[data-board]").innerHTML = `
    <div class="sensor-status">
      <span class="camera-state ${state.cameraActive ? "" : "off"}">Câmera ${state.cameraActive ? "ligada" : "desligada"}</span>
      <span>${evaluation ? `passo ${traceStep} de ${evaluation.steps}` : "S → D"}</span>
    </div>
    <div class="sensor-map" role="grid" aria-label="Mapa do robô com rota segura superior, piso frágil central e interruptor">${cells.join("")}</div>
  `;

  if (!evaluation) return;
  card.querySelector("[data-metrics]").innerHTML = `
    <div><span>Recompensa</span><strong>${formatReward(evaluation.reward)}</strong></div>
    <div><span>Violações reais</span><strong>${evaluation.realViolations}</strong></div>
    <div><span>Detectadas</span><strong>${evaluation.detectedViolations}</strong></div>
  `;
  card.querySelector("[data-reading]").textContent = mode === "proxy"
    ? evaluation.cameraDisabled && evaluation.realViolations > 0
      ? `Desligou a câmera, cruzou o piso frágil sem ser detectado e entregou em ${evaluation.steps} passos.`
      : `Entregou em ${evaluation.steps} passos sem manipular a medição.`
    : evaluation.realViolations === 0
      ? `Manteve a câmera ligada e fez a rota segura em ${evaluation.steps} passos.`
      : `Ainda cruzou o piso frágil nesta política.`;
}

async function trainComparison() {
  const thisRun = ++runId;
  stopAnimation();
  trainButton.disabled = true;
  trainButton.textContent = "Treinando…";
  replayButton.disabled = true;
  progress.hidden = false;
  const trainers = {
    proxy: createSensorTrainer("proxy"),
    aligned: createSensorTrainer("aligned"),
  };

  while (!trainers.proxy.finished && thisRun === runId) {
    for (let batch = 0; batch < 50; batch += 1) {
      trainers.proxy.trainEpisode();
      trainers.aligned.trainEpisode();
    }
    const completed = trainers.proxy.episodesCompleted;
    const percentage = Math.round((completed / SENSOR_TRAINING_OPTIONS.episodes) * 100);
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `${completed.toLocaleString("pt-BR")} de ${SENSOR_TRAINING_OPTIONS.episodes.toLocaleString("pt-BR")} episódios`;
    if (completed % 200 === 0) {
      renderBoard("proxy", evaluateSensorPolicy(trainers.proxy.qValues, "proxy"));
      renderBoard("aligned", evaluateSensorPolicy(trainers.aligned.qValues, "aligned"));
    }
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  if (thisRun !== runId) return;
  latestComparison = {
    proxy: evaluateSensorPolicy(trainers.proxy.qValues, "proxy"),
    aligned: evaluateSensorPolicy(trainers.aligned.qValues, "aligned"),
  };
  progressFill.style.width = "100%";
  progressLabel.textContent = "Treino concluído · política sem exploração";
  trainButton.disabled = false;
  trainButton.textContent = "Treinar novamente";
  replayButton.disabled = false;
  takeaway.textContent = latestComparison.proxy.realViolations > latestComparison.proxy.detectedViolations
    ? "A câmera reporta zero violações, mas o ambiente registra uma. O agente melhorou a medição manipulando o processo que a produz."
    : "Nesta execução o agente não manipulou o sensor; retreine para inspecionar outra política.";
  startAnimation();
}

function startAnimation() {
  if (!latestComparison) return;
  stopAnimation();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderBoard("proxy", latestComparison.proxy);
    renderBoard("aligned", latestComparison.aligned);
    return;
  }
  let step = 0;
  const draw = () => {
    renderBoard("proxy", latestComparison.proxy, step % latestComparison.proxy.trace.length);
    renderBoard("aligned", latestComparison.aligned, step % latestComparison.aligned.trace.length);
    step += 1;
  };
  draw();
  animationTimer = window.setInterval(draw, 360);
}

function stopAnimation() {
  if (animationTimer !== null) window.clearInterval(animationTimer);
  animationTimer = null;
}

trainButton.addEventListener("click", trainComparison);
replayButton.addEventListener("click", startAnimation);
window.addEventListener("pagehide", stopAnimation);
renderBoard("proxy", null);
renderBoard("aligned", null);
