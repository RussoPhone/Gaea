"use strict";

const $ = (id) => document.getElementById(id);
const canvas = $("world-canvas");
const context = canvas.getContext("2d");

const state = {
  snapshot: null,
  selectedId: null,
  view: "global",
  hitRegions: [],
  requestTail: Promise.resolve(),
  pollQueued: false,
  controlBusy: false,
  lastEventSignature: "",
};

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function appearanceColor(value, alpha = 1) {
  const signature = list(value);
  let hash = 2166136261;
  for (const part of signature) {
    hash ^= Math.round(finite(part) * 1000);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const hue = hash % 360;
  return `hsla(${hue}, 68%, 62%, ${Math.max(0, Math.min(1, finite(alpha, 1)))})`;
}

function short(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    return Object.entries(value).slice(0, 4).map(([key, item]) => `${key}: ${short(item, "")}`).join(" · ");
  }
  return String(value);
}

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

function compactNumber(value) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return `[${value.map(compactNumber).join(", ")}]`;
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 100) / 100) : short(value);
}

function text(id, value) {
  $(id).textContent = short(value);
}

function showError(message) {
  const banner = $("error-banner");
  banner.textContent = message;
  banner.hidden = !message;
}

function setConnection(online, detail) {
  const connection = document.querySelector(".connection");
  connection.classList.toggle("online", online);
  connection.classList.toggle("offline", !online);
  text("connection-label", online ? "Conectado" : "Desconectado");
  text("last-update", detail);
}

function enqueueRequest(task) {
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
    throw new Error(`Resposta inválida do servidor (${response.status})`);
  }
  if (!response.ok) throw new Error(payload.error || `Erro HTTP ${response.status}`);
  return payload;
}

function queueSnapshot() {
  if (state.pollQueued) return;
  state.pollQueued = true;
  enqueueRequest(async () => {
    const selected = state.selectedId ? `?selected=${encodeURIComponent(state.selectedId)}` : "";
    try {
      const snapshot = await fetchJson(`/api/snapshot${selected}`);
      state.snapshot = snapshot;
      if (state.selectedId && !snapshot.selected) {
        const stillPresent = list(snapshot.agents).some((agent) => String(agent.id) === String(state.selectedId));
        if (!stillPresent) state.selectedId = null;
      }
      updatePanels(snapshot);
      setConnection(true, `amostra recebida às ${new Date().toLocaleTimeString("pt-BR")}`);
      const workerError = record(snapshot.control).error;
      showError(workerError ? `Simulação pausada: ${workerError}` : "");
    } catch (error) {
      setConnection(false, "tentando reconectar");
      showError(`Falha de conexão: ${error.message}`);
    } finally {
      state.pollQueued = false;
    }
  });
}

