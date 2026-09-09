const actions={move:'mover',turn:'girar',wait:'esperar',inspect:'inspecionar',touch:'tocar',
  ingest:'ingerir',pick:'pegar',drop:'soltar',place:'colocar',give:'transferir',signal:'emitir sinal',
  birth:'nascimento',death:'morte'};
export const actionLabel=action=>actions[action]||action||'nenhuma';
export const patternLabel=pattern=>Array.isArray(pattern)&&pattern.length?pattern.map(value=>
  Array.isArray(value)?`(${value.join(' · ')})`:String(value)).join(' · '):'∅';
export const sourceLabel=source=>source==='self'?'própria':source==='observed'?'observada':source;
export const layerLabel=layer=>({agent:'indivíduo',object:'objeto',terrain:'terreno'})[layer]||layer;
export const directionLabel=o=>({'0,-1':'norte ↑','1,0':'leste →','0,1':'sul ↓','-1,0':'oeste ←'})[o?.join(',')]||o?.join(', ');

const plain=value=>value==null?'ausente':Array.isArray(value)?`(${value.map(plain).join(' · ')})`:String(value);
export const conditionLabel=condition=>`${condition?.kind||'relação'} ${plain(condition?.value)}`;
export const changeLabel=change=>`${plain(change?.subject)} · ${change?.attribute||'mudança'}: ${plain(change?.before)} → ${plain(change?.after)}`;
export const transitionLabel=transition=>Array.isArray(transition)&&transition.length?
  transition.map(change=>plain(change)).join(' / '):'nenhuma mudança percebida';
