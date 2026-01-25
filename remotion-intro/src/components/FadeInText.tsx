import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

type FadeInTextProps = {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  direction?: "up" | "down" | "left" | "right";
};

export const FadeInText: React.FC<FadeInTextProps> = ({
  children,
  delay = 0,
  style = {},
  direction = "up",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const getTransform = () => {
    const distance = 40;
    switch (direction) {
      case "up":
        return `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`;
      case "down":
        return `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)`;
      case "left":
        return `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)`;
      case "right":
        return `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)`;
    }
  };

  return (
    <div
      style={{
        opacity,
        transform: getTransform(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Headline text with large styling
type HeadlineProps = {
  children: React.ReactNode;
  delay?: number;
  size?: "xl" | "lg" | "md";
  color?: string;
  align?: "left" | "center" | "right";
};

export const Headline: React.FC<HeadlineProps> = ({
  children,
  delay = 0,
  size = "xl",
  color = "#0f172a",
  align = "center",
}) => {
  const sizes = {
    xl: 72,
    lg: 56,
    md: 40,
  };

  return (
    <FadeInText delay={delay}>
      <h1
        style={{
          fontSize: sizes[size],
          fontWeight: 700,
          fontFamily: "Inter, system-ui, sans-serif",
          color,
          margin: 0,
          textAlign: align,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {children}
      </h1>
    </FadeInText>
  );
};

// Subheadline text
type SubheadlineProps = {
  children: React.ReactNode;
  delay?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export const Subheadline: React.FC<SubheadlineProps> = ({
  children,
  delay = 0,
  color = "#64748b",
  align = "center",
}) => {
  return (
    <FadeInText delay={delay}>
      <p
        style={{
          fontSize: 28,
          fontWeight: 400,
          fontFamily: "Inter, system-ui, sans-serif",
          color,
          margin: 0,
          textAlign: align,
          lineHeight: 1.4,
        }}
      >
        {children}
      </p>
    </FadeInText>
  );
};
