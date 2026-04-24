const fs = require('fs');
let content = fs.readFileSync('src/pages/Onboarding.tsx', 'utf-8');

// Container
content = content.replace(
  'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4',
  'min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans'
);

// Card
content = content.replace(
  'w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden',
  'w-full max-w-2xl bg-chassis border border-border-subtle overflow-hidden'
);

// Text colors
content = content.replace(/text-slate-400/g, 'text-muted-foreground');
content = content.replace(/text-slate-500/g, 'text-muted-foreground/70');
content = content.replace(/text-slate-300/g, 'text-foreground/80');
content = content.replace(/text-slate-600/g, 'text-muted-foreground/50');
content = content.replace(/text-white/g, 'text-foreground');
content = content.replace(/text-blue-400/g, 'text-primary');
content = content.replace(/text-blue-300/g, 'text-primary');

// Borders
content = content.replace(/border-slate-700/g, 'border-border-subtle');
content = content.replace(/border-slate-600/g, 'border-border-subtle');
content = content.replace(/border-slate-500/g, 'border-primary/50');
content = content.replace(/border-blue-500/g, 'border-primary');
content = content.replace(/focus:border-blue-500/g, 'focus:border-primary');

// Backgrounds
content = content.replace(/bg-slate-800/g, 'bg-chassis');
content = content.replace(/bg-slate-700\/50/g, 'bg-background/50');
content = content.replace(/bg-slate-700\/60/g, 'bg-background/50');
content = content.replace(/bg-slate-700/g, 'bg-background');
content = content.replace(/bg-slate-600\/50/g, 'bg-chassis');
content = content.replace(/bg-slate-600/g, 'bg-border-subtle');
content = content.replace(/bg-blue-600\/20/g, 'bg-primary/10');
content = content.replace(/bg-blue-600/g, 'bg-primary');
content = content.replace(/hover:bg-blue-700/g, 'hover:bg-primary/90');
content = content.replace(/hover:bg-slate-700/g, 'hover:bg-chassis');

// Rings
content = content.replace(/focus:ring-blue-500/g, 'focus:ring-primary/50');
content = content.replace(/focus:ring-1/g, ''); // Remove ring, rely on border color

// Inputs
content = content.replace(/bg-background border border-border-subtle rounded-lg/g, 'bg-background border border-border-subtle rounded-none');
content = content.replace(/rounded-lg/g, 'rounded-none');
content = content.replace(/rounded-xl/g, 'rounded-none');

// Fix button text colors so primary buttons have text-background instead of text-foreground
content = content.replace(/bg-primary text-foreground font-semibold/g, 'bg-primary text-background font-bold tracking-widest uppercase');
content = content.replace(/bg-primary hover:bg-primary\/90 disabled:opacity-50 disabled:cursor-not-allowed text-foreground/g, 'bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-background');

// specific text replacements for inputs
content = content.replace(/placeholder-muted-foreground\/70/g, 'placeholder:text-muted-foreground/50');
content = content.replace(/bg-background border border-border-subtle rounded-none px-3 py-2.5 text-foreground placeholder:text-muted-foreground\/50 text-sm focus:outline-none focus:border-primary/g, 'bg-background border border-border-subtle rounded-none px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary transition-colors');

fs.writeFileSync('src/pages/Onboarding.tsx', content);
