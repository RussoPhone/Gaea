import { fitCamera, visibleBounds, worldToScreen } from "./camera.mjs";
import { actionGlyph, appearanceStyle } from "./presentation.mjs";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function sameId(left, right) {
  return String(left) === String(right);
}

function within(item, bounds) {
  return item.x >= bounds.left && item.x <= bounds.right
    && item.y >= bounds.top && item.y <= bounds.bottom;
}

export function buildWorldFrame(snapshot, camera, viewport, selectedId) {
  const bounds = visibleBounds(
    camera,
    viewport,
    Math.max(1, Number(snapshot.width) || 1),
    Math.max(1, Number(snapshot.height) || 1),
  );
  const agents = list(snapshot.agents).filter((item) => within(item, bounds));
  return {
    bounds,
    terrain: list(snapshot.terrain).filter((item) => within(item, bounds)),
    objects: list(snapshot.objects).filter((item) => within(item, bounds)),
    agents,
    hits: agents.map((agent) => ({
      id: agent.id,
      ...worldToScreen(camera, agent.x + 0.5, agent.y + 0.5),
      radius: Math.max(9, camera.cell * 0.35),
      selected: sameId(agent.id, selectedId),
    })),
  };
}

function direction(value) {
  const [rawX = 0, rawY = -1] = list(value);
  const length = Math.hypot(Number(rawX) || 0, Number(rawY) || 0) || 1;
  return { x: (Number(rawX) || 0) / length, y: (Number(rawY) || 0) / length };
}

function signatureSeed(value) {
  return list(value).reduce(
    (seed, part) => (Math.imul(seed ^ Math.round((Number(part) || 0) * 997), 16777619) >>> 0),
    2166136261,
  );
}

function interpolatedAgents(snapshot, previous, progress) {
  if (!previous || progress >= 1) return list(snapshot.agents);
  const prior = new Map(list(previous.agents).map((agent) => [String(agent.id), agent]));
  return list(snapshot.agents).map((agent) => {
    const before = prior.get(String(agent.id));
    if (!before) return agent;
    return {
      ...agent,
      x: before.x + (agent.x - before.x) * progress,
      y: before.y + (agent.y - before.y) * progress,
    };
  });
}

export class WorldRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  viewport() {
    const bounds = this.canvas.getBoundingClientRect();
    return { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
  }

