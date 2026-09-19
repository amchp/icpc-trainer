import { useId } from "react";
import type { Scene, Tone } from "./types.js";

const colors: Record<Tone, { fill: string; stroke: string; text: string }> = {
  neutral: { fill: "#27272a", stroke: "#71717a", text: "#e4e4e7" },
  active: { fill: "#164e63", stroke: "#22d3ee", text: "#cffafe" },
  good: { fill: "#064e3b", stroke: "#34d399", text: "#d1fae5" },
  bad: { fill: "#881337", stroke: "#fb7185", text: "#ffe4e6" },
  muted: { fill: "#18181b", stroke: "#3f3f46", text: "#71717a" },
};
const tone = (value?: Tone) => colors[value ?? "neutral"];
const motion =
  "transition-all duration-500 ease-in-out motion-reduce:transition-none";

export function ExampleIllustration({
  scene,
}: {
  readonly scene: Scene;
}): React.JSX.Element {
  const id = useId().replace(/:/g, "");
  const title = `${id}-title`;
  let height = 260;
  let viewWidth = 600;
  if (scene.kind === "bakery")
    return (
      <figure className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <figcaption className="text-sm text-zinc-300">{scene.label}</figcaption>
        <div className="my-4 rounded-lg border border-amber-900/60 bg-amber-950/20 p-4">
          <p className="mb-3 font-semibold text-amber-200">
            {scene.cookieLabel}: {scene.cookies}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Math.min(12, scene.cookies) }, (_, i) => (
              <svg
                key={i}
                viewBox="0 0 60 60"
                role="img"
                aria-label={scene.cookieLabel}
                className="size-12"
              >
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="#d6a15e"
                  stroke="#a16207"
                  strokeWidth="3"
                />
                {[
                  [20, 17],
                  [40, 22],
                  [28, 34],
                  [17, 41],
                  [40, 43],
                ].map(([x, y], j) => (
                  <circle key={j} cx={x} cy={y} r="3" fill="#713f12" />
                ))}
              </svg>
            ))}
            {scene.cookies === 0 ? (
              <span className="text-zinc-400">∅</span>
            ) : null}
            {scene.cookies > 12 ? (
              <span className="self-center text-amber-200">
                +{scene.cookies - 12}
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scene.ingredients.map((ingredient, i) => (
            <div key={i} className="rounded-lg border border-zinc-700 p-3">
              <p className="text-sm text-zinc-300">{ingredient.label}</p>
              <svg
                viewBox="0 0 100 90"
                role="img"
                aria-label={`${ingredient.label}: ${ingredient.remaining} g`}
                className="mx-auto h-24"
              >
                <path
                  d="M28 8 H72 L65 25 Q85 45 82 80 H18 Q15 45 35 25 Z"
                  fill="#44403c"
                  stroke="#a8a29e"
                  strokeWidth="2"
                />
                <text
                  x="50"
                  y="57"
                  textAnchor="middle"
                  fill="#fafafa"
                  fontSize="17"
                >
                  {ingredient.remaining} g
                </text>
              </svg>
              <p className="text-xs text-zinc-400">{ingredient.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg border border-cyan-700/60 bg-cyan-950/30 p-3 text-sm text-cyan-100">
          {scene.powderLabel}: <strong>{scene.powder} g</strong>
        </p>
      </figure>
    );
  let drawing: React.ReactNode;
  if (scene.kind === "items") {
    const singleRow = scene.shape === undefined || scene.shape === "card";
    const columns = singleRow
      ? Math.max(1, scene.items.length)
      : Math.min(6, Math.max(1, scene.items.length));
    viewWidth = singleRow ? Math.max(600, columns * 90 + 60) : 600;
    const width = (viewWidth - 60) / columns;
    height = Math.max(
      150,
      Math.ceil(scene.items.length / columns) * 110 +
        (scene.links?.length ? 60 : 15),
    );
    drawing = (
      <>
        {scene.items.length === 0 ? (
          <text x={300} y={80} textAnchor="middle" fontSize={40} fill="#a1a1aa">
            ∅
          </text>
        ) : null}
        {scene.links?.map(([a, b], index) => (
          <path
            key={index}
            d={`M${30 + ((a % columns) + 0.5) * width} ${Math.floor(a / columns) * 110 + 20} Q300 ${-40 - index * 10} ${30 + ((b % columns) + 0.5) * width} ${Math.floor(b / columns) * 110 + 20}`}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
          />
        ))}
        {scene.items.map((item, index) => {
          const c = tone(item.tone);
          const x = 30 + ((index % columns) + 0.5) * width;
          const y = 55 + Math.floor(index / columns) * 110;
          const shape = scene.shape;
          return (
            <g
              key={index}
              transform={`translate(${x},${y})`}
              className={motion}
            >
              {shape === "coin" || shape === "stone" ? (
                <>
                  <ellipse
                    rx={33}
                    ry={shape === "stone" ? 24 : 33}
                    fill={c.fill}
                    stroke={c.stroke}
                    strokeWidth="3"
                  />
                  {shape === "coin" ? (
                    <circle
                      r={26}
                      fill="none"
                      stroke={c.stroke}
                      strokeDasharray="3 3"
                    />
                  ) : null}
                </>
              ) : shape === "watermelon" ? (
                <>
                  <path
                    d="M-39 -22 A44 44 0 0 0 39 -22 Z"
                    fill="#fb7185"
                    stroke="#34d399"
                    strokeWidth="7"
                  />
                  <path
                    d="M-18 -9 l2 5 M0 -9 l0 5 M18 -9 l-2 5"
                    stroke="#18181b"
                    strokeWidth="3"
                  />
                </>
              ) : shape === "bottle" ? (
                <path
                  d="M-12 -36 H12 V-20 L24 -7 V32 H-24 V-7 L-12 -20 Z"
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth="2"
                />
              ) : shape === "folder" ? (
                <path
                  d="M-36 -23 H-8 L0 -14 H36 V29 H-36 Z"
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth="2"
                />
              ) : (
                <>
                  <rect
                    x={-width * 0.43}
                    y={-32}
                    width={width * 0.86}
                    height={66}
                    rx={shape === "book" ? 2 : 9}
                    fill={c.fill}
                    stroke={c.stroke}
                    strokeWidth="2"
                  />
                  {shape === "book" ? (
                    <line
                      x1={-width * 0.33}
                      x2={-width * 0.33}
                      y1={-32}
                      y2={34}
                      stroke={c.stroke}
                      strokeWidth="3"
                    />
                  ) : null}
                </>
              )}
              <text
                textAnchor="middle"
                y={scene.shape === "watermelon" ? 49 : 6}
                fill={c.text}
                fontSize={
                  item.text.length > 9 ? 11 : item.text.length > 5 ? 14 : 20
                }
                fontWeight="600"
              >
                {item.text}
              </text>
              {item.detail !== undefined ? (
                <text
                  textAnchor="middle"
                  y={scene.shape === "watermelon" ? 68 : 57}
                  fill="#a1a1aa"
                  fontSize="12"
                >
                  {item.detail}
                </text>
              ) : null}
              {item.tone === "good" || item.tone === "bad" ? (
                <text x={width * 0.33} y={-23} fill={c.stroke} fontSize="16">
                  {item.tone === "good" ? "✓" : "✗"}
                </text>
              ) : null}
            </g>
          );
        })}
      </>
    );
  } else if (scene.kind === "grid") {
    const rows = scene.cells.length;
    const columns = scene.cells[0]?.length ?? 1;
    const size = Math.min(60, 500 / Math.max(rows, columns));
    const left = (600 - columns * size) / 2;
    height = rows * size + 40;
    drawing = (
      <>
        {scene.cells.flatMap((row, r) =>
          row.map((cell, c) => {
            const color = tone(cell.tone);
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={left + c * size}
                  y={20 + r * size}
                  width={size}
                  height={size}
                  fill={color.fill}
                  stroke={color.stroke}
                  className={motion}
                />
                <text
                  x={left + (c + 0.5) * size}
                  y={20 + (r + 0.5) * size + 6}
                  textAnchor="middle"
                  fill={color.text}
                  fontSize={size * 0.36}
                >
                  {cell.text}
                </text>
              </g>
            );
          }),
        )}
        {scene.sudoku
          ? [0, 3, 6, 9].map((n) => (
              <g key={n}>
                <line
                  x1={left + n * size}
                  x2={left + n * size}
                  y1={20}
                  y2={20 + rows * size}
                  stroke="#a1a1aa"
                  strokeWidth="3"
                />
                <line
                  x1={left}
                  x2={left + columns * size}
                  y1={20 + n * size}
                  y2={20 + n * size}
                  stroke="#a1a1aa"
                  strokeWidth="3"
                />
              </g>
            ))
          : null}
        {scene.cursor ? (
          <circle
            cx={left + (scene.cursor[1] + 0.5) * size}
            cy={20 + (scene.cursor[0] + 0.5) * size}
            r={size * 0.3}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="4"
            className={motion}
          />
        ) : null}
      </>
    );
  } else if (scene.kind === "graph") {
    height = 340;
    const point = (i: number) => ({
      x:
        300 +
        Math.cos((i * Math.PI * 2) / scene.nodes.length - Math.PI / 2) * 215,
      y:
        165 +
        Math.sin((i * Math.PI * 2) / scene.nodes.length - Math.PI / 2) * 115,
    });
    drawing = (
      <>
        <defs>
          <marker
            id={`${id}-arrow`}
            markerWidth="8"
            markerHeight="8"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8" fill="#a1a1aa" />
          </marker>
        </defs>
        {scene.edges.map((edge, i) => {
          const a = point(edge.a);
          const b = point(edge.b);
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const offset =
            scene.edges
              .slice(0, i)
              .filter((e) => e.a === edge.a && e.b === edge.b).length * 18;
          const end = {
            x: b.x - ((b.x - a.x) / len) * 30,
            y: b.y - ((b.y - a.y) / len) * 30,
          };
          return (
            <g key={i}>
              <path
                d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2 + offset} ${(a.y + b.y) / 2 - offset} ${end.x} ${end.y}`}
                fill="none"
                stroke={tone(edge.tone).stroke}
                strokeWidth={edge.tone === "good" ? 5 : 2}
                markerEnd={scene.directed ? `url(#${id}-arrow)` : undefined}
                className={motion}
              />
              {edge.weight !== undefined ? (
                <g>
                  <rect
                    x={(a.x + b.x) / 2 - 10 + offset / 2}
                    y={(a.y + b.y) / 2 - 11 - offset / 2}
                    width={24}
                    height={20}
                    rx={4}
                    fill="#09090b"
                  />
                  <text
                    x={(a.x + b.x) / 2 + 2 + offset / 2}
                    y={(a.y + b.y) / 2 + 4 - offset / 2}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#fbbf24"
                  >
                    {edge.weight}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        {scene.nodes.map((node, i) => {
          const p = point(i);
          const color = tone(node.tone);
          return (
            <g key={i}>
              {scene.folders ? (
                <path
                  d={`M${p.x - 26} ${p.y - 20} h20 l6 7 h26 v33 h-52 Z`}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="2"
                />
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={26}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="3"
                  className={motion}
                />
              )}
              <text
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
                fill={color.text}
                fontSize="14"
              >
                {node.text}
              </text>
              {node.detail ? (
                <text
                  x={p.x}
                  y={p.y + 43}
                  textAnchor="middle"
                  fill={color.text}
                  fontSize="12"
                >
                  {node.detail}
                </text>
              ) : null}
            </g>
          );
        })}
      </>
    );
  } else if (scene.kind === "timeline") {
    const min = Math.min(0, ...scene.intervals.map((n) => n.start));
    const max = Math.max(1, ...scene.intervals.map((n) => n.end));
    const x = (n: number) => 65 + ((n - min) / (max - min)) * 460;
    height = scene.intervals.length * 60 + 35;
    drawing = (
      <>
        {scene.intervals.map((interval, index) => (
          <g key={index}>
            <text x={12} y={index * 60 + 39} fill="#d4d4d8" fontSize="14">
              {interval.text}
            </text>
            <rect
              x={x(interval.start)}
              y={index * 60 + 18}
              width={Math.max(3, x(interval.end) - x(interval.start))}
              height={26}
              rx={4}
              fill={tone(interval.tone).fill}
              stroke={tone(interval.tone).stroke}
              strokeWidth="2"
              className={motion}
            />
            <text
              x={x(interval.start)}
              y={index * 60 + 61}
              fill="#a1a1aa"
              fontSize="12"
            >
              {interval.start}
            </text>
            <text
              x={x(interval.end)}
              y={index * 60 + 61}
              fill="#a1a1aa"
              fontSize="12"
            >
              {interval.end}
            </text>
          </g>
        ))}
      </>
    );
  } else if (scene.kind === "chart") {
    const min = Math.min(0, ...scene.values);
    const max = Math.max(1, ...scene.values);
    const x = (i: number) =>
      45 + (i / Math.max(1, scene.values.length - 1)) * 500;
    const y = (n: number) => 210 - ((n - min) / (max - min)) * 150;
    drawing = (
      <>
        <path d="M40 25 V215 H560" fill="none" stroke="#71717a" />
        <polyline
          points={scene.values.map((n, i) => `${x(i)},${y(n)}`).join(" ")}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3"
        />
        {scene.annotations?.map((annotation) => (
          <g key={annotation.index}>
            <line
              x1={x(annotation.index)}
              x2={x(annotation.index)}
              y1={y(scene.values[annotation.index]!) + 10}
              y2={y(scene.values[annotation.index]!) + 25}
              stroke="#fbbf24"
            />
            <rect
              x={x(annotation.index) - 28}
              y={y(scene.values[annotation.index]!) + 25}
              width={56}
              height={21}
              rx={4}
              fill="#422006"
            />
            <text
              x={x(annotation.index)}
              y={y(scene.values[annotation.index]!) + 40}
              textAnchor="middle"
              fill="#fde68a"
              fontSize="13"
            >
              {annotation.text}
            </text>
          </g>
        ))}
        {scene.values.map((n, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(n)}
              r={scene.marked?.includes(i) ? 9 : 5}
              fill={scene.marked?.includes(i) ? "#34d399" : "#22d3ee"}
              className={motion}
            />
            <text
              x={x(i)}
              y={y(n) - 14}
              textAnchor="middle"
              fontSize="14"
              fill="#e4e4e7"
            >
              {n}
            </text>
            <text
              x={x(i)}
              y={235}
              textAnchor="middle"
              fontSize="12"
              fill="#a1a1aa"
            >
              {i}
            </text>
          </g>
        ))}
      </>
    );
  } else if (scene.kind === "square") {
    drawing = (
      <>
        <rect
          x={195}
          y={25}
          width={200}
          height={200}
          fill="#164e63"
          stroke="#22d3ee"
          strokeWidth="3"
        />
        <text x={295} y={130} textAnchor="middle" fontSize="24" fill="#cffafe">
          {scene.area}
        </text>
        <path d="M190 235 H400 M190 228 V242 M400 228 V242" stroke="#fbbf24" />
        <text x={430} y={135} fontSize="16" fill="#fbbf24">
          {scene.side === undefined ? "?" : scene.side.toFixed(5)}
        </text>
      </>
    );
  } else {
    height = 360;
    const minX = Math.min(0, ...scene.circles.map((c) => c.x - 1)),
      maxX = Math.max(scene.width, ...scene.circles.map((c) => c.x + 1)),
      minY = Math.min(0, ...scene.circles.map((c) => c.y - 1)),
      maxY = Math.max(scene.height, ...scene.circles.map((c) => c.y + 1));
    const scale = Math.min(480 / (maxX - minX), 280 / (maxY - minY));
    const x = (n: number) => 60 + (n - minX) * scale;
    const y = (n: number) => 20 + (maxY - n) * scale;
    drawing = (
      <>
        <rect
          x={x(0)}
          y={y(scene.height)}
          width={scene.width * scale}
          height={scene.height * scale}
          rx={5}
          fill="#292524"
          stroke="#a8a29e"
          strokeWidth="3"
        />
        {scene.circles.map((circle, i) => (
          <circle
            key={i}
            cx={x(circle.x)}
            cy={y(circle.y)}
            r={scale}
            fill={tone(circle.tone).fill}
            stroke={tone(circle.tone).stroke}
            strokeWidth="3"
            className={motion}
          />
        ))}
      </>
    );
  }
  return (
    <figure className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <figcaption className="mb-2 text-sm text-zinc-300">
        {scene.label}
      </figcaption>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="group"
        aria-label={scene.label}
      >
        <svg
          viewBox={`0 0 ${viewWidth} ${height}`}
          role="img"
          aria-labelledby={title}
          className="mx-auto block w-full"
          style={{
            minWidth:
              scene.kind === "items" &&
              (scene.shape === undefined || scene.shape === "card")
                ? Math.max(320, scene.items.length * 48 + 48)
                : 480,
            maxWidth: Math.max(672, viewWidth),
          }}
        >
          <title id={title}>{scene.label}</title>
          {drawing}
        </svg>
      </div>
    </figure>
  );
}
