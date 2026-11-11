/* native alarms (Capacitor Local Notifications) */
function plug(n){return window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins[n]}
var busy=false,again=null;
var remindersOn=lsGet('namaz.reminders')!==false;
var notificationTone=lsGet('namaz.tone')||'soft';
var REMINDER_MINUTES=[40,20,5];
async function schedule(level){
  if(busy){again=Math.max(again||0,level);return}
  busy=true;
  try{
    var LN=plug('LocalNotifications');
    if(!LN){nstate={ok:false,msg:'এই ফোনে নোটিফিকেশন সুবিধা পাওয়া যাচ্ছে না।'};return}
    var p=await LN.checkPermissions();
    if(p.display!=='granted'&&level>=1)p=await LN.requestPermissions();
    if(p.display!=='granted'){nstate={ok:false,msg:'নোটিফিকেশনের অনুমতি দেওয়া হয়নি।'};return}
    try{var ex=await LN.checkExactNotificationSetting();if(ex.exact_alarm!=='granted'&&level>=2)await LN.changeExactNotificationSetting()}catch(e){}
    var channelId=notificationTone==='soft'?'azan_v2_clear':'azan_v1_default';
    var channelOptions={id:channelId,name:notificationTone==='soft'?'স্পষ্ট সুর':'ফোনের ডিফল্ট সাউন্ড',description:'নামাজের ওয়াক্তের অ্যালার্ম',importance:5,visibility:1,vibration:true};
    if(notificationTone==='soft')channelOptions.sound='azan.wav';
    await LN.createChannel(channelOptions);
    var pend=await LN.getPending();
    if(pend.notifications&&pend.notifications.length)await LN.cancel({notifications:pend.notifications.map(function(n){return{id:n.id}})});
    var list=[],now=Date.now();
    for(var off=0;off<14;off++){
      var d=dayData(off);
      PR.forEach(function(q,i){
        var t=d[q.k];
        if(alarms[q.k]&&t.getTime()>now+3000)list.push({id:1000+off*10+i,title:q.n+' নামাজের ওয়াক্ত',body:'এখন '+fmtInline(t)+'। নামাজের প্রস্তুতি নিন।',schedule:{at:t,allowWhileIdle:true},channelId:channelId});
      });
      if(remindersOn){
        var intervals=[
          ['fajr',d.fajr,d.sunrise],['dhuhr',d.dhuhr,d.asr],['asr',d.asr,d.maghrib],
          ['maghrib',d.maghrib,d.isha],['isha',d.isha,dayData(off+1).fajr]
        ];
        intervals.forEach(function(p,i){
          var duration=p[2].getTime()-p[1].getTime();
          REMINDER_MINUTES.forEach(function(minutes,j){
            var at=new Date(p[2].getTime()-minutes*60000);
            if(duration>minutes*60000&&at.getTime()>now+3000){
              list.push({
                id:2000+off*100+i*3+j,
                title:PR[i].n+'-এর ওয়াক্ত শেষ হতে '+bn(minutes)+' মিনিট বাকি',
                body:'নামাজ না পড়ে থাকলে ওয়াক্ত শেষ হওয়ার আগেই দ্রুত আদায় করে নিন।',
                schedule:{at:at,allowWhileIdle:true},channelId:channelId
              });
            }
          });
        });
      }
    }
    if(list.length)await LN.schedule({notifications:list});
    nstate={ok:true,msg:'পরবর্তী ১৪ দিনের অ্যালার্ম সেট আছে ('+bn(list.length)+'টি)।'};
  }catch(e){
    nstate={ok:false,msg:'অ্যালার্ম সেট করতে সমস্যা হয়েছে। "অনুমতি ঠিক করুন" চাপুন।'};
  }finally{
    busy=false;lastSig='';
    if(again!==null){var l=again;again=null;schedule(l)}
  }
}
async function testAlarm(){
  var LN=plug('LocalNotifications'),st=$('testStatus');
  if(!LN){st.textContent='এই ফোনে নোটিফিকেশন নেই।';return}
  await schedule(2);
  try{
    await LN.schedule({notifications:[{id:9999,title:'পরীক্ষা',body:'অ্যালার্ম এভাবে বাজবে।',schedule:{at:new Date(Date.now()+10000),allowWhileIdle:true},channelId:notificationTone==='soft'?'azan_v2_clear':'azan_v1_default'}]});
    st.textContent='১০ সেকেন্ড পরে নোটিফিকেশন আসবে।';
  }catch(e){st.textContent='পরীক্ষা করা যায়নি।'}
}

