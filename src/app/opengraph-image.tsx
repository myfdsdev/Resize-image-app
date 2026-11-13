import { ImageResponse } from "next/og";

export const alt = "PixForge — One image in. Every size out.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const boxes = [
  { w: 117, h: 208, label: "9:16" },
  { w: 160, h: 160, label: "1:1" },
  { w: 120, h: 150, label: "4:5" },
  { w: 300, h: 169, label: "16:9" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#000000",
          color: "#ffffff",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 22, height: 22, border: "4px solid #000", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>PixForge</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>One image in.</div>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: "#a1a1aa" }}>Every size out.</div>
            <div style={{ fontSize: 26, color: "#a1a1aa", marginTop: 28, maxWidth: 560 }}>
              Bulk resize, convert &amp; compress. 100% in your browser.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 440,
            marginLeft: 16,
            gap: 16,
            alignContent: "center",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {boxes.map((b) => (
            <div
              key={b.label}
              style={{
                width: b.w,
                height: b.h,
                borderRadius: 14,
                border: "2px solid #2e2e33",
                background: "linear-gradient(180deg, #3f3f46 0%, #111113 100%)",
                display: "flex",
                alignItems: "flex-end",
                padding: 10,
                fontSize: 20,
                color: "#d4d4d8",
              }}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
