import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 92.79 92.79">
          <path
            d="M70.99 60.18c0,3.57 -2.45,5.76 -7.38,5.76l-28.21 0.01 0 -8.61 25.51 0 0 -23.45 -27.68 0 0 20.02 -9.88 0 -0.04 -23.88c-0,-2.99 2.58,-4.6 7.74,-4.84l32.59 0c4.55,0 6.99,1.54 7.33,4.64l0 30.35z"
            fill="#41FEAA"
          />
          <rect x="21.79" y="58.08" width="9.53" height="9.53" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
