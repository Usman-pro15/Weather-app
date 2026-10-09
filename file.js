(function(){
var $=function(s){return document.querySelector(s)};
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
var KEY='skycast',units='metric',cur=null,data=null;
try{var sv=JSON.parse(localStorage.getItem(KEY)||'{}');units=sv.u||'metric';cur=sv.p||null}catch(e){}
var GEO='https://geocoding-api.open-meteo.com/v1/search',API='https://api.open-meteo.com/v1/forecast';
var CITIES=['London','Islamabad','Dubai','New York','Tokyo','Sydney'];

function save(){try{localStorage.setItem(KEY,JSON.stringify({u:units,p:cur}))}catch(e){}}
function state(s){$('#app').setAttribute('data-state',s)}
function hint(m){$('#hint').textContent=m||''}
function T(c){return Math.round(units==='metric'?c:c*9/5+32)}
function W(k){return Math.round(units==='metric'?k:k/1.609)}
function R(v,u){return v==null?'-':Math.round(v)+(u||'')}
function D(s){return new Date(s.length===10?s+'T00:00Z':s+'Z')}
function F(s,o){o.timeZone='UTC';return D(s).toLocaleString('en-US',o)}
function dir(d){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8]}
function info(c,d){
  if(c===0)return['Clear sky',d?'sun':'moon','clear'];
  if(c===1)return['Mainly clear',d?'sun':'moon','clear'];
  if(c===2)return['Partly cloudy',d?'pcloud':'pcloudn','clear'];
  if(c===3)return['Overcast','cloud','cloud'];
  if(c<=48)return['Fog','fog','fog'];
  if(c<=57)return['Drizzle','shower','rain'];
  if(c<=67)return['Rain','rain','rain'];
  if(c<=77)return['Snow','snow','snow'];
  if(c<=82)return['Rain showers','shower','rain'];
  if(c<=86)return['Snow showers','snow','snow'];
  return['Thunderstorm','storm','storm'];
}
function ic(id,c){return'<svg class="'+(c||'wic')+'" aria-hidden="true"><use href="#i-'+id+'"/></svg>'}

/* ---------- network ---------- */
function getJSON(url){
  var c=new AbortController(),t=setTimeout(function(){c.abort()},12000);
  return fetch(url,{signal:c.signal}).then(function(r){clearTimeout(t);if(!r.ok)throw new Error('http');return r.json()})
    .catch(function(e){clearTimeout(t);throw e});
}
function fail(e){
  var nf=e&&e.message==='notfound',off=!navigator.onLine;
  $('#et').textContent=nf?'City not found':off?'You are offline':'Could not load the weather';
  $('#em').textContent=nf?'We could not find that place. Check the spelling or try a larger nearby city.'
    :off?'Connect to the internet, then try again.':'The weather service did not respond. Check your connection and try again.';
  state('error');
}
function search(q){
  state('loading');hint('');$('#alt').innerHTML='';
  getJSON(GEO+'?name='+encodeURIComponent(q)+'&count=5&language=en&format=json').then(function(r){
    if(!r.results||!r.results.length)throw new Error('notfound');
    var list=r.results.map(function(x){return{name:x.name,sub:[x.admin1,x.country].filter(Boolean).join(', '),lat:x.latitude,lon:x.longitude}});
    others(list);return load(list[0]);
  }).catch(fail);
}
function others(list){
  var box=$('#alt');box.innerHTML='';
  if(list.length<2)return;
  list.forEach(function(p,i){var b=document.createElement('button');b.textContent=p.name+(p.sub?', '+p.sub:'');if(i===0)b.className='on';
    b.onclick=function(){[].forEach.call(box.children,function(x){x.classList.remove('on')});b.classList.add('on');load(p)};box.appendChild(b)});
}
function load(p,silent){
  cur=p;save();if(!silent)state('loading');
  var url=API+'?latitude='+p.lat+'&longitude='+p.lon
   +'&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m'
   +'&hourly=temperature_2m,weather_code,precipitation_probability'
   +'&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max'
   +'&timezone=auto&forecast_days=7';
  return getJSON(url).then(function(d){data=d;render(!silent)}).catch(function(e){
    if(silent&&data){$('#upd').textContent='Could not refresh. Showing the last update.';return}
    fail(e)});
}

/* ---------- render ---------- */
function count(el,to){
  if(RM){el.textContent=to;return}
  var t0=performance.now();(function s(n){var p=Math.min(1,(n-t0)/900),e=1-Math.pow(1-p,3);el.textContent=Math.round(to*e);if(p<1)requestAnimationFrame(s)})(t0);
}
function fx(th,day){
  var h='',i,r=Math.random,nc=th==='clear'?3:th==='cloud'?7:5;
  for(i=0;i<nc;i++)h+='<i class="cl" style="--y:'+(4+r()*42)+'%;--w:'+(120+r()*180)+'px;--o:'+(th==='cloud'||th==='fog'?.38:.24)+';animation-duration:'+(60+r()*60)+'s;animation-delay:-'+(r()*90)+'s"></i>';
  if(th==='rain'||th==='storm')for(i=0;i<70;i++)h+='<i class="r" style="left:'+(r()*110)+'%;animation-duration:'+(.6+r()*.5)+'s;animation-delay:-'+(r()*2)+'s"></i>';
  if(th==='snow')for(i=0;i<55;i++)h+='<i class="s" style="--z:'+(3+r()*5)+'px;left:'+(r()*100)+'%;animation-duration:'+(6+r()*7)+'s;animation-delay:-'+(r()*12)+'s"></i>';
  if(!day&&(th==='clear'||th==='cloud'))for(i=0;i<70;i++)h+='<i class="st" style="left:'+(r()*100)+'%;top:'+(r()*70)+'%;animation-delay:-'+(r()*3)+'s"></i>';
  $('#fx').innerHTML=h;document.body.setAttribute('data-sky',th+(day?'-day':'-night'));
}
function render(anim){
  var c=data.current,dl=data.daily,hr=data.hourly,day=c.is_day===1,w=info(c.weather_code,day),i,h='';
  $('#city').textContent=cur.name;$('#sub').textContent=cur.sub||'';
  $('#when').textContent=F(c.time,{weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  count($('#t'),T(c.temperature_2m));$('#tu').textContent='\u00B0'+(units==='metric'?'C':'F');
  $('#wi').innerHTML=ic(w[1]);$('#cond').textContent=w[0];
  $('#hilo').textContent='High '+T(dl.temperature_2m_max[0])+'\u00B0   Low '+T(dl.temperature_2m_min[0])+'\u00B0';
  $('#upd').textContent='Updated '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  fx(w[2],day);

  var tiles=[['therm','Feels like',T(c.apparent_temperature)+'\u00B0'],
   ['drop','Humidity',R(c.relative_humidity_2m,'%')],
   ['wind','Wind','<svg class="ui arw" aria-hidden="true" style="--r:'+(c.wind_direction_10m+180)+'deg"><use href="#i-arrow"/></svg> '+W(c.wind_speed_10m)+' '+(units==='metric'?'km/h':'mph')+' '+dir(c.wind_direction_10m)],
   ['gauge','Pressure',R(c.pressure_msl,' hPa')],
   ['uv','UV index',R(dl.uv_index_max[0])],
   ['umb','Rain chance',R(dl.precipitation_probability_max[0],'%')],
   ['rise','Sunrise',F(dl.sunrise[0],{hour:'numeric',minute:'2-digit'})],
   ['set','Sunset',F(dl.sunset[0],{hour:'numeric',minute:'2-digit'})]];
  $('#det').innerHTML=tiles.map(function(t,n){return'<div class="card tile rise tilt" style="--i:'+(n+1)+'"><span class="ti">'+ic(t[0],'ui')+'</span><span class="tl">'+t[1]+'</span><b>'+t[2]+'</b></div>'}).join('');

  var idx=hr.time.indexOf(c.time.slice(0,13)+':00');if(idx<0)idx=0;
  for(i=idx;i<idx+24&&i<hr.time.length;i++){
    var hh=+hr.time[i].slice(11,13),k=info(hr.weather_code[i],hh>=6&&hh<19);
    h+='<div class="hr rise'+(i===idx?' nw':'')+'" style="--i:'+(i-idx)+'"><span>'+(i===idx?'Now':F(hr.time[i],{hour:'numeric'}))+'</span><div class="e">'+ic(k[1])+'</div><b>'+T(hr.temperature_2m[i])+'\u00B0</b><small>'+R(hr.precipitation_probability[i],'%')+'</small></div>';
  }
  $('#hrs').innerHTML=h;h='';

  var mn=Math.min.apply(null,dl.temperature_2m_min),mx=Math.max.apply(null,dl.temperature_2m_max),span=(mx-mn)||1;
  for(i=0;i<dl.time.length;i++){
    var k2=info(dl.weather_code[i],true),l=(dl.temperature_2m_min[i]-mn)/span*100,wd=Math.max(10,(dl.temperature_2m_max[i]-dl.temperature_2m_min[i])/span*100);
    h+='<button class="day rise" style="--i:'+(i+2)+'" aria-label="Show details for '+F(dl.time[i],{weekday:'long'})+'"><div class="in">'
     +'<div class="face"><b>'+(i?F(dl.time[i],{weekday:'short'}):'Today')+'</b><span class="dt">'+F(dl.time[i],{month:'short',day:'numeric'})+'</span><span class="e">'+ic(k2[1])+'</span>'
     +'<div class="rg"><i style="left:'+l+'%;width:'+Math.min(wd,100-l)+'%"></i></div><div class="hl">'+T(dl.temperature_2m_max[i])+'\u00B0 <span>'+T(dl.temperature_2m_min[i])+'\u00B0</span></div></div>'
     +'<div class="face bk"><b>'+k2[0]+'</b><span>Rain '+R(dl.precipitation_probability_max[i],'%')+'</span><span>UV '+R(dl.uv_index_max[i])+'</span><span>Rise '+F(dl.sunrise[i],{hour:'numeric',minute:'2-digit'})+'</span><span>Set '+F(dl.sunset[i],{hour:'numeric',minute:'2-digit'})+'</span></div></div></button>';
  }
  $('#wk').innerHTML=h;
  var ct=$('#content');if(anim){ct.classList.remove('go');void ct.offsetWidth;ct.classList.add('go')}
  state('ready');
}

/* ---------- demo data (used if the live service cannot be reached) ---------- */
function demo(){
  var n=new Date(),p=function(x){return String(x).padStart(2,'0')},base=new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()));
  var H={time:[],temperature_2m:[],weather_code:[],precipitation_probability:[]},Dd={time:[],weather_code:[],temperature_2m_max:[],temperature_2m_min:[],sunrise:[],sunset:[],uv_index_max:[],precipitation_probability_max:[]};
  var codes=[1,2,3,61,80,2,0],pr=[5,10,25,70,60,20,5],d,h;
  for(d=0;d<7;d++){
    var dt=new Date(base.getTime()+d*864e5),ds=dt.toISOString().slice(0,10);
    Dd.time.push(ds);Dd.weather_code.push(codes[d]);Dd.temperature_2m_max.push(26+Math.round(4*Math.sin(d)));Dd.temperature_2m_min.push(15+Math.round(3*Math.sin(d+1)));
    Dd.sunrise.push(ds+'T06:12');Dd.sunset.push(ds+'T18:04');Dd.uv_index_max.push(6);Dd.precipitation_probability_max.push(pr[d]);
    for(h=0;h<24;h++){H.time.push(ds+'T'+p(h)+':00');H.temperature_2m.push(Math.round(20+6*Math.sin((h-9)/24*Math.PI*2)));H.weather_code.push(h>20||h<5?0:codes[d]);H.precipitation_probability.push(Math.max(0,pr[d]-Math.abs(h-15)*2))}
  }
  var hh=n.getHours();
  return{current:{time:Dd.time[0]+'T'+p(hh)+':00',temperature_2m:H.temperature_2m[hh],apparent_temperature:H.temperature_2m[hh]+1,relative_humidity_2m:48,is_day:hh>=6&&hh<19?1:0,weather_code:H.weather_code[hh],pressure_msl:1013,wind_speed_10m:14,wind_direction_10m:300},hourly:H,daily:Dd};
}

/* ---------- events ---------- */
$('#sf').addEventListener('submit',function(e){
  e.preventDefault();var q=$('#q').value.trim();
  if(q.length<2){hint('Please type at least 2 letters of a city name.');$('#q').focus();return}
  search(q);
});
$('#q').addEventListener('input',function(){hint('')});
$('#loc').onclick=function(){
  if(!navigator.geolocation){hint('Location is not available on this device.');return}
  hint('Finding your location...');
  navigator.geolocation.getCurrentPosition(function(g){hint('');load({name:'Your location',sub:'Current position',lat:+g.coords.latitude.toFixed(3),lon:+g.coords.longitude.toFixed(3)})},
    function(){hint('Could not get your location. Allow location access or search for a city.')},{timeout:10000});
};
$('#refresh').onclick=function(){if(cur)load(cur,true)};
$('#retry').onclick=function(){cur&&cur.lat!=null&&cur.sub!=='Sample data'?load(cur):search('London')};
$('#demo').onclick=function(){data=demo();cur={name:'Demo city',sub:'Sample data, not live'};render(true)};
document.querySelector('.unit').onclick=function(e){var b=e.target.closest('button');if(!b)return;units=b.getAttribute('data-u');save();
  [].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});if(data)render(false)};
$('#wk').addEventListener('click',function(e){var d=e.target.closest('.day');if(d&&matchMedia('(hover:none)').matches)d.classList.toggle('flip')});
var ct=$('#content');
ct.addEventListener('pointermove',function(e){
  if(e.pointerType!=='mouse'||RM)return;var c=e.target.closest('.tilt');if(!c)return;
  var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  c.style.transform='perspective(900px) rotateY('+(x*12)+'deg) rotateX('+(-y*12)+'deg) scale(1.02)';
});
ct.addEventListener('pointerout',function(e){var c=e.target.closest('.tilt');if(c&&!c.contains(e.relatedTarget))c.style.transform=''});

/* quick cities */
var qk=$('#quick');CITIES.forEach(function(n){var b=document.createElement('button');b.textContent=n;b.onclick=function(){$('#q').value=n;search(n)};qk.appendChild(b)});
[].forEach.call(document.querySelector('.unit').children,function(x){x.classList.toggle('on',x.getAttribute('data-u')===units)});

/* live updates every 10 minutes */
setInterval(function(){if(cur&&cur.lat!=null&&data&&!document.hidden)load(cur,true)},600000);

if(cur&&cur.lat!=null)load(cur);else search('London');
})();