async function sendControl(command, value) {
  if (state.controlBusy) return;
  state.controlBusy = true;
  setControlsDisabled(true);
  await enqueueRequest(async () => {
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

function setControlsDisabled(disabled) {
  for (const element of document.querySelectorAll(".control-deck button, .control-deck input, .control-deck select")) {
    element.disabled = disabled;
  }
}

function updatePanels(snapshot) {
  const control = record(snapshot.control);
  const metrics = record(snapshot.metrics);
  text("tick-value", Math.trunc(finite(snapshot.tick)));
  text("metric-alive", metrics.alive);
  text("metric-births", metrics.births);
  text("metric-deaths", metrics.deaths);
  text("metric-objects", metrics.objects);
  text("metric-relations", metrics.relations);
  text("metric-light", `${Math.round(finite(snapshot.light) * 100)}%`);

  const running = Boolean(control.running);
  const remaining = Math.max(0, Math.trunc(finite(control.remaining)));
  text("run-state", running ? "EM CURSO" : remaining ? "RAJADA" : "PAUSADA");
  text("remaining-value", remaining ? `${remaining.toLocaleString("pt-BR")} restantes` : "sem rajada");
  document.querySelector(".run-state").classList.toggle("running", running || remaining > 0);
  if (Number.isFinite(Number(control.speed))) $("speed-select").value = String(control.speed);

  renderAgentList(snapshot.agents);
  renderEvents(snapshot.events);
  renderSelected(snapshot.selected);
  applyViewMode();
}

function renderAgentList(agentsValue) {
  const agents = list(agentsValue);
  text("agent-count", agents.length);
  const container = $("agent-list");
  container.replaceChildren();
  if (!agents.length) {
    container.append(emptyNode("Nenhum agente no mundo."));
    return;
  }
  for (const agent of agents) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "agent-button";
    button.classList.toggle("selected", String(agent.id) === String(state.selectedId));
    button.classList.toggle("dead", agent.alive === false);
    button.dataset.agentId = String(agent.id);
    const symbol = document.createElement("span");
    symbol.className = "agent-symbol";
    symbol.textContent = agent.alive === false ? "×" : orientationGlyph(agent.orientation);
    const name = document.createElement("strong");
    name.textContent = short(agent.id);
    const meta = document.createElement("small");
    meta.textContent = `g${short(agent.generation, "0")} · ${short(agent.action, "sem ação")}`;
    button.append(symbol, name, meta);
    button.addEventListener("click", () => selectAgent(agent.id));
    container.append(button);
  }
}

function selectAgent(id) {
  state.selectedId = String(id);
  state.view = "selected";
  applyViewMode();
  queueSnapshot();
}

function renderEvents(eventsValue) {
  const events = list(eventsValue).slice(-12).reverse();
  const signature = JSON.stringify(events);
  if (signature === state.lastEventSignature) return;
  state.lastEventSignature = signature;
  const container = $("event-list");
  container.replaceChildren();
  if (!events.length) {
    const item = document.createElement("li");
    item.append(emptyNode("Ainda não há eventos significativos."));
    container.append(item);
    return;
  }
  for (const event of events) {
    const item = document.createElement("li");
    const tick = document.createElement("span");
    tick.className = "event-tick";
    tick.textContent = `t ${short(event.tick, "?")}`;
    const description = document.createElement("div");
    const action = document.createElement("span");
    action.className = "event-action";
    action.textContent = short(event.action, "evento");
    const actor = document.createElement("strong");
    actor.textContent = ` · ${short(event.actor ?? event.entity_name, "ambiente")}`;
    description.append(action, actor);
    const details = event.reason ?? event.signal ?? event.message;
    if (details) {
      const meta = document.createElement("span");
      meta.className = "event-meta";
      meta.textContent = short(details);
      description.append(meta);
    }
    item.append(tick, description);
    container.append(item);
  }
}

function renderSelected(selectedValue) {
  const selected = selectedValue && typeof selectedValue === "object" ? selectedValue : null;
  $("selection-placeholder").hidden = Boolean(selected);
  $("selection-detail").hidden = !selected;
  if (!selected) {
    text("selected-name", state.selectedId || "Nenhum selecionado");
    text("generation", "—");
    return;
  }

  text("selected-name", selected.id);
  text("generation", `geração ${short(selected.generation, "—")}`);
  renderSelectedPosition(selected);
  text("selected-orientation", orientationGlyph(selected.orientation));
  text("selected-action", selected.action);
  const carried = selected.carried && typeof selected.carried === "object" ? selected.carried : null;
  text("selected-carried", carried ? `objeto ${short(carried.token ?? carried.id, "?")}` : "sem carga");
  $("selected-carried").style.color = carried ? appearanceColor(carried.appearance) : "";

  const body = record(selected.body);
  updateMeter("hunger", body.hunger);
  updateMeter("thirst", body.thirst);
  renderSignals(selected.perception);
  renderSensorySample(selected.perception);
  renderRelations(record(selected.memory));
  renderExperiences(record(selected.memory));
  renderDecision(selected.decision);
}

function renderSelectedPosition(selected) {
  const sensoryMode = state.view === "selected";
  const position = list(sensoryMode ? selected?.odometry : selected?.position);
  text("selected-position-label", sensoryMode ? "Odômetro adquirido" : "Posição global");
  text("selected-position", position.length >= 2 ? `${position[0]}, ${position[1]}` : "—");
}

function updateMeter(name, rawValue) {
  const value = Math.max(0, Math.min(100, finite(rawValue)));
  $(name + "-meter").value = value;
  text(name + "-value", `${Math.round(value)}%`);
}

function renderSignals(perceptionValue) {
  const signals = list(perceptionValue).filter((item) => item && item.signal !== null && item.signal !== undefined && item.signal !== "");
  text("signal-count", signals.length);
  const container = $("signals-list");
  container.replaceChildren();
  if (!signals.length) {
    container.append(emptyNode("Nenhum sinal na última amostra."));
    return;
  }
  for (const item of signals) {
    const node = document.createElement("div");
    node.className = "compact-item";
    appendLabel(node, short(item.token, "estímulo"), short(item.signal));
    appendLabel(node, "posição", `${signed(item.dx)}, ${signed(item.dy)}`);
    if (item.action) appendLabel(node, "ação", item.action);
    if (item.motion) appendLabel(node, "movimento", item.motion);
    container.append(node);
  }
}

function renderSensorySample(perceptionValue) {
  const perception = list(perceptionValue);
  text("perception-count", `${perception.length} registros`);
  const inspectable = perception.map((item) => ({
    ...record(item),
    signature: list(item?.appearance),
  }));
  $("perception-detail").textContent = jsonText(inspectable);
}

function renderRelations(memory) {
  const relations = list(memory.relations).slice().sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)));
  text("relation-count", relations.length);
  const container = $("relations-list");
  const openKeys = new Set(
    [...container.querySelectorAll("details[open]")].map((node) => node.dataset.key)
  );
  container.replaceChildren();
  if (!relations.length) {
    container.append(emptyNode("Nenhuma relação registrada."));
    return;
  }
  for (const relation of relations) {
    const node = document.createElement("details");
    node.className = "relation-item";
    node.classList.toggle("inactive", relation.active === false);
    const key = String(relation.id ?? jsonText([relation.signature, relation.action, relation.body_context, relation.signal]));
    node.dataset.key = key;
    node.open = openKeys.has(key);
    const head = document.createElement("summary");
    head.className = "relation-head";
    const name = document.createElement("strong");
    name.textContent = `#${short(relation.id, "?")} · assinatura ${jsonText(list(relation.signature))}`;
    const confidence = document.createElement("span");
    confidence.className = "confidence";
    confidence.textContent = `conf. ${formatConfidence(relation.confidence)}`;
    head.append(name, confidence);
    node.append(head);
    const summary = document.createElement("div");
    summary.className = "relation-summary";
    summary.textContent = `${short(relation.action, "sem ação")} · sinal ${short(relation.signal, "—")} · corpo ${compactNumber(relation.body_context)} · peso ${compactNumber(relation.weight)} · Δ ${compactNumber(relation.delta)} · idade ${compactNumber(relation.age)}`;
    node.append(summary);
    const raw = document.createElement("pre");
    raw.textContent = jsonText(relation);
    node.append(raw);
    container.append(node);
  }
}

