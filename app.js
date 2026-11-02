import {regions,rgb,clamp,smooth,wrap,regionAt,simulatedSun} from './content.js';
import {EggScene} from './scene.js';
import {renderMarkdown} from './markdown.js';
import {setupProjectDisclosure} from './expand-project-text.js';
import {setupExperienceDisclosure} from './expand-experience.js';
const $=id=>document.getElementById(id),canvas=$('egg-canvas'),reading=$('reading'),scroller=$('reading-scroll');
let scene;try{scene=new EggScene(canvas)}catch(error){$('error-message').hidden=false;$('intro-veil').style.opacity=0;console.error(error);throw error}
const rad=Math.PI/180, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mode='journey',progress=0,curProgress=0,yaw=0,pitch=0,tyaw=0,tpitch=0,distance=1.04,tdistance=1.04,unlocked=false,observe=0,question=0,questionReady=false,region=0,dwell=0,visited=Array(6).fill(false),order=[],wordAlpha=Array(6).fill(0),wordDye=Array(6).fill(0),world=0,worldTime=-1,worldFrom=0,modeTime=0,returnDistance=0,tint=0,crack=0,open=0,words=1,last=performance.now(),exitPressure=0,edgeAt=0,lastScrollAt=0,readingSince=0,entryRegion=0;
let pointers=new Map(),dragCap=false,capY=0,capMoved=false,pinchDistance=0,lastTouchY=0,visible=true,zoomIntent=false,revisitOrigin=0,entryDistance=0;
const dots=regions.map(r=>{let dot=document.createElement('i');dot.style.setProperty('--dot',r.color);$('visit-dots').append(dot);return dot});

