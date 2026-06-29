/* ===== NIPON26 delight pack =====
   חתולות שופטות (מורגנה ובלטרקיס) · אוכל יפני צף + מנה של היום ·
   "יובו ושירשה" · ראלי חותמות יפני (スタンプラリー).
   קובץ אחד שמזריק את הכל. כל דף צריך רק: <script src="delight.js"></script> */
(function(){
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = `
  .nip-food{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
  .nip-food span{position:absolute;opacity:.07;filter:saturate(.8);animation:nipDrift linear infinite}
  @keyframes nipDrift{0%{transform:translateY(110vh) rotate(0)}100%{transform:translateY(-20vh) rotate(360deg)}}
  .nip-cat{position:fixed;bottom:0;z-index:60;width:74px;cursor:pointer;pointer-events:auto;
    transform:translateY(46px);transition:transform .5s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 -4px 10px rgba(0,0,0,.5))}
  .nip-cat.left{left:14px}.nip-cat.right{right:14px}
  .nip-cat.peek{transform:translateY(8px)}
  .nip-cat:hover{transform:translateY(0)}
  .nip-cat .eye{transition:opacity .15s}
  .nip-cat.blink .eye{opacity:.15}
  .nip-bubble{position:fixed;z-index:61;max-width:230px;background:rgba(20,16,31,.96);color:#f0ebe3;
    border:1px solid rgba(255,140,66,.4);border-radius:14px;padding:10px 13px;font-size:.82rem;line-height:1.5;
    box-shadow:0 10px 30px rgba(0,0,0,.5);opacity:0;transform:translateY(8px);transition:.35s;pointer-events:none;
    font-family:'Segoe UI',Tahoma,sans-serif}
  .nip-bubble.show{opacity:1;transform:none}
  .nip-bubble b{color:#ff9a86}
  .nip-dish{position:fixed;bottom:14px;left:50%;transform:translateX(-50%) translateY(70px);z-index:58;
    background:rgba(20,16,31,.92);border:1px solid rgba(255,140,66,.3);border-radius:99px;color:#f0ebe3;
    padding:8px 16px;font-size:.82rem;backdrop-filter:blur(6px);box-shadow:0 8px 24px rgba(0,0,0,.4);
    transition:.5s;display:flex;align-items:center;gap:8px;font-family:'Segoe UI',Tahoma,sans-serif;max-width:90vw}
  .nip-dish.show{transform:translateX(-50%) translateY(0)}
  .nip-dish .x{cursor:pointer;color:#7d6f86;font-size:1rem;margin-right:2px}
  .nip-stamp{position:fixed;top:64px;left:14px;z-index:57;background:rgba(20,16,31,.9);
    border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:7px 11px;font-size:.74rem;color:#bcaec4;
    backdrop-filter:blur(6px);font-family:'Segoe UI',Tahoma,sans-serif;display:flex;gap:6px;align-items:center}
  .nip-stamp .st{filter:grayscale(1) opacity(.35);transition:.4s;font-size:1rem}
  .nip-stamp .st.on{filter:none;transform:scale(1.12)}
  @media (max-width:520px){.nip-cat{width:58px}.nip-stamp{font-size:.68rem;top:60px}}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  const NICKS=['המסע של יובו ושירשה 🍁','יובו 🐈‍⬛ ושירשה ביפן','יובו ושירשה (ומורגנה ובלטרקיס בקנאה)'];
  const names=document.querySelector('.cine .names');
  if(names){ let i=0; names.textContent=NICKS[0];
    if(!RM) setInterval(()=>{ i=(i+1)%NICKS.length; names.style.opacity=0;
      setTimeout(()=>{names.textContent=NICKS[i];names.style.transition='opacity .5s';names.style.opacity=1;},300);},5000); }
  const ft=document.querySelector('footer');
  if(ft && !/יובו/.test(ft.textContent)) ft.innerHTML += '<br><span style="color:#7d6f86;font-size:.85rem">🐈‍⬛ יובו ושירשה · מורגנה ובלטרקיס שומרות מרחוק 🐈‍⬛</span>';

  if(!RM){
    const FOODS=['🍜','🍣','🍙','🍡','🍢','🐙','🍱','🍵','🍶','🥢','🍤','🧋','🍥','🍠'];
    const fc=document.createElement('div'); fc.className='nip-food';
    for(let i=0;i<14;i++){ const s=document.createElement('span');
      s.textContent=FOODS[i%FOODS.length];
      s.style.left=Math.random()*100+'vw';
      s.style.fontSize=(22+Math.random()*26)+'px';
      s.style.animationDuration=(26+Math.random()*30)+'s';
      s.style.animationDelay=(-Math.random()*40)+'s';
      fc.appendChild(s); }
    document.body.appendChild(fc);
  }

  const DISHES=[
    ['🍜','ראמן — סאפורו/טוקיו'],['🍢','גיוטאן (לשון בקר) — סנדאי'],['🍣','סושי טרי — שוק טויוסו'],
    ['🐙','טאקויאקי — אוסקה'],['🥢','אוקונומייאקי — אוסקה'],['🍡','דנגו — בכל מקום'],
    ['🍵','מאצ\'ה + וגאשי — קיוטו'],['🍱','אקיבן (בנטו רכבת) — בשינקנסן'],['🧆','קושיקאטסו — אוסקה'],
    ['🍤','טמפורה — בכל מקום'],['🍶','סאקה חם — אונסן בערב'],['🍙','אוניגרי — קומביני 24/7'],
    ['🍲','שאבו-שאבו — ערב קר בהרים'],['🍠','בטטה צלויה (yaki-imo) — סתיו']
  ];
  const doy=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);
  const dish=DISHES[doy%DISHES.length];
  const dEl=document.createElement('div'); dEl.className='nip-dish';
  dEl.innerHTML=`<span style="font-size:1.1rem">${dish[0]}</span><span><b style="color:#ff9a86">המנה של היום:</b> ${dish[1]}</span><span class="x">✕</span>`;
  document.body.appendChild(dEl);
  setTimeout(()=>dEl.classList.add('show'),1200);
  dEl.querySelector('.x').onclick=()=>dEl.classList.remove('show');

  const catSVG=c=>`<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 80 C8 60 6 40 14 22 L30 40 L50 34 L70 40 L86 22 C94 40 92 60 82 80 Z" fill="#0a0a0f"/>
    <path d="M14 22 L20 2 L34 24 Z" fill="#0a0a0f"/><path d="M86 22 L80 2 L66 24 Z" fill="#0a0a0f"/>
    <ellipse class="eye" cx="38" cy="44" rx="6" ry="8" fill="${c}"/>
    <ellipse class="eye" cx="62" cy="44" rx="6" ry="8" fill="${c}"/>
    <ellipse cx="38" cy="45" rx="2" ry="6" fill="#0a0a0f"/><ellipse cx="62" cy="45" rx="2" ry="6" fill="#0a0a0f"/></svg>`;
  const QUOTES={
    'מורגנה':['5 לילות אונסן? מפנקים את עצמכם.','עוד קלסר? תפנקו אותנו במקום.','בדקתי את התקציב. לא התרשמתי.','יפן? יש שם חתולים. תביאו אחד.','מאשרת את הסושי. רק את הסושי.','42 לילות בלעדינו. נזכור את זה.'],
    'בלטרקיס':['4–5 ימי הליכה? אני ישנה 16 שעות ביום וזה עובד.','שופטת אתכם בשקט. כרגיל.','מי יאכיל אותנו 42 לילות?','מאשרת את ניוטו אונסן. מים חמים = טוב.','קומאנו מודרך? בזבוז. תשבו בבית איתי.','קיוטו? נחמד. אבל הספה פה.']
  };
  function mkCat(name,side,eyeColor){
    const el=document.createElement('div'); el.className='nip-cat '+side; el.innerHTML=catSVG(eyeColor);
    el.title=name; document.body.appendChild(el);
    setTimeout(()=>el.classList.add('peek'),800+Math.random()*1500);
    if(!RM) setInterval(()=>{ el.classList.add('blink'); setTimeout(()=>el.classList.remove('blink'),160); },2500+Math.random()*3000);
    el.onclick=()=>{ bubble(name,'ניאו! 🐾',side); el.style.transform='translateY(0) scale(1.08)';
      setTimeout(()=>el.style.transform='',300); };
    return el;
  }
  function bubble(name,text,side){
    const b=document.createElement('div'); b.className='nip-bubble';
    b.innerHTML=`<b>${name}:</b> ${text}`;
    b.style.bottom='66px'; b.style[side==='left'?'left':'right']='14px';
    document.body.appendChild(b); requestAnimationFrame(()=>b.classList.add('show'));
    setTimeout(()=>{ b.classList.remove('show'); setTimeout(()=>b.remove(),400); },4200);
  }
  if(!RM){
    mkCat('מורגנה','left','#7ee787');
    mkCat('בלטרקיס','right','#ffd966');
    setTimeout(function loop(){
      const left=Math.random()<.5;
      const name=left?'מורגנה':'בלטרקיס';
      const q=QUOTES[name][Math.floor(Math.random()*QUOTES[name].length)];
      bubble(name,q,left?'left':'right');
      setTimeout(loop,14000+Math.random()*10000);
    },6000);
  } else { mkCat('מורגנה','left','#7ee787'); mkCat('בלטרקיס','right','#ffd966'); }

  const PAGES=[['index','🏯'],['decisions','⛩️'],['itinerary','🗾'],['documents','🍁']];
  const SKEY='nipon26_stamps';
  let got=JSON.parse(localStorage.getItem(SKEY)||'[]');
  const page=(location.pathname.split('/').pop()||'index.html').replace('.html','')||'index';
  if(!got.includes(page)){ got.push(page); localStorage.setItem(SKEY,JSON.stringify(got)); }
  const sb=document.createElement('div'); sb.className='nip-stamp';
  sb.innerHTML='<span>🗾 חותמות:</span>'+PAGES.map(p=>`<span class="st ${got.includes(p[0])?'on':''}">${p[1]}</span>`).join('');
  document.body.appendChild(sb);
  if(got.length>=PAGES.length && !localStorage.getItem('nipon26_stamps_done')){
    localStorage.setItem('nipon26_stamps_done','1');
    setTimeout(()=>bubble('מורגנה','אספתם את כל החותמות! מרשים. עכשיו תאכילו אותנו. 🐾','left'),2000);
  }
})();
