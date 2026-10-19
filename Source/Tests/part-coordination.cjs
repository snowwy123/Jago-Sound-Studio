// SPDX-License-Identifier: MIT
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const web=path.resolve(__dirname,'../Web'),context=vm.createContext({console,crypto:require('crypto').webcrypto});
for(const f of ['composer.js','generation-bank.js','part-coordination.js'])vm.runInContext(fs.readFileSync(path.join(web,f),'utf8'),context);
const run=s=>vm.runInContext(s,context);run('globalThis.C=Composer;globalThis.P=PartCoordination');const C=context.C,P=context.P;
let cases=0,before=0,after=0,kept=0,total=0;
// Assess actual scheduled overlap in seconds, independently of the generator's pattern logic.
function clashes(p){const events=C.events({...p,human:0}),lead=events.filter(e=>e.role==='melody'),details=events.filter(e=>e.role==='texture');return details.reduce((count,d)=>count+lead.filter(m=>m.time<d.time+d.duration&&m.time+m.duration>d.time&&[1,2,6,10,11].includes(((d.pitch-m.pitch)%12+12)%12)).length,0);}
for(const mood of Object.keys(C.moods))for(const approach of ['original','arrangement','groove','motif'])for(let seed=0;seed<12;seed++){
 const p=run(`GenerationBank.song(${JSON.stringify({mood,approach,seed:'coord-'+seed,length:40,melody:seed%2?'flowing':'natural',details:'sparkling',structure:seed%3?'verse':'waves'})})`);
 // Exercise the worst case of identical timbres, too.
 if(seed%2) p.tracks.find(t=>t.role==='texture').instrument=p.tracks.find(t=>t.role==='melody').instrument;
 const original=JSON.stringify(p),q=P.apply(p);assert.equal(JSON.stringify(p),original,'Does not mutate source');assert.equal(JSON.stringify(P.apply(p)),JSON.stringify(q),'Deterministic');
 assert.equal(clashes(q),0,'No nominal dissonant lead/detail overlaps');before+=clashes(p);after+=clashes(q);for(let i=0;i<p.tracks.length;i++){if(p.tracks[i].role!=='texture')assert.equal(JSON.stringify(q.tracks[i]),JSON.stringify(p.tracks[i]),'Other musical parts unchanged');else{total+=Object.values(p.tracks[i].patterns).reduce((a,x)=>a+x.notes.length,0);kept+=Object.values(q.tracks[i].patterns).reduce((a,x)=>a+x.notes.length,0);}}
 cases++;
}
const p=C.generate({mood:'cosy',seed:'locked'});p.tracks.find(t=>t.role==='texture').locked=true;assert.equal(JSON.stringify(P.apply(p).tracks),JSON.stringify(p.tracks),'Locked details unchanged');
const repeat=C.generate({mood:'cosy',seed:'repeat'}),s=repeat.sections[1],lead=repeat.tracks.find(t=>t.role==='melody'),detail=repeat.tracks.find(t=>t.role==='texture');s.bars=8;lead.patterns[s.id]={bars:3,notes:[{id:'a',step:0,length:15,pitch:60,velocity:.8},{id:'b',step:16,length:15,pitch:62,velocity:.8}]};detail.patterns[s.id]={bars:2,notes:[{id:'d',step:0,length:8,pitch:61,velocity:.5}]};const q=P.apply(repeat);assert.equal(clashes(q),0,'Different pattern lengths coordinate every repeat');
console.log(JSON.stringify({cases,beforeClashes:before,afterClashes:after,retainedDetailNotes:kept,totalDetailNotes:total}));

