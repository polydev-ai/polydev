import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  AbsoluteFill,
  Audio,
  staticFile,
} from "remotion";
import { PolydevLogo } from "../components/PolydevLogo";

// Correct model names and logos
const MODELS = {
  claude: {
    name: "Claude Opus 4.5",
    logo: "https://models.dev/logos/anthropic.svg",
  },
  gpt: {
    name: "GPT 5.2",
    logo: "https://models.dev/logos/openai.svg",
  },
  gemini: {
    name: "Gemini 3.0",
    logo: "https://models.dev/logos/google.svg",
  },
  grok: {
    name: "Grok 4.1",
    logo: "https://models.dev/logos/xai.svg",
  },
  zai: {
    name: "GLM 4.7",
    logo: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

// Real responses for N+1 query problem
const RESPONSES = {
  claude: "Use JOINs or batch with WHERE IN. Prisma's include handles this.",
  gpt: "DataLoader batches N queries into 1. Add query caching.",
  gemini: "Eager load relations. Add composite indexes on FKs.",
  grok: "Connection pooling + prepared statements. Use EXPLAIN.",
  zai: "Batch with Promise.all or GraphQL DataLoader.",
};

// IDE logos
const IDE_LOGOS = {
  claudeCode: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png",
  cursor: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/cursor.png",
  cline: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/cline.png",
  windsurf: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/windsurf.png",
};

// Clean typewriter
const TypeWriter: React.FC<{
  text: string;
  startFrame: number;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, speed = 2, style }) => {
  const frame = useCurrentFrame();
  const chars = Math.min(text.length, Math.max(0, Math.floor((frame - startFrame) * speed)));
  const done = chars >= text.length;
  const blink = Math.floor(frame / 8) % 2 === 0;

  return (
    <span style={{ fontFamily: "SF Mono, JetBrains Mono, monospace", ...style }}>
      {text.slice(0, chars)}
      {!done && frame > startFrame && (
        <span style={{ opacity: blink ? 1 : 0.3 }}>|</span>
      )}
    </span>
  );
};

// Cycling text for use cases
const CyclingText: React.FC<{
  texts: string[];
  cycleDuration: number;
  style?: React.CSSProperties;
}> = ({ texts, cycleDuration, style }) => {
  const frame = useCurrentFrame();
  const currentIndex = Math.floor(frame / cycleDuration) % texts.length;
  const progress = (frame % cycleDuration) / cycleDuration;

  // Fade in/out
  const opacity = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) * 6.67 : 1;

  return (
    <span style={{ ...style, opacity }}>
      {texts[currentIndex]}
    </span>
  );
};

