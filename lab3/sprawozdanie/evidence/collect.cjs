const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const knex = require('knex');
const config = require('../../knexfile');
const root = path.resolve(__dirname, '../..');
const out = __dirname;
const records = [];
function save(id, title, text) { fs.writeFileSync(path.join(out,id+'.txt'),text); records.push({id,title,text}); }
function run(exe,args,options={}) { return new Promise((resolve,reject)=>{
 const p=spawn(exe,args,{cwd:root,env:process.env,...options}); let text='';
 p.stdout.on('data',x=>text+=x); p.stderr.on('data',x=>text+=x); p.on('error',reject);
 p.on('close',code=>resolve({code,text})); if(options.input) p.stdin.end(options.input); else p.stdin.end();
}); }
const schema='lab3_report_'+Date.now();
const url=new URL(config.connection);url.searchParams.set('options',`-c search_path=${schema},public`);
const admin=knex(config), db=knex({...config,connection:url.toString()});
let server,base,sql='';
async function start(){
 sql='';server=spawn(process.execPath,['src/server.js'],{cwd:root,env:{...process.env,DATABASE_URL:url.toString(),PORT:'0',DEBUG:'knex:query',DEBUG_COLORS:'0'}});
 server.stderr.on('data',x=>sql+=x);
 await new Promise((resolve,reject)=>{server.on('error',reject); server.once('exit',c=>reject(Error('API exit '+c)));server.stdout.on('data',x=>{const m=x.toString().match(/http:\/\/localhost:\d+/);if(m){base=m[0];resolve();}});});
}
async function stop(){if(server&&server.exitCode===null&&server.signalCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});}
async function curl(route,body){
 sql='';const args=['-sS','-i'];if(body){const f=path.join(out,'request.json');fs.writeFileSync(f,JSON.stringify(body));args.push('-H','Content-Type: application/json','--data-binary','@'+f);}args.push(base+'/api'+route);
 const res=await run('curl.exe',args);assert.equal(res.code,0);await new Promise(r=>setTimeout(r,80));
 const split=res.text.indexOf('\r\n\r\n')>=0?'\r\n\r\n':'\n\n';const parts=res.text.split(split);const headers=parts.shift();const data=JSON.parse(parts.join(split));
 const status=Number(headers.match(/HTTP\/\S+ (\d+)/)[1]);
 let cmd=`curl.exe -i "${base}/api${route}"`;if(body)cmd+='\nJSON: '+JSON.stringify(body);
 return {status,data,text:cmd+'\n\n'+headers.split(/\r?\n/).filter(x=>/^(HTTP|Content-Type|Location):?/i.test(x)).join('\n')+'\n'+JSON.stringify(data,null,2),sql};
}
async function psql(args,input){return run('docker',['compose','exec','-T','-e',`PGOPTIONS=-c search_path=${schema},public`,'db','psql','-X','-P','pager=off','-U',process.env.POSTGRES_USER,'-d',process.env.POSTGRES_DB,...args],{input});}
(async()=>{try{
 await admin.raw('CREATE SCHEMA ??',[schema]);
 const docker=await run('docker',['compose','ps']); assert.equal(docker.code,0);
 const a=await db.migrate.latest();const b=await db.migrate.rollback(undefined,true);const c=await db.migrate.latest();
 save('01','Docker i odwracalnosc migracji',docker.text+'\nKnex migrate.latest(): '+JSON.stringify(a)+'\nKnex migrate.rollback(all): '+JSON.stringify(b)+'\nKnex migrate.latest(): '+JSON.stringify(c)+'\nSchemat testowy: '+schema);
 save('02','Schemat reservations — psql', (await psql(['-c','\\d reservations'])).text);
 const constraints=await psql([],fs.readFileSync(path.join(root,'sprawozdanie/constraints.sql'),'utf8'));
 save('03','Proby naruszenia ograniczen — psql',constraints.text);
 const seed=require('../../src/db/seeds/01_booking').seed;
 await seed(db);const snapshot=async()=>Promise.all(['buildings','rooms','reservations'].map(t=>db(t).orderBy('id')));const first=await snapshot();await seed(db);assert.deepEqual(await snapshot(),first);
 save('04','Seed uruchomiony dwukrotnie', 'Wywolanie: seed(db), snapshot, seed(db), porownanie deepStrictEqual\nWynik: identyczne dane po obu uruchomieniach.\n'+JSON.stringify(first.map((rows,i)=>({table:['buildings','rooms','reservations'][i],count:rows.length,ids:rows.map(r=>r.id)})),null,2)+'\n'+(await psql(['-c','SELECT id,status,start_time,cancelled_at FROM reservations ORDER BY id;'])).text);
 await start();
 const building=await curl('/buildings',{name:'Budynek SCREEN',address:'ul. Testowa 1'});assert.equal(building.status,201);
 const room=await curl('/rooms',{buildingId:building.data.id,name:'101',capacity:10});assert.equal(room.status,201);
 save('05','Tworzenie budynku i sali',building.text+'\n\n'+room.text);
 const oldPid=server.pid;await stop();await start();
 const persisted=await curl('/rooms/'+room.data.id);assert.deepEqual(persisted.data,room.data);
 save('06','Dane po restarcie procesu API','Proces API przed restartem: '+oldPid+'\nProces API po restarcie: '+server.pid+'\n\n'+persisted.text);
 const missing=await curl('/rooms',{buildingId:999999,name:'101',capacity:10});assert.equal(missing.status,404);
 const duplicate=await curl('/rooms',{buildingId:building.data.id,name:'101',capacity:10});assert.equal(duplicate.status,409);
 save('07','Obsluzone bledy: 404 i 409',missing.text+'\n\n'+duplicate.text);
 const detail=await curl('/reservations/1');const rd=await curl('/rooms/1');save('08','Relacje: rezerwacja, sala i budynek',rd.text+'\n\n'+detail.text);
 const empty=await curl('/buildings',{name:'Pusty budynek',address:'Test'});
 const bl=await curl('/buildings');const er=await curl('/buildings/'+empty.data.id+'/rooms');const mr=await curl('/buildings/999999/rooms');
 save('09','Licznik sal i budynek bez sal',bl.text+'\n\n'+er.text+'\n\n'+mr.text);
 save('10','Sale budynku',(await curl('/buildings/1/rooms')).text);
 const five=await curl('/reservations');assert.equal(five.data.meta.total,5);
 const added=await db('reservations').insert(Array.from({length:15},(_,i)=>({room_id:1,reserved_by:'N+1 test',participants:1,start_time:new Date(Date.UTC(2035,0,i+1,10)),end_time:new Date(Date.UTC(2035,0,i+1,11)),status:'CONFIRMED'}))).returning('id');
 const twenty=await curl('/reservations');assert.equal(twenty.data.meta.total,20);
 save('11','DEBUG=knex:query — 5 i 20 rezerwacji','GET /api/reservations — 5 rekordow\n'+JSON.stringify(five.data.meta)+'\n'+five.sql+'\nGET /api/reservations — 20 rekordow\n'+JSON.stringify(twenty.data.meta)+'\n'+twenty.sql);
 const params=['buildingId=1&status=CONFIRMED&page=2&limit=2&sort=startTime','roomId=2&status=CANCELLED&sort=-createdAt','from=2026-11-10T10:15:00Z&to=2026-11-10T10:30:00Z&sort=-participants&limit=2','buildingId=2&sort=-startTime&page=99&limit=1'];
 for(let i=0;i<params.length;i++){const res=await curl('/reservations?'+params[i]);assert.equal(res.status,200);save('12'+String.fromCharCode(97+i),'Filtry i paginacja — przyklad '+(i+1),res.text+'\n\nDEBUG=knex:query\n'+res.sql);}
 const bad=await curl('/reservations?sort=invalid');const dates=await curl('/reservations?from=2026-11-10T11:00:00Z&to=2026-11-10T10:00:00Z');assert.equal(bad.status,400);assert.equal(dates.status,400);save('13','Walidacja parametrow — 400',bad.text+'\n\n'+dates.text);
 await stop();
 const race=await run(process.execPath,['--test','tests/concurrency.integration.test.js'],{env:{...process.env,RUN_DB_TESTS:'1'}});assert.equal(race.code,0);fs.writeFileSync(path.join(out,'race-full.txt'),race.text);
 const labels=['BEFORE FIX','TRANSACTION + ROOM LOCK + CONSTRAINT','DATABASE CONSTRAINT ONLY'];
 for(let i=0;i<labels.length;i++){const start=race.text.indexOf(labels[i]);const end=i<2?race.text.indexOf(labels[i+1]):race.text.length;save('14'+String.fromCharCode(97+i),labels[i],race.text.slice(start,end));}
 const diff=await run('git',['diff','c0b89df','ab3c488','--','src/modules/rooms/rooms.service.js','src/modules/reservations/reservations.service.js']);fs.writeFileSync(path.join(out,'service-task2.diff'),diff.text);
 fs.writeFileSync(path.join(out,'records.json'),JSON.stringify(records,null,2));
 console.log('Collected '+records.length+' evidence groups; API responses, SQL and concurrency verified.');
}finally{await stop();await db.destroy();await admin.raw('DROP SCHEMA IF EXISTS ?? CASCADE',[schema]);await admin.destroy();}})().catch(e=>{console.error(e);process.exitCode=1});