function renderExperiences(memory) {
  const experiences = list(memory.experiences).slice(-8).reverse();
  text("forgotten-count", `${Math.max(0, Math.trunc(finite(memory.forgotten)))} esquecidas`);
  const container = $("experiences-list");
  const openKeys = new Set(
    [...container.querySelectorAll("details[open]")].map((node) => node.dataset.key)
  );
  container.replaceChildren();
  if (!experiences.length) {
    container.append(emptyNode("Nenhuma experiência preservada."));
    return;
  }
  for (const [index, experience] of experiences.entries()) {
    const node = document.createElement("details");
    node.className = "compact-item experience-item";
    const key = typeof experience === "object" && experience !== null
      ? jsonText([experience.tick, experience.actor, experience.action, experience.target, experience.source, experience.signature])
      : `${index}:${short(experience)}`;
    node.dataset.key = key;
    node.open = openKeys.has(key);
    const summary = document.createElement("summary");
    const title = document.createElement("strong");
    title.textContent = typeof experience === "object" && experience !== null
      ? `t ${short(experience.tick, "?")} · ${short(experience.source, "?")} · ${short(experience.actor, "?")} → ${short(experience.action, "?")}`
      : short(experience);
    const target = document.createElement("span");
    target.textContent = typeof experience === "object" && experience !== null
      ? `alvo ${short(experience.target, "—")}`
      : "registro";
    summary.append(title, target);
    const raw = document.createElement("pre");
    raw.textContent = jsonText(experience);
    node.append(summary, raw);
    container.append(node);
  }
}

