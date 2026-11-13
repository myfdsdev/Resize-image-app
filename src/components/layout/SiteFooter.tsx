import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">
            Bulk resize, convert and compress images for every platform. Processed in your browser — your photos never
            leave your device.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Product</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" href="/app">Open app</Link></li>
            <li><Link className="hover:text-fg" href="/#presets">Platform presets</Link></li>
            <li><Link className="hover:text-fg" href="/#faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:text-fg" href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-faint">
        © {new Date().getFullYear()} PixForge. All rights reserved.
      </div>
    </footer>
  );
}
