import {
  Archive,
  Crop,
  Gauge,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { FormatShowcase } from "@/components/landing/FormatShowcase";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { PLATFORMS, PRESETS, presetsFor } from "@/lib/presets";

const steps = [
  { icon: Upload, title: "Drop your images", text: "Add one photo or a hundred. JPG, PNG and WebP are supported." },
  { icon: Layers, title: "Pick sizes & format", text: "Choose platform presets or a custom size, then JPG, PNG or WebP." },
  { icon: Archive, title: "Download", text: "Grab single files or everything in one neatly organised ZIP." },
];

const features = [
  { icon: Layers, title: "Every format in one run", text: "Select several presets and get every size for every image at once." },
  { icon: Crop, title: "Smart fit modes", text: "Fit, fill & crop, pad with a color, or stretch — never distort by accident." },
  { icon: RefreshCw, title: "Convert formats", text: "Switch between JPG, PNG and WebP. Transparency is handled correctly." },
  { icon: Gauge, title: "Compression control", text: "Dial in quality and see the exact size saved for every file." },
  { icon: Zap, title: "Fast batch processing", text: "Background workers process images in parallel without freezing the page." },
  { icon: ShieldCheck, title: "Private by design", text: "Images are processed on your device. Nothing is uploaded to a server." },
];

const faqs = [
  {
    q: "Are my images uploaded anywhere?",
    a: "No. All resizing, cropping and converting happens inside your browser. Your photos never leave your device.",
  },
  {
    q: "Is PixForge free?",
    a: "Yes. All image tools are free to use, with no watermark and no signup required.",
  },
  {
    q: "Why should I create an account?",
    a: "An account lets you save presets and settings, and will unlock AI tools using your own API key.",
  },
  {
    q: "Which formats are supported?",
    a: "You can upload JPG, PNG and WebP, and export to JPG, PNG or WebP. If your browser cannot export WebP, that option is disabled automatically.",
  },
  {
    q: "Will my images be stretched?",
    a: "Never by default. PixForge keeps the original ratio and lets you choose between fitting, padding or cropping. Stretching only happens if you pick it.",
  },
  {
    q: "What happens to transparent PNGs when I export JPG?",
    a: "JPG has no transparency, so transparent areas are filled with the background color you choose (white by default) instead of turning black.",
  },
  {
    q: "How many images can I process at once?",
    a: "Up to 100 images per batch, up to 25 MB each. Images are processed a few at a time so your browser stays responsive.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs text-muted">
                <Lock className="h-3.5 w-3.5" /> 100% in-browser · no uploads
              </span>
              <h1 className="text-gradient mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                One image in.
                <br />
                Every size out.
              </h1>
              <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
                Bulk resize, convert and compress images for Instagram, YouTube, Facebook, Google Ads and more — in
                seconds, right in your browser.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink href="/app" size="lg">
                  Start resizing — it&apos;s free
                </ButtonLink>
                <ButtonLink href="#presets" size="lg" variant="secondary">
                  View presets
                </ButtonLink>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
                <div>
                  <dt className="text-xs text-faint">Presets</dt>
                  <dd className="mt-1 text-2xl font-semibold">{PRESETS.length}+</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Images / batch</dt>
                  <dd className="mt-1 text-2xl font-semibold">100</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Uploads</dt>
                  <dd className="mt-1 text-2xl font-semibold">0</dd>
                </div>
              </dl>
            </div>
            <FormatShowcase />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-sm text-faint">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Three steps. Zero hassle.</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-5 w-5 text-fg" />
                    <span className="font-mono text-xs text-faint">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Presets */}
        <section id="presets" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-sm text-faint">Platform presets</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Every placement, ready to go.</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Pick as many as you need — PixForge exports every image in every selected size, organised in folders.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORMS.map((pl) => (
                <div key={pl.id} className="rounded-2xl border border-line bg-surface p-5">
                  <h3 className="font-medium">{pl.name}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {presetsFor(pl.id).map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{p.name}</span>
                        <span className="font-mono text-xs text-faint">
                          {p.width}×{p.height}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-sm text-faint">Features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Built for batch work.</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="bg-surface p-6">
                  <f.icon className="h-5 w-5" />
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI coming soon */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface-2 p-8 sm:p-12">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs text-muted">
                <Sparkles className="h-3.5 w-3.5" /> Coming soon
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight">
                AI tools with your own API key.
              </h2>
              <p className="mt-3 max-w-2xl text-muted">
                Background removal, magic eraser, background extend and upscaling — powered by your own fal.ai key. You
                stay in control of cost and usage.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm">
                {["Background remove", "Magic eraser", "Background extend", "AI upscale", "Prompt edit"].map((x) => (
                  <li key={x} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-muted">
                    <Wand2 className="h-3.5 w-3.5" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Questions & answers</h2>
            <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface">
              {faqs.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                    {f.q}
                    <span className="text-faint transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
            <h2 className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">Stop resizing by hand.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">Drop your images and get every size you need in one go.</p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/app" size="lg">
                Open PixForge
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