function renderDecision(value) {
  const container = $("decision-detail");
  container.replaceChildren();
  const decision = record(value);
  if (!Object.keys(decision).length) {
    container.textContent = "Nenhum detalhe de decisão nesta amostra.";
    return;
  }
  for (const [key, item] of Object.entries(decision)) {
    const line = document.createElement("div");
    line.textContent = `${key}: ${short(item)}`;
    container.append(line);
  }
}

function appendLabel(parent, label, value) {
  const span = document.createElement("span");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  span.append(strong, document.createTextNode(short(value)));
  parent.append(span);
}

function emptyNode(message) {
  const node = document.createElement("span");
  node.className = "empty-small";
  node.textContent = message;
  return node;
}

function formatConfidence(value) {
  const number = finite(value, NaN);
  if (!Number.isFinite(number)) return "—";
  return number <= 1 ? `${Math.round(number * 100)}%` : `${Math.round(number)}%`;
}

function signed(value) {
  const number = finite(value);
  return number > 0 ? `+${number}` : String(number);
}

function orientationGlyph(value) {
  const [dx, dy] = list(value).map((part) => Math.sign(finite(part)));
  return ({ "0,-1": "↑", "1,-1": "↗", "1,0": "→", "1,1": "↘", "0,1": "↓", "-1,1": "↙", "-1,0": "←", "-1,-1": "↖" })[`${dx},${dy}`] || "•";
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function draw() {
  resizeCanvas();
  const rect = canvas.getBoundingClientRect();
  context.clearRect(0, 0, rect.width, rect.height);
  context.fillStyle = "#07100e";
  context.fillRect(0, 0, rect.width, rect.height);
  state.hitRegions = [];

  if (state.snapshot) {
    if (state.view === "selected" && state.snapshot.selected) {
      drawSelectedPerception(context, state.snapshot.selected, rect.width, rect.height);
    } else if (state.view === "global") {
      drawGlobal(context, state.snapshot, rect.width, rect.height);
    }
  }
  requestAnimationFrame(draw);
}

function gridGeometry(columns, rows, width, height, padding = 22) {
  const cell = Math.max(2, Math.min((width - padding * 2) / Math.max(1, columns), (height - padding * 2) / Math.max(1, rows)));
  const gridWidth = cell * columns;
  const gridHeight = cell * rows;
  return { cell, left: (width - gridWidth) / 2, top: (height - gridHeight) / 2, gridWidth, gridHeight };
}

function drawGlobal(ctx, snapshot, width, height) {
  const columns = Math.max(1, Math.trunc(finite(snapshot.width, 1)));
  const rows = Math.max(1, Math.trunc(finite(snapshot.height, 1)));
  const geometry = gridGeometry(columns, rows, width, height);
  ctx.fillStyle = "#0b1613";
  ctx.fillRect(geometry.left, geometry.top, geometry.gridWidth, geometry.gridHeight);

  for (const tile of list(snapshot.terrain)) {
    const x = Math.trunc(finite(tile.x));
    const y = Math.trunc(finite(tile.y));
    if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
    const px = geometry.left + x * geometry.cell;
    const py = geometry.top + y * geometry.cell;
    ctx.fillStyle = appearanceColor(tile.appearance, .32);
    ctx.fillRect(px + .4, py + .4, geometry.cell - .8, geometry.cell - .8);
    if (tile.blocking) drawBlocking(ctx, px, py, geometry.cell);
  }

  ctx.strokeStyle = "rgba(170, 200, 183, .08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(geometry.left, geometry.top, geometry.gridWidth, geometry.gridHeight);

  for (const object of list(snapshot.objects)) drawObject(ctx, object, geometry);
  for (const agent of list(snapshot.agents)) drawAgent(ctx, agent, geometry);
}

function drawObject(ctx, object, geometry) {
  const cx = geometry.left + (finite(object.x) + .5) * geometry.cell;
  const cy = geometry.top + (finite(object.y) + .5) * geometry.cell;
  const radius = Math.max(2.5, geometry.cell * .19);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = appearanceColor(object.appearance);
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
  if (finite(object.quantity) > 1 && geometry.cell > 17) {
    ctx.fillStyle = "#f4ead4";
    ctx.font = `${Math.max(8, geometry.cell * .22)}px ui-sans-serif`;
    ctx.fillText(String(object.quantity), cx + radius, cy - radius);
  }
}

function drawAgent(ctx, agent, geometry) {
  const cx = geometry.left + (finite(agent.x) + .5) * geometry.cell;
  const cy = geometry.top + (finite(agent.y) + .5) * geometry.cell;
  const radius = Math.max(3.5, geometry.cell * .28);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = agent.alive === false ? "#6f7772" : "#9bd9a7";
  ctx.fill();
  ctx.strokeStyle = String(agent.id) === String(state.selectedId) ? "#fff4b8" : "#173228";
  ctx.lineWidth = String(agent.id) === String(state.selectedId) ? 3 : 1.5;
  ctx.stroke();
  drawOrientation(ctx, cx, cy, radius, agent.orientation);
  drawCarried(ctx, cx, cy, radius, agent.carrying);
  state.hitRegions.push({ id: String(agent.id), x: cx, y: cy, radius: Math.max(radius, 9) });
}

function drawCarried(ctx, cx, cy, radius, carrying) {
  if (!carrying) return;
  const appearance = Array.isArray(carrying) ? carrying : carrying.appearance;
  if (!Array.isArray(appearance)) return;
  const size = Math.max(3, radius * .58);
  ctx.save();
  ctx.translate(cx + radius * .72, cy + radius * .72);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = appearanceColor(appearance);
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeStyle = "#fff4b8";
  ctx.lineWidth = 1;
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawOrientation(ctx, cx, cy, radius, orientation) {
  const [rawDx, rawDy] = list(orientation);
  const length = Math.hypot(finite(rawDx), finite(rawDy));
  if (!length) return;
  const dx = finite(rawDx) / length;
  const dy = finite(rawDy) / length;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + dx * radius * 1.75, cy + dy * radius * 1.75);
  ctx.strokeStyle = "#d8fff1";
  ctx.lineWidth = 1.7;
  ctx.stroke();
}

function drawBlocking(ctx, x, y, cell) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 150, 130, .55)";
  ctx.lineWidth = Math.max(1, cell * .05);
  ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
  ctx.beginPath();
  ctx.moveTo(x + cell * .2, y + cell * .2);
  ctx.lineTo(x + cell * .8, y + cell * .8);
  ctx.stroke();
  ctx.restore();
}

