import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgb(17,24,39) 0%, rgb(14,165,233) 100%)",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            width: 320,
            height: 220,
            background: "rgba(255,255,255,0.96)",
            borderRadius: 28,
            display: "flex",
            flexDirection: "column",
            padding: 32,
            gap: 14,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 190,
              height: 20,
              borderRadius: 10,
              background: "rgb(17,24,39)",
            }}
          />
          <div
            style={{
              width: 250,
              height: 16,
              borderRadius: 8,
              background: "rgb(51,65,85)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              width: 220,
              height: 16,
              borderRadius: 8,
              background: "rgb(51,65,85)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 24,
              top: 24,
              width: 58,
              height: 58,
              borderRadius: 999,
              background: "rgb(14,165,233)",
              boxShadow: "0 10px 20px rgba(2,132,199,0.35)",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
