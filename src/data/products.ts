// Camera images
import sonyFx3Img from "@/assets/products/sony-fx3.jpg";
import bmpcc6kG2Img from "@/assets/products/bmpcc-6k-g2.jpg";
import canonR5cImg from "@/assets/products/canon-r5c.jpg";
import nikonZ9Img from "@/assets/products/nikon-z9.jpg";
import redVRaptorImg from "@/assets/products/red-v-raptor.jpg";
import fujifilmXH2sImg from "@/assets/products/fujifilm-x-h2s.jpg";
// Lens images
import sigma1835Img from "@/assets/products/sigma-18-35-art.jpg";
import canonRf85Img from "@/assets/products/canon-rf-85.jpg";
import laowa12mmImg from "@/assets/products/laowa-12mm.jpg";
import sonyGmaster50Img from "@/assets/products/sony-gmaster-50.jpg";
import tokinaCinema50Img from "@/assets/products/tokina-cinema-50.jpg";
import siruiAnamorphicImg from "@/assets/products/sirui-anamorphic-50.jpg";
// Microphone images
import rodeNtg5Img from "@/assets/products/rode-ntg5.jpg";
import shureSm7bImg from "@/assets/products/shure-sm7b.jpg";
import sennheiserEw512pImg from "@/assets/products/sennheiser-ew-512p.jpg";
import audioTechnicaImg from "@/assets/products/audio-technica-at4053b.jpg";
import zoomH6Img from "@/assets/products/zoom-h6.jpg";
// Teleprompter images
import datavideoTp650Img from "@/assets/products/datavideo-tp650.jpg";
import feelworldTp10Img from "@/assets/products/feelworld-tp10.jpg";
import glideGearTmp100Img from "@/assets/products/glide-gear-tmp100.jpg";
import parrotPresidentialImg from "@/assets/products/parrot-presidential.jpg";
import ikanPtEliteImg from "@/assets/products/ikan-pt-elite.jpg";
// Lighting images
import aputureLs600dImg from "@/assets/products/aputure-ls-600d.jpg";
import nanliteForza60bImg from "@/assets/products/nanlite-forza-60b.jpg";
import godoxSl200iiImg from "@/assets/products/godox-sl-200ii.jpg";
import luxliCello2Img from "@/assets/products/luxli-cello-2.jpg";
import aputureAmaran200xImg from "@/assets/products/aputure-amaran-200x.jpg";
import nanlitePavotubeImg from "@/assets/products/nanlite-pavotube.jpg";

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  tag: string;
  description: string;
  specs: { label: string; value: string }[];
  image: string;
  inStock: boolean;
  category: Category;
};

export type Category = "cameras" | "lenses" | "microphones" | "teleprompters" | "lighting";

