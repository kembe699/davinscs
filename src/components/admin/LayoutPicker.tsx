import { Monitor } from "lucide-react";
type LK = "tech_grid"|"magazine"|"minimal"|"showcase"|"bold"|"boutique";
const L: {key:LK;label:string;desc:string;tag:string}[] = [
  {key:"tech_grid",  label:"Tech Grid",  desc:"Dark store, sticky nav, mega hero, 4-col product grid",   tag:"POPULAR"},
  {key:"magazine",   label:"Magazine",   desc:"Editorial split-screen, featured banner, card overlays",   tag:"EDITORIAL"},
  {key:"minimal",    label:"Minimal",    desc:"White-space, centered search hero, clean product strip",   tag:"CLEAN"},
  {key:"showcase",   label:"Showcase",   desc:"Full-width cinematic hero, horizontal scroll collections", tag:"PREMIUM"},
  {key:"bold",       label:"Bold",       desc:"Oversized typography, split hero, high-contrast grid",     tag:"IMPACT"},
  {key:"boutique",   label:"Boutique",   desc:"Luxury serif, curated layout, refined product tiles",      tag:"LUXURY"},
];

export default function LayoutPicker({value,onChange}:{value:string;onChange:(k:LK)=>void}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Monitor size={14} className="text-primary"/>
        <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Website Layout</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">Choose your storefront design. Takes effect immediately after saving.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {L.map(l => {
          const active = value === l.key;
          return (
            <button key={l.key} type="button" onClick={() => onChange(l.key)}
              className={`text-left rounded-lg overflow-hidden transition-all border-2 ${active ? "border-primary shadow-lg shadow-primary/10" : "border-border-subtle hover:border-primary/40"}`}>
              {/* Browser chrome */}
              <div className={`${active ? "bg-primary/10" : "bg-[#141414]"} px-2 py-1.5 flex items-center gap-1.5 border-b ${active ? "border-primary/20" : "border-[#2a2a2a]"}`}>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/60"/>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60"/>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500/60"/>
                </div>
                <div className={`flex-1 h-2 rounded-sm text-[6px] flex items-center px-1 ${active ? "bg-primary/10 text-primary/60" : "bg-[#222] text-[#555]"}`}>
                  shop.example.com
                </div>
              </div>
              {/* Website preview */}
              <div className="h-32 overflow-hidden">
                <EcomPreview id={l.key} active={active}/>
              </div>
              {/* Label */}
              <div className={`px-3 py-2.5 flex items-center justify-between ${active ? "bg-primary/5" : "bg-admin-bg"}`}>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${active ? "text-primary" : "text-foreground"}`}>{l.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{l.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${active ? "bg-primary text-background" : "bg-[#222] text-[#666]"}`}>{l.tag}</span>
                  {active && <span className="text-[8px] text-primary font-mono">✓ ACTIVE</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shared mini-components ─────────────────────────────── */
function Bar({w,h="h-1",col}:{w:string;h?:string;col:string}) {
  return <div className={`${h} ${w} ${col} rounded-sm`}/>;
}
function ProductCard({col,accent,img}:{col:string;accent:string;img:string}) {
  return (
    <div className={`${col} rounded-sm overflow-hidden flex flex-col`}>
      <div className={`${img} flex-1`}/>
      <div className="p-0.5 space-y-0.5">
        <Bar w="w-3/4" col={col.replace("bg-","bg-").replace("/20","/40")}/>
        <Bar w="w-1/2" h="h-0.5" col={accent}/>
      </div>
    </div>
  );
}

/* ─── Per-layout e-commerce previews ─────────────────────── */
function EcomPreview({id,active}:{id:LK;active:boolean}) {
  const ac  = active ? "bg-primary"     : "bg-orange-500";
  const ac2 = active ? "bg-primary/60"  : "bg-orange-500/50";
  const nav = active ? "bg-[#0d1a2d]"   : "bg-[#0f0f0f]";
  const bg  = active ? "bg-[#0a1628]"   : "bg-[#111]";
  const muted = active ? "bg-primary/20" : "bg-[#222]";
  const dim   = active ? "bg-primary/10" : "bg-[#1a1a1a]";
  const txt   = active ? "bg-primary/40" : "bg-[#333]";
  const img   = active ? "bg-primary/30" : "bg-[#2a2a2a]";

  /* ── 1. Tech Grid ─────────────────────────────────────────── */
  if (id === "tech_grid") return (
    <div className={`w-full h-full ${bg} flex flex-col text-[0px]`}>
      {/* Sticky nav */}
      <div className={`${nav} px-2 py-1 flex items-center gap-1.5`}>
        <div className={`w-6 h-2 ${ac} rounded-sm`}/>
        <div className="flex-1 flex items-center gap-0.5">
          {["HOME","SHOP","DEALS","ABOUT"].map(n=><div key={n} className={`h-1 w-4 ${muted} rounded-sm`}/>)}
        </div>
        {/* search bar */}
        <div className={`flex items-center gap-0.5 ${dim} rounded-sm px-1 py-0.5 w-16`}>
          <div className="w-1 h-1 rounded-full border border-[#444]"/>
          <div className={`flex-1 h-0.5 ${txt} rounded-sm`}/>
        </div>
        <div className={`w-3 h-1.5 ${muted} rounded-sm`}/>
        <div className={`w-3 h-1.5 ${muted} rounded-sm`}/>
      </div>
      {/* Hero banner */}
      <div className={`${img} mx-2 mt-1 rounded-sm flex items-center px-2 gap-2`} style={{height:44}}>
        <div className="flex flex-col gap-0.5 flex-1">
          <Bar w="w-1/2" h="h-1" col={ac}/>
          <Bar w="w-3/4" h="h-2" col={txt}/>
          <Bar w="w-1/3" h="h-0.5" col={muted}/>
          <div className={`mt-1 w-8 h-2 ${ac} rounded-sm`}/>
        </div>
        <div className={`w-14 h-full ${muted} rounded-sm`}/>
      </div>
      {/* 4-col product grid */}
      <div className="grid grid-cols-4 gap-1 px-2 mt-1.5 flex-1">
        {[0,1,2,3].map(i=>(
          <div key={i} className={`${dim} rounded-sm flex flex-col overflow-hidden`}>
            <div className={`${img} flex-1`}/>
            <div className="p-0.5">
              <Bar w="w-3/4" h="h-0.5" col={txt}/>
              <Bar w="w-1/2" h="h-0.5" col={ac2}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── 2. Magazine ──────────────────────────────────────────── */
  if (id === "magazine") return (
    <div className={`w-full h-full ${bg} flex flex-col`}>
      {/* Nav */}
      <div className={`${nav} px-2 py-1 flex items-center gap-1`}>
        <div className={`h-1.5 w-8 ${txt} rounded-sm`}/>
        <div className="flex-1"/>
        {/* search */}
        <div className={`flex items-center gap-0.5 ${dim} rounded-sm px-1 py-0.5 w-14`}>
          <div className="w-1 h-1 rounded-full border border-[#444]"/>
          <div className={`flex-1 h-0.5 ${txt} rounded-sm`}/>
        </div>
        <div className={`w-3 h-1.5 ${muted} rounded-sm`}/>
      </div>
      {/* Split hero */}
      <div className="flex gap-1 px-2 mt-1 flex-1">
        <div className={`flex-1 ${img} rounded-sm relative`} style={{minHeight:0}}>
          <div className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-sm`}/>
          <div className="absolute bottom-1 left-1 space-y-0.5">
            <Bar w="w-8" h="h-0.5" col={ac}/>
            <Bar w="w-12" h="h-1" col={txt}/>
            <div className={`w-6 h-1.5 ${ac} rounded-sm mt-0.5`}/>
          </div>
        </div>
        <div className="w-1/3 flex flex-col gap-1">
          {[0,1,2].map(i=>(
            <div key={i} className="flex gap-0.5 flex-1">
              <div className={`w-5 ${img} rounded-sm`}/>
              <div className="flex flex-col justify-center gap-0.5 flex-1">
                <Bar w="w-full" h="h-0.5" col={txt}/>
                <Bar w="w-2/3" h="h-0.5" col={ac2}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Tags row */}
      <div className="flex gap-1 px-2 mt-1 pb-1">
        {[0,1,2,3].map(i=><div key={i} className={`h-2 w-8 ${dim} rounded-full`}/>)}
      </div>
    </div>
  );

  /* ── 3. Minimal ───────────────────────────────────────────── */
  if (id === "minimal") return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Clean white nav */}
      <div className="px-3 py-1.5 flex items-center gap-1 border-b border-gray-100">
        <div className="h-1.5 w-10 bg-gray-800 rounded-sm"/>
        <div className="flex-1 flex items-center justify-center">
          {["Women","Men","Sale","New"].map(n=><div key={n} className="h-1 w-5 mx-1 bg-gray-300 rounded-sm"/>)}
        </div>
        {/* search */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-0.5 w-16">
          <div className="w-1 h-1 rounded-full border border-gray-400"/>
          <div className="flex-1 h-0.5 bg-gray-300 rounded-sm"/>
        </div>
        <div className="w-3 h-1.5 bg-gray-200 rounded-sm ml-1"/>
      </div>
      {/* Centered search hero */}
      <div className="flex flex-col items-center justify-center gap-1 py-2">
        <div className="h-0.5 w-6 bg-gray-300 rounded-sm"/>
        <div className="h-2 w-20 bg-gray-800 rounded-sm"/>
        <div className="h-1 w-14 bg-gray-200 rounded-sm"/>
        <div className="flex items-center gap-1 mt-0.5 bg-gray-100 rounded-full px-2 py-0.5 w-24">
          <div className="w-1 h-1 rounded-full border border-gray-400"/>
          <div className="flex-1 h-0.5 bg-gray-200 rounded-sm"/>
        </div>
      </div>
      {/* 6-col strip */}
      <div className="grid grid-cols-6 gap-0.5 px-2 flex-1 pb-1">
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} className="bg-gray-100 rounded-sm flex flex-col overflow-hidden">
            <div className="bg-gray-200 flex-1"/>
            <div className="p-0.5">
              <div className="h-0.5 w-full bg-gray-300 rounded-sm"/>
              <div className={`h-0.5 w-2/3 ${active?"bg-primary/60":"bg-orange-400/60"} rounded-sm mt-0.5`}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── 4. Showcase ──────────────────────────────────────────── */
  if (id === "showcase") return (
    <div className={`w-full h-full ${bg} flex flex-col`}>
      {/* Transparent nav over hero */}
      <div className="px-2 py-1 flex items-center gap-1 absolute-like" style={{position:"relative",zIndex:1}}>
        <div className={`h-1.5 w-6 ${ac} rounded-sm`}/>
        <div className="flex-1"/>
        {["NEW","COLLECTIONS","SALE"].map(n=><div key={n} className={`h-1 w-5 mx-0.5 ${muted} rounded-sm`}/>)}
        <div className={`flex items-center gap-0.5 ${dim} rounded-sm px-1 py-0.5 w-12`}>
          <div className="w-1 h-1 rounded-full border border-[#555]"/>
          <div className={`flex-1 h-0.5 ${txt} rounded-sm`}/>
        </div>
        <div className={`w-2.5 h-1.5 ${muted} rounded-sm`}/>
      </div>
      {/* Full-width cinematic hero */}
      <div className={`${img} mx-0 relative flex-1`} style={{minHeight:0}}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"/>
        <div className="absolute inset-0 flex flex-col justify-center pl-3 gap-0.5">
          <Bar w="w-1/3" h="h-0.5" col={ac}/>
          <Bar w="w-1/2" h="h-2.5" col={txt}/>
          <Bar w="w-2/5" h="h-1" col={muted}/>
          <div className={`w-8 h-2 ${ac} rounded-sm mt-0.5`}/>
        </div>
      </div>
      {/* Horizontal scroll collections */}
      <div className="flex gap-1 px-2 py-1 overflow-hidden">
        {[0,1,2,3].map(i=>(
          <div key={i} className={`w-12 shrink-0 ${dim} rounded-sm flex flex-col overflow-hidden`}>
            <div className={`${img} h-5`}/>
            <Bar w="w-3/4" col={muted}/>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── 5. Bold ──────────────────────────────────────────────── */
  if (id === "bold") return (
    <div className={`w-full h-full ${bg} flex flex-col`}>
      {/* Nav */}
      <div className={`${nav} px-2 py-1 flex items-center gap-1`}>
        <div className={`h-2 w-10 ${ac} rounded-sm font-black`}/>
        <div className="flex-1"/>
        <div className={`flex items-center gap-0.5 ${dim} rounded-sm px-1 py-0.5 w-14`}>
          <div className="w-1 h-1 rounded-full border border-[#444]"/>
          <div className={`flex-1 h-0.5 ${txt} rounded-sm`}/>
        </div>
        <div className={`w-4 h-1.5 ${ac} rounded-sm ml-1`}/>
      </div>
      {/* Bold split hero */}
      <div className="flex gap-0 flex-1 mx-2 mt-1">
        <div className={`flex-1 ${dim} flex flex-col justify-center p-1.5 gap-0.5`}>
          <Bar w="w-full" h="h-3" col={txt}/>
          <Bar w="w-3/4" h="h-3" col={txt}/>
          <Bar w="w-1/2" h="h-1" col={muted}/>
          <div className={`w-10 h-2 ${ac} rounded-sm mt-0.5`}/>
        </div>
        <div className={`flex-1 ${img} rounded-r-sm`}/>
      </div>
      {/* 3-col bold grid */}
      <div className="grid grid-cols-3 gap-1 px-2 mt-1 pb-1">
        {[0,1,2].map(i=>(
          <div key={i} className={`${dim} rounded-sm`} style={{height:22}}>
            <div className={`${img} h-3 w-full rounded-t-sm`}/>
            <div className="px-0.5 pt-0.5">
              <Bar w="w-2/3" h="h-0.5" col={txt}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── 6. Boutique ──────────────────────────────────────────── */
  if (id === "boutique") return (
    <div className="w-full h-full bg-[#fafaf8] flex flex-col">
      {/* Elegant serif nav */}
      <div className="px-3 py-1.5 flex items-center gap-1 border-b border-gray-200">
        <div className="h-2 w-12 bg-gray-700 rounded-sm" style={{fontFamily:"serif"}}/>
        <div className="flex-1 flex items-center justify-center gap-2">
          {["Maison","Bijoux","Soins","Nous"].map(n=><div key={n} className="h-1 w-5 bg-gray-300 rounded-sm"/>)}
        </div>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-sm px-1.5 py-0.5 w-14">
          <div className="w-1 h-1 rounded-full border border-gray-400"/>
          <div className="flex-1 h-0.5 bg-gray-300 rounded-sm"/>
        </div>
        <div className="w-2.5 h-1.5 bg-gray-200 rounded-sm ml-1"/>
      </div>
      {/* Centered brand hero */}
      <div className="flex flex-col items-center justify-center py-1.5 gap-0.5">
        <div className="h-0.5 w-4 bg-gray-400 rounded-sm"/>
        <div className="h-1.5 w-16 bg-gray-700 rounded-sm"/>
        <div className="h-0.5 w-12 bg-gray-300 rounded-sm"/>
        <div className={`w-8 h-1.5 ${active?"bg-primary":"bg-gray-800"} rounded-sm mt-0.5`}/>
      </div>
      {/* 4-col curated product tiles */}
      <div className="grid grid-cols-4 gap-1 px-2 flex-1 pb-1">
        {[0,1,2,3].map(i=>(
          <div key={i} className="bg-gray-100 rounded-sm flex flex-col overflow-hidden">
            <div className="bg-gray-200 flex-1"/>
            <div className="p-0.5">
              <div className="h-0.5 w-full bg-gray-300 rounded-sm"/>
              <div className={`h-0.5 w-1/2 ${active?"bg-primary/60":"bg-gray-500"} rounded-sm mt-0.5`}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}