  resize() {
    const viewport = this.viewport();
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const width = Math.round(viewport.width * ratio);
    const height = Math.round(viewport.height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return viewport;
  }

  draw(snapshot, camera, frameState = {}) {
    const viewport = this.resize();
    const ctx = this.context;
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = "#0d110d";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    if (!snapshot || !camera) return [];

    const progress = Math.max(0, Math.min(1, Number(frameState.motionProgress ?? 1)));
    const visualSnapshot = {
      ...snapshot,
      agents: interpolatedAgents(snapshot, frameState.previousSnapshot, progress),
    };
    const frame = buildWorldFrame(
      visualSnapshot,
      camera,
      viewport,
      frameState.selectedId,
    );
    this.#drawWorldBase(snapshot, camera);
    for (const tile of frame.terrain) this.#drawTile(tile, camera);
    for (const object of frame.objects) this.#drawObject(object, camera);
    this.#drawEffects(list(frameState.effects), camera, frameState.now || performance.now());
    for (const agent of frame.agents) {
      this.#drawAgent(agent, camera, sameId(agent.id, frameState.selectedId));
    }
    return frame.hits;
  }

  drawPerception(selected, viewport = this.resize()) {
    const ctx = this.context;
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = "#090c09";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    if (!selected) return [];
    const perception = list(selected.perception);
    const range = Math.max(1, ...perception.flatMap((item) => [
      Math.abs(Number(item.dx) || 0),
      Math.abs(Number(item.dy) || 0),
    ]));
    const side = range * 2 + 1;
    const camera = fitCamera(side, side, viewport.width, viewport.height, 48);
    const center = range;

    for (const item of perception) {
      const tile = {
        ...item,
        x: center + (Number(item.dx) || 0),
        y: center + (Number(item.dy) || 0),
      };
      if (item.token === -1) this.#drawTile(tile, camera);
      else this.#drawPerceivedItem(tile, camera);
    }
    this.#drawAgent({
      id: selected.id,
      x: center,
      y: center,
      orientation: selected.orientation,
      action: selected.action,
      carrying: selected.carried,
    }, camera, true);
    return [];
  }

  #drawWorldBase(snapshot, camera) {
    const ctx = this.context;
    const origin = worldToScreen(camera, 0, 0);
    ctx.fillStyle = "#151a12";
    ctx.fillRect(origin.x, origin.y, snapshot.width * camera.cell, snapshot.height * camera.cell);
    ctx.strokeStyle = "rgba(206, 194, 150, .22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(origin.x, origin.y, snapshot.width * camera.cell, snapshot.height * camera.cell);
  }

  #drawTile(tile, camera) {
    const ctx = this.context;
    const point = worldToScreen(camera, tile.x, tile.y);
    const cell = camera.cell;
    const style = appearanceStyle(tile.appearance, tile.blocking ? 0.72 : 0.34);
    ctx.fillStyle = style.color;
    ctx.fillRect(point.x, point.y, cell + 0.4, cell + 0.4);
    if (tile.blocking) {
      ctx.fillStyle = `hsla(${style.hue}, ${Math.max(12, style.saturation - 12)}%, 26%, .92)`;
      ctx.beginPath();
      ctx.moveTo(point.x + cell * 0.12, point.y + cell * 0.82);
      ctx.lineTo(point.x + cell * 0.34, point.y + cell * 0.2);
      ctx.lineTo(point.x + cell * 0.58, point.y + cell * 0.48);
      ctx.lineTo(point.x + cell * 0.78, point.y + cell * 0.16);
      ctx.lineTo(point.x + cell * 0.92, point.y + cell * 0.84);
      ctx.closePath();
      ctx.fill();
    } else if (cell >= 18 && (tile.x * 17 + tile.y * 31) % 5 === 0) {
      ctx.fillStyle = "rgba(224, 211, 160, .12)";
      ctx.fillRect(point.x + cell * 0.24, point.y + cell * 0.66, 1, Math.max(2, cell * 0.12));
    }
    if (cell >= 28) {
      ctx.strokeStyle = "rgba(220, 210, 174, .055)";
      ctx.strokeRect(point.x + 0.5, point.y + 0.5, cell - 1, cell - 1);
    }
  }

  #drawObject(object, camera) {
    const ctx = this.context;
    const center = worldToScreen(camera, object.x + 0.5, object.y + 0.5);
    const size = Math.max(3, Math.min(12, camera.cell * 0.22));
    const style = appearanceStyle(object.appearance);
    const shape = signatureSeed(object.appearance) % 3;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.fillStyle = style.color;
    ctx.strokeStyle = "rgba(248, 235, 188, .72)";
    ctx.lineWidth = Math.max(1, camera.cell * 0.035);
    ctx.beginPath();
    if (shape === 0) {
      ctx.arc(0, 0, size, 0, Math.PI * 2);
    } else if (shape === 1) {
      ctx.moveTo(0, -size * 1.2);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size * 1.2);
      ctx.lineTo(-size, 0);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -size * 1.2);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size * 0.45);
      ctx.lineTo(-size, size);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (camera.cell >= 28 && Number(object.quantity) > 1) {
      ctx.fillStyle = "#e9dfb7";
      ctx.font = `600 ${Math.max(9, camera.cell * 0.24)}px ui-monospace, monospace`;
      ctx.fillText(String(object.quantity), center.x + size, center.y - size);
    }
  }

  #drawAgent(agent, camera, selected) {
    const ctx = this.context;
    const center = worldToScreen(camera, agent.x + 0.5, agent.y + 0.5);
    const radius = Math.max(4.5, Math.min(14, camera.cell * 0.3));
    const facing = direction(agent.orientation);
    const identity = appearanceStyle([agent.id, agent.generation || 0]);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(Math.atan2(facing.y, facing.x) + Math.PI / 2);
    ctx.fillStyle = agent.alive === false ? "#706b5e" : "#d8d09f";
    ctx.strokeStyle = selected ? "#fff2a6" : identity.color;
    ctx.lineWidth = selected ? 2.8 : 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.2);
    ctx.quadraticCurveTo(radius, -radius * 0.15, radius * 0.7, radius);
    ctx.lineTo(0, radius * 0.58);
    ctx.lineTo(-radius * 0.7, radius);
    ctx.quadraticCurveTo(-radius, -radius * 0.15, 0, -radius * 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -radius * 0.52, radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#24271c";
    ctx.fill();
    ctx.restore();

    if (agent.carrying) {
      ctx.fillStyle = appearanceStyle(agent.carrying.appearance || agent.carrying).color;
      ctx.fillRect(center.x + radius * 0.55, center.y + radius * 0.5, radius * 0.65, radius * 0.65);
    }
    if (camera.cell >= 28) {
      ctx.fillStyle = "rgba(248, 241, 205, .92)";
      ctx.font = `600 ${Math.max(9, camera.cell * 0.22)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(`#${agent.id} ${actionGlyph(agent.action)}`, center.x, center.y - radius - 6);
    }
  }

  #drawPerceivedItem(item, camera) {
    const ctx = this.context;
    const center = worldToScreen(camera, item.x + 0.5, item.y + 0.5);
    const size = Math.max(4, camera.cell * 0.18);
    ctx.fillStyle = appearanceStyle(item.appearance).color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, size, 0, Math.PI * 2);
    ctx.fill();
    if (item.action || item.signal !== null && item.signal !== undefined) {
      ctx.fillStyle = "#f1dfa1";
      ctx.font = `600 ${Math.max(10, camera.cell * 0.24)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(item.signal ?? actionGlyph(item.action), center.x, center.y - size - 4);
    }
  }

  #drawEffects(effects, camera, now) {
    const ctx = this.context;
    for (const effect of effects) {
      const age = Math.max(0, now - Number(effect.createdAt || now));
      const opacity = Math.max(0, 1 - age / 1300);
      if (!opacity) continue;
      const at = effect.at || effect.to;
      if (!at) continue;
      const center = worldToScreen(camera, at[0] + 0.5, at[1] + 0.5);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = effect.kind === "death" ? "#c16f62" : "#e6ce83";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      if (effect.kind === "move" && effect.from) {
        const from = worldToScreen(camera, effect.from[0] + 0.5, effect.from[1] + 0.5);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(center.x, center.y);
        ctx.stroke();
      } else if (effect.kind === "signal") {
        ctx.beginPath();
        ctx.arc(center.x, center.y, camera.cell * (0.4 + age / 500), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.font = `700 ${Math.max(12, camera.cell * 0.5)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.fillText(actionGlyph(effect.kind), center.x, center.y - camera.cell * 0.28);
        if (effect.target) {
          const target = worldToScreen(camera, effect.target[0] + 0.5, effect.target[1] + 0.5);
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}
