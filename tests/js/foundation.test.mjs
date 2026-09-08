import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationStore } from '../../core/interface/static/store.mjs';
import { candidatesAt, resolveSelection } from '../../core/interface/static/selection.mjs';
import { AsciiRenderer, asciiGlyph } from '../../core/interface/static/renderers/ascii-renderer.mjs';
import { assertRenderer } from '../../core/interface/static/renderers/renderer-contract.mjs';
import { cellRecords } from '../../core/interface/static/scene-model.mjs';

const terrain = {id:'0,0',layer:'terrain',kind:'grass',x:0,y:0,blocking:false};
const object = {id:2,layer:'object',kind:'stone',x:0,y:0,quantity:1};
const agent = {id:1,layer:'agent',kind:'gaiano',x:0,y:0,orientation:[0,-1],body:{hunger:0,thirst:0},
  micro_position:[1,1],collision_cells:[[1,1],[1,0]]};
const bootstrap = () => ({schemaVersion:2,worldRevision:'one',tick:0,width:2,height:2,
  terrain:[terrain,...[[1,0],[0,1],[1,1]].map(([x,y])=>({...terrain,id:`${x},${y}`,x,y}))],objects:[object,{...object,id:3}],agents:[agent],events:[],
  catalog:[],config:{},control:{running:false,speed:20,remaining:0}});

test('store applies dynamic frames atomically and preserves static terrain',()=>{
  const s=new SimulationStore();s.bootstrap(bootstrap());
  const previous=s.scene;
  assert.equal(s.applyFrame({...bootstrap(),worldRevision:'other'}),'resync');
  assert.equal(s.scene,previous);
  assert.throws(()=>s.applyFrame({...bootstrap(),tick:1,agents:null}));
  assert.equal(s.scene,previous);
  assert.equal(s.applyFrame({...bootstrap(),tick:1,objects:[]}), 'applied');
  assert.equal(s.scene.terrain,previous.terrain);
  assert.equal(s.scene.objects.length,0);
  assert.equal(s.applyFrame({...bootstrap(),tick:0}), 'stale');
  assert.equal(s.scene.tick,1);
});

test('invalid nested data cannot replace a valid scene and schema changes request bootstrap',()=>{
  const s=new SimulationStore();s.bootstrap(bootstrap());const scene=s.scene;
  assert.throws(()=>s.applyFrame({...bootstrap(),agents:[{...agent,body:null}]}));
  assert.equal(s.scene,scene);
  assert.throws(()=>s.bootstrap({...bootstrap(),terrain:[terrain]}));
  assert.equal(s.scene,scene);
  assert.equal(s.applyFrame({...bootstrap(),schemaVersion:3}), 'resync');
  assert.throws(()=>s.bootstrap({...bootstrap(),schemaVersion:3}));
  assert.equal(s.scene,scene);
  assert.throws(()=>cellRecords(scene,0,0).pop());
});

test('store rejects malformed or inconsistent agent microcell geometry atomically',()=>{
  const invalid = [
    {...agent,micro_position:[1]},
    {...agent,collision_cells:[[1,1]]},
    {...agent,collision_cells:[[1,1],[2,2]]},
    {...agent,micro_position:[0,0],collision_cells:[[0,0],[-1,0]]},
    {...agent,x:1,micro_position:[1,1],collision_cells:[[1,1],[1,0]]},
  ];
  for (const candidate of invalid) {
    const s=new SimulationStore();s.bootstrap(bootstrap());const scene=s.scene;
    assert.throws(()=>s.applyFrame({...bootstrap(),tick:1,agents:[candidate]}));
    assert.equal(s.scene,scene);
  }
});

test('selection enumerates all layers without collapsing stacked objects',()=>{
  const s=new SimulationStore();s.bootstrap(bootstrap());
  const candidates=candidatesAt(s.scene,0,0);
  assert.deepEqual(candidates.map(c=>c.layer),['agent','object','object','terrain']);
  assert.equal(resolveSelection(s.scene,{layer:'object',id:3}).id,3);
  assert.equal(resolveSelection(s.scene,{layer:'terrain',id:'0,0'}).kind,'grass');
});

test('ascii renderer consumes a frozen scene and exposes the picking contract',()=>{
  const s=new SimulationStore();s.bootstrap(bootstrap());
  const scene=s.scene;
  const calls=[];
  const ctx=new Proxy({}, {get(target,key){return target[key]??((...args)=>calls.push([key,...args]));},set(t,k,v){t[k]=v;return true;}});
  const surface={width:0,height:0,getContext:()=>ctx};
  const options={selection:{layer:'object',id:2},motionProgress:1};
  const renderer=assertRenderer(new AsciiRenderer());renderer.mount(surface);
  renderer.resize({width:200,height:200,ratio:1});
  renderer.render(scene,{cell:24,offsetX:0,offsetY:0},options);
  assert.equal(renderer.hitTest({x:12,y:12}).length,4);
  assert.equal(renderer.hitTest({x:150,y:150}).length,0);
  renderer.dispose();
  assert.ok(calls.some(c=>c[0]==='fillText'));
  assert.equal(s.scene,scene);
});

test('ascii renderer culls layers and picks the visible interpolated agent without changing grid state',()=>{
  const s=new SimulationStore();s.bootstrap(bootstrap());
  s.applyFrame({...bootstrap(),tick:1,agents:[{...agent,x:1,micro_position:[3,1],collision_cells:[[3,1],[3,0]]}]});
  const ctx=new Proxy({}, {get(t,k){return t[k]??(()=>{});},set(t,k,v){t[k]=v;return true;}});
  const r=new AsciiRenderer(),drawn=[];
  r.mount({getContext:()=>ctx});r.resize({width:24,height:24});
  r.tile=i=>drawn.push(i);r.object=i=>drawn.push(i);r.agent=i=>drawn.push(i);
  r.render(s.scene,{cell:24,offsetX:0,offsetY:0});
  assert.ok(drawn.every(i=>i.x===0&&i.y===0));
  r.resize({width:100,height:100});
  r.render(s.scene,{cell:24,offsetX:0,offsetY:0},{previous:s.previous,motionProgress:.1});
  assert.equal(r.hitTest({x:14,y:12})[0].id,agent.id);
  assert.equal(s.scene.agents[0].x,1);
  r.dispose();
});

test('ascii renderer uses lod without inventing physical cells',()=>{
  assert.equal(asciiGlyph({...agent,cells:[[1,0],[0,1],[1,1],[2,1],[1,2]]}, 10), '@');
  assert.equal(asciiGlyph({...agent,cells:[[1,0],[0,1],[1,1],[2,1],[1,2]]}, 24), '◉');
  const calls=[];
  const ctx=new Proxy({}, {get(target,key){return target[key]??((...args)=>calls.push([key,...args]));},set(t,k,v){t[k]=v;return true;}});
  const renderer=new AsciiRenderer();
  renderer.mount({width:0,height:0,getContext:()=>ctx});
  renderer.resize({width:80,height:80,ratio:1});
  renderer.agent({...agent,cells:[[1,0],[0,1],[1,1],[2,1],[1,2]],orientation:[1,0]}, {cell:48,offsetX:0,offsetY:0});

  assert.equal(calls.filter(([name])=>name==='fillRect').length >= 5, true);
  assert.equal(calls.some(([name])=>name==='fillText'), false);
});
