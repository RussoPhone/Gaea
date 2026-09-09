import { actionLabel, conditionLabel, changeLabel, sourceLabel, transitionLabel } from './inspection-format.mjs';

const rendered=new WeakMap();
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;};
const field=(dl,label,value)=>dl.append(node('dt',label),node('dd',value));

function evidenceEntry(e) {
  const origin=sourceLabel(e.provenance?.origin);
  return `tick ${e.tick} · ${origin} · ${actionLabel(e.action)}${e.target==null?'':` #${e.target}`} · ${e.changes?.length||0} mudanças`;
}

function memoryContent(root,data) {
  const families=data.families||[];
  root.append(node('p',`${families.length} famílias / ${data.capacity} · ${data.experienceCount} experiências guardadas`,'reading-count'));
  root.append(node('p','Famílias são relações perceptivas exatas. Ramos concorrentes preservam transições incompatíveis sem interpretação comportamental.','reading-note'));
  if(!families.length){root.append(node('p','Nenhuma relação registrada ainda. Execute alguns ticks e atualize esta leitura.','empty-reading'));return;}
  const head=node('div',null,'history-head');
  head.append(node('span','família'),node('span','ocorrência'),node('span','força'));root.append(head);
  const list=node('ol',null,'history-list');
  for(const family of families){
    const li=node('li'),details=node('details'),summary=node('summary');details.dataset.record=String(family.id);
    summary.append(node('span',`#${family.id}${family.competition?' · competição':''}`,'pattern'),
      node('span',actionLabel(family.antecedent?.operation)),node('span',Number(family.strength||0).toFixed(2),'strength'));
    const body=node('div',null,'evidence'),dl=node('dl');
    field(dl,'antecedente',family.antecedent?.conditions?.length?
      family.antecedent.conditions.map(conditionLabel).join(' / '):'ocorrência isolada');
    field(dl,'ramos',String(family.branches?.length||0));
    field(dl,'última evidência',`tick ${family.lastTick} · há ${family.age} ticks`);
    body.append(dl);
    const branches=node('ol',null,'history-list');
    for(const branch of family.branches||[]){
      const branchItem=node('li'),branchBody=node('div',null,'evidence'),branchData=node('dl');
      field(branchData,'ramo',`#${branch.id}`);
      field(branchData,'transição',transitionLabel(branch.transition));
      field(branchData,'força',Number(branch.strength||0).toFixed(2));
      field(branchData,'suporte relativo',`${Math.round(Number(branch.support||0)*100)}%`);
      field(branchData,'evidências',String(branch.evidenceCount||0));
      field(branchData,'proveniência',Object.entries(branch.provenance||{}).map(([key,n])=>`${n} ${sourceLabel(key)}`).join(' · ')||'ausente');
      branchBody.append(branchData);
      const evidence=node('ul');for(const e of [...(branch.evidence||[])].reverse())evidence.append(node('li',evidenceEntry(e)));
      branchBody.append(evidence);branchItem.append(branchBody);branches.append(branchItem);
    }
    body.append(branches);details.append(summary,body);li.append(details);list.append(li);
  }
  root.append(list,node('p',`${data.forgottenFamilies} famílias e ${data.forgottenBranches} ramos removidos da memória.`,'reading-note'));
}

function logContent(root,data,source,onSource) {
  const filter=node('label',null,'log-filter');filter.append(node('span','mostrar'));
  const select=node('select');select.id='log-source';
  for(const [value,label]of [['experiences','Experiências do gaiano'],['events','Eventos físicos envolvendo o gaiano']]){
    const option=node('option',label);option.value=value;select.append(option);
  }
  select.value=source;select.addEventListener('change',()=>onSource(select.value));filter.append(select);root.append(filter);
  const experiences=source==='experiences',items=experiences?data.experiences:data.events;
  root.append(node('p',experiences?`${items.length} experiências / ${data.experienceCapacity} guardadas`:`${items.length} eventos envolvendo este gaiano`,'reading-count'));
  root.append(node('p',experiences?'Própria e observada passam pelo mesmo mecanismo; a origem abaixo é somente proveniência.':`Visão física do pesquisador. Recorte dos últimos ${data.eventCapacity} eventos globais, não um histórico completo da vida.`,'reading-note'));
  if(!items.length){root.append(node('p','Nenhum registro disponível neste recorte.','empty-reading'));return;}
  const list=node('ol',null,'history-list log-list');
  for(const [i,e] of [...items].reverse().entries()){
    const li=node('li'),details=node('details'),summary=node('summary');details.dataset.record=`${source}-${i}`;
    summary.append(node('span',`t ${e.tick}`,'log-tick'),node('span',`${actionLabel(e.action)}${e.target==null?'':` → #${e.target}`}`,'pattern'));
    summary.append(node('span',experiences?`${sourceLabel(e.provenance?.origin)} · ${e.changes?.length||0} mudanças`:`agente #${e.actor}${e.child?` · descendente #${e.child}`:''}`,'log-meta'));
    const body=node('div',null,'evidence'),dl=node('dl');
    if(experiences){
      field(dl,'ator em proveniência',e.provenance?.actor==null?'ausente':`#${e.provenance.actor}`);
      field(dl,'estado interno anterior',(e.before?.body||[]).map((value,index)=>`canal ${index}: ${value}`).join(' · '));
      field(dl,'estado interno posterior',(e.after?.body||[]).map((value,index)=>`canal ${index}: ${value}`).join(' · '));
      for(const change of e.changes||[])field(dl,'mudança percebida',changeLabel(change));
    } else {
      field(dl,'ator',e.actor==null?'não registrado':`#${e.actor}`);
      if(e.position)field(dl,'posição no mundo',e.position.join(', '));
      if(e.delta)field(dl,'variação física',e.delta.join(', '));
      if(e.child)field(dl,'descendente',`#${e.child}`);
    }
    body.append(dl);details.append(summary,body);li.append(details);list.append(li);
  }
  root.append(list);
}

export function renderAgentHistory(root,data,section,force=false) {
  const previous=rendered.get(root);
  if(!force&&previous?.data===data&&previous?.section===section)return;
  const open=new Set([...root.querySelectorAll('details[open]')].map(el=>el.dataset.record));
  const state={data,section,source:previous?.source||'experiences'};
  rendered.set(root,state);root.replaceChildren();
  if(!data)return;
  if(section==='memory')memoryContent(root,data);
  else logContent(root,data,state.source,source=>{state.source=source;renderAgentHistory(root,data,section,true);});
  for(const detail of root.querySelectorAll('details'))detail.open=open.has(detail.dataset.record);
}
