// Nessun dato privato viene inserito nella richiesta della configurazione.
export function publicHttps(value) {
  const u = new URL(value);
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) throw Error('Indirizzo HTTPS non valido.');
  if (!h.includes('.') || h.includes(':') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(h) || h.endsWith('.local') || h.endsWith('.localhost')) throw Error('Il collegamento deve essere pubblico.');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a,b] = h.split('.').map(Number);
    if (a===0 || a===10 || a===127 || a===169&&b===254 || a===172&&b>=16&&b<=31 || a===192&&b===168 || a===100&&b>=64&&b<=127 || a>=224 || a===192&&b===0 || a===198&&(b===18||b===19)) throw Error('Indirizzi locali o riservati non ammessi.');
  }
  return u;
}
export function destination(config, fragment) {
  if (!config || !['ciro','pagina'].includes(config.tipo) || typeof config.url!=='string') throw Error('Configurazione del collegamento non valida.');
  const u = publicHttps(config.url);
  if (u.hash) throw Error('La configurazione pubblica non deve contenere codici privati.');
  if (config.tipo==='pagina') { u.hash=''; return u.href; }
  if (!/^[a-z0-9-]+\.(lhr\.life|localhost\.run)$/.test(u.hostname) || u.pathname!=='/' || u.search) throw Error('Destinazione CIRO non riconosciuta.');
  if (!/^#[A-Za-z0-9_-]{16,256}$/.test(fragment)) throw Error('Codice di accesso assente o non valido. Usa il QR privato ricevuto da CIRO.');
  u.hash=fragment; return u.href;
}
if (typeof document!=='undefined') {
  let privateFragment=location.hash;
  history.replaceState(null,'',location.pathname+location.search);
  const state=document.getElementById('stato'), retry=document.getElementById('riprova');
  async function open() {
    retry.hidden=true; state.textContent='Controllo il collegamento disponibile…';
    const control=new AbortController(); const timer=setTimeout(()=>control.abort(),10000);
    try {
      const response=await fetch('./destinazione.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:control.signal});
      if (!response.ok) throw Error('Collegamento non ancora pubblicato. Contatta chi gestisce CIRO.');
      const config=await response.json();
      if (config.attivo===false) throw Error('CIRO è momentaneamente spento. Riprova quando il PC che lo ospita è acceso.');
      const target=destination(config,privateFragment);
      if(config.tipo==='pagina') privateFragment='';
      state.textContent='Apro il collegamento…'; location.replace(target);
    } catch(error) {
      state.textContent=error.name==='AbortError'?'La connessione non risponde. Controlla Internet e riprova.':error instanceof TypeError?'Connessione non disponibile. Controlla Internet e riprova.':error.message;
      retry.hidden=false;
    } finally { clearTimeout(timer); }
  }
  retry.addEventListener('click',open); open();
}
