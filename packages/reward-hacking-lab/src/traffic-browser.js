import {
  TRAFFIC_CONFIG,
  TRAFFIC_TRAINING_OPTIONS,
  createTrafficTrainer,
  evaluateTrafficPolicy,
  highwaySpeed,
  trafficInitialState,
} from "./traffic-mdp.js";

const trainButton = document.querySelector("#traffic-train");
const replayButton = document.querySelector("#traffic-replay");
const progress = document.querySelector("#traffic-progress");
const progressFill = document.querySelector("#traffic-progress-fill");
const progressLabel = document.querySelector("#traffic-progress-label");
const takeaway = document.querySelector("#traffic-takeaway");
const cards = {
  proxy: document.querySelector("#traffic-proxy-card"),
  aligned: document.querySelector("#traffic-aligned-card"),
};

let latestComparison = null;
let animationTimer = null;
let runId = 0;

function percentage(value) {
  return `${Math.round(value * 100)}%`;
}

function renderBoard(mode, evaluation, step = evaluation ? evaluation.trace.length - 1 : 0) {
  const card = cards[mode];
  const trace = evaluation?.trace ?? [{ state: trafficInitialState(), action: null }];
  const traceStep = Math.min(step, trace.length - 1);
  const current = trace[traceStep];
  const state = current.state;
  const speed = highwaySpeed(state.congestion);
  const queueCars = Array.from({ length: TRAFFIC_CONFIG.maxQueue }, (_, index) =>
    `<span class="${index < state.queue ? "" : "empty"}" aria-hidden="true"></span>`).join("");
  const signalLabel = current.action === 1 ? "Liberar" : "Segurar";
  card.querySelector("[data-board]").innerHTML = `
    <div class="traffic-status"><strong>Rodovia ${percentage(speed)}</strong><span>${evaluation ? `passo ${traceStep} de ${evaluation.steps}` : "fila inicial vazia"}</span></div>
    <div class="traffic-scene" role="img" aria-label="Rodovia a ${percentage(speed)} da velocidade, ${state.queue} de ${TRAFFIC_CONFIG.maxQueue} vagas ocupadas na fila, sinal ${signalLabel.toLowerCase()}">
      <div class="highway"><div class="highway-cars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div></div>
      <div class="ramp-state">
        <div class="signal ${current.action === 1 ? "release" : ""}">${signalLabel}</div>
        <div class="queue-cars">${queueCars}</div>
        <div class="queue-label">${state.queue} de ${TRAFFIC_CONFIG.maxQueue} carros esperando</div>
      </div>
    </div>
  `;

  if (!evaluation) return;
  card.querySelector("[data-metrics]").innerHTML = `
    <div><span>Velocidade</span><strong>${percentage(evaluation.averageHighwaySpeed)}</strong></div>
    <div><span>Fila média</span><strong>${evaluation.averageQueue.toFixed(1)}</strong></div>
    <div><span>Liberados</span><strong>${evaluation.releasedCars}</strong></div>
  `;
  card.querySelector("[data-reading]").textContent = mode === "proxy"
    ? evaluation.releasedCars === 0
      ? `Pontuação ${evaluation.reward.toFixed(0)}: rodovia perfeita, fila saturada e nenhum carro liberado.`
      : `Priorizou a rodovia e deixou ${evaluation.finalQueue} carros na fila final.`
    : `Aceitou ${Math.round((1 - evaluation.averageHighwaySpeed) * 100)}% de lentidão média e reduziu o atraso total para ${evaluation.totalSystemDelay.toFixed(0)}.`;
}

async function trainComparison() {
  const thisRun = ++runId;
  stopAnimation();
  trainButton.disabled = true;
  trainButton.textContent = "Treinando…";
  replayButton.disabled = true;
  progress.hidden = false;
  const trainers = {
    proxy: createTrafficTrainer("proxy"),
    aligned: createTrafficTrainer("aligned"),
  };

  while (!trainers.proxy.finished && thisRun === runId) {
    for (let batch = 0; batch < 50; batch += 1) {
      trainers.proxy.trainEpisode();
      trainers.aligned.trainEpisode();
    }
    const completed = trainers.proxy.episodesCompleted;
    const percentageDone = Math.round((completed / TRAFFIC_TRAINING_OPTIONS.episodes) * 100);
    progressFill.style.width = `${percentageDone}%`;
    progressLabel.textContent = `${completed.toLocaleString("pt-BR")} de ${TRAFFIC_TRAINING_OPTIONS.episodes.toLocaleString("pt-BR")} episódios`;
    if (completed % 250 === 0) {
      renderBoard("proxy", evaluateTrafficPolicy(trainers.proxy.qValues, "proxy"));
      renderBoard("aligned", evaluateTrafficPolicy(trainers.aligned.qValues, "aligned"));
    }
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  if (thisRun !== runId) return;
  latestComparison = {
    proxy: evaluateTrafficPolicy(trainers.proxy.qValues, "proxy", { maxSteps: 200 }),
    aligned: evaluateTrafficPolicy(trainers.aligned.qValues, "aligned", { maxSteps: 200 }),
  };
  progressFill.style.width = "100%";
  progressLabel.textContent = "Treino concluído · mesma sequência de chegadas";
  trainButton.disabled = false;
  trainButton.textContent = "Treinar novamente";
  replayButton.disabled = false;
  takeaway.textContent = latestComparison.proxy.releasedCars === 0
    ? `A proxy obteve rodovia a ${percentage(latestComparison.proxy.averageHighwaySpeed)}, mas o atraso total foi ${(latestComparison.proxy.totalSystemDelay / latestComparison.aligned.totalSystemDelay).toFixed(1)}× maior. O custo foi transferido para a fila excluída.`
    : "A política proxy ainda liberou alguns carros nesta execução; aumente o treino antes de interpretar a comparação.";
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
    step += 2;
  };
  draw();
  animationTimer = window.setInterval(draw, 220);
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
