// SPDX-License-Identifier: MIT



(()=>{



 const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0].toString(36);



 function song(options={}){return GenerationBank.song(options)}



 const button=document.createElement('button');button.id='completeSong';button.className='primary wide';button.textContent='Create a complete song…';$('generate').before(button);const selective=document.createElement('button');selective.id='selectGenerate';selective.className='wide';selective.textContent='Choose parts to regenerate…';$('generate').after(selective);



button.onclick=()=>{



 const menu=(id,items)=>'<select id="'+id+'">'+Object.entries(items).map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('')+'</select>',lock=(key)=>'<label class="inline song-keep"><input type="checkbox" data-song-lock="'+key+'"> Keep '+({mood:'feeling',pace:'pace',structure:'song shape',palette:'instrument palette',groove:'drum feel',drums:'drum strength',bass:'bass movement',melody:'melody style',harmony:'harmony style',details:'little details'}[key]||key)+' when surprising me</label>';



 dialog('Make a complete song','<p>Choose a feeling and length, then create. Open the deeper choices whenever you want a different musical character. Every section and note stays editable.</p><label>Feeling'+menu('songMood',Object.fromEntries(Object.entries(C.moods).map(([k,v])=>[k,esc(v.name)])))+'</label>'+lock('mood')+'<label>Pace'+menu('songPace',{natural:'Natural for this feeling',slow:'Slower',fast:'Faster'})+'</label>'+lock('pace')+'<label>Approximate seconds<input id="songLength" type="number" min="15" max="180" value="60"></label><label>Playback / ending'+menu('songShape',{song:'Complete song · resolves and ends',loop:'Loop · returns to the opening'})+'</label><label class="inline"><input id="surpriseLength" type="checkbox"> Vary length when surprising me (15–180 seconds)</label><details id="songDepth"><summary>Song shape, instruments and musical parts</summary><label>Song shape'+menu('songStructure',{journey:'Journey · our original recipe',verse:'Verses and returning chorus',dance:'Groove, breakdown and drop',waves:'Gentle unfolding waves',cue:'Short dramatic cue',random:'Let the seed choose'})+'</label>'+lock('structure')+'<label>Instrument palette'+menu('songPalette',{mood:'Match the feeling',acoustic:'Acoustic and warm',electronic:'Electronic and glowing',pixel:'Pixel and crunchy',soft:'Soft and delicate'})+'</label>'+lock('palette')+'<label>Drum feel'+menu('songGroove',{natural:'Match the feeling',straight:'Steady four-beat pulse',halftime:'Half-time · more breathing room',breakbeat:'Breakbeat · chopped and syncopated',offbeat:'Offbeat groove',swing:'Swing · a lilting pulse'})+'</label>'+lock('groove')+'<label>Drum strength<input id="songDrums" type="range" min="0" max="100" value="50"><output id="songDrumsValue">50%</output></label>'+lock('drums')+'<label>Bass movement'+menu('songBass',{natural:'Match the feeling',pulse:'Steady pulse',rolling:'Rolling and rhythmic',melodic:'A little melody of its own'})+'</label>'+lock('bass')+'<label>Melody'+menu('songMelody',{natural:'Our original melodic recipe',sparse:'Simple and spacious',answering:'Call and response',flowing:'Flowing phrases'})+'</label>'+lock('melody')+'<label>Harmony'+menu('songHarmony',{natural:'Match the feeling',open:'Open and spacious',pulsed:'Rhythmic chord pulses',rich:'Richer, layered chords'})+'</label>'+lock('harmony')+'<label>Little details'+menu('songDetails',{natural:'Match the feeling',sparse:'Only a few accents',sparkling:'Small sparkling patterns'})+'</label>'+lock('details')+'<fieldset><legend>Include these musical parts</legend>'+[['melody','Melody'],['harmony','Harmony'],['bass','Foundation / bass'],['texture','Little details'],['rhythm','Rhythm / drums']].map(([v,n])=>'<label class="inline"><input type="checkbox" data-song-role="'+v+'" checked> '+n+'</label>').join('')+'</fieldset></details><label>Seed<div class="seed-row"><input id="songSeed"><button id="shuffleSongSeed">Shuffle seed</button></div></label><p class="hint">Create and Surprise me replace this arrangement. Undo restores it. Ending and included parts stay as chosen. Length stays as chosen unless you turn on Vary length.</p><div class="song-actions"><button id="makeSong" class="primary">Create song</button><button id="surpriseSong">Surprise me</button></div>');



 const depth=document.createElement('label');depth.innerHTML='Phrase development<input id=phraseDevelopment type=range min=0 max=1 step=.05 value=.45><span class=hint>Lower repeats a clear idea; higher changes the second half of eight-bar phrases.</span>';$('songDepth').append(depth);



 const fields={mood:'songMood',pace:'songPace',structure:'songStructure',palette:'songPalette',groove:'songGroove',bass:'songBass',melody:'songMelody',harmony:'songHarmony',details:'songDetails'},saved=project.songRecipe||{};



 for(const [key,id]of Object.entries(fields))if(saved[key])$(id).value=saved[key];$('songMood').value=project.mood;$('songSeed').value=project.seed;$('songLength').value=saved.length||60;$('songShape').value=saved.shape||'song';$('phraseDevelopment').value=saved.development??.45;$('songDrums').value=Math.round((saved.drums??.5)*100);$('songDrumsValue').value=$('songDrums').value+'%';$('songDrums').oninput=()=>$('songDrumsValue').value=$('songDrums').value+'%';const paletteLabel=$('songPalette').closest('label');$('songMood').closest('label').after(paletteLabel);const paletteHint=document.createElement('p');paletteHint.className='hint';paletteHint.textContent='Match the feeling uses its instruments. Other palettes replace those instruments while keeping the musical direction.';paletteLabel.after(paletteHint);const grooveLabel=$('songGroove').closest('label');$('songPace').closest('label').after(grooveLabel);for(const [key,id]of Object.entries({...fields,drums:'songDrums'})){const keep=document.querySelector('[data-song-lock="'+key+'"]')?.closest('label');if(keep)$(id).closest('label').after(keep)}



 for(const e of document.querySelectorAll('[data-song-lock]'))e.checked=!!saved.surpriseLocks?.[e.dataset.songLock];



 if(saved.roles)for(const e of document.querySelectorAll('[data-song-role]'))e.checked=saved.roles.includes(e.dataset.songRole);



 $('shuffleSongSeed').onclick=()=>{$('songSeed').value=seed();if(!document.querySelector('[data-song-lock=structure]').checked)$('songStructure').value='random'};



 const make=(shuffle,forcedPace=null,forcedGroove=null)=>{try{let options={coordinateParts:$('coordinateParts')?.checked!==false,approach:$('songApproach')?.value||'original',contrast:Number($('songContrast')?.value??.65),development:+$('phraseDevelopment').value,surpriseLocks:Object.fromEntries([...document.querySelectorAll('[data-song-lock]')].map(e=>[e.dataset.songLock,e.checked])),...Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,$(id).value])),length:Number($('songLength').value),shape:$('songShape').value,seed:$('songSeed').value.trim()||seed(),drums:Number($('songDrums').value)/100,roles:[...document.querySelectorAll('[data-song-role]:checked')].map(e=>e.dataset.songRole)};



  if(shuffle){options.seed=seed();if($('surpriseLength').checked){const lengths=[15,30,45,60,90,120,150,180];options.length=lengths[Math.floor(C.random(options.seed+'|duration')()*lengths.length)]}const locks=Object.fromEntries([...document.querySelectorAll('[data-song-lock]')].map(e=>[e.dataset.songLock,e.checked]));const requestedPace=options.pace,requestedGroove=options.groove;options=SongRecipes.surprise(options,locks);if(!locks.structure&&options.structure===project.songRecipe?.structure){const choices=Object.keys(SongRecipes.structures).filter(x=>x!==options.structure),r=C.random(options.seed+'|different-shape');options.structure=choices[Math.floor(r()*choices.length)]}if(requestedPace!=='natural')options.pace=requestedPace;if(requestedGroove!=='natural')options.groove=requestedGroove;}



  if(forcedPace)options.pace=forcedPace;if(forcedGroove){options.groove=forcedGroove;if(!options.surpriseLocks.drums)options.drums=Math.max(.6,options.drums);}const next=song(options);change(()=>{project=next;selected=next.tracks[0].id;sectionSelected=next.sections[Math.min(1,next.sections.length-1)].id;selectedNote=null;playPosition=0},{keepPlaying:A.playing,liveArrangement:A.playing});closeDialog();showView('music');status((A.playing?'Song queued · ': '')+(shuffle?'Surprise created':'Song created')+' · '+next.songRecipe.structure+' · '+next.songRecipe.groove+'. The recipe is saved with your project.');



 }catch(e){status(e.message)}};



 $('makeSong').onclick=()=>make(false);$('surpriseSong').onclick=()=>make(true);



};







 selective.onclick=()=>{dialog('Regenerate just what you choose','<p>Keep the arrangement and locked/sound/imported parts. Choose which musical parts get new notes.</p><label>New seed<div class=seed-row><input id=partsSeed value='+esc(project.seed)+'><button id=partsShuffle>Shuffle</button></div></label>'+project.tracks.filter(t=>!t.sound&&!t.audio).map(t=>'<label class=inline><input type=checkbox data-regenerate="'+t.id+'" '+(t.locked?'disabled':'checked')+'> '+esc(t.name)+(t.locked?' · locked':'')+'</label>').join('')+'<button id=applyRegenerate class=primary>Generate selected parts</button>');$('partsShuffle').onclick=()=>$('partsSeed').value=seed();$('applyRegenerate').onclick=()=>{const choices=new Set([...document.querySelectorAll('[data-regenerate]:checked')].map(e=>e.dataset.regenerate)),locks=new Map(project.tracks.map(t=>[t.id,t.locked]));change(()=>{project.seed=$('partsSeed').value.trim()||seed();project.tracks.forEach(t=>t.locked=t.locked||!choices.has(t.id));project=C.generate({},project);project.tracks.forEach(t=>t.locked=locks.get(t.id))},{keepPlaying:A.playing,liveArrangement:A.playing});closeDialog();status('Only your selected unlocked parts were regenerated.')}};



 const repeat=document.createElement('label');repeat.className='inline';repeat.innerHTML='<input id=soundPreviewRepeat type=checkbox > Loop sound preview';$('soundPlay').parentElement.before(repeat);$('soundPreviewRepeat').checked=soundRecipe.loop;$('soundPreviewRepeat').onchange=()=>{const loop=$('soundPreviewRepeat').checked;soundChange(()=>soundRecipe.loop=loop)};



 window.MusicSuite={song};



})();