const fitDistance=()=>Math.max(1.34,1.08/(innerWidth/innerHeight))/Math.tan(Math.PI/8)*1.5;
const readDistance=()=>Math.max(1.34/(.67*Math.tan(Math.PI/8)),1.08/(.76*(innerWidth/innerHeight)*Math.tan(Math.PI/8)));
const coinDistance=()=>1.34/(clamp(innerHeight*.14,92,110)/innerHeight*Math.tan(Math.PI/8));
const journeyDistance=p=>p<.56?Math.exp(Math.log(1.04)+(Math.log(fitDistance())-Math.log(1.04))*smooth(0,.52,p)):Math.exp(Math.log(fitDistance())+(Math.log(coinDistance())-Math.log(fitDistance()))*smooth(.58,1,p));
const canControl=()=>['journey','explore','open'].includes(mode);
const canRotate=()=>unlocked&&canControl()&&(mode==='open'||distance>=fitDistance()*.85);
function setText(id,text){if($(id).textContent!==text)$(id).textContent=text}
function say(title,detail='',eyebrow='TAKE YOUR TIME'){setText('instruction',title);setText('detail',detail);setText('eyebrow',eyebrow)}
function setMode(next){mode=next;modeTime=0;document.body.dataset.mode=next}
function reset(){stopCrackSound();setMode('journey');progress=curProgress=yaw=pitch=tyaw=tpitch=0;distance=tdistance=1.04;unlocked=false;observe=question=dwell=0;questionReady=false;region=0;visited.fill(false);order=[];wordAlpha.fill(0);wordDye.fill(0);world=0;worldTime=-1;tint=crack=open=0;words=1;reading.hidden=true;reading.style.opacity=0;$('experience').inert=false;$('portal').style.opacity=0;$('close-shell').hidden=true;exitPressure=0;pointers.clear();zoomIntent=false;revisitOrigin=0;syncVisited()}
function syncVisited(){setText('visited-count',String(order.length).padStart(2,'0')+' / 06');dots.forEach((d,i)=>{d.classList.toggle('read',visited[i]);d.title=regions[i].title+(visited[i]?'：已看過':'：尚未進入')});document.body.dataset.visited=order.length}
function setZoomIntent(closer){if(closer){if(!zoomIntent&&visited[region])revisitOrigin=distance;zoomIntent=true}else{zoomIntent=false;revisitOrigin=0}}
function adjustZoom(amount){if(!canControl())return;if(!unlocked){progress=clamp(progress+amount,0,1);return}tdistance=clamp(tdistance*Math.exp(amount*2),fitDistance()*.68,coinDistance());setZoomIntent(amount<0)}
function mixedBackground(mainIndex, pale=false){
 const main=rgb(regions[mainIndex].color), alpha=pale?.07:.20;
 const rgba=(i,a)=>`rgba(${rgb(regions[i].color).map(x=>Math.round(x*255)).join(',')},${a})`;
 const positions=['10% 12%','90% 14%','82% 84%','15% 88%','47% 4%','50% 95%'];
 const layers=regions.map((_,i)=>i===mainIndex?'':`radial-gradient(ellipse at ${positions[i]}, ${rgba(i,alpha)} 0%, transparent 55%)`).filter(Boolean);
 const base=pale?`rgb(${main.map(x=>Math.round((.37+x*.63)*255)).join(',')})`:regions[mainIndex].color;
 return [...layers,`linear-gradient(${base}, ${base})`].join(',');
}
function beginEntry(){if(mode!=='explore'||open>0||worldTime>=0&&worldTime<5)return;entryRegion=region;entryDistance=distance;returnDistance=world>.99&&visited[region]?readDistance():visited[region]?Math.max(readDistance(),revisitOrigin||distance):distance;dwell=0;zoomIntent=false;revisitOrigin=0;setMode('entering');$('portal').style.background=world>.99?mixedBackground(region):regions[region].color;}
let contentRequest=0;
async function loadRegionContent(index){
 const request=++contentRequest,body=$('reading-body'),url=new URL(`./網站內容/蛋${index+1}.md`,import.meta.url);
 body.textContent='正在載入內容…';
 try{
  const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const source=await response.text();if(request!==contentRequest||index!==entryRegion)return;
  const intro=source.match(/^簡介：([^\r\n]*)\r?$/m);setText('reading-intro',intro?intro[1].trim():'');
  const rendered=renderMarkdown(source.replace(/^簡介：[^\r\n]*\r?\n?/m,''),url,document,{workPhotos:index===3});setText('reading-title',rendered.title||'');body.replaceChildren(rendered.fragment);
  if(index===1)setupExperienceDisclosure(body);
  if(index===2)setupProjectDisclosure(body);
  if(!body.textContent.trim()&&!body.querySelector('img'))body.textContent='這一面的內容尚未填寫。';
 }catch(error){if(request===contentRequest){body.textContent='這一面的內容暫時無法載入，請稍後再試。';console.error('區域內容載入失敗',error)}}
}
function setRegionHeading(index){$('reading-region-label').textContent='｜'+regions[index].heading}
function showContent(){if(!visited[entryRegion]){visited[entryRegion]=true;order.push(entryRegion);syncVisited()}wordAlpha[entryRegion]=wordDye[entryRegion]=1;let col=rgb(regions[entryRegion].color);reading.style.background=world>.99?mixedBackground(entryRegion,true):`rgb(${col.map(x=>Math.round((.37+x*.63)*255)).join(',')})`;reading.dataset.region=entryRegion;setText('reading-symbol',regions[entryRegion].title);setRegionHeading(entryRegion);setText('reading-intro','');setText('reading-title','');setText('reading-index',String(entryRegion+1).padStart(2,'0')+' / 06');reading.hidden=false;reading.style.opacity=0;scroller.scrollTop=0;$('experience').inert=true;setMode('reading');readingSince=performance.now();exitPressure=0;edgeAt=0;setText('exit-hint','往下閱讀');loadRegionContent(entryRegion);requestAnimationFrame(()=>{reading.style.opacity=1;scroller.focus({preventScroll:true})})}
function leaveContent(){if(mode!=='reading')return;reading.style.opacity=0;setMode('leaving');$('experience').inert=false;distance=tdistance=returnDistance;$('portal').style.opacity=1;modeTime=0;}
function openShell(){if(mode!=='explore'||order.length!==6||world<.99)return;dwell=0;setMode('opening');$('open-shell').hidden=true;if(soundOn){clearTimeout(crackTimer);crackTimer=setTimeout(()=>{if(soundOn&&mode==='opening'){crackSound.currentTime=0;crackSound.play().catch(()=>{setText('sound-status','請點擊右上角重新開啟聲音')})}},1300)}}
function closeShell(){if(mode!=='open')return;setMode('closing');$('close-shell').hidden=true;}
function jumpToWorld(){reset();unlocked=true;progress=curProgress=1;questionReady=true;observe=5;visited.fill(true);order=[0,1,2,3,4,5];wordAlpha.fill(1);wordDye.fill(1);world=1;worldTime=6;distance=tdistance=Math.max(fitDistance(),1.34/(.43*Math.tan(Math.PI/8)));setMode('explore');syncVisited()}
$('restart').onclick=reset;$('home').onclick=e=>{e.preventDefault();reset()};$('return').onclick=leaveContent;$('open-shell').onclick=openShell;
$('world-test').onclick=jumpToWorld;
let soundOn=false,soundStatusTimer=0,crackTimer=0,soundRequest=0;
const crackSound=$('shell-crack-sound');
const backgroundMusic=$('background-music');backgroundMusic.volume=.35;
function stopCrackSound(){clearTimeout(crackTimer);crackSound.pause();crackSound.currentTime=0}
function updateSoundUI(message){$('sound-toggle').classList.toggle('enabled',soundOn);$('sound-toggle').setAttribute('aria-pressed',String(soundOn));$('sound-toggle').setAttribute('aria-label',(soundOn?'關閉':'開啟')+'聲音');$('sound-status').textContent=message;clearTimeout(soundStatusTimer);soundStatusTimer=setTimeout(()=>{$('sound-status').textContent=''},2500)}
$('sound-toggle').onclick=()=>{soundOn=!soundOn;const request=++soundRequest;if(!soundOn){backgroundMusic.pause();stopCrackSound();updateSoundUI('聲音已關閉');return}updateSoundUI('聲音已開啟');backgroundMusic.play().catch(()=>{if(request!==soundRequest||!soundOn)return;soundOn=false;updateSoundUI('背景音樂無法播放，請再試一次')})};
$('axis-toggle').onclick=()=>{let c=$('axis-panel').classList.toggle('collapsed');$('axis-toggle').setAttribute('aria-expanded',String(!c));$('axis-toggle').setAttribute('aria-label',c?'展開視角控制':'收合視角控制')};
$('yaw').oninput=e=>{if(canRotate())tyaw=yaw+wrap(Number(e.target.value)*rad-yaw)};$('pitch').oninput=e=>{if(canRotate())tpitch=pitch+wrap(Number(e.target.value)*rad-pitch)};$('zoom').oninput=e=>{if(!canControl())return;let next=Math.exp(Math.log(fitDistance()*.68)+(Math.log(coinDistance())-Math.log(fitDistance()*.68))*Number(e.target.value)/100);setZoomIntent(next<tdistance);tdistance=next};
function readWheel(delta){const now=performance.now();if(now-readingSince<1000)return false;let top=scroller.scrollTop<=2,bottom=scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-3,atEdge=delta<0&&top||delta>0&&bottom;if(!atEdge){exitPressure=0;edgeAt=0;setText('exit-hint','往下閱讀');return false}if(!edgeAt||now-lastScrollAt>650){edgeAt=now;exitPressure=0}lastScrollAt=now;exitPressure+=Math.min(Math.abs(delta),95);setText('exit-hint','再'+(delta>0?'向下':'向上')+'滑一點，返回蛋殼');if(exitPressure>250)leaveContent();return true}
window.addEventListener('wheel',e=>{if(mode==='reading'){if(readWheel(e.deltaY))e.preventDefault();return}if(e.target.closest('#axis-panel'))return;e.preventDefault();adjustZoom(clamp(e.deltaY,-160,160)/1200)},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(!canControl())return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const a=[...pointers.values()];pinchDistance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;let previous=pointers.get(e.pointerId),dx=e.clientX-previous.x,dy=e.clientY-previous.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){let a=[...pointers.values()],next=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinchDistance>0)adjustZoom(-Math.log(next/pinchDistance)*.6);pinchDistance=next;return}if(!unlocked){adjustZoom(-dy/innerHeight*.8)}else if(canRotate()){tyaw-=dx/innerWidth*Math.PI*2;tpitch+=dy/innerHeight*Math.PI}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);pinchDistance=0});
$('close-shell').addEventListener('pointerdown',e=>{dragCap=true;capY=e.clientY;capMoved=false;e.currentTarget.setPointerCapture(e.pointerId)});
$('close-shell').addEventListener('pointermove',e=>{if(dragCap&&e.clientY-capY>28){capMoved=true;dragCap=false;closeShell()}});
$('close-shell').addEventListener('pointerup',()=>{dragCap=false;if(!capMoved)closeShell()});$('close-shell').onclick=()=>{if(mode==='open')closeShell()};
scroller.addEventListener('touchstart',e=>{lastTouchY=e.touches[0]?.clientY||0},{passive:true});scroller.addEventListener('touchmove',e=>{let y=e.touches[0]?.clientY||0,dy=lastTouchY-y;lastTouchY=y;if(readWheel(dy*2))e.preventDefault()},{passive:false});
window.addEventListener('keydown',e=>{if($('photo-viewer').open)return;if(e.key==='Escape'){if(mode==='reading')leaveContent();else if(mode==='open')closeShell();return}if(e.target.matches('input,button,a'))return;if(e.key==='PageDown'||e.key==='PageUp'){if(mode!=='reading'){e.preventDefault();adjustZoom(e.key==='PageDown'?.09:-.09)}return}if(!canRotate())return;let n=.12;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')tyaw-=n;if(e.key==='ArrowRight')tyaw+=n;if(e.key==='ArrowUp')tpitch+=n;if(e.key==='ArrowDown')tpitch-=n}});
$('reading-body').addEventListener('click',e=>{const button=e.target.closest('.work-photo');if(!button)return;const image=button.querySelector('img');$('photo-full').src=image.src;$('photo-full').alt=image.alt;$('photo-caption').textContent=image.alt;$('photo-viewer').showModal()});
$('photo-close').addEventListener('click',()=>$('photo-viewer').close());
$('photo-viewer').addEventListener('click',e=>{if(e.target===$('photo-viewer'))$('photo-viewer').close()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error-message').hidden=false;setText('error-message','3D 顯示暫時中斷，請重新整理頁面後再試。')});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=performance.now();pointers.clear()});
window.addEventListener('resize',()=>{if(unlocked)tdistance=clamp(tdistance,fitDistance()*.68,coinDistance())});
function axisUpdate(){let cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),vectors=[[cy,-sy*sp],[0,cp],[-sy,-cy*sp]];vectors.forEach((v,i)=>{let key=['x','y','z'][i],line=$('axis-'+key),x=45+v[0]*25,y=37-v[1]*25;line.setAttribute('x1',45);line.setAttribute('y1',37);line.setAttribute('x2',x);line.setAttribute('y2',y);$('label-'+key).setAttribute('x',x+4);$('label-'+key).setAttribute('y',y-3)});if(document.activeElement!==$('yaw'))$('yaw').value=wrap(tyaw)/rad;if(document.activeElement!==$('pitch'))$('pitch').value=wrap(tpitch)/rad;if(document.activeElement!==$('zoom'))$('zoom').value=(Math.log(tdistance)-Math.log(fitDistance()*.68))/(Math.log(coinDistance())-Math.log(fitDistance()*.68))*100;setText('yaw-value',Math.round(wrap(yaw)/rad)+'°');setText('pitch-value',Math.round(wrap(pitch)/rad)+'°');$('yaw').disabled=$('pitch').disabled=!canRotate();$('zoom').disabled=!canControl()}
function frame(now){let dt=Math.min((now-last)/1000,.5);last=now;if(!visible){requestAnimationFrame(frame);return}modeTime+=dt;const ease=1-Math.exp(-dt*9);yaw+=(tyaw-yaw)*ease;pitch+=(tpitch-pitch)*ease;let veil=0;
 if(!unlocked){curProgress+=(progress-curProgress)*ease;distance=journeyDistance(curProgress);tdistance=distance;veil=1-smooth(.015,.13,curProgress);if(curProgress>.989){unlocked=true;observe=0;distance=tdistance=coinDistance();setMode('explore')}}else if(mode!=='entering'){distance+=(tdistance-distance)*ease;}
 const inPosition=distance/readDistance()>.91&&distance/readDistance()<1.13;
 if(unlocked&&mode==='explore'){
  observe+=dt;
  if(inPosition&&!questionReady){questionReady=true;dwell=0}
  let next=regionAt(yaw,pitch,region);if(next!==region){if(!visited[region])wordDye[region]=0;region=next;dwell=0;zoomIntent=false;revisitOrigin=0;}
  const worldBusy=worldTime>=0&&worldTime<5;
  if(questionReady&&inPosition&&!visited[region]&&!worldBusy){dwell+=dt;wordDye[region]=smooth(.15,1.65,dwell);if(dwell>=2)beginEntry()}else dwell=0;
  if(questionReady&&visited[region]&&zoomIntent&&distance<readDistance()*.87&&!worldBusy)beginEntry();
  if(!inPosition&&!visited[region])wordDye[region]=0;
 }
 if(mode==='entering'){
  tint=smooth(0,1.8,modeTime);distance=entryDistance*(1-smooth(1.56,2.80,modeTime))+.7*smooth(1.56,2.80,modeTime);$('portal').style.opacity=smooth(1.88,2.76,modeTime);if(modeTime>=3)showContent();
 }else if(mode==='reading'){$('portal').style.opacity=1;}
 else if(mode==='leaving'){
  if(modeTime>.55)reading.hidden=true;tint=1-smooth(.35,1.9,modeTime);$('portal').style.opacity=1-smooth(.25,1.15,modeTime);if(modeTime>2){tint=0;setMode('explore');dwell=0;zoomIntent=false;canvas.focus?.();if(order.length===6&&world===0){worldTime=0;worldFrom=distance}}
 }
 if(worldTime>=0&&mode==='explore'){worldTime+=dt;world=smooth(.4,4.5,worldTime);if(worldTime<5){let target=Math.max(fitDistance(),1.34/(.43*Math.tan(Math.PI/8)));tdistance=worldFrom+(target-worldFrom)*smooth(.8,4.8,worldTime)}}
 if(mode==='opening'){words=1-smooth(0,.7,modeTime);crack=smooth(.8,2.8,modeTime);open=smooth(2.9,4.6,modeTime);if(modeTime>4.7){open=1;setMode('open')}}
 if(mode==='closing'){open=1-smooth(0,1.4,modeTime);crack=1-smooth(1.45,3,modeTime);words=smooth(3.1,3.9,modeTime);if(modeTime>4){open=crack=0;words=1;zoomIntent=false;setMode('explore')}}
 for(let i=0;i<6;i++){let show=visited[i]||questionReady&&i===region&&inPosition&&mode==='explore'||i===entryRegion&&['entering','leaving'].includes(mode);wordAlpha[i]+=(Number(show)-wordAlpha[i])*Math.min(1,dt*4);if(visited[i])wordDye[i]=1;}
 let dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],sun=simulatedSun(),flip=smooth(.30,.70,(1-(dir[0]*sun[0]+dir[1]*sun[1]+dir[2]*sun[2]))/2),lights=regions.map((_,i)=>{let visitIndex=order.indexOf(i);return visitIndex<0?0:smooth(.4+visitIndex*.46,1.8+visitIndex*.46,worldTime)});
 scene.render({yaw,pitch,distance,flip,sun,world,lights,time:now/1000,tint,crack,open,words,region,wordAlpha,wordDye,questionAlpha:0});
 $('intro-veil').style.opacity=veil;document.documentElement.style.setProperty('--ink',veil>.4?'#333330':world>.3?'#faf8f3':flip>.5?'#30302e':'#ecece7');document.body.dataset.soundLight=String(veil>.4||(world<.3&&flip>.5)||mode==='reading');
 const chapter=world>.95?'04':unlocked&&distance>fitDistance()*1.5?'03':distance>=fitDistance()*.80?'02':'01';setText('stage-name',world>.95?'彼界':chapter==='03'?'異視':chapter==='02'?'認識':'相逢');
 $('region-name').hidden=mode!=='explore'||!questionReady||wordAlpha[region]<.5;setText('region-name',regions[region].title+'｜'+regions[region].label);
 $('axis-panel').hidden=!unlocked||mode==='reading';$('visited').style.opacity=questionReady?1:0;$('open-shell').hidden=order.length!==6||world<.99||mode!=='explore';$('close-shell').hidden=mode!=='open';
 if(mode==='open'){let [x,y]=scene.capLabel;$('close-shell').style.left=clamp(x,40,innerWidth-40)+'px';$('close-shell').style.top=clamp(y,90,innerHeight-150)+'px'}
 if(!$('open-shell').hidden){let edge=Math.min(innerHeight*1.05/(Math.max(distance-1.1,.5)*Math.tan(Math.PI/8)*2),innerWidth*.38);$('open-shell').style.left=clamp(innerWidth/2+edge+12,55,innerWidth-42)+'px';$('open-shell').style.top=clamp(innerHeight*.50,105,innerHeight-190)+'px'}
 let dwellVisible=mode==='explore'&&dwell>0;document.querySelector('.dwell').style.opacity=dwellVisible?1:0;$('dwell-fill').style.width=clamp(dwell/2*100,0,100)+'%';
 if(mode==='journey')say('放遠觀察',chapter==='02'?'繼續拉遠，試著看見不同的我':'向下滾動／向上滑動，拉開一點距離');
 else if(mode==='explore'){
  if(worldTime>=0&&worldTime<5)say('彼界成','每一個看過的角度，留下自己的光。','THE WORLD, IN MY OWN COLORS');
  else if(world>.99)say('保持心創思考',visited[region]?'靠近，重新看看這一面':'左右拖曳／滑動，試著以不同角度觀察','SIX SIDES · ONE SELF');
  else if(observe<5&&!questionReady)say('左右拖曳／滑動，試著以不同角度觀察','上下轉動，也可以看見頂部與底部','LOOK A LITTLE LONGER');
  else if(!questionReady){if(inPosition)say('慢慢觀察這一面。','停一下，讓這一面慢慢浮現','A CLOSER LOOK');else if(distance<readDistance()*.91)say('請遠離一點','向下滾動／雙指收攏，退回完整的輪廓');else say('請靠近一點','向上滾動／雙指張開，讓蛋佔據畫面');}
  else if(visited[region])say('已觀','靠近，重新看看這一面','A FAMILIAR SIDE');
  else if(!inPosition)say(distance<readDistance()*.91?'請遠離一點':'請靠近一點','讓整顆蛋回到剛才的閱讀距離');
  else say('放下','不需要點擊；換個方向，就可以繼續觀察','STAY FOR A MOMENT');
 }else if(mode==='entering')say('慢慢走進','','A DIFFERENT SIDE');
 else if(mode==='leaving')say('已觀此面','換個角度，還有更多');
 else if(mode==='opening'||mode==='closing')say('','','');
 else if(mode==='open')say('','左右、上下拖曳，自由觀察；將「蓋上」向下拖回','');
 axisUpdate();document.body.dataset.mode=mode;document.body.dataset.region=region;document.body.dataset.questionReady=questionReady;document.body.dataset.world=world>.99;requestAnimationFrame(frame);
}
syncVisited();requestAnimationFrame(frame);






