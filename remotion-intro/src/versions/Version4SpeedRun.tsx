import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { Headline, FadeInText } from "../components/FadeInText";
import { TerminalCommand } from "../components/CodeBlock";
import { PolydevLogo, PolydevLogoFull } from "../components/PolydevLogo";
import { AI_MODELS, IDE_LOGOS, IDEPanelSimple } from "../components/IDEMockup";

// Scene 1: "Stuck?" (0-2s)
const Scene1Stuck: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 800,
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#ffffff",
          transform: `scale(${scale})`,
        }}
      >
        Stuck?
      </div>
      <FadeInText delay={15}>
        <div style={{ fontSize: 80, marginTop: 20 }}>😤</div>
      </FadeInText>
    </AbsoluteFill>
  );
};

// Scene 2: "One model won't cut it" (2-4s)
const Scene2OneModel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const xScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 10, stiffness: 150 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fef2f2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Headline delay={0} color="#991b1b" size="lg">
        One model won't cut it.
      </Headline>

      {/* Big X */}
      <div
        style={{
          fontSize: 180,
          color: "#dc2626",
          fontWeight: 900,
          transform: `scale(${xScale})`,
          marginTop: 40,
        }}
      >
        ✕
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: "Four models. One call." (4-7s)
const Scene3FourModels: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const models = Object.values(AI_MODELS);

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
      <FadeInText delay={0}>
        <PolydevLogo size={60} animate={false} />
      </FadeInText>

      <div style={{ marginTop: 24 }}>
        <Headline delay={10} size="md">
          Four models. One call.
        </Headline>
      </div>

      {/* Model logos appearing */}
      <div
        style={{
          display: "flex",
          gap: 40,
          marginTop: 48,
        }}
      >
        {models.map((model, idx) => {
          const entrance = spring({
            frame: frame - 25 - idx * 6,
            fps,
            config: { damping: 12, stiffness: 150 },
          });

          return (
            <div
              key={model.name}
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
                src={model.logo}
                alt={model.name}
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
                {model.name}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Works in your IDE (7-10s)
const Scene4IDEs: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <Headline delay={0} size="md">
        Works in your IDE
      </Headline>

      <div
        style={{
          display: "flex",
          gap: 48,
          marginTop: 64,
        }}
      >
        <IDEPanelSimple ide="claudeCode" delay={15} />
        <IDEPanelSimple ide="cursor" delay={22} />
        <IDEPanelSimple ide="cline" delay={29} />
        <IDEPanelSimple ide="windsurf" delay={36} />
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: "10%+ better" (10-12s)
const Scene5Results: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkScale = spring({
    frame: frame - 25,
    fps,
    config: { damping: 10, stiffness: 150 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ecfdf5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Headline delay={0} color="#065f46" size="lg">
        10%+ better results
      </Headline>

      {/* Big Checkmark */}
      <div
        style={{
          fontSize: 180,
          color: "#22c55e",
          transform: `scale(${checkScale})`,
          marginTop: 40,
        }}
      >
        ✓
      </div>
    </AbsoluteFill>
  );
};

// Scene 6: CTA (12-15s)
const Scene6CTA: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FadeInText delay={0}>
        <PolydevLogoFull size={100} />
      </FadeInText>

      <div style={{ marginTop: 40 }}>
        <TerminalCommand command="npx polydev-ai@latest" delay={25} />
      </div>

      <FadeInText delay={50}>
        <p
          style={{
            fontSize: 36,
            color: "#f59e0b",
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 32,
          }}
        >
          polydev.ai
        </p>
      </FadeInText>
    </AbsoluteFill>
  );
};

export const Version4SpeedRun: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Scene 1: 0-2 seconds */}
      <Sequence from={0} durationInFrames={2 * fps} premountFor={fps / 2}>
        <Scene1Stuck />
      </Sequence>

      {/* Scene 2: 2-4 seconds */}
      <Sequence from={2 * fps} durationInFrames={2 * fps} premountFor={fps / 2}>
        <Scene2OneModel />
      </Sequence>

      {/* Scene 3: 4-7 seconds */}
      <Sequence from={4 * fps} durationInFrames={3 * fps} premountFor={fps / 2}>
        <Scene3FourModels />
      </Sequence>

      {/* Scene 4: 7-10 seconds - IDEs */}
      <Sequence from={7 * fps} durationInFrames={3 * fps} premountFor={fps / 2}>
        <Scene4IDEs />
      </Sequence>

      {/* Scene 5: 10-12 seconds */}
      <Sequence from={10 * fps} durationInFrames={2 * fps} premountFor={fps / 2}>
        <Scene5Results />
      </Sequence>

      {/* Scene 6: 12-15 seconds */}
      <Sequence from={12 * fps} durationInFrames={3 * fps} premountFor={fps / 2}>
        <Scene6CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
