export interface SizePreset {
  id: string;
  platform: PlatformId;
  name: string;
  width: number;
  height: number;
}

export type PlatformId =
  | "instagram"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "x"
  | "linkedin"
  | "pinterest"
  | "whatsapp"
  | "google-ads";

export const PLATFORMS: { id: PlatformId; name: string }[] = [
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "youtube", name: "YouTube" },
  { id: "tiktok", name: "TikTok" },
  { id: "x", name: "X / Twitter" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "pinterest", name: "Pinterest" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "google-ads", name: "Google Ads" },
];

const p = (platform: PlatformId, slug: string, name: string, width: number, height: number): SizePreset => ({
  id: `${platform}-${slug}`,
  platform,
  name,
  width,
  height,
});

export const PRESETS: SizePreset[] = [
  p("instagram", "square", "Post (Square)", 1080, 1080),
  p("instagram", "portrait", "Post (Portrait)", 1080, 1350),
  p("instagram", "landscape", "Post (Landscape)", 1080, 566),
  p("instagram", "story", "Story / Reel", 1080, 1920),
  p("instagram", "profile", "Profile Photo", 320, 320),

  p("facebook", "feed", "Feed Post", 1080, 1080),
  p("facebook", "link", "Link / Shared Image", 1200, 630),
  p("facebook", "cover", "Page Cover", 851, 315),
  p("facebook", "story", "Story", 1080, 1920),
  p("facebook", "event", "Event Cover", 1920, 1005),

  p("youtube", "thumbnail", "Thumbnail", 1280, 720),
  p("youtube", "banner", "Channel Banner", 2560, 1440),
  p("youtube", "shorts", "Shorts", 1080, 1920),
  p("youtube", "profile", "Profile Photo", 800, 800),

  p("tiktok", "video", "Video / Cover", 1080, 1920),
  p("tiktok", "profile", "Profile Photo", 200, 200),

  p("x", "post", "Post Image", 1600, 900),
  p("x", "header", "Header", 1500, 500),
  p("x", "profile", "Profile Photo", 400, 400),

  p("linkedin", "post", "Post Image", 1200, 627),
  p("linkedin", "banner", "Profile Banner", 1584, 396),
  p("linkedin", "profile", "Profile Photo", 400, 400),

  p("pinterest", "pin", "Standard Pin", 1000, 1500),
  p("pinterest", "square", "Square Pin", 1000, 1000),

  p("whatsapp", "status", "Status", 1080, 1920),
  p("whatsapp", "profile", "Profile Photo", 500, 500),

  p("google-ads", "square", "Responsive Square", 1200, 1200),
  p("google-ads", "landscape", "Responsive Landscape", 1200, 628),
  p("google-ads", "medium-rect", "Medium Rectangle", 300, 250),
  p("google-ads", "large-rect", "Large Rectangle", 336, 280),
  p("google-ads", "leaderboard", "Leaderboard", 728, 90),
  p("google-ads", "half-page", "Half Page", 300, 600),
  p("google-ads", "skyscraper", "Wide Skyscraper", 160, 600),
  p("google-ads", "mobile-banner", "Mobile Banner", 320, 50),
];

export const PRESET_BY_ID: Record<string, SizePreset> = Object.fromEntries(PRESETS.map((x) => [x.id, x]));

export function presetsFor(platform: PlatformId) {
  return PRESETS.filter((x) => x.platform === platform);
}

export function ratioLabel(w: number, h: number): string {
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const d = g(w, h);
  const rw = w / d;
  const rh = h / d;
  if (rw > 50 || rh > 50) return (w / h).toFixed(2) + ":1";
  return `${rw}:${rh}`;
}
