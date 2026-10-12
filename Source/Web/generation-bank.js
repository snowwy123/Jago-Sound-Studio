// SPDX-License-Identifier: MIT

// Each approach augments editable notes; the original recipe remains untouched.

const GenerationBank=(()=>{

 const approaches={original:{name:'Jago original',note:'The familiar Jago recipe, with all its existing choices.'},arrangement:{name:'Arrangement-led',note:'Contrasting sections, gradual entrances, breaks and bigger returns.'},groove:{name:'Groove-led',note:'Bass and drums lead, with syncopation and quieter answering phrases.'},motif:{name:'Motif-led',note:'A recognisable theme develops through replies, variations and returns.'}};

 const originalGenerate=Composer.generate;

 function song(options={}){const choice=options.approach||'original';if(choice==='any'){const keys=Object.keys(approaches),r=Composer.random(String(options.seed||'jago')+'|approach');options={...options,approach:keys[Math.floor(r()*keys.length)]}}const p=apply(SongRecipes.song(options),options);p.songRecipe.approachChoice=choice;return p}

 function apply(p,options={}){

  const approach=approaches[options.approach]?options.approach:'original';

  p.songRecipe=p.songRecipe||{};p.songRecipe.approach=approach;p.songRecipe.engineVersion='jago-bank-1';

  if(approach==='original')return p;

  const C=Composer,r=C.random(p.seed+'|'+approach),amount=C.clamp(Number(options.contrast??.65),0,1),themes=[[0,2,4,2,1,4,3,0],[0,4,3,2,0,1,2,0],[4,2,0,1,2,4,3,0],[0,1,3,4,2,1,2,0]],theme=themes[Math.floor(r()*themes.length)],groove=options.groove||'natural';

  const maxEnergy=Math.max(...p.sections.map(s=>s.energy));if(approach==='motif')for(const t of p.tracks){if(t.locked||t.sound||t.audio)continue;if(t.role==='texture')t.volume=Math.min(t.volume,.24);if(t.role==='harmony')t.volume=Math.min(t.volume,.4)}

  for(const [i,s]of p.sections.entries()){

   const opening=i===0,ending=i===p.sections.length-1&&!p.loop,high=s.energy>=maxEnergy*.9,breath=/break|space|view|verse/i.test(s.name)&&!opening&&!ending;

   for(const t of p.tracks){

    if(t.sound||t.audio||t.locked)continue;

    const pat=t.patterns[s.id];if(!pat)continue;

    if(approach==='arrangement'){

     if(opening&&['texture','rhythm'].includes(t.role))t.enabled[s.id]=false;

     else if(breath&&t.role==='texture')t.enabled[s.id]=false;

     else if(high)t.enabled[s.id]=true;

     if(breath&&t.role==='rhythm')pat.notes=pat.notes.filter(n=>n.pitch===36||n.pitch===38||n.step%8===0);

     for(const n of pat.notes)n.velocity=C.clamp(n.velocity*(opening?1-.25*amount:breath?1-.2*amount:high?1+.18*amount:1),.05,1);

     if(high&&t.role==='harmony'){

      const low=pat.notes.filter(n=>n.pitch<60&&n.length>2).slice(0,20);for(const [j,n]of low.entries())pat.notes.push({...n,id:'bank-open-'+j,pitch:Math.min(96,n.pitch+12),velocity:n.velocity*.55});

     }

     if(t.role==='rhythm'&&!ending&&amount>.2){const last=pat.bars*16-1;for(const [j,step]of [last-6,last-3,last-1].entries())pat.notes.push({id:'bank-fill-'+j,step,pitch:j===0?38:45,length:.4,velocity:.45+amount*.15})}

    }else if(approach==='groove'){

     if(t.role==='rhythm'){

      t.volume=Math.max(t.volume,.8);t.enabled[s.id]=!opening||s.bars<=2;

      const notes=[];for(let bar=0;bar<pat.bars;bar++){

       const b=bar*16,broken=groove==='breakbeat'||groove==='natural'&&p.tempo>=120,figures=[[0,6,8,14],[0,3,10],[0,7,10,14],[0,6,11]],kicks=broken?figures[Math.floor(r()*figures.length)]:[0,8],snares=groove==='halftime'?[8]:[4,12];

       kicks.forEach((x,j)=>notes.push({id:'groove-k-'+bar+'-'+j,step:b+x,pitch:36,length:.65,velocity:.84}));

       snares.forEach((x,j)=>notes.push({id:'groove-s-'+bar+'-'+j,step:b+x,pitch:38,length:.5,velocity:.82}));

       for(let x=0;x<16;x+=2)notes.push({id:'groove-h-'+bar+'-'+x,step:b+x+(groove==='swing'&&x%4===2?.5:0),pitch:42,length:.25,velocity:x%4===0?.5:.3});

       if(broken)notes.push({id:'groove-ghost-'+bar,step:b+(bar%2?11:7),pitch:38,length:.3,velocity:.22+.1*amount});

      }pat.notes=ending?notes.filter(n=>n.step<pat.bars*16-8):notes;

     }else if(t.role==='bass'){

      t.volume=Math.max(t.volume,.72);for(const n of pat.notes){n.length=Math.min(n.length,3.5);if(n.step%16===8)n.step+=1;n.velocity=C.clamp(n.velocity*1.12,.05,1)}

     }else if(t.role==='melody'||t.role==='texture'){pat.notes=pat.notes.filter((n,j)=>j%4!==3);for(const n of pat.notes)n.velocity*=.87;}

    }else if(approach==='motif'&&t.role==='texture'){
      t.enabled[s.id]=!opening&&!ending;
      const answers=[];for(let bar=0;bar<pat.bars;bar++){const source=pat.notes.find(n=>Math.floor(n.step/16)===bar);if(!source)continue;answers.push({...source,id:'motif-answer-'+bar,step:bar*16+14,pitch:C.clamp(source.pitch-12,36,76),length:1.5,velocity:source.velocity*.6})}pat.notes=answers;
    }else if(approach==='motif'&&t.role==='melody'){
      pat.notes=pat.notes.filter(n=>n.step%16<12);if(!ending)for(const n of pat.notes)n.length=Math.min(n.length,12-n.step%16);


     let j=0;const answering=i%2===1&&!high,shift=Math.floor(r()*3)-1;

     for(const n of pat.notes){const bar=Math.floor(n.step/16),chord=C.moods[p.mood].progress[bar%4],d=theme[j++%theme.length]+(answering?shift:0);n.pitch=C.clamp(C.degree(chord+d,p.key,p.scale,high?5:4),24,96);if(answering&&n.step%4===0&&n.step+1+n.length<pat.bars*16)n.step+=1;n.velocity=C.clamp(n.velocity*(j%8===1?1.15:.95),.05,1)}

     if(ending){const last=pat.notes.at(-1);if(last)last.pitch=C.degree(0,p.key,p.scale,4)}

    }

   }

  }

  return C.validate(p);

 }

 // Versions compared here keep their own seeds and settings. Nothing replaces the editor until chosen.

 function alternatives(options,count=3){return Array.from({length:count},(_,i)=>song({...options,seed:String(options.seed||'jago').slice(0,90)+'-idea-'+(i+1)}))}

 function regenerate(options={},previous=null){const p=originalGenerate(options,previous);if(!previous||!previous.songRecipe||!approaches[previous.songRecipe.approach]||previous.songRecipe.approach==='original')return p;p.songRecipe={...previous.songRecipe,seed:p.seed,mood:p.mood};for(const t of p.tracks){if(t.locked||t.sound||t.audio)continue;const prior=previous.tracks.find(x=>x.id===t.id);for(const section of p.sections){const target=prior?.patterns[section.id]?.bars,pat=t.patterns[section.id];if(!target||!pat||target===pat.bars)continue;const source=pat.notes;pat.notes=[];for(let offset=0;offset<target*16;offset+=64)for(const n of source){if(n.step+offset>=target*16)continue;pat.notes.push({...n,id:n.id+'-r'+offset,step:n.step+offset,length:Math.min(n.length,target*16-n.step-offset)})}pat.bars=target}}return apply(p,p.songRecipe)}

 Composer.generate=regenerate;

 return {approaches,song,alternatives,regenerate};

})();

