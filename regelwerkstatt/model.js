/* Klassisches LV-Modell in artspezifischen Indizes; RK4 ohne Clipping. */
const LV=(()=>{
 const dt=.005;
 function step(x,y){const f=(a,b)=>[.6*a*(1-b/40),.4*b*(a/100-1)];const a=f(x,y),b=f(x+a[0]*dt/2,y+a[1]*dt/2),c=f(x+b[0]*dt/2,y+b[1]*dt/2),d=f(x+c[0]*dt,y+c[1]*dt);return [x+dt*(a[0]+2*b[0]+2*c[0]+d[0])/6,y+dt*(a[1]+2*b[1]+2*c[1]+d[1])/6]}
 function cycles(y0=20,count=3){let x=100,y=y0,points=[{t:0,x,y}],bounds=[0];for(let i=1;i<40000;i++){let old=x;[x,y]=step(x,y);let t=i*dt;points.push({t,x,y});if(old<100&&x>=100&&y<40){let f=(100-old)/(x-old),prev=points[points.length-2],end={t:prev.t+f*dt,x:100,y:prev.y+f*(y-prev.y)};bounds.push(end.t);if(bounds.length>count){points[points.length-1]=end;break;}}}return {points,bounds}}
 function disturbance(percent=50,end=30){let x=100,y=40,points=[{t:0,x,y}];for(let i=1;i<=end/dt;i++){let t=i*dt;[x,y]=step(x,y);points.push({t,x,y});if(i===800){x*=1-percent/100;y*=1-percent/100;points.push({t,x,y})}}return points}
 function at(points,t){let i=points.findIndex(p=>p.t>=t);if(i<=0)return points[0];let a=points[i-1],b=points[i],f=(t-a.t)/(b.t-a.t||1);return {t,x:a.x+f*(b.x-a.x),y:a.y+f*(b.y-a.y)}}
 function mean(points,a,b){let p=[at(points,a),...points.filter(p=>p.t>a&&p.t<b),at(points,b)],sx=0,sy=0;for(let i=1;i<p.length;i++){let d=p[i].t-p[i-1].t;sx+=d*(p[i].x+p[i-1].x)/2;sy+=d*(p[i].y+p[i-1].y)/2}return {x:sx/(b-a),y:sy/(b-a)}}
 return {cycles,disturbance,mean,at};
})();
if(typeof module!=='undefined')module.exports=LV;
