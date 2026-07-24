import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import { GameFrame, ResetButton, StrategyDisclosure, playerTone } from "./GamePrimitives.js";
import {
  INITIAL_CHOMP_STATE,
  applyChompMove,
  isChompCellPresent,
  isPoisonMove,
  isWinningChompState,
  otherPlayer,
  type ChompMove,
  type ChompState,
  type Player
} from "./gameModels.js";

interface ChompGameState {
  readonly board: ChompState;
  readonly activePlayer: Player;
  readonly winner: Player | null;
  readonly lastBite: ChompMove | null;
}

const INITIAL_CHOMP_GAME: ChompGameState = { board: INITIAL_CHOMP_STATE, activePlayer: 1, winner: null, lastBite: null };

export function ChompGame(): React.JSX.Element {
  const { t } = useTranslation("introduction");
  const [state, setState] = useState<ChompGameState>(INITIAL_CHOMP_GAME);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const positionIsWinning = useMemo(() => isWinningChompState(state.board), [state.board]);
  const remaining = state.board.reduce((total, length) => total + length, 0);

  const bite = (move: ChompMove): void => {
    if (state.winner !== null || !isChompCellPresent(state.board, move)) return;
    const movingPlayer = state.activePlayer;
    if (isPoisonMove(move)) {
      const winner = otherPlayer(movingPlayer);
      setState({ ...state, winner, lastBite: move });
      setAnnouncement(t("games.chomp.poisoned", { player: movingPlayer, winner }));
      return;
    }
    const next = otherPlayer(movingPlayer);
    setState({ board: applyChompMove(state.board, move), activePlayer: next, winner: null, lastBite: move });
    setAnnouncement(t("games.chomp.bite", { player: movingPlayer, row: move.row + 1, column: move.column + 1, next }));
  };

  const reset = (): void => {
    setState(INITIAL_CHOMP_GAME);
    setExplanationOpen(false);
    setAnnouncement(t("games.active", { player: 1 }));
  };

  return (
    <GameFrame title={t("sections.chomp")} status={state.winner === null ? t("games.active", { player: state.activePlayer }) : t("games.winner", { player: state.winner })} statusClassName={playerTone(state.winner ?? state.activePlayer)} announcement={announcement}>
      <div className="mx-auto grid max-w-xl grid-cols-7 gap-1.5" role="group" aria-label={t("games.chomp.label")}>
        {Array.from({ length: 35 }, (_, index) => {
          const move = { row: Math.floor(index / 7), column: index % 7 };
          const present = isChompCellPresent(state.board, move);
          const poison = isPoisonMove(move);
          return present ? (
            <button
              key={index}
              type="button"
              disabled={state.winner !== null}
              aria-label={poison ? t("games.chomp.poison") : t("games.chomp.square", { row: move.row + 1, column: move.column + 1 })}
              onClick={() => bite(move)}
              className={cn(
                "aspect-square rounded-[0.3rem] border text-sm font-bold shadow-[inset_0_-6px_12px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200",
                poison ? "border-rose-300/70 bg-rose-500 text-white" : "border-violet-200/40 bg-violet-500/80 text-violet-50"
              )}
            >
              {poison ? "×" : ""}
            </button>
          ) : <span key={index} aria-hidden="true" className="aspect-square rounded-[0.3rem] border border-dashed border-zinc-800 bg-zinc-950/40" />;
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-violet-200">{t("games.chomp.remaining", { count: remaining })}</p>
          {state.lastBite !== null ? <p className="mt-1 text-xs text-zinc-500">{t("games.chomp.lastBite", { row: state.lastBite.row + 1, column: state.lastBite.column + 1 })}</p> : null}
        </div>
        <ResetButton onClick={reset} />
      </div>
      <StrategyDisclosure open={explanationOpen} onToggle={() => setExplanationOpen((value) => !value)} regionId="chomp-strategy">
        <p>{t("games.chomp.strategy")}</p>
        <p className="mt-2 font-mono text-violet-200">{state.winner !== null ? t("games.chomp.finished") : positionIsWinning ? t("games.chomp.winningState") : t("games.chomp.losingState")}</p>
      </StrategyDisclosure>
    </GameFrame>
  );
}
