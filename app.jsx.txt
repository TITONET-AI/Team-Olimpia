const { useState, useEffect } = React;

const SB_URL = "https://qcymlmxlqwhipmzlatof.supabase.co";
const SB_KEY = "sb_publishable_aQ-IZF9_-u2jKc4lYMaLEg_nHJQIjaA";
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "return=representation"
};

const INITIAL_PLAYERS = [
  {nombre:"Albert",pts:100},{nombre:"Davide",pts:93},{nombre:"Ettiene",pts:83},
  {nombre:"Kike",pts:81},{nombre:"Oscar F.",pts:79},{nombre:"Gerard",pts:78},
  {nombre:"Andrea",pts:76},{nombre:"Ferran",pts:72},{nombre:"Manu",pts:70},
  {nombre:"Fernando",pts:70},{nombre:"Cristian",pts:70},{nombre:"Juanjo",pts:69},
  {nombre:"Daniel",pts:59},{nombre:"Oscar G.",pts:58},
  {nombre:"Sergio",pts:50},{nombre:"Jordi",pts:50}
];
const SP_PLAYERS = ["Sergio","Jordi"];
const CONFIG = { pts_victoria:3, pts_derrota:-1, pts_empate_superior:-1, pts_empate_inferior:1, bonus_upset:1 };
const ZONE_COLORS = ["#D85A30","#D85A30","#EF9F27","#EF9F27","#EF9F27","#EF9F27","#EF9F27","#1D9E75","#1D9E75","#1D9E75","#1D9E75","#1D9E75","#1D9E75","#1D9E75","#888780","#888780"];

function calcPoints(j1, j2, result, players) {
  const r1 = players.findIndex(p => p.nombre === j1);
  const r2 = players.findIndex(p => p.nombre === j2);
  let p1=0, p2=0, b1="", b2="";
  if (result==="j1") { p1=CONFIG.pts_victoria; p2=CONFIG.pts_derrota; if(r1>r2){p1+=CONFIG.bonus_upset;b1="+1 upset";} }
  else if (result==="j2") { p2=CONFIG.pts_victoria; p1=CONFIG.pts_derrota; if(r2>r1){p2+=CONFIG.bonus_upset;b2="+1 upset";} }
  else { p1=r1<r2?CONFIG.pts_empate_superior:CONFIG.pts_empate_inferior; p2=r2<r1?CONFIG.pts_empate_superior:CONFIG.pts_empate_inferior; }
  return {p1,p2,b1,b2};
}

async function sbGet(table, params="") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {headers:HEADERS});
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {method:"POST",headers:HEADERS,body:JSON.stringify(body)});
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function sbPatch(table, filter, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {method:"PATCH",headers:HEADERS,body:JSON.stringify(body)});
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function Avatar({name, size=32, color}) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return React.createElement("div", {
    style:{width:size,height:size,borderRadius:"50%",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}
  }, React.createElement("span", {style:{fontSize:size*0.36,fontWeight:500,color,letterSpacing:"-0.5px"}}, initials));
}

function PtsBadge({val}) {
  const bg = val>0?"#E1F5EE":val<0?"#FAECE7":"#f0f0ee";
  const col = val>0?"#085041":val<0?"#712B13":"#666";
  return React.createElement("span", {
    style:{fontSize:12,fontWeight:500,padding:"2px 8px",borderRadius:6,background:bg,color:col}
  }, (val>0?"+":"")+val);
}

