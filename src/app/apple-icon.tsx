import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 118,
            height: 80,
            background: "#fff",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            padding: 18,
            gap: 10,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 70,
              height: 10,
              borderRadius: 999,
              background: "rgb(17,24,39)",
            }}
          />
          <div
            style={{
              width: 90,
              height: 8,
              borderRadius: 999,
              background: "rgb(51,65,85)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              width: 82,
              height: 8,
              borderRadius: 999,
              background: "rgb(51,65,85)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "rgb(14,165,233)",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
