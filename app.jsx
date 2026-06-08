const { useState, useEffect } = React;

const SB_URL = "https://qcymlmxlqwhipmzlatof.supabase.co";
const SB_KEY = "sb_publishable_aQ-IZF9_-u2jKc4lYMaLEg_nHJQIjaA";
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "return=representation"
};

// CEM Olímpia brand colors
const BRAND = {
  blue: "#1B75BB",
  blueDark: "#145a92",
  blueLight: "#e8f2fb",
  blueMid: "#c2ddf5",
  bg: "#f4f6f9",
  card: "#ffffff",
  border: "#dde3ed",
  text: "#1a1a2e",
  textMuted: "#6b7a99",
  textLight: "#a0aec0",
  green: "#1D9E75",
  greenLight: "#e1f5ee",
  amber: "#e8920a",
  amberLight: "#fef3e2",
  red: "#d63b3b",
  redLight: "#fdeaea",
};

const ZONE_COLORS = [
  BRAND.blue, BRAND.blue,
  BRAND.amber, BRAND.amber, BRAND.amber, BRAND.amber, BRAND.amber,
  BRAND.green, BRAND.green, BRAND.green, BRAND.green, BRAND.green, BRAND.green, BRAND.green,
  BRAND.textLight, BRAND.textLight
];

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

function Avatar({name, size=34, color}) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return React.createElement("div", {
    style:{width:size,height:size,borderRadius:"50%",background:color+"18",border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}
  }, React.createElement("span", {style:{fontSize:size*0.34,fontWeight:600,color,letterSpacing:"-0.5px"}}, initials));
}

function Card({children, style={}}) {
  return React.createElement("div", {
    style:{background:BRAND.card,border:`1px solid ${BRAND.border}`,borderRadius:12,padding:"1.25rem",...style}
  }, children);
}

function SectionLabel({text}) {
  return React.createElement("div", {
    style:{fontSize:11,fontWeight:600,color:BRAND.textLight,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}
  }, text);
}

