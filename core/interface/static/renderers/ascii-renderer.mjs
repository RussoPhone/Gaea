import { BaseRenderer } from './base-renderer.mjs';

const TERRAIN_GLYPH = Object.freeze({ grass: '"', stone: '#', water: '~' });
const TERRAIN_COLOR = Object.freeze({ grass: '#526044', stone: '#818577', water: '#5f7e83' });
const OBJECT_GLYPH = Object.freeze({ food: 'o', water: '~', stone: '*' });
const OBJECT_COLOR = Object.freeze({ food: '#b6885e', water: '#86a4a7', stone: '#aaa797' });

export function asciiGlyph(item, cellSize = 0) {
  if (item.layer === 'agent') return cellSize >= 18 ? '◉' : '@';
  if (item.kind === 'stack') return '&';
  if (item.layer === 'terrain') return TERRAIN_GLYPH[item.kind] || '.';
  return OBJECT_GLYPH[item.kind] || '?';
}

export function asciiColor(item) {
  if (item.layer === 'agent') return '#cfc2a5';
  if (item.kind === 'stack') return '#c3b597';
  if (item.layer === 'terrain') return TERRAIN_COLOR[item.kind] || '#777';
  return OBJECT_COLOR[item.kind] || '#aaa';
}

export function paintAsciiPreview(canvas, item) {
  const side = canvas.id === 'inspector-symbol' ? 40 : 26;
  const ratio = 2;
  canvas.width = canvas.height = side * ratio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#20261f';
  ctx.fillRect(0, 0, side, side);
  ctx.fillStyle = asciiColor(item);
  ctx.font = `bold ${Math.floor(side * 0.62)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(asciiGlyph(item), side / 2, side / 2);
}

export class AsciiRenderer extends BaseRenderer {
  background = '#e3d5b8';

  mark(item, camera, glyph, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(8, Math.floor(camera.cell * 0.75))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      glyph,
      camera.offsetX + (item.x + 0.5) * camera.cell,
      camera.offsetY + (item.y + 0.5) * camera.cell,
    );
  }

  tile(item, camera) {
    this.mark(item, camera, asciiGlyph(item), asciiColor(item));
  }

  object(item, camera, stack) {
    if (item.id !== stack[stack.length - 1].id) return;
    if (camera.cell >= 34) {
      this.physicalCells(item, camera, stack.length > 1 ? '#c3b597' : asciiColor(item));
      return;
    }
    this.mark(item, camera, stack.length > 1 ? '&' : asciiGlyph(item), asciiColor(item));
  }

  agent(item, camera) {
    if (camera.cell >= 34) {
      this.physicalCells(item, camera, asciiColor(item));
      this.nose(item, camera);
      return;
    }
    this.mark(item, camera, asciiGlyph(item, camera.cell), asciiColor(item));
  }

  physicalCells(item, camera, color) {
    const ctx = this.ctx;
    const cells = item.cells?.length ? item.cells : [[1, 1]];
    const unit = camera.cell / 3;
    ctx.fillStyle = color;
    for (const [dx, dy] of cells) {
      ctx.fillRect(
        camera.offsetX + item.x * camera.cell + dx * unit,
        camera.offsetY + item.y * camera.cell + dy * unit,
        Math.max(1, unit - 1),
        Math.max(1, unit - 1),
      );
    }
  }

  nose(item, camera) {
    const [dx = 0, dy = -1] = item.orientation || [];
    const ctx = this.ctx;
    const unit = camera.cell / 3;
    const cx = camera.offsetX + (item.x + 0.5) * camera.cell;
    const cy = camera.offsetY + (item.y + 0.5) * camera.cell;
    ctx.fillStyle = '#6e5a3d';
    ctx.beginPath();
    ctx.moveTo(cx + dx * unit * 1.15, cy + dy * unit * 1.15);
    ctx.lineTo(cx + dy * unit * 0.42 - dx * unit * 0.2, cy - dx * unit * 0.42 - dy * unit * 0.2);
    ctx.lineTo(cx - dy * unit * 0.42 - dx * unit * 0.2, cy + dx * unit * 0.42 - dy * unit * 0.2);
    ctx.closePath();
    ctx.fill();
  }
}
