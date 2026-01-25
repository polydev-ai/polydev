import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  AbsoluteFill,
  staticFile,
  Img,
} from "remotion";
import { Headline, FadeInText } from "../components/FadeInText";
import { TerminalCommand } from "../components/CodeBlock";
import { PolydevLogo, PolydevLogoFull } from "../components/PolydevLogo";
import { AI_MODELS, IDEPanelSimple } from "../components/IDEMockup";

// Realistic terminal component that looks like Claude Code
const ClaudeCodeTerminal: React.FC<{
  children: React.ReactNode;
  title?: string;
}> = ({ children, title = "claude" }) => {
  return (
    <div
      style={{
        backgroundColor: "#1a1a2e",
        borderRadius: 12,
        overflow: "hidden",
        width: 1200,
        boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
        border: "1px solid #333",
      }}
    >
      {/* macOS title bar */}
      <div
        style={{
          backgroundColor: "#2d2d3d",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
        </div>
        <span
          style={{
            color: "#888",
            fontSize: 13,
            fontFamily: "SF Mono, Monaco, monospace",
            marginLeft: 12,
          }}
        >
          venkat — {title} — 120×40
        </span>
      </div>
      {/* Terminal content */}
      <div style={{ padding: 24, minHeight: 500 }}>{children}</div>
    </div>
  );
};

// Typing cursor animation
const TypingCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = Math.sin(frame * 0.3) > 0 ? 1 : 0;
  return (
    <span
      style={{
        backgroundColor: "#22d3ee",
        width: 10,
        height: 24,
        display: "inline-block",
        marginLeft: 2,
        opacity,
      }}
    />
  );
};

// Typing animation for terminal text
const TerminalTyping: React.FC<{
  text: string;
  startFrame: number;
  speed?: number;
  color?: string;
  showCursor?: boolean;
}> = ({ text, startFrame, speed = 2, color = "#e2e8f0", showCursor = true }) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.min(text.length, Math.max(0, Math.floor((frame - startFrame) * speed)));
  const isComplete = charsToShow >= text.length;

  return (
    <span style={{ color, fontFamily: "SF Mono, Monaco, monospace", fontSize: 16 }}>
      {text.slice(0, charsToShow)}
      {showCursor && !isComplete && <TypingCursor />}
    </span>
  );
};

// Scene 1: Hook - "You're stuck" with real terminal look
const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const terminalEntrance = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <div
        style={{
          transform: `translateY(${interpolate(terminalEntrance, [0, 1], [50, 0])}px)`,
          opacity: terminalEntrance,
        }}
      >
        <ClaudeCodeTerminal title="useEffect Infinite Loop — claude">
          <div style={{ fontFamily: "SF Mono, Monaco, monospace", lineHeight: 1.8 }}>
            {/* Claude Code header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: "#ff6b6b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 18 }}>🤖</span>
              </div>
              <span style={{ color: "#22d3ee", fontSize: 18, fontWeight: 600 }}>Claude Code</span>
              <span style={{ color: "#666", fontSize: 14 }}>v2.1.6</span>
            </div>

            {/* User prompt */}
            <div style={{ color: "#22d3ee", marginBottom: 8 }}>
              <span style={{ color: "#f59e0b" }}>❯</span>{" "}
              <TerminalTyping
                text="React useEffect infinite loop bug. Can you get perspectives from different models?"
                startFrame={30}
                speed={1.5}
              />
            </div>

            {/* Response starting */}
            {frame > 90 && (
              <FadeInText delay={90}>
                <div style={{ color: "#94a3b8", marginTop: 16 }}>
                  <span style={{ color: "#22c55e" }}>●</span> I'll get perspectives from multiple AI models on the React useEffect infinite loop bug.
                </div>
              </FadeInText>
            )}

            {/* MCP call */}
            {frame > 120 && (
              <FadeInText delay={120}>
                <div style={{ marginTop: 16, padding: 16, backgroundColor: "#1e293b", borderRadius: 8, border: "1px solid #334155" }}>
                  <div style={{ color: "#f59e0b", fontSize: 14, marginBottom: 8 }}>
                    ⚡ mcp-execution — polydev_perspectives (MCP)
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    prompt: "Explain the common causes of React useEffect infinite loop bugs..."
                  </div>
                </div>
              </FadeInText>
            )}

            {/* Loading indicator */}
            {frame > 150 && frame < 200 && (
              <div style={{ marginTop: 16, color: "#f59e0b" }}>
                <span style={{ animation: "none" }}>↻</span> Predidigitating... (ctrl+c to interrupt - thinking)
              </div>
            )}
          </div>
        </ClaudeCodeTerminal>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: The magic - showing multiple model responses