// Suite 2.1 refinement



// SPDX-License-Identifier: MIT



function applySectionTransition(p,id,kind='fill'){const index=p.sections.findIndex(s=>s.id===id),source=p.sections[index];if(!source||source.bars<2)throw Error('Choose a section with at least two bars.');if(p.sections.length>=12)throw Error('Keep up to 12 sections; remove an unused section first.');const originalBars=source.bars,newSection={id:'transition-'+Date.now().toString(36),name:kind==='breath'?'A little space':'Transition fill',bars:1,energy:source.energy},noteStart=((originalBars-1)%4)*16;source.bars--;p.sections.splice(index+1,0,newSection);for(const t of p.tracks){if(t.sound||t.audio){t.enabled[newSection.id]=false;continue;}const old=t.patterns[source.id];if(!old)continue;const start=((originalBars-1)%old.bars)*16,notes=old.notes.filter(n=>n.step>=start&&n.step<start+16).map((n,i)=>({...n,id:'transition-note-'+i,step:n.step-start,length:Math.min(n.length,16-(n.step-start))}));if(kind==='breath'){for(let i=notes.length-1;i>=0;i--)if(notes[i].step>=8)notes.splice(i,1);}else if(t.role==='rhythm'){for(const [i,step]of [8,10,12,13,14,15].entries())notes.push({id:'fill-'+i,step,pitch:i<2?38:i<4?45:48,length:.5,velocity:.5+i*.07});}t.patterns[newSection.id]={bars:1,notes};t.enabled[newSection.id]=t.enabled[source.id]!==false;}return C.validate(p);}



function transitionWorkshop(){dialog('Shape a section transition','<p>Add a fill or a short breath before the next section. One bar is taken from the chosen section, so the total length stays the same. The new notes remain editable in the piano roll.</p><label>Section<select id="transitionSection">'+project.sections.filter(s=>s.bars>1).map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label><label>Transition<select id="transitionCharacter"><option value="fill">Drum fill</option><option value="breath">A little space</option></select></label><button id="applyTransition" class="primary">Add editable transition</button>');$('applyTransition').onclick=()=>{try{const id=$('transitionSection').value,kind=$('transitionCharacter').value;change(()=>project=applySectionTransition(C.clone(project),id,kind),{keepPlaying:A.playing,liveArrangement:A.playing});closeDialog();status('Transition added as editable notes. Undo restores the previous sections.')}catch(e){status(e.message)}};}



const transitionButton=document.createElement('button');transitionButton.id='shapeTransition';transitionButton.className='wide';transitionButton.textContent='Shape a transition…';transitionButton.onclick=transitionWorkshop;$('selectGenerate').after(transitionButton);window.MusicSuite.transition=applySectionTransition;



