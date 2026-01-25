import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

type CodeBlockProps = {
  code: string;
  filename?: string;
  delay?: number;
  highlightLines?: number[];
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  filename,
  delay = 0,
  highlightLines = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.95, 1]);

  const lines = code.split("\n");

  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        borderRadius: 16,
        overflow: "hidden",
        transform: `scale(${scale})`,
        opacity,
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          backgroundColor: "#0f172a",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ef4444",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#f59e0b",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
            }}
          />
        </div>
        {filename && (
          <span
            style={{
              color: "#94a3b8",
              fontSize: 14,
              fontFamily: "JetBrains Mono, monospace",
              marginLeft: 12,
            }}
          >
            {filename}
          </span>
        )}
      </div>
      {/* Code content */}
      <div style={{ padding: 24 }}>
        <pre
          style={{
            margin: 0,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          {lines.map((line, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: highlightLines.includes(idx + 1)
                  ? "rgba(245, 158, 11, 0.2)"
                  : "transparent",
                padding: "0 8px",
                marginLeft: -8,
                marginRight: -8,
                borderLeft: highlightLines.includes(idx + 1)
                  ? "3px solid #f59e0b"
                  : "3px solid transparent",
              }}
            >
              <span style={{ color: "#64748b", marginRight: 24, userSelect: "none" }}>
                {String(idx + 1).padStart(2, " ")}
              </span>
              <span style={{ color: "#e2e8f0" }}>{line || " "}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

// Terminal command component
type TerminalCommandProps = {
  command: string;
  delay?: number;
};

export const TerminalCommand: React.FC<TerminalCommandProps> = ({
  command,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Typing effect
  const typeProgress = interpolate(
    frame - delay,
    [0, command.length * 2],
    [0, command.length],
    { extrapolateRight: "clamp" }
  );

  const displayedCommand = command.slice(0, Math.floor(typeProgress));

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        borderRadius: 12,
        padding: "20px 28px",
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        opacity,
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      <span style={{ color: "#22c55e", fontFamily: "JetBrains Mono, monospace", fontSize: 20 }}>
        $
      </span>
      <span style={{ color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: 20 }}>
        {displayedCommand}
        <span
          style={{
            backgroundColor: "#f59e0b",
            width: 10,
            height: 24,
            display: "inline-block",
            marginLeft: 2,
            opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
          }}
        />
      </span>
    </div>
  );
};