const Scene2MultiModel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const models = [
    { name: "Claude", color: "#d97706", response: "Missing dependency arrays cause re-renders. Use exhaustive-deps rule." },
    { name: "GPT-5", color: "#10a37f", response: "Object/array references change every render. Use useMemo or useCallback." },
    { name: "Gemini", color: "#4285f4", response: "State updates inside useEffect without proper guards creates loops." },
    { name: "Grok", color: "#0f172a", response: "The functional update pattern (prev => prev + 1) avoids dependency issues." },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <FadeInText delay={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <PolydevLogo size={60} animate={false} color="#ffffff" />
          <span style={{ color: "#ffffff", fontSize: 32, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif" }}>
            queries 4 models simultaneously
          </span>
        </div>
      </FadeInText>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: 1100 }}>
        {models.map((model, idx) => {
          const entrance = spring({
            frame: frame - 20 - idx * 12,
            fps,
            config: { damping: 15, stiffness: 100 },
          });

          return (
            <div
              key={model.name}
              style={{
                backgroundColor: "#1e293b",
                borderRadius: 12,
                padding: 24,
                border: `2px solid ${model.color}40`,
                transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1])})`,
                opacity: entrance,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <img
                  src={AI_MODELS[model.name.toLowerCase().replace("-", "") as keyof typeof AI_MODELS]?.logo || AI_MODELS.claude.logo}
                  alt={model.name}
                  style={{ width: 32, height: 32, borderRadius: 8 }}
                />
                <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif" }}>
                  {model.name}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.6, margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>
                {frame > 20 + idx * 12 + 20 ? model.response : ""}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Real screenshot with zoom animation - Claude Code response
const Scene3RealScreenshot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoomProgress = spring({
    frame,
    fps,
    config: { damping: 30 },
  });

  const panX = interpolate(frame, [0, 150], [0, -100], { extrapolateRight: "clamp" });
  const panY = interpolate(frame, [0, 150], [0, -50], { extrapolateRight: "clamp" });
  const scale = interpolate(zoomProgress, [0, 1], [1, 1.15]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a" }}>
      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FadeInText delay={0}>
          <div
            style={{
              backgroundColor: "#22d3ee20",
              border: "1px solid #22d3ee",
              borderRadius: 8,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🖥️</span>
            <span style={{ color: "#22d3ee", fontSize: 16, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif" }}>
              Claude Code
            </span>
          </div>
        </FadeInText>
      </div>

      {/* Screenshot with pan/zoom */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 30px 100px rgba(0,0,0,0.6)",
        }}
      >
        <Img
          src={staticFile("screenshots/polydev-mcp-response.png")}
          style={{ width: 1400, height: "auto" }}
        />
      </div>

      {/* Highlight overlay */}
      {frame > 60 && (
        <FadeInText delay={60}>
          <div
            style={{
              position: "absolute",
              bottom: 60,
              right: 60,
              backgroundColor: "#22c55e20",
              border: "2px solid #22c55e",
              borderRadius: 12,
              padding: 20,
              maxWidth: 400,
            }}
          >
            <div style={{ color: "#22c55e", fontSize: 18, fontWeight: 600, marginBottom: 8, fontFamily: "Inter, system-ui, sans-serif" }}>
              ✨ Synthesized Insight
            </div>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, lineHeight: 1.5, fontFamily: "Inter, system-ui, sans-serif" }}>
              Multi-model perspectives combined into actionable guidance
            </p>
          </div>
        </FadeInText>
      )}
    </AbsoluteFill>
  );
};

// Scene 4: Real screenshot - Cursor
const Scene4CursorDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(
    spring({ frame, fps, config: { damping: 30 } }),
    [0, 1],
    [1.1, 1]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a" }}>
      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          zIndex: 10,
        }}
      >
        <FadeInText delay={0}>
          <div
            style={{
              backgroundColor: "#8b5cf620",
              border: "1px solid #8b5cf6",
              borderRadius: 8,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ color: "#8b5cf6", fontSize: 16, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif" }}>
              Cursor
            </span>
          </div>
        </FadeInText>
      </div>

      {/* Screenshot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 30px 100px rgba(0,0,0,0.6)",
        }}
      >
        <Img
          src={staticFile("screenshots/cursor-response.png")}
          style={{ width: 1500, height: "auto" }}
        />
      </div>

      {/* Same tool, different IDE callout */}
      {frame > 40 && (
        <FadeInText delay={40}>
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: 60,
              backgroundColor: "#8b5cf620",
              border: "2px solid #8b5cf6",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: "#8b5cf6", fontSize: 18, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif" }}>
              Same Polydev, any MCP-compatible IDE
            </div>
          </div>
        </FadeInText>
      )}
    </AbsoluteFill>
  );
};

// Scene 5: All IDEs supported
const Scene5AllIDEs: React.FC = () => {
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
      <FadeInText delay={0}>
        <PolydevLogo size={64} color="#0f172a" />
      </FadeInText>

      <div style={{ marginTop: 32 }}>
        <Headline delay={15} size="md">
          Works everywhere you code
        </Headline>
      </div>

      <div style={{ display: "flex", gap: 48, marginTop: 64 }}>
        <IDEPanelSimple ide="claudeCode" delay={30} />
        <IDEPanelSimple ide="cursor" delay={40} />
        <IDEPanelSimple ide="cline" delay={50} />
        <IDEPanelSimple ide="windsurf" delay={60} />
      </div>
    </AbsoluteFill>
  );
};

// Scene 6: Stats
const Scene6Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const statEntrance = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(statEntrance, [0, 1], [0.8, 1])})`,
          opacity: statEntrance,
        }}
      >
        <div
          style={{
            fontSize: 180,
            fontWeight: 800,
            fontFamily: "Inter, system-ui, sans-serif",
            color: "#22c55e",
            textAlign: "center",
          }}
        >
          10%+
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#94a3b8",
            fontFamily: "Inter, system-ui, sans-serif",
            textAlign: "center",
            marginTop: 16,
          }}
        >
          higher success rate on coding benchmarks
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 7: CTA
const Scene7CTA: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <FadeInText delay={0}>
        <PolydevLogoFull size={100} />
      </FadeInText>

      <div style={{ marginTop: 48 }}>
        <Headline delay={20} color="#ffffff" size="md">
          Get unstuck with multiple perspectives
        </Headline>
      </div>

      <div style={{ marginTop: 48 }}>
        <TerminalCommand command="npx polydev-ai@latest" delay={40} />
      </div>

      <FadeInText delay={80}>
        <p
          style={{
            fontSize: 36,
            color: "#f59e0b",
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 48,
          }}
        >
          polydev.ai
        </p>
      </FadeInText>
    </AbsoluteFill>
  );
};

export const Version5RealDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Scene 1: 0-8 seconds - Terminal hook */}
      <Sequence from={0} durationInFrames={8 * fps} premountFor={fps}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: 8-16 seconds - Multi-model magic */}
      <Sequence from={8 * fps} durationInFrames={8 * fps} premountFor={fps}>
        <Scene2MultiModel />
      </Sequence>

      {/* Scene 3: 16-24 seconds - Real Claude Code screenshot */}
      <Sequence from={16 * fps} durationInFrames={8 * fps} premountFor={fps}>
        <Scene3RealScreenshot />
      </Sequence>

      {/* Scene 4: 24-32 seconds - Real Cursor screenshot */}
      <Sequence from={24 * fps} durationInFrames={8 * fps} premountFor={fps}>
        <Scene4CursorDemo />
      </Sequence>

      {/* Scene 5: 32-38 seconds - All IDEs */}
      <Sequence from={32 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <Scene5AllIDEs />
      </Sequence>

      {/* Scene 6: 38-44 seconds - Stats */}
      <Sequence from={38 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <Scene6Stats />
      </Sequence>

      {/* Scene 7: 44-50 seconds - CTA */}
      <Sequence from={44 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <Scene7CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
