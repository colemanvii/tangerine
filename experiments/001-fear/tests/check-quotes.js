// Run: node tests/check-quotes.js <experiment dir> <dir of downloaded source texts>...
// Checks every 'quotation' passage (and demo quotations) appears in the downloaded corpus.
const fs=require('fs'),path=require('path');
global.window={};
const dir=path.resolve(process.argv[2]||'.');require(dir+'/sources.js');require(dir+'/demo.js');
const corpusDirs=process.argv.slice(3);
let corpus='';
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory()){if(f!=='.git')walk(p);}else if(/\.(txt|xhtml)$/.test(f))corpus+=' '+fs.readFileSync(p,'utf8');}}
corpusDirs.forEach(walk);
const norm=s=>s.replace(/<a[^>]*noteref[^>]*>[^<]*<\/a>/g,'').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\[[A-Z0-9]\]/g,'').replace(/[‘’`]/g,"'").replace(/[“”]/g,'"').replace(/--|—|–/g,' - ').replace(/[ ⁠​]/g,' ').replace(/\s+/g,' ').toLowerCase();
const C=norm(corpus);
let bad=0,n=0;
const items=[];
window.FEAR.movements.forEach(m=>m.passages.forEach(p=>{if(p.kind!=='quotation')return;const segs=p.verses?p.verses.map(v=>v[1]):p.text.split(/…|\n\n/);items.push([p.id,segs]);}));
window.HAVEN_DEMO.filter(d=>d.kind==='quotation').forEach(d=>items.push([d.id,[d.fields.body]]));
for(const [id,segs] of items){for(let s of segs){s=norm(s).replace(/^[\s"']+|[\s"']+$/g,'').trim();if(s.length<4)continue;n++;if(!C.includes(s)){bad++;console.log('MISSING',id,'::',s);}}}
console.log(n+' segments checked, '+bad+' missing');
