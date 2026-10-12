// SPDX-License-Identifier: MIT

// Original synthesis; no bundled third-party recordings or model service.

const MusicAudio=(()=>{

 const crunchCurve=Float32Array.from({length:4096},(_,i)=>Math.round((i/4095*2-1)*15)/15);

 const C=Composer,T=Math.PI*2,noiseCache=new WeakMap(),impulseCache=new WeakMap(),waveCache=new WeakMap(),decodeCache=new Map(),soundCache=new Map();let previewNode=null,previewGain=null,previewStart=0,previewVersion=0,previewRunning=false,previewRepeat=true;let live=null,voiceNodes=new Map(),interval=0,raf=0,start=0,position=0,playing=false,cycle=0,next=0,liveEvents=[],playingProject=null,pending=null,liveGraph=null,updateVersion=0;const context=()=>new(window.AudioContext||window.webkitAudioContext)();

 function noise(ctx,seed='jago'){let m=noiseCache.get(ctx);if(!m){m=new Map;noiseCache.set(ctx,m)}if(m.has(seed))return m.get(seed);const b=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),d=b.getChannelData(0),r=C.random(seed);for(let i=0;i<d.length;i++)d[i]=r()*2-1;m.set(seed,b);return b}

 function envelope(ctx,dest,time,hold,level,attack=.01,decay=.3,sustain=.35,release=.2){const g=ctx.createGain();g.connect(dest);const peak=time+attack,fall=peak+Math.min(decay,Math.max(.01,hold-attack));g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(level,peak);g.gain.exponentialRampToValueAtTime(Math.max(.00001,level*sustain),fall);const end=Math.max(fall,time+hold);g.gain.setValueAtTime(Math.max(.00001,level*sustain),end);g.gain.exponentialRampToValueAtTime(.00001,end+release);g.gain.setValueAtTime(0,end+release+.005);return{node:g,stop:end+release+.02}}

 function oscillator(ctx,dest,type,freq,start,end,level=1,detune=0){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);o.detune.value=detune;g.gain.value=level;o.connect(g).connect(dest);o.start(start);o.stop(end);return o}

 function harmonic(ctx,dest,freq,start,end,coeff){let m=waveCache.get(ctx);if(!m){m=new Map;waveCache.set(ctx,m)}const key=coeff.join(',');if(!m.has(key))m.set(key,ctx.createPeriodicWave(new Float32Array(coeff.length+1),Float32Array.from([0,...coeff])));const o=ctx.createOscillator();o.setPeriodicWave(m.get(key));o.frequency.value=freq;o.connect(dest);o.start(start);o.stop(end)}

 function burst(ctx,dest,time,length,level,cut=2000,high=false,seed='burst'){const e=envelope(ctx,dest,time,length*.15,level,.002,.02,.2,length*.85),f=ctx.createBiquadFilter(),n=ctx.createBufferSource();f.type=high?'highpass':'lowpass';f.frequency.value=cut;n.buffer=noise(ctx,seed);n.loop=true;n.connect(f).connect(e.node);n.start(time);n.stop(e.stop)}

 function note(ctx,dest,instrument,pitch,time,duration,velocity=.7){if(instrument==='crunch'){const quant=ctx.createWaveShaper(),curve=crunchCurve;quant.curve=curve;quant.connect(dest);dest=quant;instrument='chip'}else if(instrument==='lofi'){const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2300;filter.Q.value=.3;filter.connect(dest);dest=filter;instrument='epiano'}const f=440*2**((pitch-69)/12),v=velocity*.25;

 if(instrument==='drums'){const drumGain=ctx.createGain();drumGain.gain.value=1.8;drumGain.connect(dest);dest=drumGain;if(pitch===36){const e=envelope(ctx,dest,time,.05,v*2,.003,.025,.3,.28),o=oscillator(ctx,e.node,'sine',145,time,e.stop);o.frequency.exponentialRampToValueAtTime(42,time+.19);burst(ctx,e.node,time,.015,.08,4000)}else if(pitch===38){burst(ctx,dest,time,.19,v*1.3,1800,true,'snare');const e=envelope(ctx,dest,time,.025,v*.4,.001,.01,.2,.1);oscillator(ctx,e.node,'triangle',180,time,e.stop)}else if(pitch===49){burst(ctx,dest,time,1.2,v*.8,6500,true,'cymbal');burst(ctx,dest,time,.2,v*.3,2300,true,'cymbal-body')}else if(pitch===45){const e=envelope(ctx,dest,time,.03,v,.002,.025,.3,.25),o=oscillator(ctx,e.node,'sine',170,time,e.stop);o.frequency.exponentialRampToValueAtTime(85,time+.15)}else burst(ctx,dest,time,.06,v*.6,6500,true,'hat');return}

 const sustain=['strings','pad','choir','organ','bass','sub','synth','chip','flute'].includes(instrument),attack=['strings','pad','choir'].includes(instrument)?.18:instrument==='flute'?.055:.006,release=sustain?.3:['bell','musicbox','harp'].includes(instrument)?1.2:.45,hold=Math.max(.04,duration),e=envelope(ctx,dest,time,hold,v,attack,.35,sustain?.65:.12,release);

 if(['felt','piano','pluck','harp','marimba'].includes(instrument)){const coeff=instrument==='felt'?[1,.22,.12,.05,.015]:instrument==='piano'?[1,.4,.18,.11,.06,.025]:instrument==='marimba'?[1,0,.06,0,.015]:instrument==='harp'?[1,.32,.18,.12,.05]:[1,.45,.2,.08,.03];harmonic(ctx,e.node,f,time,e.stop,coeff);const click=envelope(ctx,e.node,time,.012,.15,.001,.012,.02,.02);burst(ctx,click.node,time,.035,.1,1500,false,'finger')}

 else if(instrument==='bell'||instrument==='musicbox'){for(const [ratio,level]of [[1,1],[2.76,.24],[5.4,.075]]){const g=ctx.createGain();g.gain.setValueAtTime(level,time);g.gain.exponentialRampToValueAtTime(.001,e.stop);g.connect(e.node);oscillator(ctx,g,'sine',f*ratio,time,e.stop)}}

 else if(instrument==='epiano'){const carrier=ctx.createOscillator(),mod=ctx.createOscillator(),mg=ctx.createGain();carrier.frequency.value=f;mod.frequency.value=f*2;mg.gain.setValueAtTime(f*.75,time);mg.gain.exponentialRampToValueAtTime(f*.03,time+hold+.1);mod.connect(mg).connect(carrier.frequency);carrier.connect(e.node);carrier.start(time);mod.start(time);carrier.stop(e.stop);mod.stop(e.stop)}

 else if(instrument==='flute'){harmonic(ctx,e.node,f,time,e.stop,[1,.04,.16,.015]);burst(ctx,e.node,time,Math.min(hold,.5),.025,2000,true,'breath')}

 else if(instrument==='bass'||instrument==='sub'){oscillator(ctx,e.node,instrument==='sub'?'sine':'triangle',f,time,e.stop);if(instrument==='bass')oscillator(ctx,e.node,'sine',f/2,time,e.stop,.28)}

 else if(instrument==='organ')harmonic(ctx,e.node,f,time,e.stop,[1,.55,.12,.15,.03]);

 else if(instrument==='chip')oscillator(ctx,e.node,'square',f,time,e.stop,.55);

 else if(instrument==='choir'){const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=800;filter.Q.value=1.3;filter.connect(e.node);oscillator(ctx,filter,'sawtooth',f,time,e.stop,.7,-4);oscillator(ctx,filter,'sawtooth',f,time,e.stop,.7,4);oscillator(ctx,e.node,'sine',f,time,e.stop,.5)}

 else{oscillator(ctx,e.node,instrument==='synth'?'triangle':'sawtooth',f,time,e.stop,.55,-5);oscillator(ctx,e.node,instrument==='synth'?'sine':'sawtooth',f,time,e.stop,.55,5);if(instrument==='pad')oscillator(ctx,e.node,'sine',f/2,time,e.stop,.25)} }

 function impulse(ctx,amount){let cache=impulseCache.get(ctx);if(!cache){cache=new Map;impulseCache.set(ctx,cache)}const key=amount.toFixed(4);if(cache.has(key))return cache.get(key);const length=Math.floor(ctx.sampleRate*(.35+amount*2)),b=ctx.createBuffer(2,length,ctx.sampleRate),r=C.random('jago-room');for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<length;i++){const t=i/length;d[i]=(r()*2-1)*(1-t)**(2.5+amount)*.45}}if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,b);return b}

 function graph(ctx,p,{only=null,origin=0}={}){const master=ctx.createGain(),comp=ctx.createDynamicsCompressor();master.gain.value=p.master;const fade=ctx.createGain();master.connect(fade).connect(comp).connect(ctx.destination);if(!p.loop){const now=ctx.currentTime,fi=p.fadeIn||0,fo=p.fadeOut||0,end=origin+C.seconds(p),phase=Math.max(0,now-origin);fade.gain.setValueAtTime(fi?Math.min(1,phase/fi):1,now);if(fi&&origin+fi>now)fade.gain.linearRampToValueAtTime(1,origin+fi);if(fo){const fadeAt=Math.max(now,origin+C.seconds(p)-fo);fade.gain.setValueAtTime(Math.max(0,Math.min(1,(end-fadeAt)/fo)),fadeAt);fade.gain.linearRampToValueAtTime(0,Math.max(now+.001,end))}}comp.threshold.value=-14;comp.knee.value=12;comp.ratio.value=3;comp.attack.value=.008;comp.release.value=.18;const reverb=ctx.createConvolver();reverb.buffer=impulse(ctx,p.room);const wet=ctx.createGain();wet.gain.value=.4;reverb.connect(wet).connect(master);const result=new Map;for(const t of p.tracks){const gain=ctx.createGain(),pan=ctx.createStereoPanner(),filter=ctx.createBiquadFilter(),send=ctx.createGain();gain.gain.value=t.volume;pan.pan.value=t.pan;filter.type='lowpass';filter.frequency.value=800+Math.pow(t.brightness,2)*11000;filter.Q.value=.2;filter.connect(gain).connect(pan).connect(master);send.gain.value=t.space*p.room;pan.connect(send).connect(reverb);result.set(t.id,{input:filter,gain,pan,send,filter})}return{tracks:result,master,dispose(){for(const chain of result.values())for(const node of Object.values(chain))try{node.disconnect()}catch{}for(const node of [master,fade,comp,reverb,wet])try{node.disconnect()}catch{}}}}

 function sound(ctx,dest,s,time=0,duration=s.duration){C.validateSound(s);if(s.type==='custom'){CustomSound.render(ctx,dest,s,time,duration);return}if(s.layers?.length){const mix=ctx.createGain();mix.gain.value=.65;mix.connect(dest);for(const ingredient of s.layers)sound(ctx,mix,{...ingredient,duration,volume:ingredient.volume*s.volume,seed:s.seed+'|'+ingredient.seed},time,duration)}const r=C.random(s.seed),end=time+duration,main=ctx.createGain();const mainLevel=s.volume*.7*(.6+s.size*.8);main.gain.value=mainLevel;const colour=ctx.createBiquadFilter();colour.type='lowpass';colour.frequency.value=450+Math.pow(s.tone,.7)*15000*(1-(s.distance||0)*.7);colour.Q.value=.2;const rough=ctx.createWaveShaper(),curve=new Float32Array(256),drive=1+s.texture*3;for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.tanh(x*drive)/Math.tanh(drive)}rough.curve=curve;rough.oversample='2x';main.connect(rough).connect(colour).connect(dest);const level=.24+.3*s.size,freq=80+s.tone*1600,rate=.3+s.rate*2.7;

 const tone=(at,f,len,amp=.2,type='sine',target)=>{const e=envelope(ctx,main,at,Math.min(len*.35,.15),amp,.005,.035,.25,len*.65);const o=oscillator(ctx,e.node,type,f,at,e.stop);if(target)o.frequency.exponentialRampToValueAtTime(Math.max(20,target),at+Math.max(.02,len*.8));return o},air=(at,len,amp,cut=1000,high=false)=>{const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noise(ctx,'sfx-'+s.seed);n.loop=true;f.type=high?'highpass':'lowpass';f.frequency.value=cut;f.Q.value=.4;const attack=Math.min(.004,len*.15);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(amp,at+attack);g.gain.exponentialRampToValueAtTime(.00001,at+Math.max(attack+.001,len));n.connect(f).connect(g).connect(main);n.start(at,r()*.8);n.stop(at+len+.003)};

 const sweep=(at,len,amp,blade=false)=>{const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noise(ctx,s.seed+'sweep');n.loop=true;f.type='bandpass';f.Q.value=blade?1.1:.5;f.frequency.setValueAtTime(blade?2200:240,at);f.frequency.exponentialRampToValueAtTime(blade?7800:4200,at+len*.55);f.frequency.exponentialRampToValueAtTime(blade?1100:380,at+len);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(amp*.12,at+len*.15);g.gain.exponentialRampToValueAtTime(amp,at+len*.55);g.gain.exponentialRampToValueAtTime(.0001,at+len);n.connect(f).connect(g).connect(main);n.start(at);n.stop(at+len+.02)};

 if(s.type==='rain'){const intensity=.12+s.rate*.88;for(const [kind,cut,amp]of [['lowpass',450+s.tone*1300+s.size*600,.055+intensity*.1],['bandpass',1500+s.tone*2600+s.size*1800,.018+intensity*.095]]){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noise(ctx,s.seed+kind);n.loop=true;f.type=kind;f.frequency.value=cut;f.Q.value=.35;g.gain.value=amp;n.connect(f).connect(g).connect(main);n.start(time);n.stop(end)}for(let at=time+.03;at<end-.08;at+=.035+r()*(.42-intensity*.3)){const amp=(.008+r()*.065)*(.3+intensity);air(at,.006+r()*.02,amp,1100+r()*(1700+intensity*3500),true)}}

 else if(s.type==='fire'){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noise(ctx,s.seed+'ember-bed');n.loop=true;f.type='lowpass';f.frequency.value=180+s.size*650;g.gain.value=.002+s.size*s.size*.065;n.connect(f).connect(g).connect(main);n.start(time);n.stop(end);for(let at=time+.02;at<end-.14;at+=.035+r()*(.65-s.rate*.53)){const length=.002+r()*(.009+s.texture*.024),amp=(.03+r()*.12)*(r()>.93?2:1),cut=2500+s.tone*2200+r()*2400;air(at,length,amp,cut,true);if(s.size>.4&&r()<s.texture*.65){tone(at,100+r()*260,.045+r()*.08,amp*.32,'triangle',55);air(at+.012,.018+s.size*.035,amp*.35,1100,true)}}}
 else if(s.type==='space'){const base=38+s.tone*48;for(const [ratio,amp]of [[1,.16],[1.497,.06],[2.003,.04],[3.01,.014]]){const o=ctx.createOscillator(),g=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();o.type='sine';o.frequency.value=base*ratio;g.gain.value=amp;l.frequency.value=.025+s.rate*.08+ratio*.005;lg.gain.value=base*.004*(1+s.texture*3);l.connect(lg).connect(o.frequency);o.connect(g).connect(main);o.start(time);l.start(time);o.stop(end);l.stop(end)}air(time,duration,.015,950+s.tone*1800)}

 else if(s.type==='engine'){const base=35+s.rate*65+s.tone*18;for(const [ratio,amp]of [[1,.17],[2,.09],[3,.045],[6,.018]])oscillator(ctx,main,ratio===1?'triangle':'sine',base*ratio,time,end,amp);const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();n.buffer=noise(ctx,s.seed+'mechanism');n.loop=true;f.type='bandpass';f.frequency.value=450+s.tone*1000;f.Q.value=.7;g.gain.value=.065+s.texture*.08;l.frequency.value=8+s.rate*26;lg.gain.value=.045;l.connect(lg).connect(g.gain);n.connect(f).connect(g).connect(main);n.start(time);l.start(time);n.stop(end);l.stop(end)}

 else if(['wind','ocean','electric'].includes(s.type)){const n=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();n.buffer=noise(ctx,s.seed);n.loop=true;filter.type=s.type==='rain'?'highpass':'lowpass';filter.frequency.value=s.type==='rain'?1500+s.tone*3000:s.type==='wind'?250+s.tone*700:s.type==='ocean'?700+s.tone*1400:s.type==='fire'?1000:s.type==='electric'?freq:220;filter.Q.value=.3;gain.gain.value=s.type==='rain'?.19:s.type==='fire'?.07:.18;n.connect(filter).connect(gain).connect(main);n.start(time);n.stop(end);const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=s.type==='ocean'?.06+s.rate*.14:s.type==='wind'?.08+s.rate*.35:.2+s.rate*.5;lg.gain.value=.06;gain.gain.value=.1;lfo.connect(lg).connect(gain.gain);lfo.start(time);lfo.stop(end);if(s.type==='space'||s.type==='engine'){for(const [f,a]of [[48+s.tone*35,.14],[97+s.tone*50,.04],[143,.02]])oscillator(ctx,main,'sine',f,time,end,a)}if(s.type==='fire'||s.type==='electric')for(let at=time;at<end-.1;at+=.08+r()*.35/rate)air(at,.015+r()*.05,.05+r()*.12,1500+r()*2000);if(s.type==='rain')for(let at=time;at<end-.15;at+=.1+r()*.3/rate)tone(at,700+r()*1800,.06,.02)}

 else if(s.type==='birds'||s.type==='drip'){for(let at=time+.1;at<end-.35;at+=.25+r()*1.1/rate){if(s.type==='birds'){tone(at,1200+s.tone*1800+r()*800,.16,.075,'sine',2300+r()*800);if(r()>.3)tone(at+.19,1800+r()*1500,.12,.055,'sine',1500)}else tone(at,500+r()*1400,.28,.11)}}

 else if(s.type==='footsteps'){const surface=s.surface||'stone',desired=.78-s.rate*.43,count=s.loop?Math.max(2,Math.round(duration/desired/2)*2):Math.ceil(duration/desired),spacing=s.loop?duration/count:desired,variation=s.variation??.35,weight=surface==='grass'?.7:1;for(let i=0;i<count;i++){const at=time+spacing*.25+i*spacing+(i?r()-.5:0)*spacing*.08*variation;if(at>end-.14)break;const amp=level*weight*(1+(r()-.5)*.5*variation);tone(at,55+s.size*24+(r()-.5)*10*variation,.055,amp*.22,'sine',38);if(surface==='grass'){air(at,.018,amp*.4,700);for(let k=0;k<5;k++)air(at+.012+k*.011+r()*.008,.012+r()*.014,amp*(.06+r()*.1),1400+r()*1300)}else if(surface==='gravel'){air(at,.025,amp*.35,900);for(let k=0;k<9;k++)air(at+.005+r()*.09,.002+r()*.005,amp*(.12+r()*.22),2200+r()*3600,true)}else{air(at,.028,amp*.8,surface==='metal'?4200:2000);air(at+.045,.06,amp*.3,1250)}if(surface==='wood'){tone(at,125+r()*25,.12,amp*.35);tone(at,235,.08,amp*.12)}if(surface==='metal')for(const ratio of [1,2.71,4.3])tone(at,240*ratio,.16,amp*.1);if(surface==='stone')air(at+.018,.045,amp*.22,3800,true)}}

 else if(s.type==='heartbeat'){const desired=1.25-s.rate*.65,count=s.loop?Math.max(1,Math.round(duration/desired)):Math.ceil(duration/desired),spacing=s.loop?duration/count:desired;for(let i=0;i<count;i++){const at=time+i*spacing;if(at+.35>end)continue;tone(at,65,.18,level);tone(at+Math.min(.22,spacing*.28),54,.13,level*.65)}}

 else if(s.type==='door'){const action=s.action||'both',metal=s.surface==='metal',open=action!=='close',close=action!=='open';if(open){air(time+.015,.025,.12,3200);tone(time+.02,metal?420:180,.05,.08,'triangle');const n=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),len=duration*(action==='both'?.55:.78);n.type='sawtooth';n.frequency.setValueAtTime(metal?85:55,time+.05);n.frequency.linearRampToValueAtTime(metal?130:92,time+len*.55);n.frequency.linearRampToValueAtTime(40,time+len);f.type='bandpass';f.frequency.value=metal?1500:750;f.Q.value=1.8;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(.018+s.texture*.045,time+.12);g.gain.linearRampToValueAtTime(.008,time+len);n.connect(f).connect(g).connect(main);n.start(time+.04);n.stop(time+len+.03);for(let at=time+.08;at<time+len;at+=.055+r()*.12){air(at,.035+r()*.06,.04+s.texture*.055,metal?2100:650);if(r()>.6)tone(at,metal?330+r()*160:130+r()*100,.045,.008+s.texture*.02,'triangle')}air(time+.07,len,.01,450);tone(time+.03,metal?760:340,.065,.055,'triangle',140);air(time+Math.min(len,duration*.65),.025,.065,1900,true)}if(close){

 const slam=s.size>=.75,at=time+(action==='both'?duration*.72:Math.min(.16,duration*.2)),len=Math.min(duration*.65,slam?.5:.23),force=slam?1:.48;

 air(at,.007,level*(slam?1.5:.5),metal?4200:2500,true);

 for(const [frequency,amp,decay]of metal?[[95,.9,.4],[237,.4,.3],[613,.13,.18]]:[[82,.9,.18],[163,.33,.12],[327,.10,.08]]){

  const g=ctx.createGain(),o=ctx.createOscillator();o.type='sine';o.frequency.value=frequency*(.9+s.tone*.2);

  g.gain.setValueAtTime(level*amp*force,at);g.gain.exponentialRampToValueAtTime(.00001,at+Math.min(len,decay*(slam?1.9:.7)));

  o.connect(g).connect(main);o.start(at);o.stop(at+len+.01);

 }

 air(at+.014,slam?.16:.055,level*(slam?.35:.09),metal?1800:800);

 if(slam){air(at+.075,.016,level*.18,1400,true);air(at+.13,.024,level*.10,600,true)}

 else {air(at+.065,.005,level*.35,3500,true);tone(at+.067,metal?1800:1150,.015,level*.11,'triangle',700)}

}}



 else if(s.type==='laser'){tone(time,300+s.tone*2200,duration,level,'sawtooth',45+s.size*100);air(time,.04,.08,4000,true)}

 else if(s.type==='explosion'){air(time,.045,level*.9,2400,true);tone(time,75+s.size*25,Math.min(duration,.45),level*1.5,'sine',24);for(const [cut,amp,len] of [[150,1.1,.95],[640,.85,.65],[3100,.45,.22]])air(time+.008,duration*len,level*amp,cut);for(let at=time+.12;at<end-.08;at+=.1+r()*.22)air(at,.05+r()*.12,level*.35*(1-(at-time)/duration),800+r()*1900)}

 else if(s.type==='impact'){tone(time,90+s.tone*80,duration*.6,level*1.4,'sine',28);air(time,duration,level,1800)}

 else if(s.type==='whoosh'||s.type==='sword'||s.type==='teleport'){sweep(time,Math.max(.08,duration*.92),level,s.type==='sword');if(s.type==='sword')air(time+duration*.55,.018,level*.16,8000,true);if(s.type==='teleport')tone(time,100,duration,.2,'triangle',800+s.tone*1400)}

 else if(s.type==='clang'||s.type==='shield'){air(time,.012,level,6500,true);air(time+.007,.045,level*.18,3300,true);const base=(s.type==='shield'?310:860)*(.75+s.tone*.65);for(const [ratio,amp,decay]of [[1,.3,.9],[1.83,.25,.7],[2.76,.16,.48],[4.13,.12,.3],[5.37,.07,.15],[7.91,.04,.09]]){const g=ctx.createGain(),f=base*ratio*(.995+r()*.01),len=Math.min(duration,.06+decay*(.4+(s.resonance??.5))*1.3);g.gain.setValueAtTime(level*amp,time+.002);g.gain.exponentialRampToValueAtTime(.00001,time+len);g.connect(main);oscillator(ctx,g,'sine',f,time,time+len+.005)}air(time+.018,.018,level*.4,5300,true);if(s.type==='shield')tone(time,85,.2,level*.5,'sine',45)}

 else if(s.type==='crowd'){

 for(let voice=0;voice<14;voice++){

  const breath=ctx.createBufferSource(),phrase=ctx.createGain(),low=ctx.createBiquadFilter();

  breath.buffer=noise(ctx,s.seed+'gathering-'+voice);breath.loop=true;

  low.type='lowpass';low.frequency.value=1100+r()*900;low.Q.value=.3;

  breath.connect(low);low.connect(phrase);phrase.connect(main);phrase.gain.setValueAtTime(0,time);

  for(let at=time+r()*.8;at<end-.1;){

   const len=Math.min(.4+r()*1.4,end-at-.01),amp=.008+r()*.018;

   const vowel=ctx.createBiquadFilter();vowel.type='bandpass';vowel.frequency.value=350+r()*1100;vowel.Q.value=.7;

   const g=ctx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(amp,at+.07);g.gain.exponentialRampToValueAtTime(.00001,at+len);

   low.connect(vowel);vowel.connect(g).connect(main);at+=len+.1+r()*.8;

  }

  breath.start(time,r()*.7);breath.stop(end);

 }

 for(let at=time+.4;at<end-.2;at+=1.4+r()*2.2){air(at,.12,.025,500);tone(at,90+r()*35,.14,.018,'sine',65);}

}

 else if(['forest','stream','insects','room'].includes(s.type)){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noise(ctx,s.seed+'bed');n.loop=true;f.type='lowpass';f.frequency.value=s.type==='stream'?2700:s.type==='forest'?600:250;g.gain.value=s.type==='room'?.025:s.type==='insects'?.035:.13;n.connect(f).connect(g).connect(main);n.start(time);n.stop(end);if(s.type==='stream')for(let at=time;at<end-.08;at+=.05+r()*.18)air(at,.035,.035,2500+r()*3000);if(s.type==='forest'||s.type==='insects')for(let at=time+.2;at<end-.22;at+=.24+r()*.8/rate){if(s.type==='forest')tone(at,1700+r()*2200,.13,.045,'sine',2200+r()*1800);else{tone(at,4100+r()*1600,.045,.055);tone(at+.07,4700+r()*1300,.04,.045)}}if(s.type==='crowd')for(let at=time;at<end-.3;at+=.25+r()*.4){const len=.15+r()*.2;air(at,len,.08,400+r()*600);tone(at,110+r()*100,len,.025,'triangle')}}

 else if(s.type==='thunder'){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noise(ctx,s.seed+'rolling');n.loop=true;f.type='lowpass';f.frequency.value=180+s.tone*320;f.Q.value=.3;g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(level*.55,time+Math.min(.18,duration*.12));const rolls=Math.round(6+rate*5);for(let i=1;i<=rolls;i++){const phase=i/rolls,weight=Math.pow(1-phase,1.15),swell=.6+.4*r();g.gain.linearRampToValueAtTime(Math.max(.0001,level*.7*weight*swell),time+duration*phase)}n.connect(f).connect(g).connect(main);n.start(time);n.stop(end);tone(time,42+s.size*12,duration*.8,level*.18,'sine',26);for(let at=time+.12;at<end-.3;at+=.4+r()*.7)air(at,Math.min(.6+r()*.5,end-at),level*.13*(1-(at-time)/duration),130+r()*170)}

 else if(s.type==='coin'){tone(time,800+s.tone*800,duration*.25,.25);tone(time+duration*.16,1200+s.tone*1300,duration*.65,.23)}

 else if(s.type==='click'){tone(time,150+s.tone*800,.06,.25,'triangle');air(time,.025,.14,2500)}

 else if(s.type==='chime'||s.type==='magic'){const pitches=s.type==='magic'?[72,76,79,84,88,91]:[72,79,84];pitches.forEach((p,i)=>note(ctx,main,'bell',p+Math.round(s.tone*12)-6,time+i*duration/(pitches.length+2),duration*.35,.6))}

 main.gain.setValueAtTime(0,time);main.gain.linearRampToValueAtTime(mainLevel,time+.008);main.gain.setValueAtTime(mainLevel,Math.max(time+.009,end-.025));main.gain.linearRampToValueAtTime(0,end);return main}

 async function prepareAudio(ctx,p){for(const t of p.tracks.filter(t=>t.sound)){const recipe={...t.sound,space:0},key=JSON.stringify(recipe);if(!soundCache.has(key)){if(soundCache.size>=16)soundCache.delete(soundCache.keys().next().value);soundCache.set(key,await renderSound(recipe,44100))}}for(const t of p.tracks.filter(t=>t.audio)){const key=t.audio.data;if(!decodeCache.has(key)){if(decodeCache.size>=16)decodeCache.delete(decodeCache.keys().next().value);const raw=Uint8Array.from(atob(key.split(',')[1]),c=>c.charCodeAt(0));decodeCache.set(key,await ctx.decodeAudioData(raw.buffer))}}}

 function event(ctx,g,e,at){const dest=g.tracks.get(e.track)?.input;if(!dest)return;if(e.audio||e.sound){const buffer=e.audio?decodeCache.get(e.audio.data):soundCache.get(JSON.stringify({...e.sound,space:0}));if(!buffer)return;const offset=Math.min(e.cue?.offset||0,buffer.duration),repeat=e.cue?.repeat??!!e.sound?.loop,len=repeat?e.duration:Math.min(buffer.duration-offset,e.duration);if(len<=0)return;const o=ctx.createBufferSource(),gain=ctx.createGain(),fi=Math.min(e.cue?.fadeIn||0,len/2),fo=Math.min(e.cue?.fadeOut||0,len/2);o.buffer=buffer;o.loop=repeat;if(repeat){o.loopStart=0;o.loopEnd=buffer.duration}gain.gain.setValueAtTime(fi?0:e.velocity,at);if(fi)gain.gain.linearRampToValueAtTime(e.velocity,at+fi);gain.gain.setValueAtTime(e.velocity,at+len-fo);if(fo)gain.gain.linearRampToValueAtTime(0,at+len);o.connect(gain).connect(dest);o.start(at,offset,len);return}note(ctx,dest,e.instrument,e.pitch,at,e.duration,e.velocity)}



 async function render(p,{sampleRate=44100,only=null,loop=p.loop,tail=2,progress=()=>{},signal=null}={}){C.validate(p);const seconds=C.seconds(p),extra=loop?Math.min(3,seconds):tail,ctx=new OfflineAudioContext(2,Math.ceil((seconds+extra)*sampleRate),sampleRate);await prepareAudio(ctx,p);const g=graph(ctx,p),ev=C.events(p,only);for(let i=0;i<ev.length;i++){if(signal?.aborted)throw Error('Export cancelled');event(ctx,g,ev[i],ev[i].time);if(i%128===0){progress(i/ev.length*.25);await new Promise(r=>setTimeout(r,0))}}progress(.3);const raw=await ctx.startRendering();if(signal?.aborted)throw Error('Export cancelled');const frames=Math.round((seconds+(loop?0:tail))*sampleRate),out=ctx.createBuffer(2,frames,sampleRate);for(let ch=0;ch<2;ch++){const src=raw.getChannelData(ch),dst=out.getChannelData(ch);dst.set(src.subarray(0,frames));if(loop){const n=Math.min(raw.length-frames,frames);for(let i=0;i<n;i++)dst[i]+=src[frames+i]}else{const n=Math.min(sampleRate*.025,frames);for(let i=0;i<n;i++)dst[frames-1-i]*=i/n}for(let i=0;i<Math.min(128,frames/4);i++){dst[i]*=i/128;dst[frames-1-i]*=i/128}}let peak=0;for(let ch=0;ch<2;ch++)for(const v of out.getChannelData(ch))peak=Math.max(peak,Math.abs(v));if(peak>.92)for(let ch=0;ch<2;ch++){const d=out.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]*=.92/peak}progress(1);return out}

 async function renderSound(s,sampleRate=44100){C.validateSound(s);const ctx=new OfflineAudioContext(2,Math.ceil((s.duration+1)*sampleRate),sampleRate),send=ctx.createGain(),conv=ctx.createConvolver(),wet=ctx.createGain();send.connect(ctx.destination);conv.buffer=impulse(ctx,s.space);wet.gain.value=s.space*.4;conv.connect(wet).connect(ctx.destination);send.connect(conv);if(s.type==='custom')await CustomSound.prepare(ctx,s);sound(ctx,send,{...s,volume:1},0);const raw=await ctx.startRendering(),n=Math.round(s.duration*sampleRate),out=ctx.createBuffer(2,n,sampleRate);for(let ch=0;ch<2;ch++){const d=out.getChannelData(ch),src=raw.getChannelData(ch);d.set(src.subarray(0,n));if(s.loop)for(let i=0;i<Math.min(n,raw.length-n);i++)d[i]+=src[n+i];if(s.loop){const blend=Math.min(Math.round(sampleRate*.035),Math.floor(n/4)),head=d.slice(0,blend),tail=d.slice(n-blend);for(let i=0;i<blend;i++){const t=i/(blend-1),w=(1-Math.cos(t*Math.PI))/2;d[n-blend+i]=tail[i]*(1-w)+head[i]*w}const join=d[n-1];for(let i=0;i<Math.min(32,blend);i++)d[i]=join*(1-i/32)+d[i]*(i/32)}else{const fade=Math.min(128,n/4);for(let i=0;i<fade;i++){d[i]*=i/fade;d[n-1-i]*=i/fade}}}const m=metrics(out),gain=s.normalize===false?s.volume:Math.min(96,.88/Math.max(m.peak,1e-9),(s.type==='rain'?(.025+s.rate*.12):s.type==='crowd'?.075:.12)/Math.max(m.rms,1e-9))*s.volume;for(let ch=0;ch<2;ch++){const d=out.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]*=gain*(1-(s.distance||0)*.65)}return out}

 async function update(p){if(!playing||!live)return false;const snapshot=C.validate(C.clone(p)),ctx=live,version=++updateVersion;pending=null;await prepareAudio(ctx,snapshot);if(!playing||live!==ctx||version!==updateVersion)return false;const bar=240/playingProject.tempo,at=start+Math.ceil((ctx.currentTime-start+.3)/bar)*bar;pending={project:snapshot,at,restart:snapshot.id!==playingProject.id||snapshot.tempo!==playingProject.tempo||C.seconds(snapshot)!==C.seconds(playingProject)};return true}

 function stop(){updateVersion++;previewRunning=false;previewVersion++;previewNode=null;previewGain=null;pending=null;if(live&&playing)position=(live.currentTime-start)%C.seconds(playingProject);playing=false;clearInterval(interval);cancelAnimationFrame(raf);if(live)live.close().catch(()=>{});live=null;voiceNodes.clear();document.dispatchEvent(new Event('musictransport'));return position}

 async function play(p,offset=0){stop();const ctx=context();live=ctx;await ctx.resume();await prepareAudio(ctx,p);if(live!==ctx)return;playingProject=C.clone(p);liveEvents=C.events(p);start=ctx.currentTime+.04-offset;let g=graph(ctx,p,{origin:start});voiceNodes=g.tracks;liveGraph=g;position=offset;cycle=0;next=liveEvents.findIndex(e=>e.time>=offset-.0001);if(next<0)next=liveEvents.length;playing=true;let duration=C.seconds(p);function tick(){if(!playing)return;const now=ctx.currentTime;let until=now+.24;if(pending&&now>=pending.at-.025){const at=pending.at,old=g;if(pending.restart){start=at;cycle=0;}duration=C.seconds(pending.project);g=graph(ctx,pending.project,{origin:start});liveGraph=g;g.master.gain.setValueAtTime(0,now);g.master.gain.setValueAtTime(0,at);g.master.gain.linearRampToValueAtTime(pending.project.master,at+.12);old.master.gain.cancelScheduledValues(at);old.master.gain.setValueAtTime(old.master.gain.value,at);old.master.gain.linearRampToValueAtTime(0,at+.12);setTimeout(()=>old.dispose(),1500);playingProject=pending.project;voiceNodes=g.tracks;liveEvents=C.events(playingProject);cycle=Math.floor((at-start+.00001)/duration);const offset=Math.max(0,at-start-cycle*duration);next=liveEvents.findIndex(e=>e.time>=offset-.0001);if(next<0)next=liveEvents.length;pending=null;document.dispatchEvent(new Event("musicdirection"))}if(pending)until=Math.min(until,pending.at);while(next<liveEvents.length&&start+cycle*duration+liveEvents[next].time<until){const e=liveEvents[next++],at=start+cycle*duration+e.time;if(at>=now-.01)event(ctx,g,e,Math.max(now,at))}if(next>=liveEvents.length&&start+(cycle+1)*duration<until){if(playingProject.loop){cycle++;next=0}else if(now>=start+duration){stop();position=0;return}}}tick();interval=setInterval(tick,25);function frame(){if(!playing)return;position=Math.max(0,ctx.currentTime-start)%duration;if(!frame.last||performance.now()-frame.last>65){document.dispatchEvent(new Event('musictransport'));frame.last=performance.now()}raf=requestAnimationFrame(frame)}frame();return ctx}

 async function replaceSoundPreview(s){if(!previewRunning||!live)return null;const ctx=live,version=++previewVersion,b=await renderSound(s,ctx.sampleRate);if(!previewRunning||live!==ctx||version!==previewVersion)return null;const now=ctx.currentTime,source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=b;source.loop=!!s.loop;source.connect(gain).connect(ctx.destination);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.06);if(!previewNode)previewStart=now;const offset=(now-previewStart)%b.duration;source.start(now,Math.max(0,offset));if(previewNode){previewGain.gain.cancelScheduledValues(now);previewGain.gain.setValueAtTime(previewGain.gain.value,now);previewGain.gain.linearRampToValueAtTime(0,now+.06);try{previewNode.stop(now+.07)}catch{}}previewNode=source;previewGain=gain;source.onended=()=>{if(previewNode===source)previewRunning=false};return b}

 async function previewSound(s,{repeat=s.loop}={}){stop();const ctx=context();live=ctx;await ctx.resume();previewRepeat=repeat;previewRunning=true;previewStart=ctx.currentTime;return replaceSoundPreview({...s,loop:repeat})}

 async function auditionPlaced(track,n,tempo){if(!live){live=context();await live.resume()}const ctx=live;await prepareAudio(ctx,{tracks:[track]});if(live!==ctx)return;const gain=ctx.createGain();gain.gain.value=track.volume;gain.connect(ctx.destination);event(ctx,{tracks:new Map([[track.id,{input:gain}]])},{track:track.id,instrument:track.instrument,pitch:n.pitch,velocity:n.velocity,duration:n.length*60/tempo/4,cue:track.cue,sound:track.sound,audio:track.audio},ctx.currentTime+.01);setTimeout(()=>{try{gain.disconnect()}catch{}},Math.min(30000,n.length*60/tempo/4*1000)+2500)}
 async function audition(instrument,pitch){if(!live){live=context();await live.resume()}const g=live.createGain();g.gain.value=.6;g.connect(live.destination);note(live,g,instrument,pitch,live.currentTime+.01,.22,.7)}

 function master(value){if(playingProject)playingProject.master=value;if(pending)pending.project.master=value;if(live&&liveGraph)liveGraph.master.gain.setTargetAtTime(value,live.currentTime,.025)}

 function mix(id,key,value){for(const p of [playingProject,pending?.project]){const t=p?.tracks.find(t=>t.id===id);if(t)t[key]=value}const n=voiceNodes.get(id);if(!n||!live)return;if(key==='volume')n.gain.gain.setTargetAtTime(value,live.currentTime,.025);if(key==='pan')n.pan.pan.setTargetAtTime(value,live.currentTime,.025);if(key==='brightness')n.filter.frequency.setTargetAtTime(800+value*value*11000,live.currentTime,.025);if(key==='space')n.send.gain.setTargetAtTime(value*playingProject.room,live.currentTime,.025)}

 function wav(buffer,bits=16){const bytes=bits===24?3:2,frames=buffer.length,channels=buffer.numberOfChannels,b=new ArrayBuffer(44+frames*channels*bytes),v=new DataView(b),text=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};text(0,'RIFF');v.setUint32(4,b.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*bytes,true);v.setUint16(32,channels*bytes,true);v.setUint16(34,bits,true);text(36,'data');v.setUint32(40,frames*channels*bytes,true);const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let o=44;for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){const x=C.clamp(data[ch][i],-1,1);if(bytes===2){v.setInt16(o,Math.round(x*(x<0?32768:32767)),true)}else{const n=Math.round(x*(x<0?8388608:8388607));v.setUint8(o,n&255);v.setUint8(o+1,n>>8&255);v.setUint8(o+2,n>>16&255)}o+=bytes}return new Blob([b],{type:'audio/wav'})}

 function metrics(b){let peak=0,sum=0,count=0;for(let ch=0;ch<b.numberOfChannels;ch++)for(const v of b.getChannelData(ch)){if(!Number.isFinite(v))throw Error('Invalid audio sample');peak=Math.max(peak,Math.abs(v));sum+=v*v;count++}return{peak,rms:Math.sqrt(sum/count),seconds:b.duration,frames:b.length}}

 async function source(t){const ctx=new OfflineAudioContext(2,1,44100);await prepareAudio(ctx,{tracks:[t]});return t.audio?decodeCache.get(t.audio.data):soundCache.get(JSON.stringify({...t.sound,space:0}))}

 return{auditionPlaced,source,note,sound,render,renderSound,play,update,stop,previewSound,updateSound:replaceSoundPreview,audition,mix,master,wav,metrics,get transport(){return{tempo:playingProject?.tempo,id:playingProject?.id,duration:playingProject?C.seconds(playingProject):0,queued:!!pending}},get soundPlaying(){return previewRunning},get playing(){return playing},get position(){return position}};

})();

