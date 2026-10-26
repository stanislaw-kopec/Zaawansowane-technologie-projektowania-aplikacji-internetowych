const fs=require('node:fs'); const path=require('node:path');
const {chromium}=require('C:/Users/stach/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});const page=await browser.newPage({viewport:{width:1440,height:100},deviceScaleFactor:1});
const root=__dirname;const records=JSON.parse(fs.readFileSync(path.join(root,'records.json'),'utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const manifest=[];
for(const rec of records){
 const clean=rec.text.replace(/\u001b\[[0-9;]*m/g,'');
 // Wrap long SQL lines without removing content; split tall output into readable images.
 const lines=clean.split(/\r?\n/).flatMap(line=>{const a=[];while(line.length>128){a.push(line.slice(0,128));line='  '+line.slice(128);}a.push(line);return a;});
 for(let i=0;i<lines.length;i+=46){const part=lines.slice(i,i+46).join('\n');const id=rec.id+(lines.length>46?'-'+(i/46+1):'');
 const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:28px;background:#f3f5f7;color:#15202b;font:16px Segoe UI}h1{font-size:23px;margin:0 0 8px}p{margin:0 0 18px;color:#52616d}pre{margin:0;padding:22px;background:white;border:1px solid #cbd5df;border-radius:7px;font:16px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>LAB 3 · ${esc(rec.title)}</h1><p>Zapis rzeczywistych wyników poleceń · ${esc(rec.id)}${lines.length>46?' · część '+(i/46+1):''}</p><pre>${esc(part)}</pre>`;
 fs.writeFileSync(path.join(root,id+'.html'),html);await page.setContent(html);await page.screenshot({path:path.join(root,'../screens',id+'.png'),fullPage:true});manifest.push({id:rec.id,image:id+'.png'});
 }
}
fs.writeFileSync(path.join(root,'images.json'),JSON.stringify(manifest,null,2));await browser.close();console.log('Saved '+manifest.length+' screenshots of recorded command output.');
})().catch(e=>{console.error(e);process.exitCode=1});
