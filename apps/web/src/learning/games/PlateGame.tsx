import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import { GameFrame, ResetButton, StrategyDisclosure, playerTone } from "./GamePrimitives.js";
import {
  DEFAULT_PLATE_DIMENSIONS,
  isLegalPlateCenter,
  placePlate,
  type PlateBoardDimensions,
  type PlateCenter,
  type PlateGameState
} from "./gameModels.js";

const INITIAL_PLATE_STATE: PlateGameState = { centers: [], activePlayer: 1, winner: null, moveCount: 0 };
const KEYBOARD_STEP = 0.1;
const BOARD_SIZE_OPTIONS = Array.from({ length: 11 }, (_, index) => index + 2);

const clampKeyboardCoordinate = (coordinate: number, maximum: number): number =>
  Math.min(maximum - 1, Math.max(1, coordinate));

export function PlateGame(): React.JSX.Element {
  const { t } = useTranslation("introduction");
  const [state, setState] = useState<PlateGameState>(INITIAL_PLATE_STATE);
  const [dimensions, setDimensions] = useState<PlateBoardDimensions>(DEFAULT_PLATE_DIMENSIONS);
  const [previewCenter, setPreviewCenter] = useState<PlateCenter | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const boardCenter: PlateCenter = { x: dimensions.width / 2, y: dimensions.height / 2 };

  const attemptPlacement = (center: PlateCenter): void => {
    const movingPlayer = state.activePlayer;
    const transition = placePlate(state, center, dimensions);
    if (!transition.valid) {
      setAnnouncement(t("games.invalid", { player: movingPlayer }));
      return;
    }
    setState(transition.state);
    setAnnouncement(transition.state.winner === null
      ? t("games.plate.placed", { player: movingPlayer, next: transition.state.activePlayer })
      : t("games.plate.won", { player: movingPlayer }));
  };

  const updateDimension = (dimension: keyof PlateBoardDimensions, value: number): void => {
    const nextDimensions = { ...dimensions, [dimension]: value };
    setDimensions(nextDimensions);
    setState(INITIAL_PLATE_STATE);
    setPreviewCenter(null);
    setExplanationOpen(false);
    setAnnouncement(t("games.plate.resized", { width: nextDimensions.width, height: nextDimensions.height }));
  };

  const reset = (): void => {
    setState(INITIAL_PLATE_STATE);
    setPreviewCenter(null);
    setExplanationOpen(false);
    setAnnouncement(t("games.active", { player: 1 }));
  };

  const centerFromPointer = (event: React.PointerEvent<SVGSVGElement>): PlateCenter => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * dimensions.width,
      y: ((event.clientY - bounds.top) / bounds.height) * dimensions.height
    };
  };

  const previewIsLegal = previewCenter !== null && isLegalPlateCenter(state.centers, previewCenter, dimensions);

  return (
    <GameFrame
      title={t("sections.plate")}
      status={state.winner === null ? t("games.active", { player: state.activePlayer }) : t("games.winner", { player: state.winner })}
      statusClassName={playerTone(state.winner ?? state.activePlayer)}
      announcement={announcement}
    >
      <p id="plate-game-instructions" className="mb-4 text-sm leading-6 text-zinc-400">{t("games.plate.mouseInstruction")}</p>
      <fieldset className="mb-4 flex flex-wrap items-end gap-4 border-y border-zinc-800 py-4">
        <legend className="sr-only">{t("games.plate.dimensions")}</legend>
        <label className="grid gap-1.5 text-sm text-zinc-300">
          <span>{t("games.plate.width")}</span>
          <select value={dimensions.width} onChange={(event) => updateDimension("width", Number(event.target.value))} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            {BOARD_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-zinc-300">
          <span>{t("games.plate.height")}</span>
          <select value={dimensions.height} onChange={(event) => updateDimension("height", Number(event.target.value))} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            {BOARD_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <output className="pb-2 font-mono text-sm text-cyan-200">{dimensions.width} × {dimensions.height}</output>
      </fieldset>
      <div className="mx-auto max-w-2xl rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
        <svg
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
          className="block w-full touch-none rounded-sm bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          role="img"
          aria-label={t("games.plate.label", { width: dimensions.width, height: dimensions.height })}
          aria-describedby="plate-game-instructions"
          tabIndex={0}
          onFocus={() => {
            if (state.winner === null) setPreviewCenter((current) => current ?? boardCenter);
          }}
          onBlur={() => setPreviewCenter(null)}
          onKeyDown={(event) => {
            if (state.winner !== null) return;
            if (event.key === "Enter" || event.key === " ") {
              if (previewCenter !== null) attemptPlacement(previewCenter);
              event.preventDefault();
              return;
            }
            const movement = {
              ArrowLeft: { x: -KEYBOARD_STEP, y: 0 },
              ArrowRight: { x: KEYBOARD_STEP, y: 0 },
              ArrowUp: { x: 0, y: -KEYBOARD_STEP },
              ArrowDown: { x: 0, y: KEYBOARD_STEP }
            }[event.key];
            if (movement === undefined) return;
            setPreviewCenter((current) => {
              const origin = current ?? boardCenter;
              return {
                x: clampKeyboardCoordinate(origin.x + movement.x, dimensions.width),
                y: clampKeyboardCoordinate(origin.y + movement.y, dimensions.height)
              };
            });
            event.preventDefault();
          }}
          onPointerMove={(event) => {
            if (state.winner === null) setPreviewCenter(centerFromPointer(event));
          }}
          onPointerLeave={() => setPreviewCenter(null)}
          onPointerDown={(event) => {
            if (state.winner !== null) return;
            const center = centerFromPointer(event);
            setPreviewCenter(center);
            attemptPlacement(center);
          }}
        >
          <rect x="0" y="0" width={dimensions.width} height={dimensions.height} rx="0.12" fill="#27272a" />
          {Array.from({ length: dimensions.width + 1 }, (_, index) => (
            <line key={`vertical-${index}`} x1={index} y1="0" x2={index} y2={dimensions.height} stroke="#52525b" strokeWidth="0.025" aria-hidden="true" />
          ))}
          {Array.from({ length: dimensions.height + 1 }, (_, index) => (
            <line key={`horizontal-${index}`} x1="0" y1={index} x2={dimensions.width} y2={index} stroke="#52525b" strokeWidth="0.025" aria-hidden="true" />
          ))}
          {state.centers.map((center, index) => (
            <circle data-plate="true" key={`${center.x}-${center.y}-${index}`} cx={center.x} cy={center.y} r="1" fill={index % 2 === 0 ? "#22d3ee" : "#e879f9"} fillOpacity="0.78" stroke="#f4f4f5" strokeWidth="0.05" />
          ))}
          {previewCenter !== null && state.winner === null ? (
            <circle
              data-preview="true"
              data-valid={previewIsLegal ? "true" : "false"}
              cx={previewCenter.x}
              cy={previewCenter.y}
              r="1"
              fill={previewIsLegal ? (state.activePlayer === 1 ? "#22d3ee" : "#e879f9") : "#f87171"}
              fillOpacity="0.22"
              stroke={previewIsLegal ? "#f4f4f5" : "#f87171"}
              strokeDasharray="0.14 0.1"
              strokeWidth="0.07"
              pointerEvents="none"
              aria-hidden="true"
            />
          ) : null}
        </svg>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className={cn("text-sm font-medium", state.winner === null ? playerTone(state.activePlayer) : playerTone(state.winner))}>{t("games.plate.moves", { count: state.moveCount })}</p>
        <ResetButton onClick={reset} />
      </div>
      <StrategyDisclosure open={explanationOpen} onToggle={() => setExplanationOpen((value) => !value)} regionId="plate-strategy">
        {t("games.plate.strategy")}
      </StrategyDisclosure>
    </GameFrame>
  );
}
