/* Tangerine — Design No. 05. One script for every page; each part runs only if its page has the pieces.
   Grown from Design No. 04: the resident, the branding iron, the branch, the crate, the Freeman Globe and the sky.
   New here: the light follows the time of day in Georgia. */
(function(){
  'use strict';
  var doc=document, root=doc.documentElement, NS='http://www.w3.org/2000/svg';
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
  var INK='#1c1b19';
  var $=function(s,c){return (c||doc).querySelector(s)}, $$=function(s,c){return [].slice.call((c||doc).querySelectorAll(s))};

  /* ——— the drawing materials every page shares ——— */
  var defs=doc.createElement('div');
  defs.innerHTML='<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'+
    '<symbol id="mark" viewBox="0 0 100 100" overflow="visible"><path d="M50 26 C69 25 82 39 82 57 C82 75 68 88 50 88 C32 88 18 75 18 57 C18 39 31 27 50 26Z"/><path d="M34 47 H66 M50 47 V77"/><path d="M51 25 C54 13 66 6 80 8 C76 20 65 26 51 25Z"/></symbol>'+
    '<filter id="boil" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence id="boil-noise" type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>'+
    [[2,'.07',6,11,'-.55'],[5,'.08',6,23,'-.5'],[9,'.06',7,31,'-.6'],[14,'.075',5,41,'-.45']].map(function(b,i){
      return '<filter id="burn'+i+'" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="'+b[1]+'" numOctaves="2" seed="'+b[0]+'" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="'+b[2]+'" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="'+b[3]+'" result="p"/><feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 '+b[4]+'" result="pm"/><feComposite in="d" in2="pm" operator="in"/></filter>';
    }).join('')+
    '<filter id="singe" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.6"/></filter>'+
    '<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '</defs></svg>';
  doc.body.insertBefore(defs.firstChild, doc.body.firstChild);
  $$('svg.mk-mark').forEach(function(s){ s.innerHTML='<use href="#mark" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'; });

  /* ——— Georgia time, and the light it makes ———
     ?h=19.5 in the address simulates an hour, for review. */
  var asleep=false, hour=12, minute=0;
  try{
    var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date());
    hour=+parts.find(function(p){return p.type==='hour'}).value%24; minute=+parts.find(function(p){return p.type==='minute'}).value;
  }catch(e){}
  var q=/[?&]h=([\d.]+)/.exec(location.search); if(q){ var hq=parseFloat(q[1])%24; hour=Math.floor(hq); minute=Math.round((hq-hour)*60); }
  var hf=hour+minute/60;
  var light=hf<6||hf>=20.5?'night':hf<9?'dawn':hf<16.5?'day':'golden';
  asleep=(hf>=22||hf<6);
  root.dataset.light=light;
  (function(){
    /* the sun crosses from east to west: the branch's shadow swings with it and lengthens toward evening */
    var t=Math.max(0,Math.min(1,(hf-6)/14.5)), sx=46-92*t, sy=16+34*Math.abs(t-.5)*2;
    if(light==='night'){ sx=0; sy=22; }
    root.style.setProperty('--sun-x',sx.toFixed(1)+'px');
    root.style.setProperty('--sun-y',sy.toFixed(1)+'px');
    root.style.setProperty('--sun-a',light==='night'?'.05':light==='golden'?'.16':'.12');
    var words={dawn:'Early light in Georgia.',day:'Good light in Georgia.',golden:'Golden hour in Georgia.',night:'Night in Georgia.'}[light];
    $$('[data-light-words]').forEach(function(el){ el.textContent=words+(asleep?' The tangerine is asleep.':''); });
    var names=['twelve','one','two','three','four','five','six','seven','eight','nine','ten','eleven'];
    var steps=['','five past','ten past','a quarter past','twenty past','twenty-five past','half past','twenty-five to','twenty to','a quarter to','ten to','five to'];
    var s=Math.round(minute/5), hh=hour; if(s===12){s=0;hh=(hour+1)%24}
    var shown=s>6?(hh+1)%24:hh;
    var part=shown<5?'at night':shown<12?'in the morning':shown<17?'in the afternoon':shown<21?'in the evening':'at night';
    var tx=s===0?names[shown%12]+' o’clock':steps[s]+' '+names[shown%12];
    if(s===0&&shown===12){tx='noon';part=''} if(s===0&&shown===0){tx='midnight';part=''}
    $$('[data-clock]').forEach(function(el){ el.textContent='It’s '+(minute%5?'about ':'')+tx+(part?' '+part:'')+' in Georgia.'; });
  })();

  /* ——— the resident ——— */
  function tangerine(){
    return '<svg viewBox="0 0 120 150" aria-hidden="true"><g class="boiling" filter="url(#boil)">'+
      '<g class="legs" fill="none" stroke="'+INK+'" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M48 118 C47 128 44 136 40 142 H30"/><path d="M73 118 C74 128 78 136 82 142 H92"/></g>'+
      '<path d="M58 41 C84 37 109 54 110 80 C111 106 90 125 61 125 C33 126 11 109 10 83 C9 58 31 43 58 41Z" fill="#f0661f" stroke="'+INK+'" stroke-width="3.6"/>'+
      '<path d="M24 74 C25 62 33 53 44 49" fill="none" stroke="#ffd0a3" stroke-width="5" stroke-linecap="round"/>'+
      '<g fill="#c84d14" opacity=".55"><circle cx="86" cy="96" r="1.6"/><circle cx="95" cy="78" r="1.4"/><circle cx="31" cy="99" r="1.6"/><circle cx="68" cy="112" r="1.4"/><circle cx="46" cy="106" r="1.3"/><circle cx="100" cy="94" r="1.2"/><circle cx="22" cy="88" r="1.2"/></g>'+
      '<path d="M60 41 C63 27 77 17 96 18 C92 33 78 42 60 41Z" fill="#4e6b43" stroke="'+INK+'" stroke-width="3"/>'+
      '<path d="M62 39 C72 32 82 25 93 20" fill="none" stroke="#2f4428" stroke-width="1.6"/>'+
      '<circle cx="58" cy="42" r="3.4" fill="#5a4426" stroke="'+INK+'" stroke-width="1.6"/>'+
      '<g class="eyes"><g class="eye"><ellipse cx="47" cy="78" rx="5.6" ry="8.6" fill="'+INK+'"/><circle cx="49" cy="74" r="1.9" fill="#fff"/></g>'+
      '<g class="eye"><ellipse cx="72" cy="78" rx="5.6" ry="8.6" fill="'+INK+'"/><circle cx="74" cy="74" r="1.9" fill="#fff"/></g></g>'+
      '<g class="shut" fill="none" stroke="'+INK+'" stroke-width="3" stroke-linecap="round"><path d="M40 80 C44 85 50 85 54 80"/><path d="M65 80 C69 85 75 85 79 80"/></g>'+
      '<ellipse class="mouth" cx="60" cy="100" rx="4" ry="5.2" fill="'+INK+'"/>'+
      '<path class="sweat" d="M104 46 C109 53 110 57 107 60 C104 62 100 60 101 55 C101 52 103 49 104 46Z" fill="#fff" stroke="'+INK+'" stroke-width="2"/>'+
      '<g class="zz"><text x="98" y="38">z</text><text x="104" y="30">z</text></g>'+
      '</g></svg>';
  }
  var tgs=$$('.tg');
  tgs.forEach(function(el){
    var period=el.classList.contains('tg-period');
    el.innerHTML=(period?'<span class="sr">.</span>':'')+tangerine()+'<span class="say" aria-hidden="true"></span>';
  });

  /* ——— the iron ——— */
  function iron(hot){
    return '<circle cx="40" cy="12" r="8.5" fill="none" stroke="'+INK+'" stroke-width="3.4"/>'+
      '<path d="M31 22 C30 21 50 21 49 22 L51 92 C51 96 29 96 29 92Z" fill="#a8703f" stroke="'+INK+'" stroke-width="2.6" stroke-linejoin="round"/>'+
      '<path d="M35 30 C36 50 34 70 36 88 M44 28 C43 46 45 68 43 90" fill="none" stroke="#6e4220" stroke-width="1.3"/>'+
      '<path d="M31 94 H49 V106 H31Z" fill="#8d8a84" stroke="'+INK+'" stroke-width="2.4"/>'+
      '<path d="M40 106 V214" stroke="#3a3834" stroke-width="5.5" stroke-linecap="round"/>'+
      '<path d="M40 106 V214" stroke="'+INK+'" stroke-width="1.2" opacity=".4" transform="translate(-1.6 0)"/>'+
      '<g transform="translate(6 200) scale(.68)"><use href="#mark" width="100" height="100" fill="none" stroke="#33312d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'+
      (hot?'<use class="hot" href="#mark" width="100" height="100" fill="none" stroke="#ff5a14" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>':'<use href="#mark" width="100" height="100" fill="none" stroke="#6b6862" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>')+
      '</g>';
  }
  $$('[data-iron]').forEach(function(s){s.innerHTML=iron(s.hasAttribute('data-hot'))});
  var HOT_X=6+50*.68, HOT_Y=200+57*.68;

  /* ——— line boil: redraw the noise ~9 times a second, only while something is on screen ——— */
  var noise=doc.getElementById('boil-noise'), visible=new Set();
  if('IntersectionObserver' in window){
    var vo=new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?visible.add(e.target):visible.delete(e.target)})});
    $$('.tg,.boiling').forEach(function(el){vo.observe(el)});
  } else tgs.forEach(function(t){visible.add(t)});
  if(!reduce){
    var seed=1;
    setInterval(function(){ if(!doc.hidden && visible.size){ seed=seed%4+1; noise.setAttribute('seed',seed); } },115);
  }

  /* ——— eyes: look at the pointer, blink now and then ——— */
  var px=innerWidth/2, py=innerHeight/3, holding=false;
  function look(){
    tgs.forEach(function(t){
      if(!visible.has(t))return;
      var r=t.getBoundingClientRect(), cx=r.left+r.width*.5, cy=r.top+r.height*.52;
      var dx=px-cx, dy=py-cy, d=Math.hypot(dx,dy)||1, k=Math.min(1,d/220);
      var eyes=t.querySelector('.eyes');
      eyes.setAttribute('transform','translate('+(dx/d*3.4*k).toFixed(2)+' '+(dy/d*3*k).toFixed(2)+')');
      if(holding) t.classList.toggle('nervous', d<170 && !t.classList.contains('air'));
    });
  }
  function blink(t){ if(!t||t.classList.contains('asleep'))return; t.classList.add('blink'); setTimeout(function(){t.classList.remove('blink')},120); }
  if(tgs.length) (function wait(){ setTimeout(function(){ var v=tgs.filter(function(t){return visible.has(t)}); if(v.length&&!doc.hidden) blink(v[Math.random()*v.length|0]); wait(); }, 2600+Math.random()*4200); })();

  function sleepAll(on){ tgs.forEach(function(t){t.classList.toggle('asleep',on)}) }
  if(asleep) sleepAll(true);
  function speak(t,words){
    var s=t&&t.querySelector('.say'); if(!s)return;
    s.textContent=words; s.classList.add('on'); clearTimeout(s._t);
    s._t=setTimeout(function(){s.classList.remove('on')},1500);
  }
  tgs.forEach(function(t){ t.addEventListener('click',function(){
    if(holding)return;
    if(t.classList.contains('asleep')){ t.classList.remove('asleep'); speak(t,'Mm?'); setTimeout(function(){ if(!holding) t.classList.add('asleep') },3500); return; }
    if(t.dataset.tg==='play') hop(t);
  }); });

  /* ——— the hop: it has legs. Nobody knew. ——— */
  function hop(t){
    if(t._busy)return; t._busy=true;
    var r=t.getBoundingClientRect(), w=r.width, svg=t.querySelector('svg'), step=w*.75;
    var x0=t._off||0, side=t._side||1, box=t.parentElement.getBoundingClientRect();
    var lo=Math.max(8,t.dataset.tg==='play'?box.left:8), hi=Math.min(innerWidth-8,t.dataset.tg==='play'?box.right:innerWidth-8);
    if(side>0&&r.right+step>hi) side=-1; else if(side<0&&r.left-step<lo) side=1;
    var x1=x0+side*step; t._side=-side; t._off=x1;
    t.classList.remove('nervous'); t.classList.add('oh');
    speak(t,['Not me.','Hey!','Rude.','Not the fruit.'][Math.random()*4|0]);
    if(reduce||!svg.animate){ svg.style.transform='translateX('+x1+'px)'; setTimeout(function(){t.classList.remove('oh');t._busy=false},900); return; }
    t.classList.add('air');
    var a=svg.animate([
      {transform:'translate('+x0+'px,0) scale(1,1)'},
      {transform:'translate('+x0+'px,4%) scale(1.14,.84)',offset:.12},
      {transform:'translate('+((x0+x1)/2)+'px,-150%) scale(.9,1.12)',offset:.48},
      {transform:'translate('+x1+'px,0) scale(1.16,.82)',offset:.82},
      {transform:'translate('+x1+'px,0) scale(1,1)'}
    ],{duration:720,easing:'cubic-bezier(.3,0,.4,1)'});
    setTimeout(function(){t.classList.remove('air')},640);
    a.onfinish=function(){ svg.style.transform='translate('+x1+'px,0)'; t.classList.remove('oh'); t._busy=false; };
  }

  addEventListener('pointermove',function(e){
    vx+=(e.clientX-px)*.6; px=e.clientX; py=e.clientY; look();
    if(holding&&fine&&!raf) raf=requestAnimationFrame(place);
  },{passive:true});
  var vx=0, raf=0, tilt=0;

  /* ——— holding the iron (only where the rack hangs) ——— */
  var rack=doc.getElementById('rack'), hand=doc.getElementById('hand'), burns=doc.getElementById('burns');
  function place(){
    if(!fine||!hand)return;
    vx*=.82; tilt+=(Math.max(-22,Math.min(22,-vx*1.1))-tilt)*.25;
    var s=hand.offsetWidth/80;
    hand.style.transform='translate('+(px-HOT_X*s)+'px,'+(py-HOT_Y*s)+'px) rotate('+tilt.toFixed(2)+'deg)';
    hand.style.transformOrigin=(HOT_X*s)+'px '+(HOT_Y*s)+'px';
    if(holding&&(Math.abs(tilt)>.05||Math.abs(vx)>.05)) raf=requestAnimationFrame(place); else raf=0;
  }
  if(rack&&hand&&burns){
    var btn=doc.getElementById('iron-btn'), tagText=doc.getElementById('tag-text'), count=doc.getElementById('count'),
        erase=doc.getElementById('erase'), hangupBtn=doc.getElementById('hangup'), n=0, last=0;
    if(fine) hand.classList.add('fine');
    var take=function(){
      holding=true; root.classList.add('held'); rack.classList.add('empty');
      btn.setAttribute('aria-pressed','true');
      if(asleep){ sleepAll(false); tgs.forEach(function(t){ if(visible.has(t)) speak(t,'!') }); }
      place(); look();
    };
    var hang=function(){
      holding=false; root.classList.remove('held'); rack.classList.remove('empty');
      btn.setAttribute('aria-pressed','false');
      tgs.forEach(function(t){t.classList.remove('nervous')});
      if(asleep) setTimeout(function(){ if(!holding) sleepAll(true) },1800);
      btn.focus({preventScroll:true});
    };
    addEventListener('scroll',function(){ if(holding) look() },{passive:true});
    var messages=[[0,'Please do not touch'],[1,'Oh well.'],[4,'You’re a natural.'],[12,'That’s plenty.'],[24,'We should talk.']];
    var stamp=function(cx,cy){
      var now=Date.now(); if(now-last<220)return; last=now;
      var pageX=cx+scrollX, pageY=cy+scrollY;
      tgs.forEach(function(t){ var r=t.getBoundingClientRect(); if(cx>r.left-8&&cx<r.right+8&&cy>r.top-8&&cy<r.bottom+8) hop(t); });
      var size=innerWidth<640?64:84, rot=(Math.random()*24-12).toFixed(1), f='burn'+(Math.random()*4|0);
      function mk(cls){ var s=doc.createElementNS(NS,'svg'); s.setAttribute('viewBox','0 0 100 100'); s.setAttribute('class',cls);
        s.style.cssText='--bs:'+size+'px;left:'+(pageX-size/2)+'px;top:'+(pageY-size*.57)+'px;transform:rotate('+rot+'deg)'; return s; }
      var b=mk('burn');
      b.innerHTML='<use href="#mark" fill="none" stroke="#7a3d16" stroke-opacity=".38" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" filter="url(#singe)"/>'+
        '<use href="#mark" fill="none" stroke="#2a1a10" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#'+f+')"/>';
      burns.appendChild(b);
      if(!reduce){
        var e=mk('ember'); e.innerHTML='<use href="#mark" fill="none" stroke="#ff6a1a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>';
        burns.appendChild(e); setTimeout(function(){e.remove()},1600);
        var sm=doc.createElementNS(NS,'svg'); sm.setAttribute('viewBox','0 0 90 120'); sm.setAttribute('class','smoke');
        sm.style.left=(pageX-45)+'px'; sm.style.top=(pageY-120)+'px';
        sm.innerHTML='<path d="M30 110 C22 92 38 80 30 62 C24 48 34 38 30 26"/><path d="M47 112 C55 94 40 82 48 64 C54 50 44 40 49 24"/><path d="M62 108 C56 92 68 82 62 66"/>';
        burns.appendChild(sm); setTimeout(function(){sm.remove()},2300);
      }
      var all=burns.querySelectorAll('.burn'); if(all.length>80) all[0].remove();
      n++; if(count) count.textContent='Brands built this visit: '+n; if(erase) erase.hidden=false;
      for(var i=messages.length-1;i>=0;i--) if(n>=messages[i][0]){ tagText.textContent=messages[i][1]; break; }
      if(fine){ hand.classList.add('press'); setTimeout(function(){hand.classList.remove('press')},110); }
      else { var s=hand.offsetWidth/80; hand.style.transform='translate('+(cx-HOT_X*s)+'px,'+(cy-HOT_Y*s)+'px)'; hand.classList.add('tap','show'); requestAnimationFrame(function(){requestAnimationFrame(function(){hand.classList.remove('show')})}); }
    };
    btn.addEventListener('click',function(e){ if(!holding){ e.stopPropagation(); e.preventDefault(); take(); } });
    hangupBtn.addEventListener('click',function(e){ e.stopPropagation(); hang(); });
    doc.addEventListener('click',function(e){
      if(!holding)return;
      if(e.target.closest('#hangup'))return;
      e.preventDefault(); e.stopPropagation();
      if(e.target.closest('.rack')){ hang(); return; }
      if(e.detail===0){
        var r=(doc.activeElement&&doc.activeElement!==doc.body?doc.activeElement:hangupBtn).getBoundingClientRect();
        stamp(r.left+r.width/2, r.top+r.height/2); return;
      }
      stamp(e.clientX,e.clientY);
    },true);
    addEventListener('keydown',function(e){ if(e.key==='Escape'&&holding) hang(); });
    if(erase) erase.addEventListener('click',function(){
      if(holding)return;
      burns.querySelectorAll('.burn').forEach(function(b){b.remove()});
      erase.hidden=true; n=0; count.textContent='Brands built this visit: 0'; tagText.textContent=messages[0][1];
    });

    /* hang the rack beside the second line, and keep what follows clear of it */
    var heroEl=$('.hero'), w2=$('.title .w2'), after=$('.hero .lede');
    var hangRack=function(){
      after.style.marginTop='';
      var top=w2.getBoundingClientRect().top-heroEl.getBoundingClientRect().top-(innerWidth<640?6:28);
      rack.style.top=top+'px';
      var need=top+rack.offsetHeight+28-after.offsetTop;
      if(need>0) after.style.marginTop=(parseFloat(getComputedStyle(after).marginTop)+need)+'px';
    };
    hangRack(); addEventListener('resize',hangRack);
    if(doc.fonts&&doc.fonts.ready) doc.fonts.ready.then(hangRack);
  }

  /* ——— the hand-drawn underline arrives once ——— */
  var u=$('.title .u path');
  if(u&&!reduce&&u.animate){ u.style.strokeDasharray='1'; u.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:900,delay:500,easing:'cubic-bezier(.6,0,.2,1)',fill:'backwards'}); }

  /* ——— the Freeman Globe, drawn live from the study's own code (assets/js/freeman-globe-mark.original.js) ———
     <canvas data-globe data-turn="16">: seconds per turn. data-still: one frame only. */
  (function(){
    var cvs=$$('canvas[data-globe]'); if(!cvs.length)return;
    var M;
    try{ M={RUNS:RUNS,SW:SW,SH:SH,halo:halo,globeMask:globeMask}; }  /* globals from the original file */
    catch(err){ cvs.forEach(function(cv){ cv.replaceWith(Object.assign(doc.createElement('p'),{className:'cap',textContent:'Freeman Globe, motion study 001'})); }); $$('[data-globe-toggle]').forEach(function(b){b.remove()}); return; }
    var W=M.SW, H=Math.max(M.SH,102), oy=Math.floor((H-M.SH)/2), D=100, P=[255,249,241], R=[249,56,34];
    var buf=new Uint8Array(W*H), g=new Uint8Array(W*H);
    function draw(cv,rot){
      if(!cv._ctx){ cv.width=W; cv.height=H; cv._ctx=cv.getContext('2d'); cv._img=cv._ctx.createImageData(W,H); }
      M.globeMask(buf,W,H,D,rot);
      for(var y=0;y<H;y++){ var sy=y-oy, inS=sy>=0&&sy<M.SH; for(var x=0;x<W;x++) g[y*W+x]=buf[y*W+x]&&!(inS&&M.halo[sy*M.SW+x])?1:0; }
      for(var i=0;i<M.RUNS.length;i+=3) g.fill(1,(M.RUNS[i]+oy)*W+M.RUNS[i+1],(M.RUNS[i]+oy)*W+M.RUNS[i+1]+M.RUNS[i+2]);
      var d=cv._img.data; for(var k=0;k<g.length;k++){ var c=g[k]?R:P; d[k*4]=c[0]; d[k*4+1]=c[1]; d[k*4+2]=c[2]; d[k*4+3]=255; }
      cv._ctx.putImageData(cv._img,0,0);
    }
    var t0=performance.now(), playing=!reduce;
    cvs.forEach(function(cv){
      cv._turn=parseFloat(cv.dataset.turn)||16; cv._rot=parseFloat(cv.dataset.rot)||0; cv._frame=-1; cv._on=false;
      draw(cv,cv._rot);
      if('IntersectionObserver' in window) new IntersectionObserver(function(es){ cv._on=es[0].isIntersecting; }).observe(cv); else cv._on=true;
    });
    var tog=$$('[data-globe-toggle]');
    function label(){ tog.forEach(function(b){ b.textContent=playing?'Pause':'Play'; b.setAttribute('aria-pressed',String(!playing)); }); }
    label();
    var paused=0;
    tog.forEach(function(b){ b.addEventListener('click',function(){ playing=!playing; if(playing) t0+=performance.now()-paused; else paused=performance.now(); label(); }); });
    (function tick(now){
      if(playing&&!doc.hidden){
        cvs.forEach(function(cv){
          if(!cv._on||cv.hasAttribute('data-still'))return;
          var f=Math.floor((now-t0)/1000*30);  /* 30 fps, as in the study */
          if(f!==cv._frame){ cv._frame=f; draw(cv,(cv._rot+f/30*360/cv._turn)%360); }
        });
      }
      requestAnimationFrame(tick);
    })(performance.now());
  })();

  /* ——— films: play only while on screen; never under reduced motion ——— */
  $$('video[data-auto]').forEach(function(v){
    v.muted=true;
    if(reduce){ v.controls=true; return; }
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ var p; if(es[0].isIntersecting){ p=v.play(); if(p&&p.catch)p.catch(function(){}); } else v.pause(); },{threshold:.2}).observe(v);
    v.addEventListener('click',function(){ v.paused?v.play():v.pause(); });
  });

  /* ——— the branch: hang it so its empty stem sits right above the full stop ——— */
  var branch=doc.getElementById('branch'), heroTg=$('.title .tg-period');
  var BODY='M58 41 C84 37 109 54 110 80 C111 106 90 125 61 125 C33 126 11 109 10 83 C9 58 31 43 58 41Z';
  function fruitArt(k){
    return '<path d="'+BODY+'" fill="#f0661f" stroke="'+INK+'" stroke-width="'+(2.4/k).toFixed(2)+'"/>'+
      '<path d="M24 74 C25 62 33 53 44 49" fill="none" stroke="#ffd0a3" stroke-width="5" stroke-linecap="round"/>'+
      '<g fill="#c84d14" opacity=".55"><circle cx="86" cy="96" r="1.6"/><circle cx="95" cy="78" r="1.4"/><circle cx="31" cy="99" r="1.6"/><circle cx="68" cy="112" r="1.4"/></g>'+
      '<path d="M58 37 L61 42 L68 42 L62 45 L64 50 L58 47 L52 50 L54 45 L48 42 L55 42Z" fill="#4e6b43" stroke="'+INK+'" stroke-width="'+(1.6/k).toFixed(2)+'" stroke-linejoin="round"/>';
  }
  if(branch&&heroTg){
    var heroBox=$('.hero');
    var alignBranch=function(){
      var hr=heroBox.getBoundingClientRect(), s=branch.getBoundingClientRect().width/1000;
      var tr=heroTg.getBoundingClientRect(), rx=tr.left+tr.width*.47-hr.left;
      var left=rx-868*s, edge=innerWidth-hr.left;
      if(left+1120*s<edge) left=edge-1120*s;
      branch.style.right='auto'; branch.style.left=left.toFixed(1)+'px'; branch.style.top=(26*s).toFixed(1)+'px';
    };
    alignBranch(); addEventListener('resize',alignBranch);
    if(doc.fonts&&doc.fonts.ready) doc.fonts.ready.then(alignBranch);
  }

  /* ——— picking: a fruit falls, bounces, rolls away, and turns up in the crate ——— */
  var pile=doc.getElementById('pile'), pickedEl=doc.getElementById('picked'), picked=0;
  var SLOTS=[[46,58,20],[90,58,19],[134,58,21],[316,58,19],[68,25,19],[112,24,20],[331,27,15]];
  if(pile) SLOTS.forEach(function(sl){
    var k=sl[2]/50, gg=doc.createElementNS(NS,'g');
    gg.innerHTML='<g transform="translate('+(sl[0]-60*k).toFixed(1)+' '+(sl[1]-125*k).toFixed(1)+') scale('+k.toFixed(3)+')">'+fruitArt(k)+'</g>';
    pile.appendChild(gg);
  });
  function intoCrate(){
    if(!pile)return;
    var gg=pile.children[picked-1];
    if(gg){ gg.classList.add('in','new'); setTimeout(function(){gg.classList.remove('new')},700); }
    if(pickedEl) pickedEl.textContent=picked>SLOTS.length?'The crate is full. Thank you for your help.':
      (picked===1?'One tangerine picked from the branch this visit. It’s in the crate.':['','','Two','Three','Four','Five','Six','Seven'][picked]+' tangerines picked this visit. They’re in the crate.');
  }
  function pick(gr){
    if(gr.classList.contains('picked'))return;
    var r=gr.querySelector('.body path').getBoundingClientRect();
    gr.classList.add('picked'); picked++;
    speak(tgs[0],['Careful!','My cousin!','Gently.','Oh!'][Math.random()*4|0]);
    if(reduce||!Element.prototype.animate){ intoCrate(); }
    else{
      var f=doc.createElementNS(NS,'svg'), k=r.width/100;
      f.setAttribute('viewBox','8 34 104 94'); f.setAttribute('class','faller'); f.setAttribute('aria-hidden','true');
      f.style.width=r.width*1.04+'px'; f.style.height=r.width*.94+'px';
      f.style.left=r.left+'px'; f.style.top=(r.top-r.width*.04)+'px';
      f.innerHTML=fruitArt(k); doc.body.appendChild(f);
      var floor=innerHeight-r.width*.95-8, dy=Math.max(40,floor-r.top), dir=r.left+r.width/2>innerWidth*.5?-1:1;
      var bounce=Math.min(140,dy*.28), run=innerWidth*1.1, spin=run/(Math.PI*r.width)*360;
      f.animate([
        {transform:'translate(0,0) rotate(0)',easing:'cubic-bezier(.45,0,1,.7)'},
        {transform:'translate('+dir*10+'px,'+dy+'px) rotate('+dir*24+'deg) scale(1.14,.84)',offset:.42,easing:'ease-out'},
        {transform:'translate('+dir*70+'px,'+(dy-bounce)+'px) rotate('+dir*110+'deg)',offset:.56,easing:'ease-in'},
        {transform:'translate('+dir*120+'px,'+dy+'px) rotate('+dir*180+'deg) scale(1.06,.93)',offset:.68,easing:'cubic-bezier(.2,0,.6,1)'},
        {transform:'translate('+dir*run+'px,'+dy+'px) rotate('+dir*(180+spin)+'deg)'}
      ],{duration:2100,fill:'forwards'}).onfinish=function(){ f.remove(); intoCrate(); };
    }
    setTimeout(function(){ gr.classList.remove('picked'); gr.classList.add('regrow'); setTimeout(function(){gr.classList.remove('regrow')},1700); }, 9000);
  }
  if(branch) $$('.fruit',branch).forEach(function(gr){
    gr.addEventListener('click',function(){ if(!holding) pick(gr); });
    gr.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&!holding){ e.preventDefault(); pick(gr); } });
  });

  /* ——— the constellation: Citrus Major, the maker's mark drawn in stars ——— */
  function rng(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  $$('svg.c').forEach(function(cst){
    var C=[50,57], P=[], ang=[-94,-38,12,64,112,160,214];
    ang.forEach(function(a){ var t=a*Math.PI/180; P.push([C[0]+32*Math.cos(t), C[1]+31*Math.sin(t)]); });
    var T=[[34,47],[50,47],[66,47],[50,77]], L=[[66,13],[80,8]];
    var lines=[P.concat([P[0]]), [T[0],T[1],T[2]], [T[1],T[3]], [P[0],L[0],L[1]], [L[1],[68,22],P[0]]];
    var html='<g class="lines">'+lines.map(function(l){ return '<path pathLength="1" d="M'+l.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' L')+'"/>'; }).join('')+'</g><g class="pts">';
    P.concat(T,L).forEach(function(p,i){ var hi=[0,3,7,10].indexOf(i)>-1; html+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(hi?1.7:1.15)+'"'+(hi?' class="hi"':'')+'/>'; });
    cst.innerHTML=html+'</g>';
    var drawn=false;
    if('IntersectionObserver' in window&&!reduce) new IntersectionObserver(function(es){
      if(es[0].isIntersecting&&!drawn){ drawn=true;
        $$('.lines path',cst).forEach(function(p,i){ p.style.strokeDasharray='1'; p.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:1400,delay:300+i*380,easing:'cubic-bezier(.6,0,.3,1)',fill:'backwards'}); });
      }
    },{threshold:.4}).observe(cst);
  });
  /* a sky behind anything marked [data-sky] */
  var skies=$$('[data-sky]');
  function sky(){
    skies.forEach(function(host,j){
      var svg=host.querySelector('svg.stars'); if(!svg)return;
      var w=host.offsetWidth, h=host.offsetHeight, R=rng(1997+j), n=Math.round(w*h/7000), out='';
      svg.setAttribute('viewBox','0 0 '+w+' '+h);
      for(var i=0;i<n;i++){ var x=R()*w, y=R()*(h-(j?0:90)), big=R(); out+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(big>.93?1.5:big>.7?1:.6)+'"'+(R()>.72?' class="tw" style="animation-delay:-'+(R()*4.5).toFixed(2)+'s"':'')+' opacity="'+(.35+R()*.6).toFixed(2)+'"/>'; }
      svg.innerHTML=out;
    });
  }
  if(skies.length){ sky(); var skyT; addEventListener('resize',function(){ clearTimeout(skyT); skyT=setTimeout(sky,150); }); if(doc.fonts&&doc.fonts.ready) doc.fonts.ready.then(sky); }
  var foot=doc.getElementById('foot');
  if(foot){
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ foot.classList.toggle('risen',es[0].isIntersecting); },{threshold:.25}).observe(foot);
    else foot.classList.add('risen');
  }

  /* ——— the slice: ten segments, filled as you read ——— */
  function sliceArt(){
    var h='<circle r="20.5" fill="#ee5a1c" stroke="'+INK+'" stroke-width="1.6"/><circle r="17" fill="#fff4e4"/>';
    for(var i=0;i<10;i++){
      var a0=(i*36-90+3)*Math.PI/180, a1=((i+1)*36-90-3)*Math.PI/180, r0=2.6, r1=15.6;
      var p=function(r,a){return (r*Math.cos(a)).toFixed(2)+' '+(r*Math.sin(a)).toFixed(2)};
      h+='<path class="seg" d="M'+p(r0,a0)+' L'+p(r1,a0)+' A'+r1+' '+r1+' 0 0 1 '+p(r1,a1)+' L'+p(r0,a1)+' Z" stroke="'+INK+'" stroke-width=".9" stroke-linejoin="round"/>';
    }
    return h+'<circle r="1.6" fill="'+INK+'"/>';
  }
  $$('[data-slice-art]').forEach(function(g){ g.innerHTML=sliceArt(); });
  var slice=doc.getElementById('slice');
  if(slice){
    var sg=$('#slice-g'); sg.innerHTML=sliceArt();
    var segs=$$('.seg',sg);
    var read=function(){
      var max=root.scrollHeight-innerHeight, p=max>0?scrollY/max:0, k=Math.round(p*10);
      segs.forEach(function(s,i){ s.classList.toggle('full',i<k); });
      slice.classList.toggle('on',scrollY>innerHeight*.7);
    };
    read(); addEventListener('scroll',read,{passive:true});
  }
  /* the play page's slice fills itself, slowly, and empties again */
  $$('[data-slice-demo]').forEach(function(g){
    var segs=$$('.seg',g), k=0; if(reduce){ segs.slice(0,6).forEach(function(s){s.classList.add('full')}); return; }
    setInterval(function(){ if(doc.hidden)return; k=(k+1)%12; segs.forEach(function(s,i){ s.classList.toggle('full',i<k&&k<11); }); },700);
  });

  $$('[data-year]').forEach(function(el){ el.textContent=new Date().getFullYear(); });
})();