export const cameras: Product[] = [
  {
    id: "sony-fx3",
    name: "Sony FX3 Full-Frame Cinema Camera",
    brand: "Sony",
    price: 795000,
    tag: "FULL_FRAME",
    description: "A compact full-frame cinema camera with 12.1MP sensor, 4K 120fps recording, and dual native ISO up to 409600.",
    specs: [
      { label: "Sensor", value: "12.1MP Full-Frame BSI CMOS" },
      { label: "Resolution", value: "4K 120fps / 1080p 240fps" },
      { label: "ISO Range", value: "80 – 409,600" },
      { label: "Mount", value: "Sony E-Mount" },
      { label: "Body Weight", value: "715g (body only)" },
      { label: "Battery", value: "NP-FZ100" },
    ],
    image: sonyFx3Img,
    inStock: true,
    category: "cameras",
  },
  {
    id: "bmpcc-6k-g2",
    name: "Blackmagic Pocket Cinema 6K G2",
    brand: "Blackmagic Design",
    price: 407000,
    tag: "6K_CINEMA",
    description: "The Pocket Cinema Camera 6K G2 features a Super 35 sensor with 6144×3456 resolution and 13 stops of dynamic range.",
    specs: [
      { label: "Sensor", value: "Super 35 CMOS" },
      { label: "Resolution", value: "6K / 4K / 2.8K / 2K / 1080p" },
      { label: "Dynamic Range", value: "13 stops" },
      { label: "Mount", value: "Canon EF / EF-S" },
      { label: "Body Weight", value: "900g" },
      { label: "Battery", value: "LP-E6" },
    ],
    image: bmpcc6kG2Img,
    inStock: true,
    category: "cameras",
  },
  {
    id: "canon-r5c",
    name: "Canon EOS R5 C Cinema Camera",
    brand: "Canon",
    price: 877000,
    tag: "8K_RAW",
    description: "Merges Canon's EOS R5 mirrorless system with cinema-grade 8K RAW recording and unlimited record times.",
    specs: [
      { label: "Sensor", value: "45MP Full-Frame CMOS" },
      { label: "Resolution", value: "8K RAW / 4K 120fps" },
      { label: "Cooling", value: "Active Fan Cooling" },
      { label: "Mount", value: "Canon RF Mount" },
      { label: "Body Weight", value: "680g" },
      { label: "Recording", value: "CFexpress + SD" },
    ],
    image: canonR5cImg,
    inStock: true,
    category: "cameras",
  },
  {
    id: "nikon-z9",
    name: "Nikon Z9 Mirrorless Camera",
    brand: "Nikon",
    price: 1122000,
    tag: "PRO_FLAGSHIP",
    description: "Nikon's flagship mirrorless powerhouse with a stacked 45.7MP sensor, 8K internal recording, and no mechanical shutter.",
    specs: [
      { label: "Sensor", value: "45.7MP Full-Frame Stacked CMOS" },
      { label: "Resolution", value: "8K 60fps / 4K 120fps" },
      { label: "Burst Rate", value: "120fps RAW" },
      { label: "Mount", value: "Nikon Z Mount" },
      { label: "Body Weight", value: "1,340g" },
      { label: "Battery", value: "EN-EL18d" },
    ],
    image: nikonZ9Img,
    inStock: false,
    category: "cameras",
  },
  {
    id: "red-v-raptor",
    name: "RED V-RAPTOR 8K VV",
    brand: "RED Digital Cinema",
    price: 5000000,
    tag: "8K_VV",
    description: "The V-RAPTOR shoots 8K at up to 120fps in VistaVision format with 17+ stops of dynamic range.",
    specs: [
      { label: "Sensor", value: "35.4MP VistaVision CMOS" },
      { label: "Resolution", value: "8K VV 120fps" },
      { label: "Dynamic Range", value: "17+ stops" },
      { label: "Mount", value: "DSMC3 Interchangeable" },
      { label: "Body Weight", value: "1,450g" },
      { label: "Recording", value: "REDCODE RAW" },
    ],
    image: redVRaptorImg,
    inStock: true,
    category: "cameras",
  },
  {
    id: "fujifilm-x-h2s",
    name: "Fujifilm X-H2S Mirrorless",
    brand: "Fujifilm",
    price: 510000,
    tag: "APSC_SPEED",
    description: "Fujifilm's speed champion: 26.16MP stacked BSI sensor with 6.2K 30fps open-gate video and ProRes RAW output.",
    specs: [
      { label: "Sensor", value: "26.16MP APS-C Stacked BSI CMOS" },
      { label: "Resolution", value: "6.2K 30fps / 4K 120fps" },
      { label: "Burst Rate", value: "40fps (electronic)" },
      { label: "Mount", value: "Fujifilm X Mount" },
      { label: "Body Weight", value: "660g" },
      { label: "Battery", value: "NP-W235" },
    ],
    image: fujifilmXH2sImg,
    inStock: true,
    category: "cameras",
  },
];

