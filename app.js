(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const names = {
    spettacoli: { kicker: "Teatro e spettacolo dal vivo", description: "Programmazione teatrale a Bologna e dintorni · novembre–dicembre 2026" },
    concerti: { kicker: "Live, club e musica classica", description: "Bologna, Modena, Ferrara e Imola · 16 novembre 2026 – 27 aprile 2027" },
    eventi: { kicker: "Mostre, workshop, fiere e territorio", description: "Bologna e provincia · 16 novembre – 31 dicembre 2026" }
  };
  const today = new Date(); today.setHours(0,0,0,0);
  let section = "spettacoli", items = [], cursor = new Date(today);
  let start = new Date(2026,10,16), end = new Date(2026,11,31);
  const fmt = (date, opts) => new Intl.DateTimeFormat("it-IT", opts).format(date);
  const key = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const parse = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
  const between = (a,b) => a >= start && a <= end;
  const safeLink = value => { try { const u = new URL(value); return ["https:","http:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };

  function setRange() {
    const c = EventData.config[section]; start = parse(c.start); end = parse(c.end);
    cursor = new Date(Math.max(start.getTime(), Math.min(today.getTime(), end.getTime())));
  }
  function eventsOn(date) {
    const k = key(date);
    return items.filter(e => e.date === k);
  }
  function createEventCard(e, compact = false) {
    const card = document.createElement("article"); card.className = compact ? "mobile-event-card" : "modal-event-card";
    const title = document.createElement("h3"); title.className = compact ? "mobile-event-title" : "modal-event-name"; title.textContent = e.title; card.appendChild(title);
    const cat = document.createElement("span"); cat.className = "event-category"; cat.textContent = e.category; card.appendChild(cat);
    const place = document.createElement("p"); place.className = compact ? "mobile-event-venue" : "event-place";
    place.textContent = [e.venue,e.city].filter(Boolean).join(" · ") || "Luogo da definire"; card.appendChild(place);
    const meta = document.createElement("div"); meta.className = compact ? "mobile-event-footer" : "event-meta";
    const info = document.createElement("span"); info.textContent = [e.time,e.price].filter(Boolean).join(" · ") || (e.endDate && e.endDate !== e.date ? "Fino al " + fmt(parse(e.endDate),{day:"numeric",month:"long"}) : "");
    if (e.endDate && e.endDate !== e.date) info.textContent += (info.textContent ? " · " : "") + "fino al " + fmt(parse(e.endDate),{day:"numeric",month:"long",year:"numeric"});
    meta.appendChild(info);
    const url = safeLink(e.link);
    if (url) { const a = document.createElement("a"); a.className = compact ? "mobile-event-details" : "modal-link"; a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; a.textContent="Fonte e dettagli ↗"; meta.appendChild(a); }
    card.appendChild(meta); return card;
  }
  function openModal(list, heading) {
    $("modal-kicker").textContent = "Dettagli appuntamento";
    $("modal-event-title").textContent = heading;
    const host = $("modal-event-list"); host.replaceChildren();
    list.forEach(e => host.appendChild(createEventCard(e)));
    $("event-modal-backdrop").hidden = false; $("modal-close").focus();
  }
  function renderMonth(monthDate) {
    const year=monthDate.getFullYear(), month=monthDate.getMonth();
    const card=document.createElement("section"); card.className="month-card";
    const header=document.createElement("header"); header.className="month-header";
    const heading=document.createElement("div");
    const index=document.createElement("span"); index.className="month-index"; index.textContent=fmt(monthDate,{month:"long",year:"numeric"});
    const title=document.createElement("h3"); title.textContent=fmt(monthDate,{month:"long",year:"numeric"});
    heading.append(index,title);
    const count=document.createElement("span"); count.className="month-count";
    const monthEvents=items.filter(e=>e.date.startsWith(key(new Date(year,month,1)).slice(0,7)));
    count.textContent=monthEvents.length+" appuntamenti"; header.append(heading,count); card.appendChild(header);
    const grid=document.createElement("div"); grid.className="calendar";
    ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].forEach((label,i)=>{const el=document.createElement("div");el.className="weekday"+(i>4?" weekend-heading":"");el.textContent=label;grid.appendChild(el);});
    const offset=(new Date(year,month,1).getDay()+6)%7, days=new Date(year,month+1,0).getDate();
    const total=Math.ceil((offset+days)/7)*7;
    for(let i=0;i<total;i++){
      const day=i-offset+1, cell=document.createElement("div");cell.className="day";
      if(day<1||day>days){cell.classList.add("empty");grid.appendChild(cell);continue;}
      const date=new Date(year,month,day), k=key(date), dayItems=eventsOn(date);
      if(i%7>4)cell.classList.add("weekend"); if(+date===+today)cell.classList.add("today");
      const n=document.createElement("span");n.className="day-number";n.textContent=day;cell.appendChild(n);
      if(dayItems.length){
        cell.classList.add("day-clickable");cell.tabIndex=0;cell.setAttribute("role","button");
        cell.setAttribute("aria-label",dayItems.length+" eventi il "+fmt(date,{dateStyle:"full"}));
        const list=document.createElement("div");list.className="events";
        dayItems.forEach(e=>{const b=document.createElement("button");b.className="event";b.type="button";b.textContent=e.title;b.addEventListener("click",ev=>{ev.stopPropagation();openModal([e],e.title);});list.appendChild(b);});
        cell.appendChild(list);
        const show=()=>openModal(dayItems,fmt(date,{dateStyle:"full"}));
        cell.addEventListener("click",show);cell.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();show();}});
      }
      grid.appendChild(cell);
    }
    card.appendChild(grid); return card;
  }
  function renderMonths() {
    const host=$("months");host.replaceChildren();
    const month=new Date(start.getFullYear(),start.getMonth(),1), last=new Date(end.getFullYear(),end.getMonth(),1);
    while(month<=last){host.appendChild(renderMonth(month));month.setMonth(month.getMonth()+1);}
  }
  function renderMobile() {
    $("mobile-day-title").textContent=fmt(cursor,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    $("mobile-day-kicker").textContent=+cursor===+today?"Oggi":"Agenda giornaliera";
    const list=eventsOn(cursor), host=$("mobile-day-events");host.replaceChildren();
    $("mobile-day-count").textContent=list.length+" appuntamenti";
    if(!list.length){const empty=document.createElement("p");empty.className="mobile-day-empty";empty.textContent="Nessun appuntamento in questa giornata.";host.appendChild(empty);}
    list.forEach(e=>host.appendChild(createEventCard(e,true)));
    $("previous-day").disabled=cursor<=start; $("next-day").disabled=cursor>=end;
  }
  async function loadSection(next) {
    section=next; setRange();
    document.querySelectorAll(".nav-tab").forEach(b=>{const active=b.dataset.section===section;b.classList.toggle("is-active",active);b.setAttribute("aria-selected",String(active));});
    $("section-kicker").textContent=names[section].kicker;
    $("section-title").textContent=section==="spettacoli"?"Prossimi spettacoli":section==="concerti"?"Prossimi concerti":"Cosa fare nei prossimi giorni";
    $("section-description").textContent=names[section].description;
    $("load-status").textContent="Caricamento appuntamenti…";
    try {
      items=await EventData.load(section);
      renderMonths();renderMobile();
      $("event-count").textContent=items.length+" appuntamenti";
      $("load-status").textContent=items.length?"Calendario caricato · seleziona un giorno per vedere i dettagli.":"Nessun appuntamento trovato nel periodo.";
    } catch(err) {
      items=[];renderMonths();renderMobile();$("event-count").textContent="Dati non disponibili";$("load-status").textContent="Errore nel caricamento: "+err.message;
    }
  }
  document.querySelectorAll(".nav-tab").forEach(b=>b.addEventListener("click",()=>loadSection(b.dataset.section)));
  $("previous-day").addEventListener("click",()=>{cursor.setDate(cursor.getDate()-1);renderMobile();});
  $("next-day").addEventListener("click",()=>{cursor.setDate(cursor.getDate()+1);renderMobile();});
  $("modal-close").addEventListener("click",()=>$("event-modal-backdrop").hidden=true);
  $("event-modal-backdrop").addEventListener("click",e=>{if(e.target.id==="event-modal-backdrop")e.currentTarget.hidden=true;});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")$("event-modal-backdrop").hidden=true;});
  fetch("./data_aggiornamento.txt",{cache:"no-store"}).then(r=>r.ok?r.text():"").then(t=>{$("updated-at").textContent=t.trim()||"Aggiornamento dati non disponibile";}).catch(()=>$("updated-at").textContent="Aggiornamento dati non disponibile");
  loadSection(section);
})();