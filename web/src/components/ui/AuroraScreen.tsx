"use client";
import { useRouter } from "next/navigation";
import { AuroraBackground } from "./aurora-background";

export function AuroraScreen() {
  const router = useRouter();

  return (
    <AuroraBackground className="dark">
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(2.5rem, 8vw, 5rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#ffffff",
            lineHeight: 1.15,
          }}
        >
          Découvrez Velona
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 3vw, 1.35rem)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "0.04em",
            maxWidth: "36ch",
            lineHeight: 1.6,
          }}
        >
          L&apos;application indispensable
        </p>

        <button
          onClick={() => router.push("/dashboard")}
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem 2.25rem",
            borderRadius: "9999px",
            background: "#ffffff",
            color: "#18181b",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(255,255,255,0.18)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 32px rgba(255,255,255,0.28)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(255,255,255,0.18)";
          }}
        >
          Profitez →
        </button>
      </div>

      {/* Playfair Display from Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;700&display=swap');`}</style>
    </AuroraBackground>
  );
}