export const lenses: Product[] = [
  {
    id: "sigma-18-35-art",
    name: "Sigma 18-35mm f/1.8 Art DC HSM",
    brand: "Sigma",
    price: 163000,
    tag: "ART_SERIES",
    description: "Industry-leading f/1.8 maximum aperture across the full zoom range — a game-changer for video and stills.",
    specs: [
      { label: "Focal Length", value: "18–35mm" },
      { label: "Aperture", value: "f/1.8 – f/16" },
      { label: "Elements", value: "17 elements / 12 groups" },
      { label: "Mount", value: "Canon EF / Nikon F / Sony A" },
      { label: "Filter Thread", value: "72mm" },
      { label: "Weight", value: "810g" },
    ],
    image: sigma1835Img,
    inStock: true,
    category: "lenses",
  },
  {
    id: "canon-rf-85-1-2",
    name: "Canon RF 85mm f/1.2L USM",
    brand: "Canon",
    price: 571000,
    tag: "L_SERIES",
    description: "Masterpiece portrait prime with an f/1.2 aperture delivering creamy bokeh and razor-sharp subject separation.",
    specs: [
      { label: "Focal Length", value: "85mm" },
      { label: "Aperture", value: "f/1.2 – f/16" },
      { label: "Elements", value: "13 elements / 9 groups" },
      { label: "Mount", value: "Canon RF" },
      { label: "Filter Thread", value: "82mm" },
      { label: "Weight", value: "1,195g" },
    ],
    image: canonRf85Img,
    inStock: true,
    category: "lenses",
  },
  {
    id: "laowa-12mm-zero-d",
    name: "Laowa 12mm f/2.8 Zero-D",
    brand: "Laowa",
    price: 173000,
    tag: "ZERO_DISTORTION",
    description: "Ultra-wide prime with near-zero distortion — perfect for architecture, real estate, and cinematic wide shots.",
    specs: [
      { label: "Focal Length", value: "12mm" },
      { label: "Aperture", value: "f/2.8 – f/22" },
      { label: "Elements", value: "16 elements / 10 groups" },
      { label: "Mount", value: "Canon EF / Nikon F / Sony FE" },
      { label: "Filter Thread", value: "77mm" },
      { label: "Weight", value: "540g" },
    ],
    image: laowa12mmImg,
    inStock: true,
    category: "lenses",
  },
  {
    id: "sony-gmaster-50-1-2",
    name: "Sony FE 50mm f/1.2 GM",
    brand: "Sony",
    price: 408000,
    tag: "GM_SERIES",
    description: "Sony's G Master 50mm standard prime with f/1.2 and near-perfect bokeh for both video and photography.",
    specs: [
      { label: "Focal Length", value: "50mm" },
      { label: "Aperture", value: "f/1.2 – f/22" },
      { label: "Elements", value: "14 elements / 10 groups" },
      { label: "Mount", value: "Sony FE" },
      { label: "Filter Thread", value: "72mm" },
      { label: "Weight", value: "778g" },
    ],
    image: sonyGmaster50Img,
    inStock: true,
    category: "lenses",
  },
  {
    id: "tokina-cinema-50mm-t1-5",
    name: "Tokina Cinema ATX 50mm T1.5",
    brand: "Tokina",
    price: 235000,
    tag: "CINEMA_PRIME",
    description: "PL/EF cinema prime with smooth, clickless iris and linear focus — built for professional video production.",
    specs: [
      { label: "Focal Length", value: "50mm" },
      { label: "T-Stop", value: "T1.5 – T22" },
      { label: "Elements", value: "11 elements / 8 groups" },
      { label: "Mount", value: "Canon EF / PL" },
      { label: "Filter Thread", value: "77mm" },
      { label: "Weight", value: "960g" },
    ],
    image: tokinaCinema50Img,
    inStock: false,
    category: "lenses",
  },
  {
    id: "sirui-anamorphic-50mm",
    name: "SIRUI 50mm T2.9 1.6x Anamorphic",
    brand: "SIRUI",
    price: 183000,
    tag: "ANAMORPHIC",
    description: "Affordable 1.6x anamorphic prime delivering cinematic oval bokeh and horizontal lens flares.",
    specs: [
      { label: "Focal Length", value: "50mm (1.6x squeeze)" },
      { label: "T-Stop", value: "T2.9 – T16" },
      { label: "Format", value: "Full-Frame / APS-C" },
      { label: "Mount", value: "Sony FE / Canon RF / Nikon Z / L" },
      { label: "Filter Thread", value: "82mm" },
      { label: "Weight", value: "680g" },
    ],
    image: siruiAnamorphicImg,
    inStock: true,
    category: "lenses",
  },
];

