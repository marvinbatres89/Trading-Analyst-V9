import{CONFIG}from"./prediction.js";
export const ESTADOS_MONITOR=Object.freeze({INACTIVE:"INACTIVE",MONITORING:"MONITORING",CANDIDATE:"CANDIDATE",PREPARE:"PREPARE",REVALIDATING:"REVALIDATING",CONFIRMED:"CONFIRMED",EXECUTING:"EXECUTING",RESULT:"RESULT",CANCELLED:"CANCELLED"});
const timings={rise_fall:{prepareMs:4200,revalidateMs:1800,maxMs:11000},even_odd:{prepareMs:2800,revalidateMs:900,maxMs:8500},over_under:{prepareMs:2800,revalidateMs:900,maxMs:8500},match:{prepareMs:3800,revalidateMs:1600,maxMs:10000}};
export function crearMonitorOportunidades(){let active=false,state=ESTADOS_MONITOR.INACTIVE,ctx={estrategia:"rise_fall"},candidate=null,locked=null,same=0,weak=0,contrary=0,start=0,tPrepare=null,tRevalidate=null,tMax=null,tReturn=null,lastConfirmed=0;const ev={estado:[],prepare:[],revalidando:[],confirmado:[],cancelado:[],resultado:[],diagnostico:[]};
 const emit=(e,d={})=>(ev[e]||[]).forEach(f=>{try{f(d)}catch(x){console.error(x)}});const change=(s,msg)=>{state=s;emit("estado",{estado:s,mensaje:msg,resultado:locked||candidate,contexto:{...ctx}})};
 const clear=()=>{[tPrepare,tRevalidate,tMax,tReturn].forEach(x=>x&&clearTimeout(x));tPrepare=tRevalidate=tMax=tReturn=null};
 const reset=()=>{clear();candidate=locked=null;same=weak=contrary=0;start=0};
 function al(e,f){if(ev[e]&&typeof f==="function")ev[e].push(f)}
 function establecerContexto(n={}){ctx={...ctx,...n};if(active){reset();change(ESTADOS_MONITOR.MONITORING,"Configuration updated. Searching again.")}}
 function iniciar(){active=true;reset();change(ESTADOS_MONITOR.MONITORING,`${ctx.mercado||"Selected market"}. Searching entry.`)}
 function detener(m="Engine stopped."){active=false;reset();change(ESTADOS_MONITOR.INACTIVE,m)}
 function schedulePrepare(result){const time=timings[result.estrategia]||timings.rise_fall;locked=JSON.parse(JSON.stringify(result));start=Date.now();change(ESTADOS_MONITOR.PREPARE,`Possible ${result.direccion}. Prepare the operation.`);emit("prepare",{resultado:locked,contexto:{...ctx}});
 tPrepare=setTimeout(()=>{if(!active||state!==ESTADOS_MONITOR.PREPARE)return;change(ESTADOS_MONITOR.REVALIDATING,"Checking the latest ticks.");emit("revalidando",{resultado:locked,contexto:{...ctx}});
 tRevalidate=setTimeout(()=>{if(!active||state!==ESTADOS_MONITOR.REVALIDATING)return;const fresh=candidate;const cfg=CONFIG[locked.estrategia];const still=fresh&&fresh.direccion===locked.direccion&&fresh.puntaje>=cfg.prepare-4&&fresh.metadata?.aptaParaConfirmacion;
 if(still&&Date.now()-lastConfirmed>3500){locked={...fresh,estado:"CONFIRMED",ejecutable:true};lastConfirmed=Date.now();clear();change(ESTADOS_MONITOR.CONFIRMED,`${locked.direccion} confirmed. Execute now.`);emit("confirmado",{resultado:locked,contexto:{...ctx}})}
 else cancelarOportunidad("Final revalidation did not remain strong enough.")},time.revalidateMs)},time.prepareMs);
 tMax=setTimeout(()=>{if([ESTADOS_MONITOR.PREPARE,ESTADOS_MONITOR.REVALIDATING].includes(state))cancelarOportunidad("Opportunity expired before confirmation.")},time.maxMs)}
 function procesar(result){if(!active||!result)return;if([ESTADOS_MONITOR.CONFIRMED,ESTADOS_MONITOR.EXECUTING,ESTADOS_MONITOR.RESULT].includes(state))return;candidate=result;const cfg=CONFIG[result.estrategia]||CONFIG.rise_fall;
 if(result.direccion==="WAIT"||result.puntaje<cfg.candidate){if([ESTADOS_MONITOR.PREPARE,ESTADOS_MONITOR.REVALIDATING].includes(state)){weak++;if(weak>3)cancelarOportunidad("Signal lost strength for several checks.")}else{same=0;change(ESTADOS_MONITOR.MONITORING,"Searching for a stronger setup.")}return}
 if(locked){if(result.direccion!==locked.direccion)contrary++;else contrary=0;if(contrary>2)cancelarOportunidad("Opposite direction persisted.");return}
 if(candidate?.direccion===result.direccion)same++;else same=1;
 if(state===ESTADOS_MONITOR.MONITORING){change(ESTADOS_MONITOR.CANDIDATE,"Possible opportunity detected. Validating.");}
 const needed=result.estrategia==="rise_fall"?2:1;if(state===ESTADOS_MONITOR.CANDIDATE&&same>=needed&&result.puntaje>=cfg.prepare)schedulePrepare(result)}
 function cancelarOportunidad(m="Opportunity cancelled."){const r=locked||candidate;reset();change(ESTADOS_MONITOR.CANCELLED,m);emit("cancelado",{motivo:m,resultado:r,contexto:{...ctx}});if(active)tReturn=setTimeout(()=>change(ESTADOS_MONITOR.MONITORING,"Continuing automatic search."),1400)}
 function marcarEjecutando(){if(state!==ESTADOS_MONITOR.CONFIRMED)return false;state=ESTADOS_MONITOR.EXECUTING;change(state,"Signal locked during execution window.");return true}
 function registrarResultado({acierto,datos={}}={}){if(![ESTADOS_MONITOR.CONFIRMED,ESTADOS_MONITOR.EXECUTING].includes(state))return false;const r=locked;state=ESTADOS_MONITOR.RESULT;change(state,acierto?"Prediction successful.":"Prediction failed.");emit("resultado",{acierto:Boolean(acierto),resultado:r,datos,contexto:{...ctx}});reset();if(active)tReturn=setTimeout(()=>change(ESTADOS_MONITOR.MONITORING,"Searching for a new entry."),3800);return true}
 return{al,iniciar,detener,procesar,establecerContexto,cancelarOportunidad,marcarEjecutando,registrarResultado,obtenerEstado:()=>({activo:active,estado:state,resultado:locked||candidate,contexto:{...ctx}}),destruir:()=>{active=false;reset();Object.keys(ev).forEach(k=>ev[k]=[])}}}
export const monitorOportunidades=crearMonitorOportunidades();
