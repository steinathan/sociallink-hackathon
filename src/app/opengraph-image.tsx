import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SocialLink — Social Discovery, Considered";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #F5F1EA 0%, #EFE9DD 55%, #F5F1EA 100%)",
          color: "#1A1410",
          fontFamily: "serif",
        }}
      >
        {/* Top — eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#A39A8E",
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#C45F4F",
            }}
          />
          SocialLink · Lagos · Abuja · Port Harcourt
        </div>

        {/* Middle — display */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: -2,
              marginBottom: 12,
            }}
          >
            Social discovery,
          </div>
          <div
            style={{
              fontSize: 110,
              fontStyle: "italic",
              fontWeight: 400,
              color: "#C45F4F",
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            considered.
          </div>
        </div>

        {/* Bottom — meta strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(26,20,16,0.12)",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#1A1410",
              fontFamily: "sans-serif",
              maxWidth: 640,
              lineHeight: 1.4,
            }}
          >
            Verified Consultants. Escrowed retainers. Considered sessions.
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#A39A8E",
              letterSpacing: 3,
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            sociallink.ng
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