export const microphones: Product[] = [
  {
    id: "rode-ntg5",
    name: "Røde NTG5 Broadcast Shotgun",
    brand: "Røde",
    price: 102000,
    tag: "BROADCAST_SHOTGUN",
    description: "Ultra-compact broadcast-grade shotgun mic with RF-bias technology and industry-leading off-axis rejection.",
    specs: [
      { label: "Type", value: "Condenser — Line Gradient" },
      { label: "Frequency", value: "20Hz – 20kHz" },
      { label: "Sensitivity", value: "-30 dBV/Pa" },
      { label: "Self Noise", value: "10 dB(A)" },
      { label: "Connector", value: "3-pin XLR" },
      { label: "Length", value: "203mm / 76g" },
    ],
    image: rodeNtg5Img,
    inStock: true,
    category: "microphones",
  },
  {
    id: "shure-sm7b",
    name: "Shure SM7B Dynamic Vocal Mic",
    brand: "Shure",
    price: 81000,
    tag: "PODCAST_LEGEND",
    description: "The industry standard for podcasting, broadcasting, and vocal recording. Used by Joe Rogan and countless pros.",
    specs: [
      { label: "Type", value: "Dynamic Cardioid" },
      { label: "Frequency", value: "50Hz – 20kHz" },
      { label: "Sensitivity", value: "-59 dBV/Pa" },
      { label: "Output", value: "3-pin XLR" },
      { label: "Weight", value: "765g" },
      { label: "Requires", value: "Preamp / Audio Interface" },
    ],
    image: shureSm7bImg,
    inStock: true,
    category: "microphones",
  },
  {
    id: "sennheiser-ew-512p",
    name: "Sennheiser EW 512P G4 Wireless",
    brand: "Sennheiser",
    price: 163000,
    tag: "WIRELESS_LAV",
    description: "Professional UHF wireless lav system with 42MHz tuning bandwidth and ultra-low latency at 1.9ms.",
    specs: [
      { label: "Type", value: "Wireless Lavalier System" },
      { label: "Frequency", value: "566–608 MHz (Band AW+)" },
      { label: "Latency", value: "1.9ms" },
      { label: "Range", value: "Up to 100m line-of-sight" },
      { label: "Battery", value: "AA / Rechargeable" },
      { label: "Channels", value: "Up to 32 compatible" },
    ],
    image: sennheiserEw512pImg,
    inStock: true,
    category: "microphones",
  },
  {
    id: "audio-technica-at4053b",
    name: "Audio-Technica AT4053b Hypercardioid",
    brand: "Audio-Technica",
    price: 71000,
    tag: "HYPERCARDIOID",
    description: "Professional hypercardioid condenser for film production, ENG, and live broadcast environments.",
    specs: [
      { label: "Type", value: "Condenser Hypercardioid" },
      { label: "Frequency", value: "20Hz – 20kHz" },
      { label: "Self Noise", value: "12 dB SPL" },
      { label: "Max SPL", value: "153 dB" },
      { label: "Connector", value: "5-pin LEMO" },
      { label: "Weight", value: "79g" },
    ],
    image: audioTechnicaImg,
    inStock: true,
    category: "microphones",
  },
  {
    id: "zoom-h6-essential",
    name: "Zoom H6essential Portable Recorder",
    brand: "Zoom",
    price: 55000,
    tag: "FIELD_RECORDER",
    description: "Six-track portable field recorder with 32-bit float recording, 4 XLR/TRS combo inputs, and built-in mid-side mics.",
    specs: [
      { label: "Tracks", value: "6 simultaneous" },
      { label: "Bit Depth", value: "32-bit Float" },
      { label: "Sample Rate", value: "44.1 / 48 / 96kHz" },
      { label: "Inputs", value: "4 × XLR/TRS Combo + 2 built-in" },
      { label: "Storage", value: "SDXC (up to 512GB)" },
      { label: "Power", value: "4 × AA / USB-C" },
    ],
    image: zoomH6Img,
    inStock: true,
    category: "microphones",
  },
];

