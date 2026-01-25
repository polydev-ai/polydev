import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { PolydevLogo } from "./PolydevLogo";

// IDE Tool logos
export const IDE_LOGOS = {
  claudeCode: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png",
  cursor: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/cursor.png",
  cline: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/cline.png",
  windsurf: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/windsurf.png",
};

// AI Model data
export const AI_MODELS = {
  claude: {
    name: "Claude",
    logo: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png",
    color: "#d97706",
  },
  gpt: {
    name: "GPT-5",
    logo: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openai.png",
    color: "#10a37f",
  },
  gemini: {
    name: "Gemini",
    logo: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/gemini-color.png",
    color: "#4285f4",
  },
  grok: {
    name: "Grok",
    logo: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/grok.png",
    color: "#0f172a",
  },
  zai: {
    name: "Z AI",
    logo: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    color: "#6366f1",
  },
};

type PerspectiveMessage = {
  model: keyof typeof AI_MODELS;
  text: string;
  delay: number;
};

type IDEMockupProps = {
  ide: "claudeCode" | "cursor" | "cline" | "windsurf";
  userQuery: string;
  perspectives: PerspectiveMessage[];
  showTyping?: boolean;
};

// Typing animation for text
const TypingText: React.FC<{ text: string; startFrame: number; speed?: number }> = ({
  text,
  startFrame,
  speed = 1.5,
}) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.min(
    text.length,
    Math.max(0, Math.floor((frame - startFrame) * speed))
  );
  return <>{text.slice(0, charsToShow)}</>;
};

// Single perspective card
const PerspectiveCard: React.FC<{
  model: keyof typeof AI_MODELS;
  text: string;
  delay: number;
}> = ({ model, text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 150 },
  });

  const modelData = AI_MODELS[model];

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        border: `2px solid ${modelData.color}30`,
        transform: `translateY(${interpolate(entrance, [0, 1], [20, 0])}px)`,
        opacity: entrance,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <img src={modelData.logo} alt={modelData.name} style={{ width: 24, height: 24, borderRadius: 6 }} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            color: "#0f172a",
          }}
        >
          {modelData.name}
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "#475569",
          fontFamily: "Inter, system-ui, sans-serif",
          margin: 0,
        }}
      >
        <TypingText text={text} startFrame={delay + 15} speed={2} />
      </p>
    </div>
  );
};

export const IDEMockup: React.FC<IDEMockupProps> = ({
  ide,
  userQuery,
  perspectives,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ideNames = {
    claudeCode: "Claude Code",
    cursor: "Cursor",
    cline: "Cline",
    windsurf: "Windsurf",
  };

  return (
    <div
      style={{
        backgroundColor: "#1e1e1e",
        borderRadius: 16,
        overflow: "hidden",
        width: 1000,
        height: 700,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          backgroundColor: "#323232",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
          <img src={IDE_LOGOS[ide]} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />
          <span style={{ color: "#cccccc", fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
            {ideNames[ide]}
          </span>
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* Code editor area (left) */}
        <div style={{ flex: 1, backgroundColor: "#1e1e1e", padding: 20 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#9cdcfe" }}>
            <span style={{ color: "#569cd6" }}>async function</span>{" "}
            <span style={{ color: "#dcdcaa" }}>fetchUserData</span>
            <span style={{ color: "#d4d4d4" }}>()</span>{" "}
            <span style={{ color: "#d4d4d4" }}>{"{"}</span>
            <br />
            <span style={{ color: "#6a9955", marginLeft: 20 }}>{"// TODO: optimize this"}</span>
            <br />
            <span style={{ color: "#d4d4d4", marginLeft: 20 }}>...</span>
          </div>
        </div>

        {/* Polydev panel (right) */}
        <div
          style={{
            width: 420,
            backgroundColor: "#f8fafc",
            borderLeft: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Panel header with Polydev branding */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#ffffff",
            }}
          >
            <PolydevLogo size={28} animate={false} showText={false} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                color: "#0f172a",
              }}
            >
              Polydev Perspectives
            </span>
          </div>

          {/* User query */}
          <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}>
            <div
              style={{
                backgroundColor: "#0f172a",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#ffffff",
                  fontFamily: "Inter, system-ui, sans-serif",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {userQuery}
              </p>
            </div>
          </div>

          {/* Perspectives */}
          <div
            style={{
              flex: 1,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
            }}
          >
            {perspectives.map((p, idx) => (
              <PerspectiveCard key={idx} model={p.model} text={p.text} delay={p.delay} />
            ))}
          </div>

          {/* Synthesis footer */}
          {(() => {
            const synthDelay = Math.max(...perspectives.map((p) => p.delay)) + 60;
            const synthEntrance = spring({
              frame: frame - synthDelay,
              fps,
              config: { damping: 200 },
            });

            return (
              <div
                style={{
                  padding: 16,
                  borderTop: "1px solid #e2e8f0",
                  backgroundColor: "#fef3c7",
                  opacity: synthEntrance,
                  transform: `translateY(${interpolate(synthEntrance, [0, 1], [10, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#92400e",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    Consensus: All models recommend batching queries
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// Simpler IDE panel for quick demos
export const IDEPanelSimple: React.FC<{
  ide: "claudeCode" | "cursor" | "cline" | "windsurf";
  delay?: number;
}> = ({ ide, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const ideNames = {
    claudeCode: "Claude Code",
    cursor: "Cursor",
    cline: "Cline",
    windsurf: "Windsurf",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        transform: `scale(${entrance})`,
        opacity: entrance,
      }}
    >
      <img
        src={IDE_LOGOS[ide]}
        alt={ideNames[ide]}
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      />
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        {ideNames[ide]}
      </span>
    </div>
  );
};
