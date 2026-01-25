import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { Headline, Subheadline, FadeInText } from "../components/FadeInText";
import { TerminalCommand } from "../components/CodeBlock";
import { PolydevLogo, PolydevLogoFull } from "../components/PolydevLogo";
import { AI_MODELS, IDEPanelSimple } from "../components/IDEMockup";

// Animated counter for the 10%+ stat
const AnimatedStat: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame - delay, [0, 30], [0, 10], {
    extrapolateRight: "clamp",
  });

  const scale = spring({
    frame: frame - delay - 30,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <div
      style={{
        fontSize: 180,
        fontWeight: 800,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#f59e0b",
        transform: `scale(${0.9 + scale * 0.1})`,
      }}
    >
      {Math.floor(progress)}%+
    </div>
  );
};

// Scene 1: The Hook - "10% higher success rate"
const Scene1Hook: React.FC = () => {
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
        <PolydevLogo size={80} color="#ffffff" />
      </FadeInText>

      <div style={{ marginTop: 48 }}>
        <AnimatedStat delay={20} />
      </div>

      <FadeInText delay={55}>
        <p
          style={{
            fontSize: 36,
            color: "#ffffff",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          higher success rate on coding benchmarks
        </p>
      </FadeInText>
    </AbsoluteFill>
  );
};

// Scene 2: The Architecture diagram with Polydev
const Scene2Architecture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const arrowProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200 },
  });

  const modelsProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200 },
  });

  const outputProgress = spring({
    frame: frame - 70,
    fps,
    config: { damping: 200 },
  });

  const models = Object.values(AI_MODELS);

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
      {/* Architecture Flow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        {/* Your Agent */}
        <FadeInText delay={0}>
          <div
            style={{
              backgroundColor: "#f1f5f9",
              padding: "24px 36px",
              borderRadius: 12,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 24,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Your IDE
          </div>
        </FadeInText>

        {/* Arrow */}
        <div
          style={{
            fontSize: 48,
            color: "#94a3b8",
            opacity: arrowProgress,
            transform: `translateX(${interpolate(arrowProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          →
        </div>

        {/* Polydev */}
        <FadeInText delay={15}>
          <div
            style={{
              backgroundColor: "#0f172a",
              padding: "20px 32px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <PolydevLogo size={36} color="#ffffff" showText={false} animate={false} />
            <span
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 24,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Polydev
            </span>
          </div>
        </FadeInText>

        {/* Arrow */}
        <div
          style={{
            fontSize: 48,
            color: "#94a3b8",
            opacity: arrowProgress,
            transform: `translateX(${interpolate(arrowProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          →
        </div>

        {/* Models */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            opacity: modelsProgress,
            transform: `scale(${interpolate(modelsProgress, [0, 1], [0.9, 1])})`,
          }}
        >
          {models.map((model) => (
            <div
              key={model.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#f8fafc",
                padding: "10px 18px",
                borderRadius: 8,
                border: `2px solid ${model.color}30`,
              }}
            >
              <img src={model.logo} alt={model.name} style={{ width: 24, height: 24 }} />
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: "Inter, system-ui, sans-serif",
                  color: "#0f172a",
                }}
              >
                {model.name}
              </span>
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 48,
            color: "#94a3b8",
            opacity: outputProgress,
          }}
        >
          →
        </div>

        {/* Synthesized Answer */}
        <div
          style={{
            opacity: outputProgress,
            transform: `scale(${interpolate(outputProgress, [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              backgroundColor: "#22c55e",
              padding: "24px 36px",
              borderRadius: 12,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 24,
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            ✓ Best Answer
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{ marginTop: 60 }}>
        <FadeInText delay={90}>
          <p
            style={{
              fontSize: 28,
              color: "#64748b",
              fontFamily: "Inter, system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            Different models have different strengths.
            <br />
            <span style={{ color: "#0f172a", fontWeight: 600 }}>Polydev combines them.</span>
          </p>
        </FadeInText>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: IDE Logos
const Scene3IDEs: React.FC = () => {
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
      <Headline delay={0} size="lg">
        Integrates with your workflow
      </Headline>

      <div
        style={{
          display: "flex",
          gap: 56,
          marginTop: 80,
        }}
      >
        <IDEPanelSimple ide="claudeCode" delay={20} />
        <IDEPanelSimple ide="cursor" delay={30} />
        <IDEPanelSimple ide="cline" delay={40} />
        <IDEPanelSimple ide="windsurf" delay={50} />
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: CTA
const Scene4CTA: React.FC = () => {
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
        <PolydevLogoFull size={90} />
      </FadeInText>

      <div style={{ marginTop: 48 }}>
        <Headline delay={20} color="#ffffff" size="md">
          One command. Instant setup.
        </Headline>
      </div>

      <div style={{ marginTop: 48 }}>
        <TerminalCommand command="npx polydev-ai@latest" delay={40} />
      </div>

      <FadeInText delay={80}>
        <p
          style={{
            fontSize: 32,
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

export const Version2TheMath: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Scene 1: 0-5 seconds */}
      <Sequence from={0} durationInFrames={5 * fps} premountFor={fps}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: 5-15 seconds */}
      <Sequence from={5 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <Scene2Architecture />
      </Sequence>

      {/* Scene 3: 15-20 seconds */}
      <Sequence from={15 * fps} durationInFrames={5 * fps} premountFor={fps}>
        <Scene3IDEs />
      </Sequence>

      {/* Scene 4: 20-25 seconds */}
      <Sequence from={20 * fps} durationInFrames={5 * fps} premountFor={fps}>
        <Scene4CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
