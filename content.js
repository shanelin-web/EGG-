export const regions = [
 {title:'膻',label:'關於我',heading:'關於我的膻中',color:'#C9B5DA',direction:[0,0,1]},
 {title:'擔',label:'經歷經驗',heading:'擔當與經歷',color:'#F3BEA6',direction:[1,0,0]},
 {title:'誕',label:'個人作品',heading:'作品集',color:'#E9D898',direction:[0,0,-1]},
 {title:'石',label:'水電實錄',heading:'一石一作',color:'#9AC6BC',direction:[-1,0,0]},
 {title:'澹',label:'未來方向',heading:'澹然方向',color:'#A5C9E0',direction:[0,1,0]},
 {title:'餤',label:'生活紀錄',heading:'生活饗餤',color:'#DDA0A8',direction:[0,-1,0]},
];
export const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// A local-clock-driven artistic light orbit, not an astronomical sun position.
export function simulatedSun(date=new Date()){
 const day=(date.getHours()*3600+date.getMinutes()*60+date.getSeconds()+date.getMilliseconds()/1000)/86400;
 const phase=(day-.5)*Math.PI*2;
 return [Math.sin(phase)*.835,.55,Math.cos(phase)*.835];
}
export function regionAt(yaw,pitch,previous=-1){
 const deg=Math.asin(Math.sin(pitch))*180/Math.PI;
 const facingYaw=wrap(yaw+(Math.cos(pitch)<0?Math.PI:0));
 if(deg>53 || previous===4&&deg>47)return 4;
 if(deg< -53 || previous===5&&deg< -47)return 5;
 if(previous>=0&&previous<4&&Math.abs(wrap(facingYaw-previous*Math.PI/2))<Math.PI/4+.055)return previous;
 return (Math.round(facingYaw/(Math.PI/2))+4)%4;
}
