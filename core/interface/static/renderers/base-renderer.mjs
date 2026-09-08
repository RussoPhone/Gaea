import { visibleBounds, screenToWorld } from '../camera.mjs';
import { candidatesAt, resolveSelection } from '../selection.mjs';
import { cellRecords } from '../scene-model.mjs';

export class BaseRenderer {
  mount(surface) { this.surface=surface; this.ctx=surface.getContext('2d'); }
  resize(viewport) {
    this.viewport=viewport;
    const ratio=viewport.ratio || 1;
    const w=Math.round(viewport.width*ratio),h=Math.round(viewport.height*ratio);
    if(this.surface.width!==w)this.surface.width=w;
    if(this.surface.height!==h)this.surface.height=h;
    this.ctx.setTransform(ratio,0,0,ratio,0,0);
    this.ctx.imageSmoothingEnabled=false;
  }
  render(scene,camera,options={}) {
    this.scene=scene; this.camera=camera;
    this.agentHits=[];
    const ctx=this.ctx,v=this.viewport;
    ctx.clearRect(0,0,v.width,v.height);
    ctx.fillStyle=this.background || '#20261f'; ctx.fillRect(0,0,v.width,v.height);
    if(!scene||!camera)return;
    const b=visibleBounds(camera,v,scene.width,scene.height);
    const within=item=>item.x>=b.left&&item.x<=b.right&&item.y>=b.top&&item.y<=b.bottom;
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++) {
      for(const item of cellRecords(scene,x,y))if(item.layer==='terrain')this.tile(item,camera);
    }
    for(const item of scene.objects.filter(within))this.object(item,camera,
      cellRecords(scene,item.x,item.y).filter(i=>i.layer==='object'));
    const old=new Map((options.previous?.agents || []).map(a=>[a.id,a]));
    for(const agent of scene.agents.filter(within)) {
      const prior=old.get(agent.id),p=options.motionProgress??1;
      // Only interpolate adjacent steps; skipped ticks must not invent paths through obstacles.
      const can=options.previous?.worldRevision===scene.worldRevision && scene.tick===options.previous.tick+1 &&
        prior&&Math.abs(agent.x-prior.x)+Math.abs(agent.y-prior.y)===1;
      const visual=can?{...agent,x:prior.x+(agent.x-prior.x)*p,y:prior.y+(agent.y-prior.y)*p}:agent;
      this.agent(visual,camera);
      this.agentHits.push({agent,x:camera.offsetX+(visual.x+.5)*camera.cell,
        y:camera.offsetY+(visual.y+.5)*camera.cell});
    }
    const selected=resolveSelection(scene,options.selection);
    if(selected){
      const x=Math.round(camera.offsetX+selected.x*camera.cell)+.5,y=Math.round(camera.offsetY+selected.y*camera.cell)+.5;
      const size=Math.round(camera.cell)-1,arm=Math.max(3,Math.floor(size*.25));
      ctx.beginPath();
      for(const [dx,dy,sx,sy] of [[0,0,1,1],[size,0,-1,1],[0,size,1,-1],[size,size,-1,-1]]){
        ctx.moveTo(x+dx+sx*arm,y+dy);ctx.lineTo(x+dx,y+dy);ctx.lineTo(x+dx,y+dy+sy*arm);
      }
      ctx.strokeStyle='#282d25';ctx.lineWidth=3;ctx.stroke();
      ctx.strokeStyle='#c3b597';ctx.lineWidth=1;ctx.stroke();
    }
  }
  hitTest(point) {
    if(!this.scene||!this.camera)return[];
    // Pick a moving glyph where it is actually drawn, but return authoritative
    // records and the candidates of its logical cell, never interpolated state.
    const visible=(this.agentHits||[]).map(hit=>({...hit,distance:Math.hypot(point.x-hit.x,point.y-hit.y)}))
      .filter(hit=>hit.distance<=this.camera.cell*.4).sort((a,b)=>a.distance-b.distance)[0];
    if(visible)return candidatesAt(this.scene,visible.agent.x,visible.agent.y);
    const world=screenToWorld(this.camera,point.x,point.y);
    return candidatesAt(this.scene,Math.floor(world.x),Math.floor(world.y));
  }
  dispose(){this.scene=null;this.surface=null;this.ctx=null;this.camera=null;this.agentHits=[];}
}
