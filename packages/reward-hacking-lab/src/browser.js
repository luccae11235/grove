import {
  DEFAULT_LAYOUT,
  DEFAULT_TRAINING_OPTIONS,
  createEnvironment,
  createTrainer,
  evaluatePolicy,
  formatReward,
  positionKey,
} from "./experiment.js";

const editorGrid = document.querySelector("#editor-grid");
const editorHint = document.querySelector("#editor-hint");
const checkpointButtons = [...document.querySelectorAll("[data-checkpoint]")];
const trainButton = document.querySelector("#train");
const resetButton = document.querySelector("#reset-layout");
const replayButton = document.querySelector("#replay");
const trainingProgress = document.querySelector("#training-progress");
const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const takeaway = document.querySelector("#takeaway");
const resultCards = {
  proxy: document.querySelector("#proxy-card"),
  aligned: document.querySelector("#aligned-card"),
};

let selectedCheckpoint = 0;
let layout = cloneDefaultLayout();
let runId = 0;
let animationTimer = null;
let latestComparison = null;

function cloneDefaultLayout() {
  return {
    width: DEFAULT_LAYOUT.width,
    height: DEFAULT_LAYOUT.height,
    start: { ...DEFAULT_LAYOUT.start },
    checkpoints: DEFAULT_LAYOUT.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    walls: DEFAULT_LAYOUT.walls.map((wall) => ({ ...wall })),
  };
}

function cellContents(x, y) {
  const key = `${x},${y}`;
  if (positionKey(layout.start) === key) return { kind: "start", label: "S" };
  const checkpoint = layout.checkpoints.findIndex((position) => positionKey(position) === key);
  if (checkpoint >= 0) return { kind: "checkpoint", label: `C${checkpoint + 1}`, checkpoint };
  if (layout.walls.some((position) => positionKey(position) === key)) return { kind: "wall", label: "" };
  return { kind: "empty", label: "" };
}