export const teleprompters: Product[] = [
  {
    id: "datavideo-tp-650",
    name: "Datavideo TP-650 Portable Teleprompter",
    brand: "Datavideo",
    price: 71000,
    tag: "PORTABLE_PRO",
    description: "Camera-mounted teleprompter with 15\" beam-splitter glass supporting tablets up to 12.9\" — travel-ready.",
    specs: [
      { label: "Screen Size", value: "Supports up to 12.9\" tablet" },
      { label: "Glass", value: "60/40 Beam Splitter" },
      { label: "Compatibility", value: "iPad / Android Tablets" },
      { label: "Hood Material", value: "Fabric (collapsible)" },
      { label: "Weight", value: "1.8kg" },
      { label: "App", value: "Datavideo Prompter (iOS/Android)" },
    ],
    image: datavideoTp650Img,
    inStock: true,
    category: "teleprompters",
  },
  {
    id: "feelworld-tp10",
    name: "FEELWORLD TP10 Teleprompter Kit",
    brand: "FEELWORLD",
    price: 37000,
    tag: "BUDGET_PRO",
    description: "Lightweight aluminum teleprompter kit with 10\" semi-transparent glass for tablets up to 9.7\".",
    specs: [
      { label: "Screen Size", value: "Supports up to 9.7\" tablet" },
      { label: "Glass", value: "Semi-transparent reflective" },
      { label: "Material", value: "Aluminum Alloy" },
      { label: "Hood", value: "Black Matte Hood Included" },
      { label: "Weight", value: "1.1kg" },
      { label: "App", value: "Universal (any prompter app)" },
    ],
    image: feelworldTp10Img,
    inStock: true,
    category: "teleprompters",
  },
  {
    id: "glide-gear-tmp100",
    name: "Glide Gear TMP100 Pro Teleprompter",
    brand: "Glide Gear",
    price: 45000,
    tag: "DUAL_GLASS",
    description: "Professional dual camera-mount teleprompter with 70/30 beam-splitter glass and universal tablet compatibility.",
    specs: [
      { label: "Screen Size", value: "Supports up to 11\" tablet" },
      { label: "Glass", value: "70/30 Beam Splitter" },
      { label: "Material", value: "Aluminum & ABS" },
      { label: "Mount", value: "Standard 1/4\"-20 tripod thread" },
      { label: "Weight", value: "1.5kg" },
      { label: "Compatibility", value: "Universal" },
    ],
    image: glideGearTmp100Img,
    inStock: true,
    category: "teleprompters",
  },
  {
    id: "parrot-presidential",
    name: "Parrot Presidential Teleprompter",
    brand: "Parrot",
    price: 611000,
    tag: "FLOOR_STAND",
    description: "Broadcast-grade floor-standing teleprompter with 17\" LCD monitor and full studio rigging — presidential quality.",
    specs: [
      { label: "Monitor", value: "17\" 1920×1200 LCD" },
      { label: "Glass", value: "60/40 Optical Glass" },
      { label: "Scroll", value: "Hardware Controller Included" },
      { label: "Stand", value: "Heavy-Duty Tripod Base" },
      { label: "Weight", value: "12kg (full kit)" },
      { label: "Software", value: "Autocue QMaster Compatible" },
    ],
    image: parrotPresidentialImg,
    inStock: false,
    category: "teleprompters",
  },
  {
    id: "ikan-pt-elite",
    name: "Ikan PT-ELITE-V2 Teleprompter",
    brand: "Ikan",
    price: 112000,
    tag: "ELITE_SERIES",
    description: "Advanced teleprompter with 17\" high-brightness LCD monitor, foot pedal controller, and optional remote.",
    specs: [
      { label: "Monitor", value: "17\" 1280×1024 LCD" },
      { label: "Brightness", value: "500 cd/m²" },
      { label: "Glass", value: "50/50 Beam Splitter" },
      { label: "Controller", value: "Foot Pedal + Hand Remote" },
      { label: "Weight", value: "6.3kg" },
      { label: "Software", value: "Ikan Prompt (iOS/Android/Win)" },
    ],
    image: ikanPtEliteImg,
    inStock: true,
    category: "teleprompters",
  },
];