/* location */
function getPos(){
  var G=plug('Geolocation');
  if(G){return(async function(){
    try{var p=await G.checkPermissions();if(p.location!=='granted'&&p.coarseLocation!=='granted')await G.requestPermissions({permissions:['location']})}catch(e){}
    var r=await G.getCurrentPosition({enableHighAccuracy:false,timeout:15000});
    return{lat:r.coords.latitude,lng:r.coords.longitude};
  })()}
  return new Promise(function(res,rej){
    if(!navigator.geolocation)return rej();
    navigator.geolocation.getCurrentPosition(function(p){res({lat:p.coords.latitude,lng:p.coords.longitude})},rej,{timeout:10000});
  });
}
function setLoc(l){loc=l;lsSet('namaz.loc',loc);daysKey='';lastSig='';syncSelect();tick();schedule(0)}
function useGps(){
  var st=$('gpsStatus');st.textContent='অবস্থান খোঁজা হচ্ছে…';
  return getPos().then(function(p){
    setLoc({mode:'gps',name:'আপনার অবস্থান',lat:+p.lat.toFixed(4),lng:+p.lng.toFixed(4)});
    st.textContent='অবস্থান পাওয়া গেছে।';
  },function(){st.textContent='জিপিএস পাওয়া যায়নি। নিচের তালিকা থেকে জেলা বেছে নিন।'});
}
function buildSelect(){
  var h='<option value="gps" disabled>জিপিএস অবস্থান</option>';
  DISTRICTS.forEach(function(d,i){h+='<option value="'+i+'">'+d[0]+'</option>'});
  $('district').innerHTML=h;
  $('district').addEventListener('change',function(){var d=DISTRICTS[+this.value];setLoc({mode:'district',name:d[0],lat:d[1],lng:d[2]});$('gpsStatus').textContent=''});
  syncSelect();
}
function syncSelect(){
  var v='gps';
  if(loc.mode==='district')DISTRICTS.forEach(function(d,i){if(d[0]===loc.name)v=String(i)});
  $('district').value=v;
}
document.addEventListener('click',function(ev){
  var b=ev.target.closest('button');if(!b)return;
  if(b.classList.contains('bell')){var k=b.getAttribute('data-k');alarms[k]=!alarms[k];lsSet('namaz.alarms',alarms);lastSig='';tick();schedule(0)}
  else if(b.id==='armBtn')schedule(2);
  else if(b.id==='testBtn')testAlarm();
  else if(b.id==='gpsBtn')useGps();
});
var reminderToggle=$('reminderToggle');
if(reminderToggle){
  reminderToggle.checked=remindersOn;
  reminderToggle.addEventListener('change',function(){
    remindersOn=reminderToggle.checked;
    lsSet('namaz.reminders',remindersOn);
    schedule(0);
  });
}
buildSelect();tick();setInterval(tick,1000);
schedule(1).then(function(){if(!savedLoc||loc.mode==='gps')useGps()});


/* Motion effects are progressive enhancements and respect accessibility settings. */
(function initMotion(){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!('IntersectionObserver' in window))return;
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:0.08,rootMargin:'0px 0px -28px 0px'});
  function watch(root){
    (root||document).querySelectorAll('.top,.hero,.armbar,.wrap > section,.row').forEach(function(el){
      if(el.classList.contains('reveal-motion'))return;
      el.classList.add('reveal-motion');
      observer.observe(el);
    });
  }
  watch(document);
  var rows=$('rows');
  if(rows&&'MutationObserver' in window){
    new MutationObserver(function(){watch(rows)}).observe(rows,{childList:true});
  }
})();



/* Persistent appearance and notification sound preferences. */
(function initPreferences(){
  var theme=lsGet('namaz.theme')||'dark';
  function applyTheme(value){document.documentElement.setAttribute('data-theme',value==='system'?'system':value)}
  applyTheme(theme);
  var themeSelect=$('themeSelect');
  if(themeSelect){themeSelect.value=theme;themeSelect.addEventListener('change',function(){theme=themeSelect.value;lsSet('namaz.theme',theme);applyTheme(theme)})}
  var toneSelect=$('toneSelect');
  if(toneSelect){
    toneSelect.value=notificationTone;
    toneSelect.addEventListener('change',function(){
      notificationTone=toneSelect.value;lsSet('namaz.tone',notificationTone);
      schedule(0);
      var st=$('testStatus');if(st)st.textContent='নতুন সাউন্ড অনুযায়ী অ্যালার্ম আপডেট হচ্ছে…';
    });
  }
})();

/* Bottom navigation: switch pages without reloading or interrupting alarms. */
(function initBottomNav(){
  var nav=document.querySelector('.bottom-nav');
  if(!nav)return;
  var pages={home:$('homePage'),settings:$('settingsPage'),about:$('aboutPage')};
  nav.addEventListener('click',function(ev){
    var btn=ev.target.closest('[data-nav]');
    if(!btn)return;
    var key=btn.getAttribute('data-nav');
    if(!pages[key])return;
    Object.keys(pages).forEach(function(k){
      pages[k].hidden=k!==key;
      pages[k].classList.toggle('active',k===key);
    });
    nav.querySelectorAll('.nav-item').forEach(function(item){
      var active=item===btn;
      item.classList.toggle('active',active);
      if(active){item.setAttribute('aria-current','page')}else{item.removeAttribute('aria-current')}
    });
    window.scrollTo({top:0,behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
})();
