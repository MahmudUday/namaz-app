function lsGet(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var savedLoc=lsGet('namaz.loc');
var loc=savedLoc||{mode:'district',name:'ঢাকা',lat:23.8103,lng:90.4125};
var alarms=lsGet('namaz.alarms')||{fajr:true,dhuhr:true,asr:true,maghrib:true,isha:true};
var nstate={ok:false,msg:'অ্যালার্ম সেট করা হচ্ছে…'};
function tzOf(){return loc.mode==='gps'?-new Date().getTimezoneOffset()/60:6}

var days=null,daysKey='',prayers=[];
function dayData(off){
  var tz=tzOf(),L=new Date(Date.now()+tz*36e5+off*864e5),y=L.getUTCFullYear(),m=L.getUTCMonth()+1,d=L.getUTCDate();
  var r=calcDay(y,m,d,loc.lat,loc.lng,tz);
  function D(h){return new Date(Date.UTC(y,m-1,d)+(h-tz)*36e5)}
  var noon=D(r.noon),sunset=D(r.sunset);
  return{y:y,m:m,d:d,wd:L.getUTCDay(),fajr:D(r.fajr),sunrise:D(r.sunrise),noon:noon,dhuhr:new Date(noon.getTime()+120000),asr:D(r.asr),sunset:sunset,maghrib:new Date(sunset.getTime()+60000),isha:D(r.isha)};
}
function ensureDays(){
  var tz=tzOf(),L=new Date(Date.now()+tz*36e5);
  var key=loc.lat+','+loc.lng+','+tz+','+L.getUTCFullYear()+'-'+L.getUTCMonth()+'-'+L.getUTCDate();
  if(key!==daysKey){days=[dayData(-1),dayData(0),dayData(1)];daysKey=key;buildPrayers()}
}
function buildPrayers(){
  prayers=[];
  days.forEach(function(d,i){var nx=days[i+1];
    [['fajr',d.fajr,d.sunrise],['dhuhr',d.dhuhr,d.asr],['asr',d.asr,d.maghrib],['maghrib',d.maghrib,d.isha],['isha',d.isha,nx?nx.fajr:new Date(d.isha.getTime()+9*36e5)]].forEach(function(a){prayers.push({k:a[0],s:a[1],e:a[2],day:i-1,id:a[0]+a[1].getTime()})});
  });
}
function fmt(d){
  var t=new Date(d.getTime()+tzOf()*36e5),h=t.getUTCHours(),mi=t.getUTCMinutes(),v=h+mi/60,p;
  if(v<3)p='রাত';else if(v<6)p='ভোর';else if(v<11)p='সকাল';else if(v<15)p='দুপুর';else if(v<17)p='বিকাল';else if(v<18.5)p='সন্ধ্যা';else p='রাত';
  return{t:bn((h%12||12)+':'+pad(mi)),p:p};
}
function fmtInline(d){var f=fmt(d);return f.p+' '+f.t}
function hms(ms){var s=Math.max(0,Math.floor(ms/1000));return bn(pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60))}
function pname(p){return p.k==='dhuhr'&&days[p.day+1].wd===5?'যোহর · জুমা':NAME[p.k]}

var BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/><path class="slash" d="M4 4l16 16"/></svg>';
function renderHeader(){
  var d=days[1];
  $('date').textContent=WD[d.wd]+', '+bn(d.d)+' '+MON[d.m-1]+' '+bn(d.y);
  $('place').textContent=loc.mode==='gps'?'আপনার অবস্থান ('+bn(loc.lat.toFixed(2))+'°, '+bn(loc.lng.toFixed(2))+'°)':loc.name;
}
function renderHero(cur,nxt){
  var h='';
  if(cur){
    h+='<div class="current-prayer"><div class="hero-label"><span class="live-dot"></span>এখন চলছে</div><div class="current-name">'+pname(cur)+'</div><div class="current-range">'+fmtInline(cur.s)+' <span>থেকে</span> '+fmtInline(cur.e)+'</div><div class="current-left">ওয়াক্ত শেষ হতে বাকি <b id="curleft"></b></div></div>';
  }else{
    h+='<div class="current-prayer no-current"><div class="hero-label">বর্তমানে</div><div class="current-name">কোনো নামাজের ওয়াক্ত চলছে না</div></div>';
  }
  if(nxt){
    h+='<div class="next-prayer"><div class="next-heading">পরবর্তী ওয়াক্ত'+(nxt.day===1?' · আগামীকাল':'')+'</div><div class="next-name">'+pname(nxt)+'</div><div class="next-range">'+fmtInline(nxt.s)+' <span>থেকে</span> '+fmtInline(nxt.e)+'</div><div class="next-count-label">শুরু হতে বাকি <b id="cd"></b></div></div>';
  }
  $('hero').innerHTML=h;
}
function renderRows(cur,nxt){
  var d=days[1],out='';
  prayers.filter(function(p){return p.day===0}).forEach(function(p){
    var s=fmt(p.s),e=fmt(p.e),isNow=cur&&cur.id===p.id,isNext=nxt&&nxt.id===p.id;
    out+='<div class="row prayer-'+p.k+(isNow?' now':'')+'"><div class="nm">'+NAME[p.k]+(isNow?'<span class="pill">চলছে</span>':isNext?'<span class="pill soon">পরবর্তী</span>':'')+(p.k==='dhuhr'&&d.wd===5?'<small>জুমার নামাজ</small>':'')+'</div><div class="t"><b>'+s.t+'</b><small>'+s.p+'</small></div><div class="t end"><b>'+e.t+'</b><small>'+e.p+'</small></div><button class="bell" type="button" data-k="'+p.k+'" aria-pressed="'+(alarms[p.k]?'true':'false')+'" aria-label="'+NAME[p.k]+' অ্যালার্ম">'+BELL+'</button></div>';
  });
  $('rows').innerHTML=out;
}
function renderExtras(){
  var d=days[1],m=60000;
  function rng(a,b){return fmtInline(a)+' – '+fmtInline(b)}
  $('extras').innerHTML='<div><span class="hl">সূর্যোদয় (ফজরের শেষ)</span><span>'+fmtInline(d.sunrise)+'</span></div><div><span>মাকরুহ: সূর্যোদয়ের পর</span><span>'+rng(d.sunrise,new Date(d.sunrise.getTime()+15*m))+'</span></div><div><span>মাকরুহ: দুপুরে সূর্য মাথার ওপর</span><span>'+rng(new Date(d.dhuhr.getTime()-6*m),d.dhuhr)+'</span></div><div><span>মাকরুহ: সূর্যাস্তের আগে</span><span>'+rng(new Date(d.maghrib.getTime()-15*m),d.maghrib)+'</span></div>';
}
function tahajjudTimes(){
  var now=Date.now(),today=days[1],nightStart,isha,end;
  if(now<today.fajr.getTime()){
    nightStart=days[0].maghrib;isha=days[0].isha;end=today.fajr;
  }else{
    nightStart=today.maghrib;isha=today.isha;end=days[2].fajr;
  }
  var duration=end.getTime()-nightStart.getTime();
  var lastThird=new Date(end.getTime()-duration/3);
  var bestStart=new Date(Math.max(isha.getTime(),lastThird.getTime()));
  return{isha:isha,end:end,best:bestStart};
}
function renderTahajjud(){
  var t=tahajjudTimes(),now=Date.now(),html='';
  html+='<div class="tahajjud-times"><div><small>সাধারণ সময় শুরু</small><b>'+fmtInline(t.isha)+'</b><span>এশার পর</span></div><div><small>সময় শেষ</small><b>'+fmtInline(t.end)+'</b><span>ফজর শুরু হলে</span></div></div>';
  html+='<div class="best-time"><span class="best-badge">উত্তম সময় · শেষ এক-তৃতীয়াংশ</span><b>'+fmtInline(t.best)+'</b><small>এই সময় থেকে ফজর পর্যন্ত</small></div>';
  if(now<t.isha.getTime())html+='<div class="tahajjud-status">এশার পর তাহাজ্জুদের সময় শুরু হবে <b id="tahajjudCd">'+hms(t.isha.getTime()-now)+'</b></div>';
  else if(now<t.best.getTime())html+='<div class="tahajjud-status">তাহাজ্জুদের সময় চলছে · উত্তম সময় শুরু হতে বাকি <b id="tahajjudCd">'+hms(t.best.getTime()-now)+'</b></div>';
  else if(now<t.end.getTime())html+='<div class="tahajjud-status active">এখন রাতের উত্তম সময় চলছে <b id="tahajjudCd">'+hms(t.end.getTime()-now)+'</b><small>ফজর পর্যন্ত বাকি</small></div>';
  else html+='<div class="tahajjud-status">আজকের তাহাজ্জুদের সময় শেষ হয়েছে।';
  $('tahajjudCard').innerHTML=html;
}
function renderArmbar(){
  $('armbar').innerHTML='<div class="state"><span class="dot'+(nstate.ok?' on':'')+'"></span><span>'+nstate.msg+'</span></div><button class="btn'+(nstate.ok?'':' primary')+'" id="armBtn" type="button">'+(nstate.ok?'আবার সেট করুন':'অনুমতি ঠিক করুন')+'</button>';
}
var lastSig='';
function tick(){
  ensureDays();
  var now=Date.now(),cur=null,nxt=null,i;
  for(i=0;i<prayers.length;i++){var p=prayers[i];if(!cur&&p.s.getTime()<=now&&now<p.e.getTime())cur=p;if(!nxt&&p.s.getTime()>now)nxt=p}
  var sig=daysKey+'|'+(cur?cur.id:'-')+'|'+(nxt?nxt.id:'-')+'|'+JSON.stringify(alarms)+'|'+JSON.stringify(nstate);
  if(sig!==lastSig){lastSig=sig;renderHeader();renderHero(cur,nxt);renderRows(cur,nxt);renderExtras();renderTahajjud();renderArmbar()}
  if(nxt&&$('cd'))$('cd').textContent=hms(nxt.s.getTime()-now);
  if(cur&&$('curleft'))$('curleft').textContent=hms(cur.e.getTime()-now);
  var tj=tahajjudTimes(),tc=$('tahajjudCd');
  if(tc){
    if(now<tj.isha.getTime())tc.textContent=hms(tj.isha.getTime()-now);
    else if(now<tj.best.getTime())tc.textContent=hms(tj.best.getTime()-now);
    else if(now<tj.end.getTime())tc.textContent=hms(tj.end.getTime()-now);
  }
}
