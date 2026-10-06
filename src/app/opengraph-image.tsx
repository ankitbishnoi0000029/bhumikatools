import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "idcardtools — Print E-Aadhaar PVC & Free PDF Tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#f4f1ea",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 16,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#0a0a0a66",
            marginBottom: 30,
          }}
        >
          idcardtools.com
        </div>
        <div
          style={{
            fontSize: 82,
            fontWeight: 400,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            color: "#0a0a0a",
            marginBottom: 30,
          }}
        >
          Print your{" "}
          <span style={{ fontStyle: "italic", color: "#ff6a00" }}>
            E-Aadhaar
          </span>
          <br />
          onto a PVC card.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#0a0a0a99",
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          31+ free PDF tools · UIDAI-compliant · Delivered in 24 hours
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: "#ff6a00",
            }}
          />
          <div style={{ fontSize: 22, color: "#0a0a0a" }}>idcardtools</div>
        </div>
      </div>
    ),
    { ...size }
  );
}