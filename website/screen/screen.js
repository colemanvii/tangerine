const $ = s => document.querySelector(s);
const feed = 'https://raw.githubusercontent.com/colemanvii/tangerine/main/website/screen/work.json';
let works = [], current = 0, followLatest = true, syncing = false;
const search = $('input'), dialog = $('dialog');
function show(index) {
  if (!works.length) return;
  current = (index + works.length) % works.length;
  const item = works[current];
  $('#notice').hidden = true;
  $('#art').alt = item.description;
  $('#art').src = item.src;
  $('#piece').href = item.src;
  $('#title').textContent = item.title;
  $('#project').textContent = ' / ' + item.project;
  $('time').dateTime = item.date;
  $('time').textContent = new Date(item.date.slice(0,10)+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  $('#count').textContent = (current+1)+' / '+works.length;
}
function results() {
  const ignored = new Set(['the','on','of','a','an','show','me','work','with','in','for','and','that','from']);
  const terms = search.value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(x=>x&&!ignored.has(x));
  const box = $('#matches');
  box.replaceChildren();
  works.forEach((item,i)=>{
    const words = [item.title,item.project,item.description,item.date].join(' ').toLowerCase();
    if (!terms.every(term=>words.includes(term))) return;
    const button = document.createElement('button'), project = document.createElement('small');
    project.textContent = item.project;
    button.append(item.title,project);
    button.onclick = ()=>{followLatest=false;show(i);dialog.close()};
    box.append(button);
  });
  if (!box.children.length) box.textContent = 'No matching work.';
}
async function read(url) {
  const response = await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw Error(response.status);
  return response.json();
}
let local = [], published = [];
function render() {
  const previous = works[current]?.id;
  works = [...new Map([...local,...published].filter(x=>x.id && x.title && x.project && x.description && Number.isFinite(Date.parse(x.date)) && /^(https:\/\/|media\/)/.test(x.src)).map(x=>[x.id,x])).values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  if(works.length) show(followLatest?0:Math.max(0,works.findIndex(x=>x.id===previous)));
  else $('#notice').textContent='The archive is empty.';
  if(dialog.open) results();
}
async function sync(){
  if(syncing) return;
  syncing=true;
  try { const fresh=await read(feed); if(Array.isArray(fresh)){published=fresh;render()} }catch{}finally{syncing=false}
}
function step(n){followLatest=false;show(current+n)}
$('#prev').onclick=()=>step(-1); $('#next').onclick=()=>step(1);
$('#latest').onclick=()=>{followLatest=true;show(0);sync()};
$('#find').onclick=()=>{search.value='';results();dialog.showModal();search.focus()};
$('#close').onclick=()=>dialog.close(); search.oninput=results;
search.onkeydown=e=>{if(e.key==='Enter') $('#matches button')?.click()};
document.addEventListener('keydown',e=>{if(dialog.open||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1);if(e.key==='/'){e.preventDefault();$('#find').click()}});
$('#art').onerror=()=>{$('#notice').hidden=false;$('#notice').textContent='Image unavailable.'};
(async()=>{[local,published]=await Promise.all(['local.json','work.json'].map(url=>read(url).catch(()=>[])));render();sync();setInterval(()=>{if(!document.hidden)sync()},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()})})();