function App() {
  const [tab, setTab] = useState("ranking");
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [j1, setJ1] = useState("Fernando");
  const [j2, setJ2] = useState("Albert");
  const [result, setResult] = useState("j1");
  const [sets, setSets] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{ loadData(); },[]);

  async function loadData() {
    setLoading(true); setError("");
    try {
      const [pls, mts] = await Promise.all([
        sbGet("jugadores","order=pts.desc"),
        sbGet("partidos","order=created_at.desc")
      ]);
      if (Array.isArray(pls) && pls.length===0) { await seedPlayers(); return; }
      if (Array.isArray(pls) && pls.length>0) setPlayers(pls);
      if (Array.isArray(mts)) setMatches(mts);
    } catch(e) { setError("No se pudo conectar. Comprueba tu conexión."); }
    setLoading(false);
  }

  async function seedPlayers() {
    try {
      await sbPost("jugadores", INITIAL_PLAYERS.map(p=>({nombre:p.nombre,pts:p.pts,jugados:0,victorias:0,derrotas:0,empates:0})));
      await loadData();
    } catch(e) { setLoading(false); setError("Error al inicializar."); }
  }

  const sorted = [...players].sort((a,b)=>b.pts-a.pts);
  const maxPts = sorted.length ? Math.max(...sorted.map(p=>p.pts)) : 100;
  const {p1:prev1, p2:prev2, b1, b2} = calcPoints(j1,j2,result,sorted);
  const names = INITIAL_PLAYERS.map(p=>p.nombre);

  async function saveMatch() {
    if (j1===j2) return;
    setSaving(true); setError("");
    const {p1,p2} = calcPoints(j1,j2,result,sorted);
    const resultLabel = result==="j1"?j1:result==="j2"?j2:"Empate";
    try {
      await sbPost("partidos",{id:Date.now(),fecha,j1,j2,resultado:resultLabel,sets:sets||"-",pts_j1:p1,pts_j2:p2});
      const pl1=players.find(p=>p.nombre===j1), pl2=players.find(p=>p.nombre===j2);
      await sbPatch("jugadores",`nombre=eq.${encodeURIComponent(j1)}`,{pts:pl1.pts+p1,jugados:pl1.jugados+1,victorias:pl1.victorias+(p1>=3?1:0),derrotas:pl1.derrotas+(p1<0?1:0),empates:pl1.empates+(resultLabel==="Empate"?1:0)});
      await sbPatch("jugadores",`nombre=eq.${encodeURIComponent(j2)}`,{pts:pl2.pts+p2,jugados:pl2.jugados+1,victorias:pl2.victorias+(p2>=3?1:0),derrotas:pl2.derrotas+(p2<0?1:0),empates:pl2.empates+(resultLabel==="Empate"?1:0)});
      setSaved(true); setSets("");
      setTimeout(()=>{ setSaved(false); setTab("ranking"); }, 1800);
      await loadData();
    } catch(e) { setError("Error al guardar el partido."); }
    setSaving(false);
  }

  const s = (id) => ({
    padding:"10px 18px", fontSize:14, cursor:"pointer", fontWeight:500,
    color: tab===id?"#1a1a1a":"#888",
    borderBottom: tab===id?"2px solid #1a1a1a":"2px solid transparent",
    marginBottom:-1, background:"none", border:"none",
    borderBottom: tab===id?"2px solid #1a1a1a":"2px solid transparent",
  });

  const rBtn = (val, label) => {
    const configs = {
      j1:{bg:"#E1F5EE",col:"#085041",border:"#5DCAA5"},
      draw:{bg:"#FAEEDA",col:"#633806",border:"#EF9F27"},
      j2:{bg:"#FAECE7",col:"#712B13",border:"#F0997B"}
    };
    const c = configs[val];
    const active = result===val;
    return React.createElement("div", {
      onClick:()=>setResult(val),
      style:{flex:1,padding:"11px 6px",textAlign:"center",fontSize:13,cursor:"pointer",borderRadius:8,fontWeight:active?500:400,background:active?c.bg:"transparent",color:active?c.col:"#888",border:`1px solid ${active?c.border:"#ddd"}`,transition:"all 0.15s",userSelect:"none"}
    }, label);
  };

  return React.createElement("div", {style:{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",maxWidth:620,margin:"0 auto",padding:"1.5rem 1rem"}},

    // HEADER
    React.createElement("div", {style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem"}},
      React.createElement("div", {style:{display:"flex",alignItems:"center",gap:12}},
        React.createElement("div", {style:{width:42,height:42,borderRadius:10,background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}, "🏆"),
        React.createElement("div", null,
          React.createElement("div", {style:{fontSize:18,fontWeight:500,lineHeight:1.2}}, "Team Olimpia"),
          React.createElement("div", {style:{fontSize:12,color:"#888",marginTop:2}}, "CET10 Olímpia · Temporada 26/27")
        )
      ),
      React.createElement("button", {onClick:loadData,style:{fontSize:13,padding:"7px 13px",cursor:"pointer",background:"#f0f0ee",border:"1px solid #ddd",borderRadius:8,color:"#666"}}, "↻ Actualizar")
    ),

    error && React.createElement("div", {style:{background:"#FAECE7",color:"#712B13",borderRadius:8,padding:"9px 14px",fontSize:13,marginBottom:"1.25rem"}}, "⚠️ "+error),

    // TABS
    React.createElement("div", {style:{display:"flex",borderBottom:"1px solid #eee",marginBottom:"1.75rem"}},
      React.createElement("button", {onClick:()=>setTab("ranking"),style:s("ranking")}, "Ranking"),
      React.createElement("button", {onClick:()=>setTab("partido"),style:s("partido")}, "Registrar partido"),
      React.createElement("button", {onClick:()=>setTab("historial"),style:s("historial")}, "Historial")
    ),

    // RANKING
    tab==="ranking" && React.createElement("div", null,
      loading && React.createElement("div", {style:{color:"#888",fontSize:14,padding:"2rem 0"}}, "⏳ Cargando ranking..."),
      !loading && sorted.map((p,i) => {
        const isSP = SP_PLAYERS.includes(p.nombre) && p.jugados===0;
        const col = ZONE_COLORS[Math.min(i,ZONE_COLORS.length-1)];
        const pct = Math.round((p.pts/maxPts)*100);
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return React.createElement("div", {key:p.nombre,style:{display:"flex",alignItems:"center",gap:14,padding:"11px 0",borderBottom:"1px solid #f0f0ee"}},
          React.createElement("span", {style:{fontSize:i<3?16:13,color:"#aaa",width:24,textAlign:"right",flexShrink:0}}, isSP?"—":medal||i+1),
          React.createElement(Avatar, {name:p.nombre,size:30,color:col}),
          React.createElement("span", {style:{flex:1,fontSize:15,fontWeight:500}}, p.nombre),
          React.createElement("div", {style:{width:130,height:5,background:"#eee",borderRadius:3,overflow:"hidden",flexShrink:0}},
            React.createElement("div", {style:{height:"100%",borderRadius:3,background:col,width:`${pct}%`,transition:"width 0.5s ease"}})
          ),
          isSP
            ? React.createElement("span", {style:{fontSize:12,color:"#aaa",width:38,textAlign:"right",flexShrink:0}}, "S/P")
            : React.createElement("span", {style:{fontSize:15,fontWeight:500,color:col,width:38,textAlign:"right",flexShrink:0}}, p.pts)
        );
      }),
      !loading && React.createElement("div", {style:{display:"flex",gap:20,marginTop:"1.5rem",paddingTop:"1rem",borderTop:"1px solid #f0f0ee"}},
        [{col:"#D85A30",label:"Top 2"},{col:"#EF9F27",label:"3–7"},{col:"#1D9E75",label:"8–14"},{col:"#888780",label:"S/P"}].map(z =>
          React.createElement("div", {key:z.label,style:{display:"flex",alignItems:"center",gap:5}},
            React.createElement("div", {style:{width:8,height:8,borderRadius:"50%",background:z.col}}),
            React.createElement("span", {style:{fontSize:11,color:"#aaa"}}, z.label)
          )
        )
      )
    ),

    // REGISTRAR PARTIDO
    tab==="partido" && React.createElement("div", {style:{display:"flex",flexDirection:"column",gap:14}},
      React.createElement("div", {style:{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem"}},
        React.createElement("div", {style:{fontSize:11,fontWeight:500,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}, "Jugadores"),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"end"}},
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:"#888",marginBottom:5}}, "Jugador 1"),
            React.createElement("select", {value:j1,onChange:e=>setJ1(e.target.value)}, names.map(n=>React.createElement("option",{key:n},n)))
          ),
          React.createElement("div", {style:{fontSize:13,fontWeight:500,color:"#aaa",paddingBottom:8,textAlign:"center"}}, "vs"),
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:"#888",marginBottom:5}}, "Jugador 2"),
            React.createElement("select", {value:j2,onChange:e=>setJ2(e.target.value)}, names.filter(n=>n!==j1).map(n=>React.createElement("option",{key:n},n)))
          )
        )
      ),

      React.createElement("div", {style:{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem"}},
        React.createElement("div", {style:{fontSize:11,fontWeight:500,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}, "Resultado"),
        React.createElement("div", {style:{display:"flex",gap:8,marginBottom:16}},
          rBtn("j1", j1+" gana"),
          rBtn("draw", "Empate"),
          rBtn("j2", j2+" gana")
        ),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          [{name:j1,pts:prev1,bonus:b1},{name:j2,pts:prev2,bonus:b2}].map(pl =>
            React.createElement("div", {key:pl.name,style:{background:"#f8f8f6",borderRadius:8,padding:"12px",textAlign:"center"}},
              React.createElement("div", {style:{fontSize:11,color:"#aaa",marginBottom:6}}, pl.name),
              React.createElement("div", {style:{fontSize:22,fontWeight:500,color:pl.pts>0?"#1D9E75":pl.pts<0?"#D85A30":"#888"}}, (pl.pts>0?"+":"")+pl.pts),
              pl.bonus && React.createElement("div", {style:{fontSize:11,color:"#1D9E75",marginTop:3}}, pl.bonus)
            )
          )
        )
      ),

      React.createElement("div", {style:{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1.25rem"}},
        React.createElement("div", {style:{fontSize:11,fontWeight:500,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}, "Detalles"),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}},
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:"#888",marginBottom:5}}, "Fecha"),
            React.createElement("input", {type:"date",value:fecha,onChange:e=>setFecha(e.target.value)})
          ),
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:"#888",marginBottom:5}}, "Sets (opcional)"),
            React.createElement("input", {type:"text",value:sets,onChange:e=>setSets(e.target.value),placeholder:"ej. 6-4, 6-3"})
          )
        )
      ),

      React.createElement("button", {
        onClick:saveMatch, disabled:saving||j1===j2,
        style:{width:"100%",padding:"13px",fontSize:15,fontWeight:500,cursor:saving?"wait":"pointer",background:saved?"#E1F5EE":"#fff",border:`1px solid ${saved?"#5DCAA5":"#ddd"}`,borderRadius:12,color:saved?"#085041":"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}
      }, saving?"Guardando...":saved?"✓ Partido guardado":"Guardar partido")
    ),

    // HISTORIAL
    tab==="historial" && React.createElement("div", null,
      loading && React.createElement("div", {style:{color:"#888",fontSize:14,padding:"2rem 0"}}, "⏳ Cargando..."),
      !loading && matches.length===0 && React.createElement("div", {style:{textAlign:"center",padding:"3rem 0",color:"#aaa"}},
        React.createElement("div", {style:{fontSize:36,marginBottom:8}}, "🎾"),
        React.createElement("div", {style:{fontSize:14}}, "Aún no hay partidos registrados")
      ),
      matches.map((m,i) => {
        const win=m.resultado===m.j1, draw=m.resultado==="Empate";
        const badgeBg=draw?"#FAEEDA":win?"#E1F5EE":"#FAECE7";
        const badgeCol=draw?"#633806":win?"#085041":"#712B13";
        const label=draw?"Empate":`${m.resultado} gana`;
        return React.createElement("div", {key:i,style:{display:"flex",alignItems:"center",gap:12,padding:"13px 0",borderBottom:"1px solid #f0f0ee"}},
          React.createElement("span", {style:{fontSize:11,padding:"3px 9px",borderRadius:6,fontWeight:500,background:badgeBg,color:badgeCol,whiteSpace:"nowrap",flexShrink:0}}, label),
          React.createElement("span", {style:{flex:1,fontSize:14,minWidth:0}},
            React.createElement("span", {style:{fontWeight:500}}, m.j1),
            React.createElement("span", {style:{color:"#aaa",margin:"0 5px"}}, "vs"),
            React.createElement("span", {style:{fontWeight:500}}, m.j2),
            m.sets&&m.sets!=="-"&&React.createElement("span", {style:{color:"#aaa",fontSize:12}}, " · "+m.sets)
          ),
          React.createElement("span", {style:{color:"#aaa",fontSize:12,whiteSpace:"nowrap",flexShrink:0}}, m.fecha),
          React.createElement("div", {style:{display:"flex",gap:4,flexShrink:0}},
            React.createElement(PtsBadge, {val:Number(m.pts_j1)}),
            React.createElement(PtsBadge, {val:Number(m.pts_j2)})
          )
        );
      })
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
