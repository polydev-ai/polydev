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
import { CodeBlock, TerminalCommand } from "../components/CodeBlock";
import { PolydevLogo, PolydevLogoFull } from "../components/PolydevLogo";
import { IDEMockup, AI_MODELS, IDEPanelSimple } from "../components/IDEMockup";

const N1_QUERY_CODE = `async function getUsers() {
  const users = await db.query('SELECT * FROM users')

  for (const user of users) {
    user.posts = await db.query(
      'SELECT * FROM posts WHERE user_id = ?',
      [user.id]
    )
  }

  return users  // 10k users = 10k queries!
}`;

// Scene 1: The Problem
const Scene1Problem: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        gap: 80,
      }}
    >
      {/* Left: Problem statement */}
      <div style={{ flex: 1, maxWidth: 500 }}>
        <FadeInText delay={0}>
          <span
            style={{
              fontSize: 18,
              color: "#ef4444",
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Production Down
          </span>
        </FadeInText>
        <div style={{ marginTop: 16 }}>
          <Headline delay={10} color="#ffffff" size="md" align="left">
            You ask your AI for help.
          </Headline>
        </div>
        <div style={{ marginTop: 24 }}>
          <Subheadline delay={30} color="#94a3b8" align="left">
            It gives you one answer. Is it right?
          </Subheadline>
        </div>
      </div>

      {/* Right: Code block */}
      <div style={{ flex: 1, maxWidth: 700 }}>
        <CodeBlock
          code={N1_QUERY_CODE}
          filename="user-service.ts"
          delay={20}
          highlightLines={[4, 5, 6, 7, 8, 9]}
        />
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Polydev IDE mockup with real perspectives
const Scene2PolydevDemo: React.FC = () => {
  const perspectives = [
    {
      model: "claude" as const,
      text: "Use a JOIN query to batch all user posts in one query. This eliminates the N+1 problem entirely.",
      delay: 20,
    },
    {
      model: "gpt" as const,
      text: "Implement DataLoader pattern for automatic batching. Add Redis cache for frequently accessed users.",
      delay: 40,
    },
    {
      model: "gemini" as const,
      text: "Use Promise.all with chunked batches of 100. Add query monitoring to track performance gains.",
      delay: 60,
    },
    {
      model: "grok" as const,
      text: "Create a materialized view for user+posts. Use connection pooling to handle concurrent loads.",
      delay: 80,
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <PolydevLogo size={48} animate={false} />
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#0f172a",
            }}
          >
            in Claude Code
          </span>
        </div>
      </FadeInText>

      <IDEMockup
        ide="claudeCode"
        userQuery="How do I fix the N+1 query problem that's killing our production database?"
        perspectives={perspectives}
      />
    </AbsoluteFill>
  );
};

// Scene 3: Same in Cline
const Scene3ClineDemo: React.FC = () => {
  const perspectives = [
    {
      model: "claude" as const,
      text: "The N+1 is in your user loader. Use a single LEFT JOIN instead of the loop.",
      delay: 15,
    },
    {
      model: "gpt" as const,
      text: "Prisma's include() will solve this automatically. Switch from raw SQL.",
      delay: 30,
    },
    {
      model: "gemini" as const,
      text: "Add query batching with a 50ms window. This catches all related queries.",
      delay: 45,
    },
    {
      model: "grok" as const,
      text: "Consider GraphQL with DataLoader for complex nested data requirements.",
      delay: 60,
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <PolydevLogo size={48} animate={false} />
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#0f172a",
            }}
          >
            in Cline
          </span>
        </div>
      </FadeInText>

      <IDEMockup
        ide="cline"
        userQuery="Why is my database query so slow with 10k users?"
        perspectives={perspectives}
      />
    </AbsoluteFill>
  );
};

// Scene 4: All IDEs
const Scene4AllIDEs: React.FC = () => {
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
        <PolydevLogo size={64} />
      </FadeInText>

      <div style={{ marginTop: 32 }}>
        <Headline delay={15} size="md">
          Works everywhere you code
        </Headline>
      </div>

      <div
        style={{
          display: "flex",
          gap: 56,
          marginTop: 64,
        }}
      >
        <IDEPanelSimple ide="claudeCode" delay={30} />
        <IDEPanelSimple ide="cursor" delay={40} />
        <IDEPanelSimple ide="cline" delay={50} />
        <IDEPanelSimple ide="windsurf" delay={60} />
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: CTA
const Scene5CTA: React.FC = () => {
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

export const Version3TheDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Scene 1: 0-8 seconds */}
      <Sequence from={0} durationInFrames={8 * fps} premountFor={fps}>
        <Scene1Problem />
      </Sequence>

      {/* Scene 2: 8-22 seconds - Polydev in Claude Code */}
      <Sequence from={8 * fps} durationInFrames={14 * fps} premountFor={fps}>
        <Scene2PolydevDemo />
      </Sequence>

      {/* Scene 3: 22-34 seconds - Polydev in Cline */}
      <Sequence from={22 * fps} durationInFrames={12 * fps} premountFor={fps}>
        <Scene3ClineDemo />
      </Sequence>

      {/* Scene 4: 34-40 seconds - All IDEs */}
      <Sequence from={34 * fps} durationInFrames={6 * fps} premountFor={fps}>
        <Scene4AllIDEs />
      </Sequence>

      {/* Scene 5: 40-45 seconds - CTA */}
      <Sequence from={40 * fps} durationInFrames={5 * fps} premountFor={fps}>
        <Scene5CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