function drawSelectedPerception(ctx, selected, width, height) {
  const perception = list(selected.perception);
  const range = Math.max(1, ...perception.flatMap((item) => [Math.abs(finite(item.dx)), Math.abs(finite(item.dy))]));
  const side = range * 2 + 1;
  const geometry = gridGeometry(side, side, width, height, 34);
  const center = range;

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const px = geometry.left + x * geometry.cell;
      const py = geometry.top + y * geometry.cell;
      ctx.fillStyle = "rgba(22, 41, 35, .46)";
      ctx.fillRect(px + .5, py + .5, geometry.cell - 1, geometry.cell - 1);
    }
  }

  for (const item of perception) {
    const gx = center + Math.trunc(finite(item.dx));
    const gy = center + Math.trunc(finite(item.dy));
    if (gx < 0 || gy < 0 || gx >= side || gy >= side) continue;
    const px = geometry.left + gx * geometry.cell;
    const py = geometry.top + gy * geometry.cell;
    ctx.fillStyle = appearanceColor(item.appearance, item.token === -1 ? .32 : .95);
    ctx.fillRect(px + 1, py + 1, geometry.cell - 2, geometry.cell - 2);
    if (item.blocking) drawBlocking(ctx, px, py, geometry.cell);
    if (item.motion || item.action || item.signal) {
      ctx.beginPath();
      ctx.arc(px + geometry.cell / 2, py + geometry.cell / 2, Math.max(2, geometry.cell * .13), 0, Math.PI * 2);
      ctx.fillStyle = item.signal ? "#74bec2" : "#e0b66f";
      ctx.fill();
    }
    if (geometry.cell > 25 && item.token !== -1 && item.token !== null && item.token !== undefined) {
      ctx.fillStyle = "rgba(240,250,244,.88)";
      ctx.font = `${Math.max(8, geometry.cell * .16)}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(item.token).slice(0, 10), px + geometry.cell / 2, py + geometry.cell - 5);
    }
  }

  const cx = geometry.left + (center + .5) * geometry.cell;
  const cy = geometry.top + (center + .5) * geometry.cell;
  const radius = Math.max(5, geometry.cell * .3);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#b8e7a8";
  ctx.fill();
  ctx.strokeStyle = "#fff4b8";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawOrientation(ctx, cx, cy, radius, selected.orientation);
  drawCarried(ctx, cx, cy, radius, selected.carried);
}

function applyViewMode() {
  const selectedMode = state.view === "selected";
  document.body.classList.toggle("selected-mode", selectedMode);
  $("global-view").classList.toggle("active", !selectedMode);
  $("selected-view").classList.toggle("active", selectedMode);
  text("map-title", selectedMode ? `Percepção · ${state.selectedId || "sem seleção"}` : "Mapa global");
  $("sample-note").hidden = !selectedMode || !state.snapshot?.selected;
  $("canvas-empty").hidden = !selectedMode || Boolean(state.snapshot?.selected);
  renderSelectedPosition(state.snapshot?.selected);
}

canvas.addEventListener("click", (event) => {
  if (state.view !== "global") return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = state.hitRegions.find((region) => Math.hypot(x - region.x, y - region.y) <= region.radius);
  if (hit) selectAgent(hit.id);
});

$("global-view").addEventListener("click", () => {
  state.view = "global";
  applyViewMode();
});

$("selected-view").addEventListener("click", () => {
  state.view = "selected";
  applyViewMode();
  if (state.selectedId) queueSnapshot();
});

$("run-button").addEventListener("click", () => sendControl("run"));
$("pause-button").addEventListener("click", () => sendControl("pause"));
$("step-button").addEventListener("click", () => sendControl("step"));
$("speed-select").addEventListener("change", (event) => sendControl("speed", Number(event.target.value)));
$("burst-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendControl("burst", Number($("burst-value").value));
});

window.addEventListener("online", queueSnapshot);
window.addEventListener("offline", () => setConnection(false, "rede indisponível"));

applyViewMode();
queueSnapshot();
setInterval(queueSnapshot, 200);
requestAnimationFrame(draw);
