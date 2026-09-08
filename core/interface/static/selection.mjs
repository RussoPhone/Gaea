import { cellRecords, entityRecord } from './scene-model.mjs';
const priority = {agent:0, object:1, terrain:2};
export function candidatesAt(scene, x, y) {
  return [...cellRecords(scene,x,y)].sort((a,b)=>priority[a.layer]-priority[b.layer] || String(a.id).localeCompare(String(b.id)));
}
export function resolveSelection(scene, selection) {
  return selection ? entityRecord(scene,selection.layer,selection.id) : null;
}
export function selectionKey(item) { return {layer:item.layer,id:item.id}; }