export const lighting: Product[] = [
  {
    id: "aputure-ls-600d-pro",
    name: "Aputure LS 600d Pro LED Light",
    brand: "Aputure",
    price: 285000,
    tag: "600W_DAYLIGHT",
    description: "600W daylight LED with Bowens mount, weather resistance, and 45,000 lux at 1m — the industry's top workhorse.",
    specs: [
      { label: "Power", value: "600W LED" },
      { label: "Color Temp", value: "5600K ±200K" },
      { label: "CRI / TLCI", value: "96+ / 97+" },
      { label: "Output", value: "45,000 lux @ 1m" },
      { label: "Mount", value: "Bowens Mount" },
      { label: "IP Rating", value: "IP54 Weather Resistant" },
    ],
    image: aputureLs600dImg,
    inStock: true,
    category: "lighting",
  },
  {
    id: "nanlite-forza-60b",
    name: "Nanlite Forza 60B Bi-Color LED",
    brand: "Nanlite",
    price: 71000,
    tag: "BI_COLOR",
    description: "Compact 60W bi-color LED spotlight with 2700–6500K range, Bowens mount, and wireless DMX control.",
    specs: [
      { label: "Power", value: "60W" },
      { label: "Color Temp", value: "2700K – 6500K" },
      { label: "CRI", value: "96+" },
      { label: "Output", value: "7,140 lux @ 1m (5600K)" },
      { label: "Mount", value: "Bowens Mount" },
      { label: "Control", value: "DMX / Bluetooth / CRMX" },
    ],
    image: nanliteForza60bImg,
    inStock: true,
    category: "lighting",
  },
  {
    id: "godox-sl-200ii",
    name: "Godox SL-200W II LED Video Light",
    brand: "Godox",
    price: 59000,
    tag: "STUDIO_LED",
    description: "200W daylight-balanced studio LED with quiet fan, Bowens mount, and 88° illumination angle.",
    specs: [
      { label: "Power", value: "200W" },
      { label: "Color Temp", value: "5600K ±200K" },
      { label: "CRI / TLCI", value: "96 / 97" },
      { label: "Output", value: "18,100 lux @ 1m" },
      { label: "Mount", value: "Bowens Mount" },
      { label: "Dimming", value: "0–100% PWM" },
    ],
    image: godoxSl200iiImg,
    inStock: true,
    category: "lighting",
  },
  {
    id: "luxli-cello-2",
    name: "Luxli Cello 2 RGBAW Panel",
    brand: "Luxli",
    price: 112000,
    tag: "RGBAW_PANEL",
    description: "Compact RGBAW on-camera LED panel with 2000–10000K range, gel emulation, and free iOS/Android app.",
    specs: [
      { label: "Size", value: "6\" × 6\" Panel" },
      { label: "Color Temp", value: "2000K – 10,000K" },
      { label: "Colors", value: "RGBAW" },
      { label: "CRI", value: "95+" },
      { label: "Power", value: "V-Mount / Anton Bauer / USB-C" },
      { label: "Control", value: "Bluetooth App + DMX" },
    ],
    image: luxliCello2Img,
    inStock: true,
    category: "lighting",
  },
  {
    id: "aputure-amaran-200x",
    name: "Aputure Amaran 200x Bi-Color",
    brand: "Aputure",
    price: 53000,
    tag: "AMARAN_SERIES",
    description: "200W bi-color LED with sidus Link app control, hyper-smooth dimming, and Bowens S-mount compatibility.",
    specs: [
      { label: "Power", value: "200W" },
      { label: "Color Temp", value: "2700K – 6500K" },
      { label: "CRI / TLCI", value: "95 / 97" },
      { label: "Output", value: "14,200 lux @ 1m" },
      { label: "Control", value: "Sidus Link App + 2.4GHz" },
      { label: "Mount", value: "Bowens S-Mount" },
    ],
    image: aputureAmaran200xImg,
    inStock: true,
    category: "lighting",
  },
  {
    id: "nanlite-pavotube-ii-30c",
    name: "Nanlite PavoTube II 30C RGB Tube",
    brand: "Nanlite",
    price: 41000,
    tag: "RGB_TUBE",
    description: "2-foot RGBWW LED tube light with internal battery, 14 built-in effects, and Bluetooth app control.",
    specs: [
      { label: "Length", value: "60cm / 2ft" },
      { label: "Color Temp", value: "2700K – 6500K + RGB" },
      { label: "CRI", value: "95+" },
      { label: "Output", value: "1,300 lux @ 1m" },
      { label: "Battery", value: "Built-in (2 hrs runtime)" },
      { label: "Effects", value: "14 built-in (lightning, fire, etc.)" },
    ],
    image: nanlitePavotubeImg,
    inStock: true,
    category: "lighting",
  },
];

