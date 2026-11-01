import {regions,rgb,clamp,smooth} from './content.js';
const TAU=Math.PI*2;
export const normalize=v=>{let l=Math.hypot(...v)||1;return v.map(x=>x/l)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const ident=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function eggPoint(t,p,scale=1){
 let s=Math.sin(t),c=Math.cos(t),d=[s*Math.sin(p),c,s*Math.cos(p)];
 // Broad, shallow asymmetries are anchored to the shell and remain visible as it turns.
 const marks=[[[.54,.23,.81],-.010,65],[[-.70,-.10,.71],.008,90],[[.05,-.43,-.90],-.008,75],[[.84,.49,-.23],.006,100]];
 let detail=marks.reduce((sum,[centre,amount,width])=>{let v=normalize(centre),dot=d[0]*v[0]+d[1]*v[1]+d[2]*v[2];return sum+amount*Math.exp((dot-1)*width)},0);
 let organic=1+.010*Math.sin(3*p+.65)*s*s+detail,r=1.035*s*(1-.07*c)*organic;
 return [r*Math.sin(p)*scale,1.34*c*(1+detail)*scale,r*Math.cos(p)*scale]
}
const seam=p=>1.13+.032*Math.sin(7*p)+.022*Math.sin(13*p+1)+.014*Math.sin(29*p);
function normal(t,p){let e=.0002,a=eggPoint(clamp(t+e,.00001,Math.PI-.00001),p),b=eggPoint(clamp(t-e,.00001,Math.PI-.00001),p),c=eggPoint(t,p+e),d=eggPoint(t,p-e);return normalize(cross(a.map((x,i)=>x-b[i]),c.map((x,i)=>x-d[i])))}
export function shellGeometry(cap){const v=[],ix=[],rings=52,sides=144;
 for(let inside=0;inside<2;inside++)for(let i=0;i<=rings;i++)for(let j=0;j<=sides;j++){
  const p=j/sides*TAU,edge=seam(p),t=cap?i/rings*edge:edge+i/rings*(Math.PI-edge),tt=clamp(t,.00001,Math.PI-.00001),pos=eggPoint(tt,p,inside?.967:1),n=normal(tt,p).map(x=>x*(inside?-1:1));
  v.push(...pos,...n,j/sides,i/rings,inside);
 }
 const layer=(rings+1)*(sides+1);
 for(let k=0;k<2;k++)for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){let a=k*layer+i*(sides+1)+j,b=a+sides+1;ix.push(a,b,a+1,a+1,b,b+1)}
 const edgeRow=cap?rings:0;
 for(let j=0;j<sides;j++){let a=edgeRow*(sides+1)+j,b=a+layer;ix.push(a,a+1,b,b,a+1,b+1)}
 return {v,ix};
}
function decalGeometry(dir){let v=[],ix=[],up=Math.abs(dir[1])>.9?[0,0,-Math.sign(dir[1])]:[0,1,0],right=normalize(cross(up,dir));let nx=28,ny=12;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){let u=x/nx,w=y/ny,d=normalize(dir.map((n,i)=>n+(u-.5)*.91*right[i]+(w-.5)*.36*up[i])),t=Math.acos(d[1]),p=Math.atan2(d[0],d[2]),pt=eggPoint(t,p,1.008),n=normal(clamp(t,.00001,Math.PI-.00001),p);v.push(...pt,...n,u,1-w,0)}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){let a=y*(nx+1)+x,b=a+nx+1;ix.push(a,b,a+1,a+1,b,b+1)}return {v,ix};
}
export class EggScene{
 constructor(canvas){this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});if(!gl)throw Error('WebGL unavailable');
 const vs=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aUV;attribute float aI;uniform mat4 uProjection,uView,uModel;varying vec3 vP,vN,vLocal;varying vec2 vUV;varying float vI;void main(){vec4 p=uModel*vec4(aP,1.);vP=p.xyz;vLocal=aP;vN=mat3(uModel)*aN;vUV=aUV;vI=aI;gl_Position=uProjection*uView*p;}`;
 const derivatives=!!gl.getExtension('OES_standard_derivatives');
 this.shell=this.program(vs,`${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}precision highp float;varying vec3 vP,vN,vLocal;varying vec2 vUV;varying float vI;uniform vec3 uDirection,uColor,uRegion,uSun,uPalette[6];uniform float uFlip,uTint,uCrack,uWorld,uCap,uMixWorld,uDistance;
 float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float shellDetail(vec3 p){
  float a=sin(dot(p,vec3(.83,.29,.41))+sin(dot(p,vec3(.21,.47,.32))));
  float b=sin(dot(p,vec3(-.36,.71,.53))+sin(dot(p,vec3(.39,-.18,.37))));
  float c=sin(dot(p,vec3(.24,-.45,.91))+sin(dot(p,vec3(.42,.31,-.16))));
  float surface=(a+b+c)/3.;
  float pits=smoothstep(.38,.72,surface);
  return .5+.10*surface-.20*pits;
 }
 void main(){vec3 n=normalize(vN);vec3 samplePos=vLocal*155.;float grain=shellDetail(samplePos);float detailFade=1.;
 ${derivatives?`float px=max(length(dFdx(vLocal)),length(dFdy(vLocal)));detailFade=1.-smoothstep(.014,.06,px);`:''}
 if(vI<.5&&detailFade>.001){
  float eps=.18;
  vec3 gradient=vec3(shellDetail(samplePos+vec3(eps,0.,0.))-shellDetail(samplePos-vec3(eps,0.,0.)),shellDetail(samplePos+vec3(0.,eps,0.))-shellDetail(samplePos-vec3(0.,eps,0.)),shellDetail(samplePos+vec3(0.,0.,eps))-shellDetail(samplePos-vec3(0.,0.,eps)))/(2.*eps);
  gradient-=n*dot(gradient,n);
  n=normalize(n-.12*detailFade*gradient);
 }
 float df=max(dot(n,normalize(uSun)),0.),fill=max(dot(n,normalize(vec3(.65,-.2,.35))),0.);float rim=pow(1.-max(dot(n,uDirection),0.),2.);float spec=pow(max(dot(reflect(-normalize(uSun),n),uDirection),0.),25.);float val=mix(.59+.30*df+.06*fill+.09*spec,.045+.20*df+.07*fill+.08*spec,uFlip);float crossover=1.-abs(uFlip-.5)*2.;val=mix(val,mix(.965,.025,step(.5,uFlip)),rim*(.21+.58*crossover));vec3 col=vec3(val);vec3 pearl=vec3(.75,.755,.74)+df*.18+spec*.08+vec3(.05,.015,.06)*n.x+vec3(-.01,.025,.04)*n.z;col=mix(col,pearl,uWorld);col*=1.-(.014*detailFade*grain*(1.-vI));vec3 d=normalize(vLocal);
 float w0=max(d.z,0.)+.12,w1=max(d.x,0.)+.12,w2=max(-d.z,0.)+.12,w3=max(-d.x,0.)+.12,w4=max(d.y,0.)+.12,w5=max(-d.y,0.)+.12;
 vec3 other=(uPalette[0]*w0+uPalette[1]*w1+uPalette[2]*w2+uPalette[3]*w3+uPalette[4]*w4+uPalette[5]*w5)/(w0+w1+w2+w3+w4+w5);
 vec3 dye=mix(uColor,uColor*.88+other*.12,uMixWorld);float arrival=(1.-dot(d,uRegion))*.5;
 // Crack lines appear first; colored seep follows the same path later.
 float crackFront=smoothstep(-.045,.065,uTint*1.22-arrival)*smoothstep(.01,.10,uTint);
 float seepFront=smoothstep(-.10,.10,(uTint-.16)*1.42-arrival)*smoothstep(.16,.28,uTint);
 // A different irregular cellular network is anchored in 3D for each region.
 float staining=0.,fissures=0.,patch=0.;
 if(uTint>.001 && vI<.5){
  vec3 seed=uRegion*17.3+vec3(13.1,29.7,7.4);
  vec3 pos=d*5.2+seed+vec3(noise3(d*7.+seed),noise3(d*7.+seed+19.),noise3(d*7.+seed+43.))*.22;
  vec3 cell=floor(pos),fraction=fract(pos);float first=10.,second=10.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
   vec3 off=vec3(float(x),float(y),float(z)),id=cell+off;
   vec3 point=vec3(hash3(id),hash3(id+vec3(37.2,9.1,14.7)),hash3(id+vec3(12.8,51.4,8.3)));
   vec3 delta=off+point-fraction;float dist=dot(delta,delta);
   if(dist<first){second=first;first=dist;}else if(dist<second){second=dist;}
  }
  float edge=sqrt(second)-sqrt(first);
  fissures=1.-smoothstep(.004,.017,edge);
  staining=1.-smoothstep(.012,.085,edge);
  patch=smoothstep(.36,.58,noise3(d*3.4+seed+vec3(71.2)));
 }
 vec3 innerColor=mix(dye*.72,vec3(1.),.12);
 float fineCrack=fissures*patch*crackFront*(1.-vI);
 vec3 crackShade=mix(vec3(.23),vec3(.74),step(.5,uFlip)*(1.-uWorld));
 col=mix(col,crackShade,fineCrack*.42);
 float seep=clamp(fissures*.58+staining*.055,0.,1.)*patch*seepFront*(1.-vI);
 col=mix(col,innerColor,seep);if(vI>.5){float depth=smoothstep(-1.34,.65,vLocal.y);float hollow=pow(clamp(dot(n,uDirection),0.,1.),1.3);col=vec3(.44+.26*depth-.13*hollow+.09*df+.05*fill);}float p=atan(vP.x,vP.z);float theta=acos(clamp(vP.y/1.34,-1.,1.));float seam=1.13+.032*sin(7.*p)+.022*sin(13.*p+1.)+.014*sin(29.*p);float line=1.-smoothstep(.001,.008,abs(theta-seam));float shellBranch=1.-smoothstep(.001,.006,abs(theta-seam-.11*abs(sin(p*11.))));shellBranch*=step(.82,sin(p*9.+1.));float reveal=smoothstep(0.,.09,uCrack-((p+3.14159)/6.28318));float crack=max(line,shellBranch*.6)*reveal*uCrack*(1.-vI)*(1.-uCap);col=mix(col,vec3(.19,.17,.20),crack*.8);gl_FragColor=vec4(col,1.);}`);
 this.text=this.program(vs,`precision mediump float;varying vec3 vN;varying vec2 vUV;uniform sampler2D uTexture;uniform vec3 uColor,uDirection;uniform float uAlpha;void main(){float a=texture2D(uTexture,vUV).a*uAlpha*smoothstep(.06,.27,dot(normalize(vN),uDirection));if(a<.01)discard;gl_FragColor=vec4(uColor,a);}`);
 this.bg=this.program(`attribute vec2 aP;varying vec2 vUV;void main(){vUV=aP;gl_Position=vec4(aP,1.,1.);}`,`precision mediump float;varying vec2 vUV;uniform float uFlip,uWorld,uTime,uAspect,uYaw,uPitch,uDistance;uniform vec3 uColors[6];uniform float uLights[6];void main(){vec2 p=vUV;p.x*=uAspect;vec3 ray=normalize(vec3(p*.75,1.));float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);vec3 q=vec3(cy*ray.x+sy*(cp*ray.z-sp*ray.y),cp*ray.y+sp*ray.z,-sy*ray.x+cy*(cp*ray.z-sp*ray.y));vec3 camera=vec3(sy*cp,sp,cy*cp)*clamp(uDistance*.035,.12,.65);vec3 nearRay=normalize(q-camera);vec3 col=vec3(.095,.105,.125);for(int i=0;i<6;i++){float a=float(i)*1.0472+.4;vec3 center=normalize(vec3(cos(a),sin(a*.8)*.62,sin(a)));float glow=pow(max(0.,(dot(q,center)+1.)*.5),5.);vec3 nearCenter=normalize(vec3(cos(a+.7)*.8,sin(a*1.3)*.8,sin(a+.7)));float veil=pow(max(0.,(dot(nearRay,nearCenter)+1.)*.5),12.);col+=uColors[i]*(glow*.30+veil*.20)*uLights[i];}col=clamp(col,0.,1.);vec3 mono=vec3(.018+.964*uFlip);gl_FragColor=vec4(mix(mono,col,uWorld),1.);}`);
 this.bgBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.bgBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 this.lower=this.mesh(shellGeometry(false));this.cap=this.mesh(shellGeometry(true));this.decals=regions.map(r=>this.mesh(decalGeometry(r.direction)));this.textures=regions.map(r=>this.texture(r.title));this.questionTexture=null;document.fonts.load('600 82px NotoEgg').then(()=>{this.textures.forEach(t=>gl.deleteTexture(t));this.textures=regions.map(r=>this.texture(r.title))}).catch(()=>{});this.model=ident();this.capModel=ident();gl.enable(gl.DEPTH_TEST);
 }
 program(vs,fs){const gl=this.gl,p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
 mesh({v,ix}){let gl=this.gl,b=gl.createBuffer(),i=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(ix),gl.STATIC_DRAW);return {b,i,count:ix.length}}
 texture(title){let c=document.createElement('canvas');c.width=512;c.height=256;let ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.font='600 82px NotoEgg, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(title,256,128);let gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
 uniform(p,n,type,value){let gl=this.gl,l=gl.getUniformLocation(p,n);if(type==='1f')gl.uniform1f(l,value);else if(type==='3fv')gl.uniform3fv(l,value);else if(type==='1fv')gl.uniform1fv(l,value);else if(type==='4m')gl.uniformMatrix4fv(l,false,value)}
 draw(mesh,p,model){let gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.b);for(const [name,size,offset] of [['aP',3,0],['aN',3,12],['aUV',2,24],['aI',1,32]]){let loc=gl.getAttribLocation(p,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,36,offset)}}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.i);this.uniform(p,'uModel','4m',model);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0)}
 project(pos){let s=this.last,cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch),x=cy*pos[0]-sy*pos[2],y=-sy*sp*pos[0]+cp*pos[1]-cy*sp*pos[2],z=s.distance-(sy*cp*pos[0]+sp*pos[1]+cy*cp*pos[2]),f=1/Math.tan(Math.PI/8);return [(x*f/z/(innerWidth/innerHeight)*.5+.5)*innerWidth,(-y*f/z*.5+.5)*innerHeight,z]}
 render(s){this.last=s;let gl=this.gl,c=this.canvas,dpr=Math.min(devicePixelRatio||1,2),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);if(c.width!==w||c.height!==h){c.width=w;c.height=h}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.useProgram(this.bg);gl.bindBuffer(gl.ARRAY_BUFFER,this.bgBuf);let a=gl.getAttribLocation(this.bg,'aP');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);for(let i=0;i<8;i++)if(i!==a)gl.disableVertexAttribArray(i);this.uniform(this.bg,'uFlip','1f',s.flip);this.uniform(this.bg,'uWorld','1f',s.world);this.uniform(this.bg,'uTime','1f',s.time);this.uniform(this.bg,'uAspect','1f',w/h);this.uniform(this.bg,'uYaw','1f',s.yaw);this.uniform(this.bg,'uPitch','1f',s.pitch);this.uniform(this.bg,'uDistance','1f',s.distance);this.uniform(this.bg,'uColors','3fv',regions.flatMap(r=>rgb(r.color)));this.uniform(this.bg,'uLights','1fv',s.lights);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);
 let f=1/Math.tan(Math.PI/8),near=.05,far=150,proj=new Float32Array([f/(w/h),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]),cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch),dir=[sy*cp,sp,cy*cp],view=new Float32Array([cy,-sy*sp,dir[0],0,0,cp,dir[1],0,-sy,-cy*sp,dir[2],0,0,0,-s.distance,1]);
 const p=this.shell;gl.useProgram(p);this.uniform(p,'uProjection','4m',proj);this.uniform(p,'uView','4m',view);this.uniform(p,'uDirection','3fv',dir);this.uniform(p,'uSun','3fv',s.sun);this.uniform(p,'uDistance','1f',s.distance);this.uniform(p,'uFlip','1f',s.flip);this.uniform(p,'uWorld','1f',s.world);this.uniform(p,'uTint','1f',s.tint);this.uniform(p,'uCrack','1f',s.crack);this.uniform(p,'uColor','3fv',rgb(regions[s.region].color));this.uniform(p,'uRegion','3fv',regions[s.region].direction);this.uniform(p,'uPalette','3fv',regions.flatMap(r=>rgb(r.color)));this.uniform(p,'uMixWorld','1f',s.world>.99?1:0);this.uniform(p,'uCap','1f',0);this.draw(this.lower,p,this.model);
 const o=s.open,rz=-o*.42,rx=-o*.7,cz=Math.cos(rz),sz=Math.sin(rz),cx=Math.cos(rx),sx=Math.sin(rx);this.capModel=new Float32Array([cz,sz,0,0,-sz*cx,cz*cx,sx,0,sz*sx,-cz*sx,cx,0,o*.80,o*1.20,-o*.12,1]);this.uniform(p,'uCap','1f',smooth(0,.2,o));this.draw(this.cap,p,this.capModel);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.useProgram(this.text);for(const [n,t,v] of [['uProjection','4m',proj],['uView','4m',view],['uDirection','3fv',dir]])this.uniform(this.text,n,t,v);
 if(s.questionAlpha>0){this.uniform(this.text,'uColor','3fv',Array(3).fill(s.flip>.5?.96:.06));this.uniform(this.text,'uAlpha','1f',s.questionAlpha);gl.bindTexture(gl.TEXTURE_2D,this.questionTexture);this.draw(this.decals[s.region],this.text,this.model)}for(let i=0;i<6;i++){let alpha=s.wordAlpha[i]*s.words;if(alpha<.001)continue;let shellLight=(1-s.world)*(1-s.flip)+s.world,neutral=shellLight<.5?1:0;this.uniform(this.text,'uColor','3fv',Array(3).fill(neutral));this.uniform(this.text,'uAlpha','1f',alpha);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);this.draw(this.decals[i],this.text,this.model)}gl.depthMask(true);gl.disable(gl.BLEND);
 let pt=[0,.58,.65],m=this.capModel;this.capLabel=this.project([m[0]*pt[0]+m[4]*pt[1]+m[8]*pt[2]+m[12],m[1]*pt[0]+m[5]*pt[1]+m[9]*pt[2]+m[13],m[2]*pt[0]+m[6]*pt[1]+m[10]*pt[2]+m[14]]);
 }
}


