const { useState, useEffect } = React;

const SB_URL = "https://qcymlmxlqwhipmzlatof.supabase.co";
const SB_KEY = "sb_publishable_aQ-IZF9_-u2jKc4lYMaLEg_nHJQIjaA";
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "return=representation"
};

const BRAND = {
  blue: "#1B75BB", blueDark: "#145a92", blueLight: "#e8f2fb", blueMid: "#c2ddf5",
  bg: "#f4f6f9", card: "#ffffff", border: "#dde3ed",
  text: "#1a1a2e", textMuted: "#6b7a99", textLight: "#a0aec0",
  green: "#1D9E75", greenLight: "#e1f5ee",
  amber: "#e8920a", amberLight: "#fef3e2",
  red: "#d63b3b", redLight: "#fdeaea",
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

// ── ALGORITMO ──────────────────────────────────────────────────────────────
function calcEloPoints(ptsGanador, ptsPerdedor) {
  const diff = ptsPerdedor - ptsGanador; // positivo = rival más fuerte
  let ptsWin, ptsLose;
  if (diff >= 26)       { ptsWin = 5; ptsLose = -1; }
  else if (diff >= 11)  { ptsWin = 4; ptsLose = -1; }
  else if (diff >= 0)   { ptsWin = 3; ptsLose = -1; }
  else if (diff >= -10) { ptsWin = 2; ptsLose = -2; }
  else                  { ptsWin = 2; ptsLose = -3; }
  return { ptsWin, ptsLose };
}

function calcStreakBonus(victoriasSeguidas) {
  return victoriasSeguidas >= 3 ? 1 : 0;
}

function calcInactivityPenalty(mesesSinJugar) {
  if (mesesSinJugar >= 3) return -5;
  if (mesesSinJugar === 2) return -3;
  if (mesesSinJugar === 1) return -1;
  return 0;
}

function isRankingActive(date) {
  const m = new Date(date).getMonth() + 1; // 1-12
  return m !== 7 && m !== 8; // julio y agosto excluidos
}

function calcPoints(j1name, j2name, result, players) {
  const pl1 = players.find(p => p.nombre === j1name);
  const pl2 = players.find(p => p.nombre === j2name);
  if (!pl1 || !pl2) return {p1:0, p2:0, b1:"", b2:""};

  const r1 = players.findIndex(p => p.nombre === j1name);
  const r2 = players.findIndex(p => p.nombre === j2name);

  let p1=0, p2=0, b1="", b2="";

  if (result === "j1") {
    const {ptsWin, ptsLose} = calcEloPoints(pl1.pts, pl2.pts);
    const streak = calcStreakBonus((pl1.racha_victorias || 0) + 1);
    p1 = ptsWin + streak;
    p2 = ptsLose;
    if (ptsWin > 3) b1 = `+${ptsWin} ELO`;
    if (streak > 0) b1 += (b1?" · ":"") + "+1 racha";
    if (ptsLose < -1) b2 = `${ptsLose} ELO`;
  } else if (result === "j2") {
    const {ptsWin, ptsLose} = calcEloPoints(pl2.pts, pl1.pts);
    const streak = calcStreakBonus((pl2.racha_victorias || 0) + 1);
    p2 = ptsWin + streak;
    p1 = ptsLose;
    if (ptsWin > 3) b2 = `+${ptsWin} ELO`;
    if (streak > 0) b2 += (b2?" · ":"") + "+1 racha";
    if (ptsLose < -1) b1 = `${ptsLose} ELO`;
  } else {
    // Empate: ranking position logic
    p1 = r1 < r2 ? -1 : 1;
    p2 = r2 < r1 ? -1 : 1;
  }

  return {p1, p2, b1, b2};
}
// ──────────────────────────────────────────────────────────────────────────

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
    } catch(e) { setError("No se pudo conectar. Comprueba la conexión."); }
    setLoading(false);
  }

  async function seedPlayers() {
    try {
      await sbPost("jugadores", INITIAL_PLAYERS.map(p=>({
        nombre:p.nombre, pts:p.pts, jugados:0, victorias:0, derrotas:0, empates:0,
        racha_victorias:0, meses_sin_jugar:0
      })));
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
    const active = isRankingActive(fecha);

    try {
      await sbPost("partidos",{
        id:Date.now(), fecha, j1, j2, resultado:resultLabel,
        sets:sets||"-", pts_j1:active?p1:0, pts_j2:active?p2:0
      });

      if (active) {
        const pl1=players.find(p=>p.nombre===j1);
        const pl2=players.find(p=>p.nombre===j2);

        // Calcular nueva racha
        const racha1 = result==="j1" ? (pl1.racha_victorias||0)+1 : (result==="draw" ? (pl1.racha_victorias||0) : 0);
        const racha2 = result==="j2" ? (pl2.racha_victorias||0)+1 : (result==="draw" ? (pl2.racha_victorias||0) : 0);

        await sbPatch("jugadores",`nombre=eq.${encodeURIComponent(j1)}`,{
          pts: pl1.pts+p1, jugados: pl1.jugados+1,
          victorias: pl1.victorias+(result==="j1"?1:0),
          derrotas: pl1.derrotas+(result==="j2"?1:0),
          empates: pl1.empates+(result==="draw"?1:0),
          racha_victorias: racha1, meses_sin_jugar: 0
        });
        await sbPatch("jugadores",`nombre=eq.${encodeURIComponent(j2)}`,{
          pts: pl2.pts+p2, jugados: pl2.jugados+1,
          victorias: pl2.victorias+(result==="j2"?1:0),
          derrotas: pl2.derrotas+(result==="j1"?1:0),
          empates: pl2.empates+(result==="draw"?1:0),
          racha_victorias: racha2, meses_sin_jugar: 0
        });
      }

      setSaved(true); setSets("");
      setTimeout(()=>{ setSaved(false); setTab("ranking"); }, 1800);
      await loadData();
    } catch(e) { setError("Error en guardar el partit."); }
    setSaving(false);
  }

  const tabStyle = (id) => ({
    padding:"11px 18px", fontSize:14, cursor:"pointer", fontWeight:500, background:"none", border:"none",
    color: tab===id?"#fff":"rgba(255,255,255,0.6)",
    borderBottom: tab===id?"2px solid #fff":"2px solid transparent",
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
      background:active?c.bg:"#fff", color:active?c.col:BRAND.textMuted,
      border:`1px solid ${active?c.border:BRAND.border}`,
      transition:"all 0.15s", userSelect:"none"
    };
  };

  const activeMonth = isRankingActive(fecha);

  return React.createElement("div", null,

    // HEADER AZUL
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
      React.createElement("div", {style:{display:"flex"}},
        ["ranking","partido","historial"].map(id =>
          React.createElement("button", {key:id, onClick:()=>setTab(id), style:tabStyle(id)},
            id==="ranking"?"Ranking":id==="partido"?"Registrar partido":"Historial"
          )
        )
      )
    ),

    error && React.createElement("div", {
      style:{background:BRAND.redLight,color:BRAND.red,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:"1rem",border:`1px solid ${BRAND.red}33`}
    }, "⚠️ "+error),

    // ── RANKING ──
    tab==="ranking" && React.createElement("div", null,
      loading && React.createElement("div", {style:{color:BRAND.textMuted,fontSize:14,padding:"2rem 0",textAlign:"center"}}, "⏳ Cargando clasificación..."),
      !loading && sorted.map((p,i) => {
        const isSP = SP_PLAYERS.includes(p.nombre) && p.jugados===0;
        const col = ZONE_COLORS[Math.min(i,ZONE_COLORS.length-1)];
        const pct = Math.round((p.pts/maxPts)*100);
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
        const streak = p.racha_victorias || 0;
        return React.createElement(Card, {key:p.nombre, style:{marginBottom:8,padding:"12px 16px"}},
          React.createElement("div", {style:{display:"flex",alignItems:"center",gap:12}},
            React.createElement("span", {style:{fontSize:i<3?18:14,color:BRAND.textLight,width:26,textAlign:"right",flexShrink:0,fontWeight:500}}, isSP?"—":medal||i+1),
            React.createElement(Avatar, {name:p.nombre,size:34,color:col}),
            React.createElement("div", {style:{flex:1}},
              React.createElement("div", {style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
                React.createElement("span", {style:{fontSize:15,fontWeight:600,color:BRAND.text}}, p.nombre),
                streak>=3 && React.createElement("span", {
                  style:{fontSize:10,fontWeight:700,background:BRAND.amberLight,color:BRAND.amber,padding:"2px 6px",borderRadius:4}
                }, `🔥 ${streak} seguits`)
              ),
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

    // ── REGISTRAR PARTIDO ──
    tab==="partido" && React.createElement("div", {style:{display:"flex",flexDirection:"column",gap:12}},


      React.createElement(Card, null,
        React.createElement(SectionLabel, {text:"Jugadores"}),
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
        React.createElement(SectionLabel, {text:"Resultado"}),
        React.createElement("div", {style:{display:"flex",gap:8,marginBottom:14}},
          React.createElement("div", {onClick:()=>setResult("j1"),style:rBtnStyle("j1")}, j1+" gana"),
          React.createElement("div", {onClick:()=>setResult("draw"),style:rBtnStyle("draw")}, "Empate"),
          React.createElement("div", {onClick:()=>setResult("j2"),style:rBtnStyle("j2")}, j2+" gana")
        ),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          [{name:j1,pts:activeMonth?prev1:0,bonus:activeMonth?b1:""},{name:j2,pts:activeMonth?prev2:0,bonus:activeMonth?b2:""}].map(pl =>
            React.createElement("div", {key:pl.name,style:{background:BRAND.bg,borderRadius:8,padding:"12px",textAlign:"center",border:`1px solid ${BRAND.border}`}},
              React.createElement("div", {style:{fontSize:11,color:BRAND.textMuted,marginBottom:6,fontWeight:500}}, pl.name),
              React.createElement("div", {style:{fontSize:24,fontWeight:700,color:pl.pts>0?BRAND.green:pl.pts<0?BRAND.red:BRAND.textMuted}},
                activeMonth ? (pl.pts>0?"+":"")+pl.pts : "—"
              ),
              pl.bonus && React.createElement("div", {style:{fontSize:11,color:BRAND.blue,marginTop:3}}, pl.bonus)
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
      }, saving?"Guardando...":saved?"✓ Partido guardado":"Guardar partido"),

      React.createElement(Card, {style:{padding:"1.25rem"}},
        React.createElement(SectionLabel, {text:"Cómo funcionan los puntos"}),

        // ELO
        React.createElement("div", {style:{marginBottom:16}},
          React.createElement("div", {style:{fontSize:13,fontWeight:600,color:BRAND.text,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span", {style:{background:BRAND.blueLight,color:BRAND.blue,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700}}, "ELO"),
            "Puntos según el nivel del rival"
          ),
          React.createElement("div", {style:{fontSize:12,color:BRAND.textMuted,lineHeight:1.6,marginBottom:10}},
            "Los puntos no son fijos. Cuanto más fuerte es tu rival, más ganas si le vences y menos pierdes si caes. Así el ranking refleja el mérito real de cada victoria."
          ),
          React.createElement("div", {style:{background:BRAND.bg,borderRadius:8,overflow:"hidden",border:`1px solid ${BRAND.border}`}},
            React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr auto auto",fontSize:11,fontWeight:600,color:BRAND.textMuted,padding:"6px 12px",borderBottom:`1px solid ${BRAND.border}`,background:"#eef1f6"}},
              React.createElement("span", null, "Situación"),
              React.createElement("span", {style:{textAlign:"center",minWidth:40}}, "Ganador"),
              React.createElement("span", {style:{textAlign:"center",minWidth:40}}, "Perdedor")
            ),
            [
              ["Rival tiene +26 pts más que tú", "+5", "-1"],
              ["Rival tiene +11 a +25 pts más", "+4", "-1"],
              ["Rival similar (diferencia 0–10 pts)", "+3", "-1"],
              ["Rival tiene 1–10 pts menos", "+2", "-2"],
              ["Rival tiene 11+ pts menos", "+2", "-3"],
            ].map(([label, win, lose], i) =>
              React.createElement("div", {key:i, style:{display:"grid",gridTemplateColumns:"1fr auto auto",fontSize:12,padding:"7px 12px",borderBottom:i<4?`1px solid ${BRAND.border}`:"none",background:i%2===0?"#fff":BRAND.bg}},
                React.createElement("span", {style:{color:BRAND.textMuted}}, label),
                React.createElement("span", {style:{textAlign:"center",fontWeight:700,color:BRAND.green,minWidth:40}}, win),
                React.createElement("span", {style:{textAlign:"center",fontWeight:700,color:BRAND.red,minWidth:40}}, lose)
              )
            )
          )
        ),

        // EMPATE
        React.createElement("div", {style:{marginBottom:16}},
          React.createElement("div", {style:{fontSize:13,fontWeight:600,color:BRAND.text,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span", {style:{background:BRAND.amberLight,color:BRAND.amber,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700}}, "EMPATE"),
            "Ventaja para el que sube"
          ),
          React.createElement("div", {style:{fontSize:12,color:BRAND.textMuted,lineHeight:1.6}}),
          React.createElement("div", {style:{background:BRAND.bg,borderRadius:8,border:`1px solid ${BRAND.border}`,padding:"10px 12px",fontSize:12,color:BRAND.textMuted,lineHeight:1.7}},
            "En un empate o partido no completado, el jugador mejor clasificado pierde ",
            React.createElement("span", {style:{fontWeight:700,color:BRAND.red}}, "−1 pt"),
            " y el peor clasificado gana ",
            React.createElement("span", {style:{fontWeight:700,color:BRAND.green}}, "+1 pt"),
            ". Competir hacia arriba siempre compensa."
          )
        ),

        // RACHA
        React.createElement("div", {style:{marginBottom:16}},
          React.createElement("div", {style:{fontSize:13,fontWeight:600,color:BRAND.text,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span", {style:{background:BRAND.amberLight,color:BRAND.amber,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700}}, "🔥 RACHA"),
            "Bonus por victorias consecutivas"
          ),
          React.createElement("div", {style:{background:BRAND.bg,borderRadius:8,border:`1px solid ${BRAND.border}`,padding:"10px 12px",fontSize:12,color:BRAND.textMuted,lineHeight:1.7}}),
          React.createElement("div", {style:{background:BRAND.bg,borderRadius:8,border:`1px solid ${BRAND.border}`,padding:"10px 12px",fontSize:12,color:BRAND.textMuted,lineHeight:1.7}},
            "A partir de la ",
            React.createElement("span", {style:{fontWeight:700,color:BRAND.text}}, "3ª victoria consecutiva"),
            " sumas ",
            React.createElement("span", {style:{fontWeight:700,color:BRAND.green}}, "+1 pt extra"),
            " por cada nueva victoria mientras no pierdas. Un empate no rompe la racha, una derrota sí."
          )
        ),

        // INACTIVIDAD
        React.createElement("div", {style:{marginBottom:16}},
          React.createElement("div", {style:{fontSize:13,fontWeight:600,color:BRAND.text,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span", {style:{background:BRAND.redLight,color:BRAND.red,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700}}, "INACTIVIDAD"),
            "Penalización por no jugar"
          ),
          React.createElement("div", {style:{background:BRAND.bg,borderRadius:8,overflow:"hidden",border:`1px solid ${BRAND.border}`}},
            [
              ["1 mes sin jugar", "−1 pt"],
              ["2 meses consecutivos sin jugar", "−3 pts"],
              ["3 o más meses consecutivos sin jugar", "−5 pts"],
            ].map(([label, pen], i) =>
              React.createElement("div", {key:i, style:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"7px 12px",borderBottom:i<2?`1px solid ${BRAND.border}`:"none",background:i%2===0?"#fff":BRAND.bg}},
                React.createElement("span", {style:{color:BRAND.textMuted}}, label),
                React.createElement("span", {style:{fontWeight:700,color:BRAND.red}}, pen)
              )
            )
          )
        ),

        // CALENDARIO
        React.createElement("div", {style:{background:BRAND.blueLight,borderRadius:8,padding:"10px 12px",border:`1px solid ${BRAND.blueMid}`,fontSize:12,color:BRAND.blue,lineHeight:1.7}},
          React.createElement("span", {style:{fontWeight:700}},           "📅 Calendario: "),
          "Puedes registrar partidos desde ya. Los puntos y el ranking ",
          React.createElement("span", {style:{fontWeight:700}}, "ya se actualizan"),
          ". La actividad de julio y agosto ",
          React.createElement("span", {style:{fontWeight:700}}, "no se tendrá en cuenta"),
          " para el índice de inactividad, que empezará a partir de ",
          React.createElement("span", {style:{fontWeight:700}}, "septiembre"),
          "."
        )
      )
    ),

    // ── HISTORIAL ──
    tab==="historial" && React.createElement("div", null,
      loading && React.createElement("div", {style:{color:BRAND.textMuted,fontSize:14,padding:"2rem 0",textAlign:"center"}}, "⏳ Cargando..."),
      !loading && matches.length===0 && React.createElement("div", {style:{textAlign:"center",padding:"3rem 0",color:BRAND.textMuted}},
        React.createElement("div", {style:{fontSize:42,marginBottom:12}}, "🎾"),
        React.createElement("div", {style:{fontSize:15,fontWeight:500}}, "Aún no hay partidos registrados")
      ),
      matches.map((m,i) => {
        const win=m.resultado===m.j1, draw=m.resultado==="Empate";
        const inactive = m.pts_j1===0 && m.pts_j2===0;
        const badgeBg=inactive?"#f0f2f5":draw?BRAND.amberLight:win?BRAND.greenLight:BRAND.redLight;
        const badgeCol=inactive?BRAND.textMuted:draw?BRAND.amber:win?BRAND.green:BRAND.red;
        const label=inactive?"Sin puntos":draw?"Empate":`${m.resultado} gana`;
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
            !inactive && React.createElement("div", {style:{display:"flex",gap:4,flexShrink:0}},
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