function PtsBadge({val}) {
  const bg = val>0?BRAND.greenLight:val<0?BRAND.redLight:"#f0f2f5";
  const col = val>0?BRAND.green:val<0?BRAND.red:BRAND.textMuted;
  return React.createElement("span", {
    style:{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:6,background:bg,color:col}
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
    } catch(e) { setError("No s'ha pogut connectar. Comprova la connexió."); }
    setLoading(false);
  }

  async function seedPlayers() {
    try {
      await sbPost("jugadores", INITIAL_PLAYERS.map(p=>({nombre:p.nombre,pts:p.pts,jugados:0,victorias:0,derrotas:0,empates:0})));
      await loadData();
    } catch(e) { setLoading(false); setError("Error en inicialitzar."); }
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
    } catch(e) { setError("Error en guardar el partit."); }
    setSaving(false);
  }

  const tabStyle = (id) => ({
    padding:"11px 18px", fontSize:14, cursor:"pointer", fontWeight:500, background:"none", border:"none",
    color: tab===id ? BRAND.blue : BRAND.textMuted,
    borderBottom: tab===id ? `2px solid ${BRAND.blue}` : "2px solid transparent",
    marginBottom:-1
  });

  const rBtnStyle = (val) => {
    const active = result===val;
    const configs = {
      j1:{bg:BRAND.greenLight,col:BRAND.green,border:BRAND.green},
      draw:{bg:BRAND.amberLight,col:BRAND.amber,border:BRAND.amber},
      j2:{bg:BRAND.redLight,col:BRAND.red,border:BRAND.red}
    };
    const c = configs[val];
    return {
      flex:1, padding:"11px 6px", textAlign:"center", fontSize:13, cursor:"pointer",
      borderRadius:8, fontWeight:active?600:400,
      background:active?c.bg:"#fff",
      color:active?c.col:BRAND.textMuted,
      border:`1px solid ${active?c.border:BRAND.border}`,
      transition:"all 0.15s", userSelect:"none"
    };
  };

  return React.createElement("div", null,

    // HEADER
    React.createElement("div", {style:{background:BRAND.blue,margin:"-1.5rem -1rem 1.5rem",padding:"1.25rem 1.25rem 0"}},
      React.createElement("div", {style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem"}},
        React.createElement("div", {style:{display:"flex",alignItems:"center",gap:12}},
          React.createElement("div", {style:{width:44,height:44,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}, "🎾"),
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.2}}, "Team Olimpia"),
            React.createElement("div", {style:{fontSize:12,color:"rgba(255,255,255,0.75)",marginTop:2}}, "CEM Olímpia · Temporada 26/27")
          )
        ),
        React.createElement("button", {
          onClick:loadData,
          style:{fontSize:12,padding:"6px 12px",cursor:"pointer",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,color:"#fff"}
        }, "↻ Actualizar")
      ),

      // TABS en el header
      React.createElement("div", {style:{display:"flex"}},
        React.createElement("button", {onClick:()=>setTab("ranking"),style:{...tabStyle("ranking"),color:tab==="ranking"?"#fff":"rgba(255,255,255,0.6)",borderBottom:tab==="ranking"?"2px solid #fff":"2px solid transparent"}}, "Ranking"),
        React.createElement("button", {onClick:()=>setTab("partido"),style:{...tabStyle("partido"),color:tab==="partido"?"#fff":"rgba(255,255,255,0.6)",borderBottom:tab==="partido"?"2px solid #fff":"2px solid transparent"}}, "Registrar partido"),
        React.createElement("button", {onClick:()=>setTab("historial"),style:{...tabStyle("historial"),color:tab==="historial"?"#fff":"rgba(255,255,255,0.6)",borderBottom:tab==="historial"?"2px solid #fff":"2px solid transparent"}}, "Historial")
      )
    ),

    error && React.createElement("div", {
      style:{background:BRAND.redLight,color:BRAND.red,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:"1rem",border:`1px solid ${BRAND.red}33`}
    }, "⚠️ "+error),

    // RANKING
    tab==="ranking" && React.createElement("div", null,
      loading && React.createElement("div", {style:{color:BRAND.textMuted,fontSize:14,padding:"2rem 0",textAlign:"center"}}, "⏳ Carregant classificació..."),
      !loading && sorted.map((p,i) => {
        const isSP = SP_PLAYERS.includes(p.nombre) && p.jugados===0;
        const col = ZONE_COLORS[Math.min(i,ZONE_COLORS.length-1)];
        const pct = Math.round((p.pts/maxPts)*100);
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        return React.createElement(Card, {key:p.nombre, style:{marginBottom:8,padding:"12px 16px"}},
          React.createElement("div", {style:{display:"flex",alignItems:"center",gap:12}},
            React.createElement("span", {style:{fontSize:i<3?18:14,color:BRAND.textLight,width:26,textAlign:"right",flexShrink:0,fontWeight:500}}, isSP?"—":medal||i+1),
            React.createElement(Avatar, {name:p.nombre,size:34,color:col}),
            React.createElement("div", {style:{flex:1}},
              React.createElement("div", {style:{fontSize:15,fontWeight:600,color:BRAND.text,marginBottom:4}}, p.nombre),
              React.createElement("div", {style:{height:4,background:"#eef1f6",borderRadius:2,overflow:"hidden"}},
                React.createElement("div", {style:{height:"100%",borderRadius:2,background:col,width:`${pct}%`,transition:"width 0.5s ease"}})
              )
            ),
            isSP
              ? React.createElement("span", {style:{fontSize:12,color:BRAND.textLight,background:"#f0f2f5",padding:"3px 8px",borderRadius:6,flexShrink:0}}, "S/P")
              : React.createElement("span", {style:{fontSize:17,fontWeight:700,color:col,minWidth:42,textAlign:"right",flexShrink:0}}, p.pts)
          )
        );
      }),
      !loading && React.createElement("div", {style:{display:"flex",gap:16,marginTop:"1rem",padding:"12px 16px",background:"#fff",borderRadius:10,border:`1px solid ${BRAND.border}`}},
        [{col:BRAND.blue,label:"Top 2"},{col:BRAND.amber,label:"3–7"},{col:BRAND.green,label:"8–14"},{col:BRAND.textLight,label:"S/P"}].map(z =>
          React.createElement("div", {key:z.label,style:{display:"flex",alignItems:"center",gap:6}},
            React.createElement("div", {style:{width:8,height:8,borderRadius:"50%",background:z.col}}),
            React.createElement("span", {style:{fontSize:11,color:BRAND.textMuted}}, z.label)
          )
        )
      )
    ),

    // REGISTRAR PARTIDO
    tab==="partido" && React.createElement("div", {style:{display:"flex",flexDirection:"column",gap:12}},
      React.createElement(Card, null,
        React.createElement(SectionLabel, {text:"Jugadors"}),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"end"}},
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:BRAND.textMuted,marginBottom:5}}, "Jugador 1"),
            React.createElement("select", {value:j1,onChange:e=>setJ1(e.target.value)}, names.map(n=>React.createElement("option",{key:n},n)))
          ),
          React.createElement("div", {style:{fontSize:13,fontWeight:600,color:BRAND.textLight,paddingBottom:8,textAlign:"center"}}, "vs"),
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:BRAND.textMuted,marginBottom:5}}, "Jugador 2"),
            React.createElement("select", {value:j2,onChange:e=>setJ2(e.target.value)}, names.filter(n=>n!==j1).map(n=>React.createElement("option",{key:n},n)))
          )
        )
      ),

      React.createElement(Card, null,
        React.createElement(SectionLabel, {text:"Resultat"}),
        React.createElement("div", {style:{display:"flex",gap:8,marginBottom:14}},
          React.createElement("div", {onClick:()=>setResult("j1"),style:rBtnStyle("j1")}, j1+" guanya"),
          React.createElement("div", {onClick:()=>setResult("draw"),style:rBtnStyle("draw")}, "Empat"),
          React.createElement("div", {onClick:()=>setResult("j2"),style:rBtnStyle("j2")}, j2+" guanya")
        ),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          [{name:j1,pts:prev1,bonus:b1},{name:j2,pts:prev2,bonus:b2}].map(pl =>
            React.createElement("div", {key:pl.name,style:{background:BRAND.bg,borderRadius:8,padding:"12px",textAlign:"center",border:`1px solid ${BRAND.border}`}},
              React.createElement("div", {style:{fontSize:11,color:BRAND.textMuted,marginBottom:6,fontWeight:500}}, pl.name),
              React.createElement("div", {style:{fontSize:24,fontWeight:700,color:pl.pts>0?BRAND.green:pl.pts<0?BRAND.red:BRAND.textMuted}}, (pl.pts>0?"+":"")+pl.pts),
              pl.bonus&&React.createElement("div", {style:{fontSize:11,color:BRAND.green,marginTop:3}}, pl.bonus)
            )
          )
        )
      ),

      React.createElement(Card, null,
        React.createElement(SectionLabel, {text:"Detalls"}),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}},
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:BRAND.textMuted,marginBottom:5}}, "Data"),
            React.createElement("input", {type:"date",value:fecha,onChange:e=>setFecha(e.target.value)})
          ),
          React.createElement("div", null,
            React.createElement("div", {style:{fontSize:12,color:BRAND.textMuted,marginBottom:5}}, "Sets (opcional)"),
            React.createElement("input", {type:"text",value:sets,onChange:e=>setSets(e.target.value),placeholder:"p.ex. 6-4, 6-3"})
          )
        )
      ),

      React.createElement("button", {
        onClick:saveMatch, disabled:saving||j1===j2,
        style:{width:"100%",padding:"14px",fontSize:15,fontWeight:600,cursor:saving?"wait":"pointer",background:saved?BRAND.green:BRAND.blue,border:"none",borderRadius:12,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s",opacity:j1===j2?0.5:1}
      }, saving?"Guardant...":saved?"✓ Partit guardat":"Desar partit")
    ),

    // HISTORIAL
    tab==="historial" && React.createElement("div", null,
      loading && React.createElement("div", {style:{color:BRAND.textMuted,fontSize:14,padding:"2rem 0",textAlign:"center"}}, "⏳ Carregant..."),
      !loading && matches.length===0 && React.createElement("div", {style:{textAlign:"center",padding:"3rem 0",color:BRAND.textMuted}},
        React.createElement("div", {style:{fontSize:42,marginBottom:12}}, "🎾"),
        React.createElement("div", {style:{fontSize:15,fontWeight:500}}, "Encara no hi ha partits registrats")
      ),
      matches.map((m,i) => {
        const win=m.resultado===m.j1, draw=m.resultado==="Empate";
        const badgeBg=draw?BRAND.amberLight:win?BRAND.greenLight:BRAND.redLight;
        const badgeCol=draw?BRAND.amber:win?BRAND.green:BRAND.red;
        const label=draw?"Empat":`${m.resultado} guanya`;
        return React.createElement(Card, {key:i,style:{marginBottom:8,padding:"12px 16px"}},
          React.createElement("div", {style:{display:"flex",alignItems:"center",gap:10}},
            React.createElement("span", {style:{fontSize:11,padding:"3px 10px",borderRadius:6,fontWeight:600,background:badgeBg,color:badgeCol,whiteSpace:"nowrap",flexShrink:0}}, label),
            React.createElement("span", {style:{flex:1,fontSize:14,color:BRAND.text,minWidth:0}},
              React.createElement("span", {style:{fontWeight:600}}, m.j1),
              React.createElement("span", {style:{color:BRAND.textLight,margin:"0 5px"}}, "vs"),
              React.createElement("span", {style:{fontWeight:600}}, m.j2),
              m.sets&&m.sets!=="-"&&React.createElement("span", {style:{color:BRAND.textMuted,fontSize:12}}, " · "+m.sets)
            ),
            React.createElement("span", {style:{color:BRAND.textLight,fontSize:12,whiteSpace:"nowrap",flexShrink:0}}, m.fecha),
            React.createElement("div", {style:{display:"flex",gap:4,flexShrink:0}},
              React.createElement(PtsBadge, {val:Number(m.pts_j1)}),
              React.createElement(PtsBadge, {val:Number(m.pts_j2)})
            )
          )
        );
      })
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
