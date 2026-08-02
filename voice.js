const map={RISE:"subida",FALL:"bajada",EVEN:"par",ODD:"impar",OVER:"mayor",UNDER:"menor",MATCH:"coincidencia"};
class Voice{constructor(){this.active=true;this.voice=null;this.rate=.9}
 async init(){if(!("speechSynthesis"in window)){this.active=false;return}await new Promise(r=>setTimeout(r,250));this.voices=speechSynthesis.getVoices();this.voice=this.voices.find(v=>v.lang.toLowerCase()==="es-sv")||this.voices.find(v=>v.lang.toLowerCase().startsWith("es"))||this.voices[0]}
 speak(t,replace=true){if(!this.active||!t)return;if(replace)speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);if(this.voice){u.voice=this.voice;u.lang=this.voice.lang}else u.lang="es-SV";u.rate=this.rate;speechSynthesis.speak(u)}
 sequence(a){this.speak(a.filter(Boolean).join(". "))}
 toggle(){this.active=!this.active;if(!this.active)speechSynthesis.cancel();return this.active}
 setRate(v){this.rate=Number(v)||.9}
 select(id){this.voice=(this.voices||[]).find(v=>`${v.name}|${v.lang}`===id)||this.voice}
 direction(d){return map[d]||d}
 announceSearch(m,s){const n={rise_fall:"sube y baja",even_odd:"par e impar",over_under:"mayor y menor",match:"coincidencia"}[s];this.sequence(["Motor encendido",m,`Estrategia ${n}`,"Buscando entrada"])}
 prepare(r){this.sequence(["Atención",r.direccion==="MATCH"?`Posible coincidencia con el número ${r.metadata?.digito}`:`Posible ${this.direction(r.direccion)}`,"Prepare el bot"])}
 revalidate(r){this.speak(r.direccion==="MATCH"?`Revalidando coincidencia ${r.metadata?.digito}`:`Revalidando ${this.direction(r.direccion)}`)}
 confirm(r){this.sequence([r.direccion==="MATCH"?`Coincidencia ${r.metadata?.digito} confirmada`:`${this.direction(r.direccion)} confirmada`,"Ejecute ahora"])}
 cancel(){this.sequence(["Oportunidad cancelada","Continuando la búsqueda"])}
 result(ok){this.sequence([ok?"Resultado acertado":"Resultado fallido","Buscando una nueva oportunidad"])}
 manual(r){this.speak(!r||r.direccion==="WAIT"?`No hay entrada clara. Puntaje ${r?.puntaje||0} de 100`:r.direccion==="MATCH"?`Posible coincidencia ${r.metadata?.digito}. Puntaje ${r.puntaje}`:`Posible ${this.direction(r.direccion)}. Puntaje ${r.puntaje}`)}
 test(){this.speak("Asistente de voz funcionando. Matches se pronuncia coincidencia.")}
}
export const asistenteVoz=new Voice();
