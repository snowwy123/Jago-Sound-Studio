// SPDX-License-Identifier: MIT
const CustomSound=(()=>{
 const C=Composer,decoded=new WeakMap(),waveforms=['sine','triangle','square','sawtooth'];
 const curveDefault=()=>[{x:0,y:0},{x:.06,y:1},{x:.65,y:.6},{x:1,y:0}],pitchDefault=()=>[{x:0,y:.5},{x:1,y:.5}];
 function blank(){return {...C.sound('custom','new-sound'),label:'My custom sound',duration:2,space:0,texture:0,ingredients:[]}}
 function ingredient(kind='tone',id=C.id()) {return {id,name:kind==='tone'?'Tone':kind==='noise'?'Noise':kind==='impulse'?'Impact':'Recording',kind,enabled:true,offset:0,duration:1,level:.7,pan:0,frequency:220,wave:'sine',colour:'white',cutoff:12000,filter:'lowpass',drive:0,pitch:0,volumeCurve:curveDefault(),pitchCurve:pitchDefault()}}
 function validate(s){
  const parts=s.ingredients||[];if(!Array.isArray(parts)||parts.length>8)throw Error('Use up to eight sound ingredients.');
  const ids=new Set(),num=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
  for(const l of parts){
   if(!l||!['tone','noise','impulse','sample'].includes(l.kind)||typeof l.id!=='string'||ids.has(l.id))throw Error('Invalid sound ingredient.');ids.add(l.id);
   for(const [k,a,b]of [['offset',0,30],['duration',.01,30],['level',0,1],['pan',-1,1],['frequency',20,16000],['cutoff',20,20000],['drive',0,1],['pitch',-24,24]])if(!num(l[k],a,b))throw Error('Invalid ingredient '+k+'.');
   if(!waveforms.includes(l.wave)||!['white','pink','brown'].includes(l.colour)||!['lowpass','highpass','bandpass'].includes(l.filter))throw Error('Unknown ingredient sound setting.');
   for(const k of ['volumeCurve','pitchCurve']){const points=l[k];if(!Array.isArray(points)||points.length<2||points.length>32||points[0].x!==0||points.at(-1).x!==1)throw Error('Invalid '+k+'.');let prev=-1;for(const p of points){if(!num(p.x,0,1)||!num(p.y,0,1)||p.x<=prev)throw Error('Invalid curve point.');prev=p.x}}
   if(l.kind==='sample'&&(typeof l.data!=='string'||!/^data:audio\/[a-zA-Z0-9.+-]+;base64,/.test(l.data)||l.data.length>8000000||!num(l.trim||0,0,30)))throw Error('Choose an audio recording under 6 MB and 30 seconds.');
  }return s;
 }
 async function prepare(ctx,s){const parts=s.ingredients||[],map=new Map();for(const l of parts.filter(x=>x.kind==='sample'&&x.enabled!==false)){const data=Uint8Array.from(atob(l.data.split(',')[1]),c=>c.charCodeAt(0));map.set(l.id,await ctx.decodeAudioData(data.buffer))}decoded.set(ctx,map)}
 function drawCurve(param,points,start,length,map){param.setValueAtTime(map(points[0].y),start);for(const p of points.slice(1))param.linearRampToValueAtTime(map(p.y),start+p.x*length)}
 function render(ctx,dest,s,time=0,duration=s.duration){
  validate(s);const bus=ctx.createGain();bus.gain.value=.5;bus.connect(dest);
  for(const l of (s.ingredients||[]).filter(x=>x.enabled!==false)){
   const length=Math.min(l.duration,duration-l.offset);if(length<=0)continue;
   const start=time+l.offset,g=ctx.createGain(),pan=ctx.createStereoPanner(),f=ctx.createBiquadFilter(),drive=ctx.createWaveShaper();
   f.type=l.filter;f.frequency.value=Math.min(l.cutoff,ctx.sampleRate*.45);f.Q.value=.5;pan.pan.value=l.pan;
   if(l.drive){const c=new Float32Array(256),d=1+l.drive*8;for(let i=0;i<c.length;i++){const x=i/127.5-1;c[i]=Math.tanh(x*d)/Math.tanh(d)}drive.curve=c}
   g.connect(drive).connect(f).connect(pan).connect(bus);drawCurve(g.gain,l.volumeCurve,start,length,y=>y*l.level);
   let source;
   if(l.kind==='tone'||l.kind==='impulse'){source=ctx.createOscillator();source.type=l.kind==='impulse'?'sine':l.wave;drawCurve(source.frequency,l.pitchCurve,start,length,y=>C.clamp(l.frequency*2**((l.pitch+(y-.5)*48)/12),20,ctx.sampleRate*.45));if(l.kind==='impulse')source.frequency.exponentialRampToValueAtTime(30,start+Math.min(.18,length*.8));}
   else{source=ctx.createBufferSource();if(l.kind==='sample'){source.buffer=decoded.get(ctx)?.get(l.id);if(!source.buffer)continue;drawCurve(source.playbackRate,l.pitchCurve,start,length,y=>2**((l.pitch+(y-.5)*48)/12));}
    else{const b=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),d=b.getChannelData(0),r=C.random(s.seed+'|'+l.id);let last=0;for(let i=0;i<d.length;i++){const white=r()*2-1;last=l.colour==='brown'?(last+.02*white)/1.02:l.colour==='pink'?last*.85+white*.15:white;d[i]=l.colour==='brown'?last*3.5:l.colour==='pink'?last*2:last}source.buffer=b;source.loop=true;}
   }source.connect(g);if(l.kind==='sample'){source.start(start,Math.min(l.trim||0,source.buffer.duration));source.stop(start+length)}else{source.start(start);source.stop(start+length)}
  }
 }
 C.soundTypes.custom={name:'Custom sound',group:'Your sound design',duration:2,loop:false};
 function generate(seed='jago-custom',character='any'){
  seed=String(seed).slice(0,100);const r=C.random(seed),s=blank(),family=character==='any'?['signal','impact','air','rise'][Math.floor(r()*4)]:character;s.seed=seed;s.characterFamily=family;s.label={signal:'Invented signal',impact:'Invented impact',air:'Invented air texture',rise:'Invented rising cue'}[family]||'Invented sound';s.duration=family==='signal'?.4+r()*1.2:family==='impact'?.3+r()*1.7:1+r()*4;
  const count=family==='impact'?3:2+Math.floor(r()*2);for(let i=0;i<count;i++){const kind=family==='signal'?'tone':family==='impact'?(i===0?'impulse':'noise'):family==='air'?'noise':i===0?'tone':'noise',l=ingredient(kind,'invented-'+i);l.name=l.name+' '+(i+1);l.duration=s.duration*(.6+r()*.4);l.frequency=family==='signal'?220*2**Math.floor(r()*4):family==='impact'?60+r()*180:120+r()*600;l.cutoff=family==='impact'?400+r()*3500:1000+r()*12000;l.wave=['sine','triangle','square'][Math.floor(r()*3)];l.colour=['white','pink','brown'][Math.floor(r()*3)];l.pan=(r()-.5)*.6;l.level=.3+r()*.45;l.drive=family==='impact'?r()*.5:0;if(family==='rise')l.pitchCurve=[{x:0,y:.15},{x:.8,y:.85},{x:1,y:.7}];if(family==='air')l.volumeCurve=[{x:0,y:0},{x:.25,y:.5},{x:.7,y:1},{x:1,y:0}];if(family==='impact')l.volumeCurve=[{x:0,y:0},{x:.01,y:1},{x:.2,y:.15},{x:1,y:0}];s.ingredients.push(l)}return validate(s);
 }
 function studies(){
  const make=(label,duration,parts,space=0)=>({...blank(),label,seed:label.toLowerCase().replace(/[^a-z]/g,'-'),duration,space,ingredients:parts.map((part,i)=>({...ingredient(part.kind,'study-'+i),...part}))}),hit=[{x:0,y:0},{x:.01,y:1},{x:.2,y:.18},{x:1,y:0}];
  return [make('Three-note confirmation',1,[660,880,1100].map((frequency,i)=>({kind:'tone',name:'Note '+(i+1),frequency,offset:i*.2,duration:.25,wave:'sine',level:.65})),.08),make('Soft air sweep',1.6,[{kind:'noise',name:'Air',colour:'pink',filter:'bandpass',cutoff:2200,duration:1.6,volumeCurve:[{x:0,y:0},{x:.2,y:.2},{x:.7,y:1},{x:1,y:0}]},{kind:'tone',name:'Low movement',frequency:90,wave:'triangle',offset:.15,duration:1.2,level:.25,pitchCurve:[{x:0,y:.8},{x:1,y:.3}]}]),make('Layered low impact',1,[{kind:'impulse',name:'Body',frequency:160,duration:.5,volumeCurve:hit},{kind:'noise',name:'Texture',colour:'brown',cutoff:1800,duration:.45,volumeCurve:hit},{kind:'noise',name:'Contact',filter:'highpass',cutoff:3000,duration:.08,level:.3,volumeCurve:hit}],.12),make('Glass-like descending signal',2,[{kind:'tone',name:'Bell body',frequency:880,duration:1.8,level:.55,volumeCurve:[{x:0,y:0},{x:.005,y:1},{x:.3,y:.2},{x:1,y:0}],pitchCurve:[{x:0,y:.5},{x:.5,y:.45},{x:1,y:.4}]},{kind:'tone',name:'Overtone',frequency:1760,duration:1.3,level:.2,volumeCurve:hit}],.25)];
 }
 return {blank,ingredient,validate,prepare,render,generate,studies,curveDefault,pitchDefault};
})();
