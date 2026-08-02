import{limitarNumero,resumenTecnicoValido}from"./indicators.js";
export const CONFIG=Object.freeze({
 rise_fall:{candidate:54,prepare:65,confirm:76,minDiff:12},
 even_odd:{candidate:53,prepare:62,confirm:70,minDiff:8},
 over_under:{candidate:53,prepare:62,confirm:70,minDiff:8},
 match:{candidate:52,prepare:60,confirm:68,minPct:14}
});
const names={rise_fall:"Rise / Fall",even_odd:"Even / Odd",over_under:"Over / Under",match:"Matches"};
const voice={RISE:"Sube",FALL:"Baja",EVEN:"Par",ODD:"Impar",OVER:"Mayor",UNDER:"Menor",MATCH:"Coincidencia",WAIT:"Esperar"};
const base=(strategy,direction,score,reasons=[],warnings=[],metadata={})=>({estrategia:strategy,nombreEstrategia:names[strategy],direccion:direction,nombreVoz:voice[direction],puntaje:Math.round(limitarNumero(score,0,100)),razones:reasons,advertencias:warnings,metadata,creadoEn:Date.now()});
function rise(r){if(!resumenTecnicoValido(r))return base("rise_fall","WAIT",0,["Collecting technical data."]);
 let up=0,down=0,ru=[],rd=[],w=[];const{tendencia:t,momentum:m,flujoCorto:f,flujoMedio:fm,interpretacionRsi:ir,rsi,volatilidad:v,mercadoLateral:l,fibonacci:fb}=r;
 if(t.direccion==="ALCISTA"){up+=22+t.fuerza*4;ru.push("Trend is bullish.")}if(t.direccion==="BAJISTA"){down+=22+t.fuerza*4;rd.push("Trend is bearish.")}
 if(m.direccion==="POSITIVO"){up+=16+m.fuerza*3;ru.push("Momentum is positive.")}if(m.direccion==="NEGATIVO"){down+=16+m.fuerza*3;rd.push("Momentum is negative.")}
 if(f.direccion==="ALCISTA"){up+=15+f.fuerza*3;ru.push("Short tick flow supports rise.")}if(f.direccion==="BAJISTA"){down+=15+f.fuerza*3;rd.push("Short tick flow supports fall.")}
 if(fm.direccion==="ALCISTA")up+=7;if(fm.direccion==="BAJISTA")down+=7;
 if(ir.direccion==="BULLISH")up+=10+ir.fuerza*2;if(ir.direccion==="BEARISH")down+=10+ir.fuerza*2;
 if(fb?.cercaDeNivel){if(fb.direccionBase==="ALCISTA"){up+=10;ru.push(`Fibonacci ${fb.nivelCercano.porcentaje}% support zone.`)}else{down+=10;rd.push(`Fibonacci ${fb.nivelCercano.porcentaje}% resistance zone.`)}}
 if(v.nivel==="MUY ALTA"){up-=14;down-=14;w.push("Very high volatility.")}else if(v.nivel==="ALTA"){up-=6;down-=6}
 if(l.lateral){up-=12;down-=12;w.push("Lateral market filter active.")}
 let direction=up>=down?"RISE":"FALL",score=Math.max(up,down),diff=Math.abs(up-down);
 const aligned=direction==="RISE"?t.direccion==="ALCISTA"&&m.direccion==="POSITIVO"&&f.direccion==="ALCISTA":t.direccion==="BAJISTA"&&m.direccion==="NEGATIVO"&&f.direccion==="BAJISTA";
 if(!aligned){score-=10;w.push("Main indicators are not fully aligned.")}if(diff<CONFIG.rise_fall.minDiff)score-=8;
 score=limitarNumero(score,0,100);if(score<CONFIG.rise_fall.candidate||diff<8)direction="WAIT";
 return base("rise_fall",direction,score,direction==="RISE"?ru:rd,w,{diferencia:diff,aptaParaConfirmacion:direction!=="WAIT"&&score>=CONFIG.rise_fall.confirm&&aligned&&!l.lateral&&v.nivel!=="MUY ALTA"})}
function binary(r,type){const e=r?.estadisticasDigitos,c=CONFIG[type];if(!e||e.cantidad<20)return base(type,"WAIT",0,["Collecting at least 20 digits."]);
 let a,b,dir,reason;if(type==="even_odd"){a=e.porcentajePares;b=e.porcentajeImpares;dir=a>=b?"EVEN":"ODD";reason=`${e.pares} even and ${e.impares} odd in ${e.cantidad} ticks.`}else{a=e.porcentajeAltos;b=e.porcentajeBajos;dir=a>=b?"OVER":"UNDER";reason=`${e.altos} high and ${e.bajos} low digits in ${e.cantidad} ticks.`}
 const diff=Math.abs(a-b);let score=48+diff*1.8+(e.cantidad>=50?4:0);score=limitarNumero(score,0,86);if(diff<c.minDiff||score<c.candidate)dir="WAIT";
 return base(type,dir,score,[reason,`Observed difference: ${diff.toFixed(1)}%.`],["Past frequency does not guarantee the next digit."],{diferencia:diff,aptaParaConfirmacion:dir!=="WAIT"&&score>=c.confirm})}
function match(r){const e=r?.estadisticasDigitos,c=CONFIG.match;if(!e||e.cantidad<30)return base("match","WAIT",0,["Collecting at least 30 digits for Matches."]);
 const pct=e.cantidad?e.frecuenciaCaliente/e.cantidad*100:0;let score=48+Math.max(0,pct-10)*2.5+(e.frecuenciaCaliente>=5?5:0);score=limitarNumero(score,0,82);const dir=pct>=c.minPct&&score>=c.candidate?"MATCH":"WAIT";
 return base("match",dir,score,[`Digit ${e.digitoCaliente} appeared ${e.frecuenciaCaliente} times in ${e.cantidad} ticks.`,`Observed frequency: ${pct.toFixed(1)}%.`],["Matches is experimental; repetition is not a guarantee."],{digito:e.digitoCaliente,ventanaEvaluacionTicks:5,aptaParaConfirmacion:dir==="MATCH"&&score>=c.confirm})}
export function generarPrediccion({estrategia="rise_fall",resumen}={}){if(estrategia==="even_odd")return binary(resumen,"even_odd");if(estrategia==="over_under")return binary(resumen,"over_under");if(estrategia==="match")return match(resumen);return rise(resumen)}
export function clasificarPuntaje(score,strategy="rise_fall"){const c=CONFIG[strategy]||CONFIG.rise_fall;return{nivel:score>=c.confirm?"STRONG":score>=c.prepare?"PREPARE":score>=c.candidate?"CANDIDATE":score>=40?"MONITORING":"NO TRADE"}}
export function crearTextoOperacion(r){if(!r)return"No analysis available.";if(r.direccion==="WAIT")return`No clear entry. Score ${r.puntaje}/100.`;if(r.direccion==="MATCH")return`Possible coincidence ${r.metadata?.digito}. Score ${r.puntaje}/100.`;return`Possible ${r.nombreVoz}. Score ${r.puntaje}/100.`}
