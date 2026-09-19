import "../../i18n/registerGreedyResources.js";
import { CoinChangeTool, CoinCounterexampleLab, ActivitySelectionTool, TwinsTool, ChatRoomTool, AlternatingTool } from "../../learning/greedy/GreedyInteractions.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function CoinChange(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="coin-change-walkthrough" toolId="coin-change-walkthrough">
        <CoinChangeTool />
      </AnimationToolSection>
      <AnimationToolSection key="coin-change-counterexample" toolId="coin-change-counterexample">
        <CoinCounterexampleLab />
      </AnimationToolSection>
    </>
  );
}

export function ActivitySelection(): React.JSX.Element {
  return (
    <AnimationToolSection key="activity-selection-walkthrough" toolId="activity-selection-walkthrough">
      <ActivitySelectionTool />
    </AnimationToolSection>
  );
}

export function LargestFirstSelection(): React.JSX.Element {
  return (
    <AnimationToolSection key="largest-first-selection" toolId="largest-first-selection">
      <TwinsTool />
    </AnimationToolSection>
  );
}

export function SubsequenceScanner(): React.JSX.Element {
  return (
    <AnimationToolSection key="subsequence-scanner" toolId="subsequence-scanner">
      <ChatRoomTool />
    </AnimationToolSection>
  );
}

export function SignBlockSelection(): React.JSX.Element {
  return (
    <AnimationToolSection key="sign-block-selection" toolId="sign-block-selection">
      <AlternatingTool />
    </AnimationToolSection>
  );
}