export const allProducts: Product[] = [
  ...cameras,
  ...lenses,
  ...microphones,
  ...teleprompters,
  ...lighting,
];

export const productsByCategory: Record<Category, Product[]> = {
  cameras,
  lenses,
  microphones,
  teleprompters,
  lighting,
};

export const categoryMeta: Record<
  Category,
  { title: string; subtitle: string; module: string; tag: string; description: string }
> = {
  cameras: {
    title: "Cameras & Cinema",
    subtitle: "IMAGING_SYSTEMS",
    module: "MODULE_01",
    tag: "PRO_IMAGING",
    description:
      "From compact mirrorless hybrids to full-frame cinema rigs. 4K, 6K, 8K — every resolution, every format, every budget.",
  },
  lenses: {
    title: "Lenses & Optics",
    subtitle: "OPTICAL_SYSTEMS",
    module: "MODULE_05",
    tag: "OPTICAL_PRECISION",
    description:
      "Cine primes, anamorphic glass, ultra-wide zooms, and vintage rehoused optics for every mount and format.",
  },
  microphones: {
    title: "Microphones & Audio",
    subtitle: "AUDIO_SYSTEMS",
    module: "MODULE_02",
    tag: "ZERO_LATENCY",
    description:
      "XLR condensers, wireless lavaliers, shotgun mics, dynamic vocal mics, and professional field recorders.",
  },
  teleprompters: {
    title: "Teleprompters",
    subtitle: "SCRIPT_SYSTEMS",
    module: "MODULE_03",
    tag: "SCRIPT_FLOW",
    description:
      "Professional teleprompter systems for live broadcasts, YouTube creators, and corporate productions.",
  },
  lighting: {
    title: "Studio Lighting",
    subtitle: "LIGHTING_SYSTEMS",
    module: "MODULE_04",
    tag: "HIGH_CRI",
    description:
      "LED panels, COB lights, bi-color fixtures, RGBAW panels, and full studio kits — built for professional output.",
  },
};
