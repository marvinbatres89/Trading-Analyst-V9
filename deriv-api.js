const URL="wss://api.derivws.com/trading/v1/options/ws/public";
class DerivAPI{
 constructor(){this.ws=null;this.symbol=null;this.events={estado:[],tick:[],error:[],diagnostico:[]};this.subscription=null;this.manual=false;this.retry=0;this.timer=null}
 al(e,f){if(this.events[e]&&typeof f==="function")this.events[e].push(f)}
 emit(e,d){(this.events[e]||[]).forEach(f=>{try{f(d)}catch(err){console.error(err)}})}
 conectar(symbol){this.manual=false;this.symbol=symbol;this._open()}
 _open(){this._clear();this.emit("estado",{estado:"connecting",texto:"CONNECTING"});try{this.ws=new WebSocket(URL)}catch(e){return this._fail(e)}
 this.ws.onopen=()=>{this.retry=0;this.emit("estado",{estado:"live",texto:"LIVE"});this._subscribe()}
 this.ws.onmessage=e=>this._message(e)
 this.ws.onerror=()=>this.emit("error",{mensaje:"WebSocket error."})
 this.ws.onclose=()=>{this.emit("estado",{estado:"offline",texto:"OFFLINE"});if(!this.manual)this._retry()}}
 _subscribe(){if(!this.ws||this.ws.readyState!==1)return;this.ws.send(JSON.stringify({ticks:this.symbol,subscribe:1}))}
 _message(event){let d;try{d=JSON.parse(event.data)}catch{return}
 if(d.error){this.emit("error",{mensaje:d.error.message||"Deriv error"});return}
 if(d.subscription?.id)this.subscription=d.subscription.id
 if(d.tick){this.emit("tick",{simbolo:d.tick.symbol||this.symbol,precio:Number(d.tick.quote),epoch:Number(d.tick.epoch),pipSize:Number(d.tick.pip_size)})}}
 cambiarSimbolo(symbol){this.symbol=symbol;if(this.ws?.readyState===1){if(this.subscription)this.ws.send(JSON.stringify({forget:this.subscription}));this.subscription=null;this._subscribe()}}
 desconectar(){this.manual=true;this._clear();if(this.ws){try{this.ws.close()}catch{}this.ws=null}this.emit("estado",{estado:"offline",texto:"OFFLINE"})}
 _retry(){clearTimeout(this.timer);this.retry++;this.timer=setTimeout(()=>this._open(),Math.min(15000,1500*this.retry))}
 _clear(){clearTimeout(this.timer);this.timer=null}
 _fail(e){this.emit("error",{mensaje:e?.message||"Connection error"});this._retry()}}
export const derivAPI=new DerivAPI();
