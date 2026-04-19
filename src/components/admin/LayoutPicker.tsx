import { Monitor } from "lucide-react";
type LK = "tech_grid"|"magazine"|"minimal"|"showcase"|"bold"|"boutique";
const L: {key:LK;label:string;desc:string}[] = [
  {key:"tech_grid",label:"Tech Grid",desc:"Dark technical, 12-col hero, 3-col grid"},
  {key:"magazine",label:"Magazine",desc:"Editorial split-screen, overlay cards"},
  {key:"minimal",label:"Minimal",desc:"Centered headline, clean 6-col strip"},
  {key:"showcase",label:"Showcase",desc:"Cinematic hero, horizontal scroll"},
  {key:"bold",label:"Bold",desc:"Oversized type, split hero, bold grid"},
  {key:"boutique",label:"Boutique",desc:"Luxury elegant, refined typography"},
];
const ICONS: Record<LK,string> = {
  tech_grid:"⬛⬛⬛\n⬛⬛⬛",magazine:"▓▓ ▒▒\n▒▒ ▒▒",
  minimal:"━━━\n□□□□□□",showcase:"███\n→→→",
  bold:"■ ▪▪\n▪▪ ▪▪",boutique:"◻ ■\n◻◻◻",
};
export default function LayoutPicker({value,onChange}:{value:string;onChange:(k:LK)=>void}) {
  return (
    <div className="border border-border-subtle bg-chassis p-6">
      <div className="flex items-center gap-2 mb-1">
        <Monitor size={14} className="text-primary"/>
        <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Website Layout</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">Choose your storefront design. Takes effect immediately after saving.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {L.map(l=>{
          const active = value===l.key;
          return (
            <button key={l.key} type="button" onClick={()=>onChange(l.key)}
              className={`text-left border-2 p-4 transition-all ${active?"border-primary bg-primary/5":"border-border-subtle hover:border-primary/50 bg-admin-bg"}`}>
              <div className={`h-24 mb-3 flex items-center justify-center border rounded font-mono text-[9px] whitespace-pre-wrap leading-relaxed ${active?"border-primary/40 text-primary":"border-border-subtle text-muted-foreground"}`}>
                <LayoutPreview id={l.key} active={active}/>
              </div>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-xs font-bold uppercase tracking-wide ${active?"text-primary":"text-foreground"}`}>{l.label}</p>
                {active&&<span className="font-mono-tech text-[9px] text-primary">✓ ACTIVE</span>}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">{l.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutPreview({id,active}:{id:LK;active:boolean}) {
  const c = active?"bg-primary/20":"bg-[#1c1c1c]";
  const h = active?"bg-primary/40":"bg-[#2a2a2a]";
  const a = active?"bg-primary/60":"bg-orange-500/40";
  if(id==="tech_grid") return <div className="w-full h-full p-1.5 flex flex-col gap-1"><div className="flex gap-1 flex-1"><div className={`w-1/3 ${c} flex flex-col gap-0.5 p-1`}><div className={`h-1.5 w-2/3 ${a} rounded-sm`}/><div className={`h-3 ${h} rounded-sm`}/></div><div className={`flex-1 ${h} rounded-sm`}/><div className={`w-1/4 flex flex-col gap-0.5`}>{[0,1,2].map(i=><div key={i} className={`flex-1 ${c} rounded-sm`}/>)}</div></div><div className="grid grid-cols-3 gap-0.5 h-7">{[0,1,2].map(i=><div key={i} className={`${c} rounded-sm`}/>)}</div></div>;
  if(id==="magazine") return <div className="w-full h-full p-1.5 flex flex-col gap-1"><div className="flex gap-1 flex-1"><div className={`flex-1 ${h} rounded-sm relative`}><div className={`absolute bottom-1 left-1 h-1 w-1/2 ${a} rounded-sm`}/></div><div className={`w-2/5 ${c} rounded-sm flex flex-col p-1 justify-between`}><div className={`h-3 ${h} rounded-sm`}/>{[0,1].map(i=><div key={i} className="flex gap-0.5"><div className={`size-2 ${h} rounded-sm`}/><div className={`flex-1 h-0.5 ${c} rounded-sm my-auto`}/></div>)}</div></div><div className="grid grid-cols-3 gap-0.5 h-6">{[0,1,2].map(i=><div key={i} className={`${h} rounded-sm`}/>)}</div></div>;
  if(id==="minimal") return <div className="w-full h-full p-1.5 flex flex-col items-center justify-center gap-1"><div className={`h-0.5 w-1/3 ${a} rounded-sm`}/><div className={`h-4 w-3/4 ${h} rounded-sm`}/><div className={`h-1 w-1/2 ${c} rounded-sm`}/><div className="flex gap-1 mt-1"><div className={`h-2.5 w-10 ${h} rounded-sm`}/><div className={`h-2.5 w-8 border border-[#333] rounded-sm`}/></div><div className="grid grid-cols-6 gap-0.5 w-full mt-1">{[0,1,2,3,4,5].map(i=><div key={i} className={`aspect-square ${c} rounded-sm`}/>)}</div></div>;
  if(id==="showcase") return <div className="w-full h-full p-1.5 flex flex-col gap-1"><div className={`flex-1 ${h} rounded-sm relative`}><div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 rounded-sm"/><div className="absolute bottom-1 left-1.5 space-y-0.5"><div className={`h-2.5 w-14 ${c} rounded-sm`}/><div className={`h-1.5 w-8 ${a} rounded-sm`}/></div></div><div className="flex gap-0.5 h-6 overflow-hidden">{[0,1,2,3].map(i=><div key={i} className={`w-7 shrink-0 ${c} rounded-sm`}/>)}</div><div className="grid grid-cols-3 gap-0.5 h-5">{[0,1,2].map(i=><div key={i} className={`${h} rounded-sm`}/>)}</div></div>;
  if(id==="bold") return <div className="w-full h-full p-1.5 flex flex-col gap-1"><div className="flex gap-1 flex-1"><div className={`flex-1 ${c} flex flex-col justify-center p-1 gap-0.5`}><div className={`h-5 ${h} rounded-sm`}/><div className={`h-1 w-2/3 ${c} rounded-sm`}/><div className={`h-2 w-1/2 ${a} rounded-sm mt-0.5`}/></div><div className="flex-1 flex flex-col gap-0.5">{[0,1,2].map(i=><div key={i} className={`flex-1 ${c} flex items-center px-1 gap-0.5`}><span className={`text-[7px] font-mono ${active?"text-primary/60":"text-orange-500/30"}`}>0{i+1}</span><div className={`flex-1 h-1 ${h} rounded-sm`}/></div>)}</div></div><div className="grid grid-cols-3 gap-0.5 h-6">{[0,1,2].map(i=><div key={i} className={`${c} rounded-sm`}/>)}</div></div>;
  if(id==="boutique") return <div className="w-full h-full p-1.5 flex flex-col gap-1"><div className="flex gap-1.5 flex-1"><div className="flex-1 flex flex-col justify-center gap-1 p-0.5"><div className={`h-0.5 w-6 ${a} rounded-sm`}/><div className={`h-4 ${h} rounded-sm`}/><div className={`h-1 w-3/4 ${c} rounded-sm`}/><div className={`h-2 w-1/2 ${h} rounded-sm mt-0.5`}/></div><div className={`w-2/5 ${c} rounded-sm`}/></div><div className="grid grid-cols-3 gap-0.5 h-8">{[0,1,2].map(i=><div key={i} className={`${c} rounded-sm`}/>)}</div></div>;
  return null;
}
