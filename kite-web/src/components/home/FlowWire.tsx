interface Point {
  x: number;
  y: number;
}

interface Props {
  from: Point;
  to: Point;
  /** Wire color; defaults to the muted editor wire gray. */
  color?: string;
  /** Pull of the bezier control points along the vertical axis (0–1). */
  curvature?: number;
}

/**
 * A bezier "wire" between two nodes, drawn the way the flow editor draws
 * edges: vertical control points for a smooth top→bottom S-curve. Renders a
 * soft underlay plus a brighter dashed line that animates like flowing data.
 * Must be placed inside an <svg> sharing the constellation's viewBox.
 */
export default function FlowWire({
  from,
  to,
  color = "#7c7995",
  curvature = 0.5,
}: Props) {
  const dy = (to.y - from.y) * curvature;
  const d = `M ${from.x} ${from.y} C ${from.x} ${from.y + dy} ${to.x} ${
    to.y - dy
  } ${to.x} ${to.y}`;

  return (
    <g>
      {/* Soft static underlay for body + a faint colored halo. */}
      <path d={d} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
      {/* Bright traveling dashes. */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        className="home-wire-flow"
        opacity={0.9}
      />
    </g>
  );
}
