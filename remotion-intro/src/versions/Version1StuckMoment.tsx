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
import { IDEMockup, IDEPanelSimple } from "../components/IDEMockup";

// Scene 1: Developer stuck with single AI
const Scene1Stuck: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <FadeInText delay={0}>
        <span
          style={{
            fontSize: 24,
            color: "#ef4444",
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          The Problem
        </span>
      </FadeInText>

      <div style={{ marginTop: 32 }}>
        <Headline delay={15} color="#ffffff">
          Your AI gave you one answer.
        </Headline>
      </div>

      <div style={{ marginTop: 16 }}>
        <Subheadline delay={35} color="#94a3b8">
          Was it the right one?
        </Subheadline>
      </div>

      {/* Animated question marks */}
      <FadeInText delay={55}>
        <div
          style={{
            fontSize: 100,
            marginTop: 48,
            display: "flex",
            gap: 24,
          }}
        >
          <span style={{ opacity: 0.3 }}>🤔</span>
          <span style={{ opacity: 0.6 }}>❓</span>
          <span style={{ opacity: 0.9 }}>🤷</span>
        </div>
      </FadeInText>
    </AbsoluteFill>
  );
};

// Scene 2: Polydev solution - IDE mockup showing perspectives
const Scene2PolydevInAction: React.FC = () => {
  const perspectives = [
    {
      model: "claude" as const,
      text: "Use a JOIN query instead of N+1 loops. Add query monitoring to track performance.",
      delay: 30,
    },
    {
      model: "gpt" as const,
      text: "Implement DataLoader pattern with Redis caching for frequently accessed data.",
      delay: 50,
    },
    {
      model: "gemini" as const,
      text: "Batch queries with Promise.all(). Consider GraphQL for flexible data loading.",
      delay: 70,
    },
    {
      model: "grok" as const,
      text: "Use materialized views for read-heavy queries. Add connection pooling.",
      delay: 90,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <FadeInText delay={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <PolydevLogo size={48} animate={false} />
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#0f172a",
            }}
          >
            gives you 4 perspectives instantly
          </span>
        </div>
      </FadeInText>

      <IDEMockup
        ide="claudeCode"
        userQuery="How do I fix the N+1 query problem in my user service?"
        perspectives={perspectives}
      />
    </AbsoluteFill>
  );
};

// Scene 3: Works with all IDEs
const Scene3AllIDEs: React.FC = () => {
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
      <Headline delay={0} size="lg">
        Works with your favorite tools
      </Headline>

      <div
        style={{
          display: "flex",
          gap: 64,
          marginTop: 80,
        }}
      >
        <IDEPanelSimple ide="claudeCode" delay={20} />
        <IDEPanelSimple ide="cursor" delay={30} />
        <IDEPanelSimple ide="cline" delay={40} />
        <IDEPanelSimple ide="windsurf" delay={50} />
      </div>

      <div style={{ marginTop: 60 }}>
        <FadeInText delay={70}>
          <p
            style={{
              fontSize: 24,
              color: "#64748b",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            One command to add to any MCP-compatible tool
          </p>
        </FadeInText>
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
        <PolydevLogoFull size={100} />
      </FadeInText>

      <div style={{ marginTop: 60 }}>
        <Headline delay={25} color="#ffffff" size="md">
          Stop guessing. Get perspectives.
        </Headline>
      </div>

      <div style={{ marginTop: 48 }}>
        <TerminalCommand command="npx polydev-ai@latest" delay={45} />
      </div>

      <FadeInText delay={90}>
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

export const Version1StuckMoment: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Scene 1: 0-5 seconds - The stuck moment */}
      <Sequence from={0} durationInFrames={5 * fps} premountFor={fps}>
        <Scene1Stuck />
      </Sequence>

      {/* Scene 2: 5-18 seconds - Polydev in IDE showing perspectives */}
      <Sequence from={5 * fps} durationInFrames={13 * fps} premountFor={fps}>
        <Scene2PolydevInAction />
      </Sequence>

      {/* Scene 3: 18-24 seconds - All IDEs */}
      <Sequence from={18 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <Scene3AllIDEs />
      </Sequence>

      {/* Scene 4: 24-30 seconds - CTA */}
      <Sequence from={24 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <Scene4CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