// Scene 1: The Hook - Stop copy-pasting into multiple AI chats
const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame: frame - 10, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
          opacity: titleIn,
          textAlign: "center",
          maxWidth: 1400,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          Stop copy-pasting your code into{" "}
          <span style={{ color: "#64748b" }}>ChatGPT, Claude, Gemini, Grok...</span>
        </div>
      </div>

      <div
        style={{
          opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }),
          marginTop: 48,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#3b82f6",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Get all their perspectives in your IDE
        </div>
      </div>

      {/* Model logos */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginTop: 56,
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {Object.values(MODELS).map((model, idx) => (
          <div
            key={model.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              backgroundColor: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <img src={model.logo} alt="" style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 14, color: "#475569", fontFamily: "Inter, sans-serif" }}>
              {model.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 1B: Transition - Introduce Polydev
const Scene1BTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const textIn = spring({ frame: frame - 30, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Polydev logo */}
      <div
        style={{
          transform: `scale(${logoIn})`,
          opacity: logoIn,
        }}
      >
        <PolydevLogo size={120} animate={false} showText={true} />
      </div>

      {/* Explanation */}
      <div
        style={{
          marginTop: 48,
          textAlign: "center",
          transform: `translateY(${interpolate(textIn, [0, 1], [20, 0])}px)`,
          opacity: textIn,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.5,
          }}
        >
          Add Polydev to your IDE
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#3b82f6",
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 16,
          }}
        >
          One question → All perspectives
        </div>
      </div>

      {/* Arrow indicator */}
      <div
        style={{
          marginTop: 56,
          opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" }),
          fontSize: 24,
          color: "#64748b",
        }}
      >
        Let's see it in action ↓
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Perspectives building up - 2 → 5 → Multi
const Scene2Perspectives: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modelKeys = Object.keys(MODELS) as (keyof typeof MODELS)[];

  // Timeline: first 2 appear together at frame 15, then 3rd at 45, 4th at 65, 5th at 85
  const getShowFrame = (idx: number) => {
    if (idx < 2) return 15; // First 2 together
    return 15 + (idx - 1) * 25; // Then increment
  };

  // Multi synthesis appears after all 5
  const multiShowFrame = 140;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 40,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <PolydevLogo size={48} animate={false} showText={false} />
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Polydev Perspectives
        </span>
      </div>

      {/* Cards grid */}
      <div style={{ display: "flex", gap: 16, width: 1600, flexWrap: "wrap", justifyContent: "center" }}>
        {modelKeys.map((key, idx) => {
          const showAt = getShowFrame(idx);
          const cardIn = spring({
            frame: frame - showAt,
            fps,
            config: { damping: 18, stiffness: 120 },
          });

          if (frame < showAt) return null;

          const typeStart = showAt + 10;
          const responseComplete = frame > typeStart + 40;

          return (
            <div
              key={key}
              style={{
                width: 300,
                backgroundColor: "#ffffff",
                borderRadius: 12,
                padding: 18,
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transform: `translateY(${interpolate(cardIn, [0, 1], [20, 0])}px) scale(${interpolate(cardIn, [0, 1], [0.95, 1])})`,
                opacity: cardIn,
              }}
            >
              {/* Model header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img
                  src={MODELS[key].logo}
                  alt=""
                  style={{ width: 24, height: 24 }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {MODELS[key].name}
                </span>
                {responseComplete && (
                  <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 12 }}>✓</span>
                )}
              </div>

              {/* Response */}
              <div style={{ minHeight: 60 }}>
                <TypeWriter
                  text={RESPONSES[key]}
                  startFrame={typeStart}
                  speed={1.8}
                  style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi synthesis */}
      {frame > multiShowFrame && (
        <div
          style={{
            marginTop: 32,
            padding: "20px 40px",
            backgroundColor: "#0f172a",
            borderRadius: 12,
            opacity: interpolate(frame, [multiShowFrame, multiShowFrame + 15], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(frame, [multiShowFrame, multiShowFrame + 15], [0.9, 1], { extrapolateRight: "clamp" })})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#22c55e",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              ✓ Consensus
            </span>
            <span
              style={{
                fontSize: 20,
                color: "#ffffff",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              All models agree — use batching
            </span>
          </div>
        </div>
      )}

      {/* Counter showing 2 → 5 */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 64,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18, color: "#64748b", fontFamily: "Inter, sans-serif" }}>
          Perspectives:
        </span>
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#3b82f6",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {Math.min(5, frame < 15 ? 0 : frame < 40 ? 2 : frame < 65 ? 3 : frame < 90 ? 4 : 5)}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Use Cases + Value Prop
const Scene3ValueProp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const useCases = [
    "Stuck on a bug?",
    "Architecture decision?",
    "Security concern?",
    "Code review needed?",
  ];

  const mainIn = spring({ frame: frame - 10, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Cycling use cases */}
      <div style={{ height: 80, display: "flex", alignItems: "center" }}>
        <CyclingText
          texts={useCases}
          cycleDuration={25}
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: "#64748b",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />
      </div>

      {/* Main message */}
      <div
        style={{
          transform: `scale(${interpolate(mainIn, [0, 1], [0.9, 1])})`,
          opacity: mainIn,
          textAlign: "center",
          marginTop: 32,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.2,
          }}
        >
          Get <span style={{ color: "#3b82f6" }}>Multiple Perspectives</span>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 8,
          }}
        >
          <span style={{ color: "#22c55e" }}>Get Unstuck</span>
        </div>
      </div>

      {/* Value prop - consensus */}
      <div
        style={{
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
          marginTop: 56,
          padding: "16px 32px",
          backgroundColor: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#0f172a",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          When multiple models agree, you know you're right
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: IDE with inline suggestions (not separate panel)
const Scene4IDEInline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowIn = spring({ frame: frame - 5, fps, config: { damping: 12 } });

  // Inline suggestions timing
  const suggestion1At = 40;
  const suggestion2At = 70;
  const suggestion3At = 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1400,
          height: 780,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          transform: `scale(${interpolate(windowIn, [0, 1], [0.95, 1])})`,
          opacity: windowIn,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#eab308" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#22c55e" }} />
          </div>
          <img src={IDE_LOGOS.cursor} alt="" style={{ width: 20, height: 20, marginLeft: 8 }} />
          <span style={{ color: "#64748b", fontSize: 13, fontFamily: "SF Mono, monospace" }}>
            api-service/users.ts — Cursor
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <PolydevLogo size={24} animate={false} showText={false} />
            <span style={{ color: "#22c55e", fontSize: 12, fontFamily: "SF Mono, monospace" }}>
              Polydev connected
            </span>
          </div>
        </div>

        {/* Code editor with inline suggestions */}
        <div style={{ padding: 32, fontFamily: "JetBrains Mono, SF Mono, monospace", fontSize: 15, lineHeight: 2 }}>
          {/* Line 1 */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>1</span>
            <span style={{ color: "#7c3aed" }}>async function</span>
            <span style={{ color: "#059669" }}> getUsers</span>
            <span style={{ color: "#0f172a" }}>() {"{"}</span>
          </div>

          {/* Line 2 - Comment */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>2</span>
            <span style={{ color: "#64748b", paddingLeft: 24 }}>// N+1 query problem here</span>
          </div>

          {/* Line 3 */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>3</span>
            <span style={{ paddingLeft: 24 }}>
              <span style={{ color: "#7c3aed" }}>const</span>
              <span style={{ color: "#0f172a" }}> users = </span>
              <span style={{ color: "#7c3aed" }}>await</span>
              <span style={{ color: "#059669" }}> db.query</span>
              <span style={{ color: "#0f172a" }}>(</span>
              <span style={{ color: "#0369a1" }}>'SELECT * FROM users'</span>
              <span style={{ color: "#0f172a" }}>)</span>
            </span>
          </div>

          {/* Line 4 */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>4</span>
            <span style={{ paddingLeft: 24 }}>
              <span style={{ color: "#7c3aed" }}>for</span>
              <span style={{ color: "#0f172a" }}> (</span>
              <span style={{ color: "#7c3aed" }}>const</span>
              <span style={{ color: "#0f172a" }}> user </span>
              <span style={{ color: "#7c3aed" }}>of</span>
              <span style={{ color: "#0f172a" }}> users) {"{"}</span>
            </span>
          </div>

          {/* Line 5 - Problem line with red highlight */}
          <div style={{ display: "flex", backgroundColor: "#fef2f2", marginLeft: 64, marginRight: -32, paddingRight: 32 }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>5</span>
            <span style={{ paddingLeft: 24 }}>
              <span style={{ color: "#0f172a" }}>user.posts = </span>
              <span style={{ color: "#7c3aed" }}>await</span>
              <span style={{ color: "#059669" }}> db.query</span>
              <span style={{ color: "#0f172a" }}>(...</span>
              <span style={{ color: "#0f172a" }}>)</span>
              <span style={{ color: "#dc2626" }}> // N+1!</span>
            </span>
          </div>

          {/* Line 6 */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>6</span>
            <span style={{ paddingLeft: 24, color: "#0f172a" }}>{"}"}</span>
          </div>

          {/* Line 7 */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#94a3b8", width: 40, textAlign: "right", marginRight: 24 }}>7</span>
            <span style={{ color: "#0f172a" }}>{"}"}</span>
          </div>

          {/* Inline suggestions appearing below the code */}
          <div style={{ marginTop: 32, marginLeft: 64 }}>
            {/* Suggestion 1 - Claude */}
            {frame > suggestion1At && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  backgroundColor: "#fafafa",
                  borderLeft: "3px solid #cc785c",
                  marginBottom: 12,
                  opacity: interpolate(frame, [suggestion1At, suggestion1At + 5], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                <img src={MODELS.claude.logo} alt="" style={{ width: 20, height: 20, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "Inter, sans-serif" }}>
                    Claude Opus 4.5
                  </span>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontFamily: "Inter, sans-serif" }}>
                    <TypeWriter
                      text="Use JOINs or batch with WHERE IN clause. Prisma's include option handles this automatically."
                      startFrame={suggestion1At + 5}
                      speed={2.5}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion 2 - GPT */}
            {frame > suggestion2At && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  backgroundColor: "#fafafa",
                  borderLeft: "3px solid #10a37f",
                  marginBottom: 12,
                  opacity: interpolate(frame, [suggestion2At, suggestion2At + 5], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                <img src={MODELS.gpt.logo} alt="" style={{ width: 20, height: 20, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "Inter, sans-serif" }}>
                    GPT 5.2
                  </span>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontFamily: "Inter, sans-serif" }}>
                    <TypeWriter
                      text="DataLoader pattern batches N queries into 1. Also consider query result caching."
                      startFrame={suggestion2At + 5}
                      speed={2.5}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion 3 - Gemini */}
            {frame > suggestion3At && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  backgroundColor: "#fafafa",
                  borderLeft: "3px solid #4285f4",
                  marginBottom: 12,
                  opacity: interpolate(frame, [suggestion3At, suggestion3At + 5], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                <img src={MODELS.gemini.logo} alt="" style={{ width: 20, height: 20, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "Inter, sans-serif" }}>
                    Gemini 3.0
                  </span>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontFamily: "Inter, sans-serif" }}>
                    <TypeWriter
                      text="Eager loading with relations. Add composite indexes on foreign keys."
                      startFrame={suggestion3At + 5}
                      speed={2.5}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* More indicator */}
            {frame > suggestion3At + 30 && (
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  fontFamily: "Inter, sans-serif",
                  paddingLeft: 32,
                  opacity: interpolate(frame, [suggestion3At + 30, suggestion3At + 40], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                +2 more perspectives from Grok 4.1 and GLM 4.7
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: IDE Logos with bigger Polydev logo
const Scene5IDEs: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ides = [
    { name: "Claude Code", logo: IDE_LOGOS.claudeCode },
    { name: "Cursor", logo: IDE_LOGOS.cursor },
    { name: "Cline", logo: IDE_LOGOS.cline },
    { name: "Windsurf", logo: IDE_LOGOS.windsurf },
  ];

  const logoIn = spring({ frame: frame - 5, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Big Polydev logo */}
      <div
        style={{
          transform: `scale(${logoIn})`,
          opacity: logoIn,
          marginBottom: 48,
        }}
      >
        <PolydevLogo size={140} animate={false} showText={true} />
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#0f172a",
          fontFamily: "Inter, system-ui, sans-serif",
          marginBottom: 56,
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        One install. Any MCP-compatible IDE.
      </div>

      <div style={{ display: "flex", gap: 56 }}>
        {ides.map((ide, idx) => {
          const iconIn = spring({
            frame: frame - 40 - idx * 8,
            fps,
            config: { damping: 15 },
          });

          return (
            <div
              key={ide.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                transform: `scale(${iconIn})`,
                opacity: iconIn,
              }}
            >
              <img
                src={ide.logo}
                alt={ide.name}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#0f172a",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {ide.name}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 6: CTA
const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame: frame - 10, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ transform: `scale(${logoIn})`, opacity: logoIn }}>
        <PolydevLogo size={160} animate={false} showText={true} />
      </div>

      <div
        style={{
          marginTop: 48,
          fontSize: 32,
          fontWeight: 600,
          color: "#0f172a",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" }),
          textAlign: "center",
        }}
      >
        Multiple perspectives. <span style={{ color: "#22c55e" }}>Better code.</span>
      </div>

      <div
        style={{
          marginTop: 48,
          padding: "16px 28px",
          backgroundColor: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ color: "#0f172a", fontSize: 20, fontFamily: "SF Mono, JetBrains Mono, monospace" }}>
          $ npx polydev-ai@latest
        </span>
      </div>

      <div
        style={{
          marginTop: 48,
          fontSize: 40,
          fontWeight: 700,
          color: "#3b82f6",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        polydev.ai
      </div>
    </AbsoluteFill>
  );
};

export const Version6LiveDemo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Fade out music in last 2 seconds
  const musicVolume = interpolate(
    frame,
    [0, durationInFrames - 2 * fps, durationInFrames],
    [0.25, 0.25, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      {/* Background music */}
      <Audio
        src={staticFile("audio/background.mp3")}
        volume={musicVolume}
        startFrom={0}
      />

      {/* Scene 1: 0-5s - Hook (copy-pasting problem) */}
      <Sequence from={0} durationInFrames={5 * fps}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 1B: 5-9s - Introduce Polydev */}
      <Sequence from={5 * fps} durationInFrames={4 * fps}>
        <Scene1BTransition />
      </Sequence>

      {/* Scene 2: 9-17s - Perspectives building 2→5→Multi */}
      <Sequence from={9 * fps} durationInFrames={8 * fps}>
        <Scene2Perspectives />
      </Sequence>

      {/* Scene 3: 17-24s - Value prop with cycling use cases */}
      <Sequence from={17 * fps} durationInFrames={7 * fps}>
        <Scene3ValueProp />
      </Sequence>

      {/* Scene 4: 24-33s - IDE with inline suggestions */}
      <Sequence from={24 * fps} durationInFrames={9 * fps}>
        <Scene4IDEInline />
      </Sequence>

      {/* Scene 5: 33-39s - IDE logos with big Polydev logo */}
      <Sequence from={33 * fps} durationInFrames={6 * fps}>
        <Scene5IDEs />
      </Sequence>

      {/* Scene 6: 39-45s - CTA */}
      <Sequence from={39 * fps} durationInFrames={6 * fps}>
        <Scene6CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
