import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import { GameFrame, ResetButton, StrategyDisclosure, playerTone } from "./GamePrimitives.js";
import { applyStonesMove, type StonesGameState } from "./gameModels.js";

const INITIAL_STONES_STATE: StonesGameState = { remaining: 25, activePlayer: 1, winner: null, lastMove: null };

export function StonesGame(): React.JSX.Element {
  const { t } = useTranslation("introduction");
  const [state, setState] = useState<StonesGameState>(INITIAL_STONES_STATE);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const take = (count: number): void => {
    const movingPlayer = state.activePlayer;
    const transition = applyStonesMove(state, count);
    if (!transition.valid) return;
    setState(transition.state);
    setAnnouncement(transition.state.winner === null
      ? t("games.stones.moved", { player: movingPlayer, count, next: transition.state.activePlayer })
      : t("games.stones.won", { player: movingPlayer }));
  };

  const reset = (): void => {
    setState(INITIAL_STONES_STATE);
    setExplanationOpen(false);
    setAnnouncement(t("games.active", { player: 1 }));
  };

  return (
    <GameFrame title={t("sections.stones")} status={state.winner === null ? t("games.active", { player: state.activePlayer }) : t("games.winner", { player: state.winner })} statusClassName={playerTone(state.winner ?? state.activePlayer)} announcement={announcement}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="img" aria-label={t("games.stones.label")}>
        {Array.from({ length: 25 }, (_, index) => (
          <span key={index} aria-hidden="true" className={cn("aspect-square rounded-full border shadow-[inset_0_-4px_7px_rgba(0,0,0,0.25)]", index < state.remaining ? "border-amber-200/50 bg-amber-400" : "border-zinc-800 bg-zinc-900 opacity-25")} />
        ))}
      </div>
      <p className="mt-5 font-mono text-sm text-amber-200">{t("games.stones.remaining", { count: state.remaining })}</p>
      {state.lastMove !== null ? <p className="mt-1 text-xs text-zinc-500">{t("games.stones.lastMove", { count: state.lastMove })}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {[1, 2, 3].map((count) => (
          <button key={count} type="button" disabled={state.winner !== null || count > state.remaining} onClick={() => take(count)} className="rounded-md border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
            {t("games.stones.take", { count })}
          </button>
        ))}
        <span className="grow" />
        <ResetButton onClick={reset} />
      </div>
      <StrategyDisclosure open={explanationOpen} onToggle={() => setExplanationOpen((value) => !value)} regionId="stones-strategy">
        {t("games.stones.strategy")}
      </StrategyDisclosure>
    </GameFrame>
  );
}
