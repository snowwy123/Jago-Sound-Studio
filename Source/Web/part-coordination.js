/* SPDX-License-Identifier: MIT */
// Coordinate generated detail phrases against the actual sounding lead, including pattern repeats.
// This is a generation pass: loading a project or changing an instrument never rewrites notes.
const PartCoordination=(()=>{
 const consonant=new Set([0,3,4,5,7,8,9]),pc=n=>((n%12)+12)%12;
 function occurrences(pat,bars){const result=[];if(!pat)return result;for(let base=0;base<bars*16;base+=pat.bars*16)for(const n of pat.notes){if(n.step>=pat.bars*16||base+n.step>=bars*16)continue;result.push({...n,start:base+n.step,end:Math.min(bars*16,base+pat.bars*16,base+n.step+n.length)});}return result;}
 function apply(input){const p=Composer.clone(input),C=Composer;
  for(const section of p.sections){
   const leads=p.tracks.filter(t=>t.role==='melody'&&!t.audio&&!t.sound&&t.enabled[section.id]!==false).flatMap(t=>occurrences(t.patterns[section.id],section.bars).map(n=>({...n,instrument:t.instrument})));
   if(!leads.length)continue;
   const chords=p.tracks.filter(t=>t.role==='harmony'&&!t.audio&&!t.sound&&t.enabled[section.id]!==false).flatMap(t=>occurrences(t.patterns[section.id],section.bars));
   for(const t of p.tracks){if(t.role!=='texture'||t.locked||t.audio||t.sound||t.enabled[section.id]===false)continue;const pat=t.patterns[section.id];if(!pat)continue;
    const sameFamily=n=>C.voices[n.instrument]?.family===C.voices[t.instrument]?.family;
    const overlap=(n,start,end)=>n.start<end+.4&&n.end+.4>start;
    const safe=(note)=>{for(let base=0;base<section.bars*16;base+=pat.bars*16){const start=base+note.step;if(start>=section.bars*16)continue;const end=Math.min(base+pat.bars*16,section.bars*16,start+note.length),active=leads.filter(n=>overlap(n,start,end));for(const n of active){if(!consonant.has(pc(note.pitch-n.pitch)))return false;if(sameFamily(n)&&Math.abs(note.pitch-n.pitch)<5)return false;}
      const harmony=chords.filter(n=>n.start<=start&&n.end>start);if(active.length&&harmony.length&&!harmony.some(n=>pc(n.pitch)===pc(note.pitch)))return false;
     }return true;};
    pat.notes=pat.notes.flatMap(n=>{
     if(safe(n))return[n];
     // First look for a nearby answer in a gap. Keep the figure within its original bar.
     for(const shift of [.5,1,2,3]){const step=n.step+shift;if(Math.floor(step/16)!==Math.floor(n.step/16)||step>=pat.bars*16)continue;const candidate={...n,step,length:Math.max(.25,Math.min(n.length,16-step%16))};let gap=true;for(let base=0;base<section.bars*16;base+=pat.bars*16){if(base+step>=section.bars*16)continue;if(leads.some(l=>overlap(l,base+step,base+step+candidate.length))){gap=false;break;}}if(gap&&safe(candidate))return[candidate];}
     // Retain the rhythmic figure when possible, but voice it with the lead and harmony.
     const pitches=Array.from({length:73},(_,i)=>i+24).filter(v=>C.scales[p.scale].includes(pc(v-p.key))).sort((a,b)=>Math.abs(a-n.pitch)-Math.abs(b-n.pitch)||a-b);
     for(const pitch of pitches){if(Math.abs(pitch-n.pitch)>12)continue;const candidate={...n,pitch};if(safe(candidate))return[candidate];}
     // A fast passing lead note may need a shorter answer rather than another sustained voice.
     for(const length of [Math.min(1,n.length),.25]){const candidate={...n,length};if(safe(candidate))return[candidate];}
     return[];
    });
   }
  }
  p.coordinateParts=true;return C.validate(p);
 }
 return{apply};
})();
