import {
  centerCameraOn,
  fitCamera,
  panCamera,
  zoomCameraAt,
} from "./camera.mjs";
import { deriveWorldEffects, reconcileSelection } from "./presentation.mjs";
import { WorldRenderer } from "./world-renderer.mjs";

const $ = (id) => document.getElementById(id);
const canvas = $("world-canvas");
const renderer = new WorldRenderer(canvas);
const agentDialog = $("agent-dialog");
const memoryDialog = $("memory-dialog");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  snapshot: null,
  previousSnapshot: null,
  snapshotAt: performance.now(),
  camera: null,
  selectedId: null,
  selection: null,
  perspective: "global",
  following: false,
  effects: [],
  hits: [],
  requestTail: Promise.resolve(),
  pollQueued: false,
  controlBusy: false,
  online: false,
};

const actionNames = {
  move: "movendo",
  turn: "girando",
  wait: "esperando",
  inspect: "observando",
  ingest: "ingerindo",
  pick: "recolhendo",
  drop: "soltando",
  place: "posicionando",
  give: "transferindo",
  touch: "tocando",
  signal: "sinalizando",
  birth: "nascimento",
  death: "morte",
};

function list(value) {
  return Array.isArray(value) ? value : [];
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sameId(left, right) {
  return String(left) === String(right);
}

function setText(id, value, fallback = "—") {
  $(id).textContent = value === null || value === undefined || value === "" ? fallback : String(value);
}

function bounded(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function formatPosition(value) {
  return Array.isArray(value) ? `${value[0]}, ${value[1]}` : "—";
}

function formatAppearance(value) {
  const appearance = Array.isArray(value) ? value : value?.appearance;
  return Array.isArray(appearance) ? `aparência ${appearance.join("·")}` : "sem carga";
}

function formatOrientation(value) {
  const [x, y] = list(value).map((part) => Math.sign(Number(part) || 0));
  return ({
    "0,-1": "↑ norte",
    "1,0": "→ leste",
    "0,1": "↓ sul",
    "-1,0": "← oeste",
  })[`${x},${y}`] || "—";
}

function enqueue(task) {
  const result = state.requestTail.then(task, task);
  state.requestTail = result.catch(() => {});
  return result;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
  let payload;
  try {
    payload = await response.json();
  } catch (_) {
    throw new Error(`resposta inválida (${response.status})`);
  }
  if (!response.ok) throw new Error(payload.error || `erro HTTP ${response.status}`);
  return payload;
}

function setConnection(online, detail) {
  state.online = online;
  const connection = document.querySelector(".connection");
  connection.classList.toggle("online", online);
  setText("connection-label", detail);
}

function showError(message) {
  const banner = $("error-banner");
  banner.textContent = message || "";
  banner.hidden = !message;
}

function currentAgent() {
  return list(state.snapshot?.agents).find((agent) => sameId(agent.id, state.selectedId));
}

function fitWorld() {
  if (!state.snapshot) return;
  const viewport = renderer.viewport();
  state.camera = fitCamera(
    state.snapshot.width,
    state.snapshot.height,
    viewport.width,
    viewport.height,
    viewport.width < 620 ? 18 : 38,
  );
}

function centerOnSelected(immediate = false) {
  const agent = currentAgent();
  if (!agent || !state.camera) return;
  const desired = centerCameraOn(state.camera, agent.x, agent.y, renderer.viewport());
  if (immediate || reducedMotion.matches) {
    state.camera = desired;
    return;
  }
  state.camera = {
    ...state.camera,
    offsetX: state.camera.offsetX + (desired.offsetX - state.camera.offsetX) * 0.12,
    offsetY: state.camera.offsetY + (desired.offsetY - state.camera.offsetY) * 0.12,
  };
}

function setFollowing(enabled) {
  state.following = Boolean(enabled && state.selectedId !== null && currentAgent());
  if (state.following) {
    state.perspective = "global";
    centerOnSelected(true);
  }
  renderChrome();
}

function setPerspective(perspective) {
  if (perspective === "agent" && !state.selection?.detail) return;
  state.perspective = perspective;
  if (perspective === "agent") state.following = false;
  renderChrome();
}

function renderStatus() {
  const snapshot = record(state.snapshot);
  const metrics = record(snapshot.metrics);
  const control = record(snapshot.control);
  const remaining = Math.max(0, Math.trunc(Number(control.remaining) || 0));
  const runLabel = control.running ? "EM CURSO" : remaining ? "RAJADA" : "PAUSADA";
  setText("tick-value", Math.trunc(Number(snapshot.tick) || 0));
  setText("alive-value", metrics.alive);
  setText("generation-value", metrics.generation);
  setText("births-value", metrics.births, "0");
  setText("deaths-value", metrics.deaths, "0");
  setText("run-state", runLabel);
  setText("remaining-value", remaining ? `${remaining} passos restantes` : control.running ? `${control.speed || 0} ticks/s` : "tempo suspenso");
  $("run-button").classList.toggle("active", Boolean(control.running));
  $("pause-button").classList.toggle("active", !control.running && !remaining);
  if (control.speed && document.activeElement !== $("speed-select")) {
    $("speed-select").value = String(control.speed);
  }
}

function eventDescription(event) {
  const action = actionNames[event.action] || event.action || "acontecimento";
  const target = event.child ?? event.target;
  const where = Array.isArray(event.position) ? ` em ${formatPosition(event.position)}` : "";
  return `#${event.actor} ${action}${target === null || target === undefined ? "" : ` → #${target}`}${where}`;
}

function renderEvents() {
  const events = list(state.snapshot?.events).slice(-10).reverse();
  setText("event-count", events.length, "0");
  const container = $("event-list");
  container.replaceChildren();
  if (!events.length) {
    const item = document.createElement("li");
    item.className = "empty-event";
    item.textContent = "O mundo ainda está quieto.";
    container.append(item);
    return;
  }
  for (const event of events) {
    const item = document.createElement("li");
    const tick = document.createElement("time");
    const description = document.createElement("span");
    tick.textContent = `t${event.tick}`;
    description.textContent = eventDescription(event);
    item.append(tick, description);
    container.append(item);
  }
}

function renderAgentSheet() {
  const selection = state.selection;
  const detail = selection?.detail;
  if (!detail) {
    if (agentDialog.open) agentDialog.close();
    return;
  }
  setText("agent-id", `Gaiano #${detail.id}`);
  setText("agent-action", actionNames[detail.action] || detail.action, "sem ação");
  setText("agent-position", formatPosition(detail.position || [detail.x, detail.y]));
  const hunger = bounded(detail.body?.hunger);
  const thirst = bounded(detail.body?.thirst);
  $("agent-hunger").value = hunger;
  $("agent-thirst").value = thirst;
  setText("agent-hunger-value", Math.round(hunger));
  setText("agent-thirst-value", Math.round(thirst));
  setText("agent-generation", detail.generation, "0");
  setText("agent-orientation", formatOrientation(detail.orientation));
  setText("agent-carried", formatAppearance(detail.carried || detail.carrying));
  $("agent-death").hidden = !selection.dead;
  $("agent-follow").classList.toggle("active", state.following);
  $("agent-perspective").classList.toggle("active", state.perspective === "agent");
  if (!agentDialog.open && !memoryDialog.open) agentDialog.show();
}

function renderChrome() {
  renderStatus();
  renderEvents();
  renderAgentSheet();
  const hasSelection = Boolean(state.selection?.detail && !state.selection.dead);
  $("follow-agent").disabled = !hasSelection;
  $("follow-agent").classList.toggle("active", state.following);
  $("global-view").hidden = state.perspective === "global";
  setText("perspective-kicker", state.perspective === "agent" ? "CAMPO SENSORIAL" : "VISÃO DO OBSERVADOR");
  setText(
    "perspective-title",
    state.perspective === "agent" ? `Percepção de #${state.selectedId}` : state.following ? `Acompanhando #${state.selectedId}` : "Mundo inteiro",
  );
}

function acceptSnapshot(snapshot) {
  const now = performance.now();
  const effects = deriveWorldEffects(state.snapshot, snapshot)
    .map((effect) => ({ ...effect, createdAt: now }));
  state.effects = [...state.effects, ...effects].slice(-96);
  state.previousSnapshot = state.snapshot;
  state.snapshot = snapshot;
  state.snapshotAt = now;
  state.selection = reconcileSelection(
    state.selectedId,
    state.selection?.detail,
    snapshot,
  );
  if (state.selectedId !== null && !state.selection) {
    state.selectedId = null;
    state.following = false;
    state.perspective = "global";
  }
  if (!state.camera) fitWorld();
  renderChrome();
}

function queueSnapshot() {
  if (state.pollQueued) return;
  state.pollQueued = true;
  enqueue(async () => {
    const selected = state.selectedId === null ? "" : `?selected=${encodeURIComponent(state.selectedId)}`;
    try {
      const snapshot = await fetchJson(`/api/snapshot${selected}`);
      acceptSnapshot(snapshot);
      setConnection(true, "observando");
      const workerError = record(snapshot.control).error;
      showError(workerError ? `Simulação interrompida: ${workerError}` : "");
    } catch (error) {
      setConnection(false, "reconectando");
      showError(`A última visão foi preservada. ${error.message}`);
    } finally {
      state.pollQueued = false;
    }
  });
}

function setControlsDisabled(disabled) {
  for (const element of document.querySelectorAll("#time-controls button, #time-controls input, #time-controls select")) {
    element.disabled = disabled;
  }
}

async function sendControl(command, value) {
  if (state.controlBusy) return;
  state.controlBusy = true;
  setControlsDisabled(true);
  await enqueue(async () => {
    try {
      const payload = { command };
      if (value !== undefined) payload.value = value;
      await fetchJson("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showError("");
    } catch (error) {
      showError(`Comando recusado: ${error.message}`);
    } finally {
      state.controlBusy = false;
      setControlsDisabled(false);
      queueSnapshot();
    }
  });
}

function selectAgent(id) {
  state.selectedId = id;
  const agent = list(state.snapshot?.agents).find((candidate) => sameId(candidate.id, id));
  if (agent) {
    state.selection = {
      id: agent.id,
      dead: false,
      detail: { ...agent, position: [agent.x, agent.y], carried: agent.carrying },
    };
    renderChrome();
  }
  queueSnapshot();
}

let pointer = null;
canvas.addEventListener("pointerdown", (event) => {
  if (state.perspective !== "global" || event.button !== 0) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add("dragging");
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer || pointer.id !== event.pointerId || !state.camera) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) pointer.moved = true;
  state.camera = panCamera(state.camera, dx, dy);
  state.following = false;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

canvas.addEventListener("pointerup", (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  canvas.classList.remove("dragging");
  if (!pointer.moved) {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const hit = state.hits.findLast((region) => Math.hypot(x - region.x, y - region.y) <= region.radius);
    if (hit) selectAgent(hit.id);
  }
  pointer = null;
});

canvas.addEventListener("pointercancel", () => {
  pointer = null;
  canvas.classList.remove("dragging");
});

canvas.addEventListener("wheel", (event) => {
  if (!state.camera || state.perspective !== "global") return;
  event.preventDefault();
  const bounds = canvas.getBoundingClientRect();
  state.camera = zoomCameraAt(
    state.camera,
    event.clientX - bounds.left,
    event.clientY - bounds.top,
    event.deltaY < 0 ? 1.14 : 1 / 1.14,
  );
  state.following = false;
}, { passive: false });

$("fit-world").addEventListener("click", () => { state.following = false; fitWorld(); renderChrome(); });
$("follow-agent").addEventListener("click", () => setFollowing(!state.following));
$("global-view").addEventListener("click", () => setPerspective("global"));
$("run-button").addEventListener("click", () => sendControl("run"));
$("pause-button").addEventListener("click", () => sendControl("pause"));
$("step-button").addEventListener("click", () => sendControl("step"));
$("speed-select").addEventListener("change", (event) => sendControl("speed", Number(event.target.value)));
$("burst-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendControl("burst", Number($("burst-value").value));
});
$("agent-follow").addEventListener("click", () => setFollowing(!state.following));
$("agent-perspective").addEventListener("click", () => {
  setPerspective(state.perspective === "agent" ? "global" : "agent");
  if (agentDialog.open) agentDialog.close();
});
$("agent-memory").addEventListener("click", () => {
  if (agentDialog.open) agentDialog.close();
  if (!memoryDialog.open) memoryDialog.showModal();
});

document.addEventListener("keydown", (event) => {
  const editing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (event.key === "Escape") {
    if (memoryDialog.open) memoryDialog.close();
    else if (agentDialog.open) agentDialog.close();
    else if (state.perspective === "agent") setPerspective("global");
    return;
  }
  if (editing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === " ") {
    event.preventDefault();
    sendControl(state.snapshot?.control?.running ? "pause" : "run");
  } else if (event.key === ".") {
    sendControl("step");
  } else if (event.key.toLowerCase() === "f") {
    setFollowing(!state.following);
  } else if (event.key === "0") {
    state.following = false;
    fitWorld();
    renderChrome();
  } else if (state.camera && state.perspective === "global" && event.key.startsWith("Arrow")) {
    event.preventDefault();
    const distance = 42;
    const offsets = {
      ArrowLeft: [distance, 0], ArrowRight: [-distance, 0],
      ArrowUp: [0, distance], ArrowDown: [0, -distance],
    }[event.key];
    state.camera = panCamera(state.camera, ...offsets);
    state.following = false;
  }
});

window.addEventListener("online", queueSnapshot);
window.addEventListener("offline", () => {
  setConnection(false, "sem conexão");
  showError("A última visão foi preservada. Rede indisponível.");
});

function draw(now) {
  state.effects = state.effects.filter((effect) => now - effect.createdAt < 1300);
  if (state.following) centerOnSelected();
  if (state.perspective === "agent") {
    state.hits = renderer.drawPerception(state.selection?.detail);
  } else {
    state.hits = renderer.draw(state.snapshot, state.camera, {
      previousSnapshot: state.previousSnapshot,
      motionProgress: reducedMotion.matches ? 1 : Math.min(1, (now - state.snapshotAt) / 170),
      selectedId: state.selectedId,
      effects: state.effects,
      now,
    });
  }
  requestAnimationFrame(draw);
}

setConnection(false, "conectando");
renderChrome();
queueSnapshot();
setInterval(queueSnapshot, 200);
requestAnimationFrame(draw);
