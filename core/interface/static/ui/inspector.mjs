import { cellRecords } from '../scene-model.mjs';
import { paintAsciiPreview } from '../renderers/ascii-renderer.mjs';
import { actionLabel, directionLabel, layerLabel } from './inspection-format.mjs';

function addField(fields, label, value) {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = String(value ?? '—');
  fields.append(dt, dd);
}

function addMeter(fields, label, value) {
  const level = value >= 75 ? 'high' : value >= 45 ? 'mid' : 'low';
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.className = 'meter-cell';
  dd.dataset.level = level;
  const track = document.createElement('div');
  track.className = 'meter-track';
  track.setAttribute('role', 'meter');
  track.setAttribute('aria-label', label);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', String(Math.round(value)));
  const fill = document.createElement('span');
  fill.className = 'meter-fill';
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  track.append(fill);
  const amount = document.createElement('span');
  amount.className = 'meter-amount';
  amount.textContent = value.toFixed(1);
  dd.append(track, amount);
  fields.append(dt, dd);
}

export function renderInspector(root, scene, item, detail = null, options = {}) {
  root.hidden = !item;
  if (!item) return;
  const isAgent = item.layer === 'agent';
  const tab = isAgent ? options.tab || 'summary' : 'summary';
  root.classList.toggle('deep', tab !== 'summary');
  root.querySelector('[data-category]').textContent = layerLabel(item.layer);
  root.querySelector('#cell-label').textContent = `NA CÉLULA · ${item.x}, ${item.y}`;
  root.querySelector('#inspector-tabs').hidden = !isAgent;
  root.querySelector('#inspector-summary').hidden = tab !== 'summary';
  root.querySelector('#history-panel').hidden = tab === 'summary';
  root.querySelector('#history-panel').setAttribute('aria-labelledby', `tab-${tab}`);
  for (const button of root.querySelectorAll('[data-tab]')) {
    button.setAttribute('aria-selected', String(button.dataset.tab === tab));
    button.tabIndex = button.dataset.tab === tab ? 0 : -1;
  }
  paintAsciiPreview(root.querySelector('#inspector-symbol'), item);
  root.querySelector('[data-title]').textContent = `${item.kind}${item.layer === 'terrain' ? '' : ` #${item.id}`}`;
  const fields = root.querySelector('[data-fields]');
  fields.replaceChildren();
  addField(fields, 'camada', layerLabel(item.layer));
  addField(fields, 'posição', `${item.x}, ${item.y}`);
  if (item.layer === 'agent') {
    addField(fields, 'orientação', directionLabel(item.orientation));
    addField(fields, 'última ação', actionLabel(item.action));
    addMeter(fields, 'fome', item.body.hunger);
    addMeter(fields, 'sede', item.body.thirst);
    addField(fields, 'geração', item.generation);
    addField(fields, 'carga', item.carrying ? `${item.carrying.kind} #${item.carrying.id}` : 'nenhuma');
  } else if (item.layer === 'object') {
    addField(fields, 'quantidade', item.quantity);
    if (detail) {
      addField(fields, 'portátil', detail.portable ? 'sim' : 'não');
      addField(fields, 'ingerível', detail.ingestible ? 'sim' : 'não');
    }
  } else {
    addField(fields, 'bloqueio', item.blocking ? 'sim' : 'não');
    const occupants = cellRecords(scene, item.x, item.y).filter((i) => i.layer !== 'terrain');
    addField(fields, 'presentes', occupants.map((i) => `${i.kind} #${i.id}`).join(', ') || 'nenhum');
  }
}
