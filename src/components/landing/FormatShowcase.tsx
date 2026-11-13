/** Decorative: one "image" shown in many platform ratios (pure CSS, no assets). */
const formats = [
  { label: "Story 9:16", w: 9, h: 16, col: "row-span-2" },
  { label: "Post 1:1", w: 1, h: 1, col: "" },
  { label: "Portrait 4:5", w: 4, h: 5, col: "" },
  { label: "Thumbnail 16:9", w: 16, h: 9, col: "col-span-2" },
  { label: "Pin 2:3", w: 2, h: 3, col: "row-span-2" },
  { label: "Banner 3:1", w: 3, h: 1, col: "col-span-2" },
];

function Scene() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,#3f3f46_0%,#18181b_45%,#09090b_100%)]" />
      <div className="absolute left-1/2 top-[22%] h-10 w-10 -translate-x-1/2 rounded-full bg-zinc-200 shadow-[0_0_60px_10px_rgba(255,255,255,0.15)]" />
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-3/5 w-full">
        <path d="M0 60 L0 38 L18 22 L30 34 L46 14 L62 32 L74 24 L100 42 L100 60 Z" fill="#27272a" />
        <path d="M0 60 L0 48 L22 36 L40 46 L58 34 L80 46 L100 40 L100 60 Z" fill="#3f3f46" />
      </svg>
    </div>
  );
}

export function FormatShowcase() {
  return (
    <div className="grid grid-flow-row-dense auto-rows-[88px] grid-cols-3 gap-3 sm:auto-rows-[110px] sm:grid-cols-4">
      {formats.map((f) => (
        <div
          key={f.label}
          className={`group relative overflow-hidden rounded-xl border border-line-strong bg-surface ${f.col}`}
        >
          <Scene />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] text-zinc-300 backdrop-blur">
            {f.label}
          </span>
        </div>
      ))}
    </div>
  );
}