function renderEditor() {
  editorGrid.replaceChildren();
  editorGrid.style.setProperty("--columns", String(layout.width));
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const contents = cellContents(x, y);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cell ${contents.kind}`;
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", cellLabel(x, y, contents));
      cell.disabled = contents.kind === "start" || contents.kind === "wall";
      cell.textContent = contents.label;
      if (contents.checkpoint === selectedCheckpoint) cell.dataset.selected = "true";
      editorGrid.append(cell);
    }
  }
}

function cellLabel(x, y, contents) {
  if (contents.kind === "start") return `Largada, coluna ${x + 1}, linha ${y + 1}`;
  if (contents.kind === "wall") return `Parede, coluna ${x + 1}, linha ${y + 1}`;
  if (contents.kind === "checkpoint") return `${contents.label}, coluna ${x + 1}, linha ${y + 1}`;
  return `Célula livre, coluna ${x + 1}, linha ${y + 1}`;
}

function selectCheckpoint(index) {
  selectedCheckpoint = index;
  checkpointButtons.forEach((button, buttonIndex) => {
    button.setAttribute("aria-pressed", String(buttonIndex === index));
  });
  editorHint.textContent = `C${index + 1} selecionado. Escolha uma célula livre.`;
  renderEditor();
}

function moveCheckpoint(x, y) {
  const occupied = cellContents(x, y);
  if (occupied.kind !== "empty" && occupied.checkpoint !== selectedCheckpoint) {
    editorHint.textContent = "Escolha uma célula sem largada, parede ou outro checkpoint.";
    return;
  }
  layout.checkpoints[selectedCheckpoint] = { x, y };
  invalidateResults();
  const moved = selectedCheckpoint;
  selectCheckpoint((selectedCheckpoint + 1) % layout.checkpoints.length);
  editorHint.textContent = `C${moved + 1} movido. Agora posicione C${selectedCheckpoint + 1}.`;
}

function invalidateResults() {
  runId += 1;
  stopAnimation();
  latestComparison = null;
  replayButton.disabled = true;
  trainButton.disabled = false;
  trainButton.textContent = "Treinar os dois agentes";
  trainingProgress.hidden = true;
  takeaway.textContent = "A recompensa é a nota vista pelo agente. A volta completa é a meta humana que usamos para julgá-lo.";
  for (const mode of ["proxy", "aligned"]) renderEmptyCard(mode);
}

function renderEmptyCard(mode) {
  const card = resultCards[mode];
  card.querySelector("[data-board]").replaceChildren();
  card.querySelector("[data-metrics]").innerHTML = `
    <div><span>Recompensa</span><strong>—</strong></div>
    <div><span>Volta real</span><strong>—</strong></div>
  `;
  card.querySelector("[data-reading]").textContent = "Treine os agentes para revelar a política.";
}

function boardCellMarkup(x, y, activePosition, recentPositions) {
  const contents = cellContents(x, y);
  const key = `${x},${y}`;
  const trailIndex = recentPositions.findIndex((position) => positionKey(position) === key);
  const onTrail = trailIndex >= 0;
  const isAgent = activePosition && positionKey(activePosition) === key;
  const classes = ["cell", contents.kind];
  if (onTrail) classes.push("trail");
  if (isAgent) classes.push("has-agent");
  const agent = isAgent ? '<span class="agent-mark" aria-hidden="true">A</span>' : "";
  return `<div class="${classes.join(" ")}" role="gridcell" aria-label="${cellLabel(x, y, contents)}">${contents.label}${agent}</div>`;
}

function renderPolicy(mode, evaluation, episodeLabel, activeStep = evaluation.trajectory.length - 1) {
  const card = resultCards[mode];
  const activePosition = evaluation.trajectory[Math.min(activeStep, evaluation.trajectory.length - 1)];
  const recentPositions = evaluation.trajectory.slice(Math.max(0, activeStep - 12), activeStep + 1).reverse();
  const cells = [];
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) cells.push(boardCellMarkup(x, y, activePosition, recentPositions));
  }
  const board = card.querySelector("[data-board]");
  board.innerHTML = `<div class="grid policy-grid" style="--columns: ${layout.width}" role="grid" aria-label="Política ${mode === "proxy" ? "proxy" : "alinhada"}, ${episodeLabel}">${cells.join("")}</div>`;
  card.querySelector("[data-metrics]").innerHTML = `
    <div><span>Recompensa</span><strong>${formatReward(evaluation.reward)}</strong></div>
    <div><span>Volta real</span><strong>${evaluation.completedLap ? "Sim" : "Não"}</strong></div>
  `;
  const reading = card.querySelector("[data-reading]");
  if (mode === "proxy") {
    reading.textContent = evaluation.completedLap
      ? `Completou a volta após ${evaluation.steps} passos.`
      : `Entrou ${evaluation.repeatedEntries} vezes em checkpoints já visitados e não terminou a volta.`;
  } else {
    reading.textContent = evaluation.completedLap
      ? `Visitou os quatro checkpoints em ordem e voltou à largada em ${evaluation.steps} passos.`
      : `Ainda não encontrou uma volta completa após ${evaluation.steps} passos.`;
  }
}

async function trainComparison() {
  const thisRun = ++runId;
  stopAnimation();
  trainButton.disabled = true;
  resetButton.disabled = true;
  checkpointButtons.forEach((button) => { button.disabled = true; });
  trainButton.textContent = "Treinando…";
  replayButton.disabled = true;
  trainingProgress.hidden = false;
  const environment = createEnvironment(layout);
  const options = { ...DEFAULT_TRAINING_OPTIONS };
  const trainers = {
    proxy: createTrainer(environment, "proxy", options),
    aligned: createTrainer(environment, "aligned", options),
  };

  while (!trainers.proxy.finished && thisRun === runId) {
    for (let batch = 0; batch < 25; batch += 1) {
      trainers.proxy.trainEpisode();
      trainers.aligned.trainEpisode();
    }
    const completed = trainers.proxy.episodesCompleted;
    const percentage = Math.min(100, Math.round((completed / options.episodes) * 100));
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `${completed.toLocaleString("pt-BR")} de ${options.episodes.toLocaleString("pt-BR")} episódios`;
    renderPolicy("proxy", evaluatePolicy(environment, trainers.proxy.qValues, "proxy"), `após ${completed} episódios`);
    renderPolicy("aligned", evaluatePolicy(environment, trainers.aligned.qValues, "aligned"), `após ${completed} episódios`);
    await nextFrame();
  }

  if (thisRun !== runId) return;
  const comparison = {
    environment,
    proxy: evaluatePolicy(environment, trainers.proxy.qValues, "proxy"),
    aligned: evaluatePolicy(environment, trainers.aligned.qValues, "aligned"),
  };
  latestComparison = comparison;
  progressFill.style.width = "100%";
  progressLabel.textContent = "Treino concluído · política sem exploração";
  trainButton.disabled = false;
  resetButton.disabled = false;
  checkpointButtons.forEach((button) => { button.disabled = false; });
  trainButton.textContent = "Treinar novamente";
  replayButton.disabled = false;
  takeaway.textContent = comparison.proxy.reward > comparison.aligned.reward && !comparison.proxy.completedLap && comparison.aligned.completedLap
    ? "A medida subiu, mas a meta falhou: ao ser otimizado, o checkpoint deixou de representar progresso. Esta é a tensão central da lei de Goodhart."
    : "Mude os checkpoints e teste de novo: reward hacking é uma possibilidade criada pela recompensa, não um resultado garantido em todo mapa.";
  startAnimation();
}

function startAnimation() {
  if (!latestComparison) return;
  stopAnimation();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderPolicy("proxy", latestComparison.proxy, "trajetória final");
    renderPolicy("aligned", latestComparison.aligned, "trajetória final");
    return;
  }
  let step = 0;
  const renderStep = () => {
    renderPolicy("proxy", latestComparison.proxy, "trajetória final", step % latestComparison.proxy.trajectory.length);
    renderPolicy("aligned", latestComparison.aligned, "trajetória final", step % latestComparison.aligned.trajectory.length);
    step += 1;
  };
  renderStep();
  animationTimer = window.setInterval(renderStep, 140);
}

function stopAnimation() {
  if (animationTimer !== null) window.clearInterval(animationTimer);
  animationTimer = null;
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

editorGrid.addEventListener("click", (event) => {
  const cell = event.target.closest("button[data-x]");
  if (!cell || cell.disabled) return;
  moveCheckpoint(Number(cell.dataset.x), Number(cell.dataset.y));
});
checkpointButtons.forEach((button) => {
  button.addEventListener("click", () => selectCheckpoint(Number(button.dataset.checkpoint)));
});
resetButton.addEventListener("click", () => {
  layout = cloneDefaultLayout();
  invalidateResults();
  selectCheckpoint(0);
  editorHint.textContent = "Pista restaurada. C1 selecionado.";
});
trainButton.addEventListener("click", trainComparison);
replayButton.addEventListener("click", startAnimation);
window.addEventListener("pagehide", stopAnimation);

renderEditor();
for (const mode of ["proxy", "aligned"]) renderEmptyCard(mode);
