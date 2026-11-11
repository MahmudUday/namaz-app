var RAD=Math.PI/180,DEG=180/Math.PI;
function dsin(d){return Math.sin(d*RAD)}function dcos(d){return Math.cos(d*RAD)}function dtan(d){return Math.tan(d*RAD)}
function dasin(x){return Math.asin(x)*DEG}function dacos(x){return Math.acos(x)*DEG}function datan2(y,x){return Math.atan2(y,x)*DEG}function dacot(x){return Math.atan(1/x)*DEG}
function fixa(a,b){a=a-b*Math.floor(a/b);return a<0?a+b:a}
function julian(y,m,d){if(m<=2){y-=1;m+=12}var A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5}
function sunPos(jd){var D=jd-2451545.0,g=fixa(357.529+0.98560028*D,360),q=fixa(280.459+0.98564736*D,360),L=fixa(q+1.915*dsin(g)+0.020*dsin(2*g),360),e=23.439-0.00000036*D,RA=datan2(dcos(e)*dsin(L),dcos(L))/15;return{decl:dasin(dsin(e)*dsin(L)),eqt:q/15-fixa(RA,24)}}
/* Karachi: Fajr/Isha 18 deg. Hanafi Asr (shadow factor 2). Returns local hours. */
function calcDay(y,m,d,lat,lng,tz){
  var jd=julian(y,m,d)-lng/(15*24),sp=sunPos(jd),decl=sp.decl,noon=12+tz-lng/15-sp.eqt;
  function ang(a){var v=(-dsin(a)-dsin(decl)*dsin(lat))/(dcos(decl)*dcos(lat));return dacos(Math.max(-1,Math.min(1,v)))/15}
  var asrA=-dacot(2+dtan(Math.abs(lat-decl)));
  return{fajr:noon-ang(18),sunrise:noon-ang(0.833),noon:noon,asr:noon+ang(asrA),sunset:noon+ang(0.833),isha:noon+ang(18)};
}

var BN='০১২৩৪৫৬৭৮৯';
function bn(s){return String(s).replace(/\d/g,function(d){return BN[d]})}
function pad(n){return String(n).padStart(2,'0')}
function $(id){return document.getElementById(id)}
var DISTRICTS=[['ঢাকা',23.8103,90.4125],['গাজীপুর',23.9999,90.4203],['নারায়ণগঞ্জ',23.6238,90.5],['নরসিংদী',23.9193,90.7176],['টাঙ্গাইল',24.2513,89.9167],['ফরিদপুর',23.607,89.8429],['কিশোরগঞ্জ',24.4449,90.7766],['ময়মনসিংহ',24.7471,90.4203],['চট্টগ্রাম',22.3569,91.7832],['কক্সবাজার',21.4272,92.0058],['কুমিল্লা',23.4607,91.1809],['ব্রাহ্মণবাড়িয়া',23.9608,91.1115],['নোয়াখালী',22.8696,91.0995],['ফেনী',23.0159,91.3976],['রাঙ্গামাটি',22.7324,92.2985],['বান্দরবান',22.1953,92.2184],['খাগড়াছড়ি',23.1193,91.9847],['সিলেট',24.8949,91.8687],['হবিগঞ্জ',24.3745,91.4156],['রাজশাহী',24.3745,88.6042],['বগুড়া',24.8465,89.3773],['পাবনা',24.0064,89.2372],['রংপুর',25.7439,89.2752],['দিনাজপুর',25.6279,88.6332],['ঠাকুরগাঁও',26.0336,88.4616],['খুলনা',22.8456,89.5403],['যশোর',23.1667,89.2167],['কুষ্টিয়া',23.9013,89.1205],['সাতক্ষীরা',22.7185,89.0705],['বরিশাল',22.701,90.3535],['পটুয়াখালী',22.3596,90.3299]];
var PR=[{k:'fajr',n:'ফজর'},{k:'dhuhr',n:'যোহর'},{k:'asr',n:'আসর'},{k:'maghrib',n:'মাগরিব'},{k:'isha',n:'এশা'}];
var NAME={};PR.forEach(function(p){NAME[p.k]=p.n});
var WD=['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
var MON=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
