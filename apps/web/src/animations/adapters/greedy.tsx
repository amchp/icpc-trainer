import "../../i18n/registerGreedyResources.js";
import { CoinChangeTool, CoinCounterexampleLab, ActivitySelectionTool, TwinsTool, ChatRoomTool, AlternatingTool } from "../../learning/greedy/GreedyInteractions.js";
import { AnimationCodeReference } from "../AnimationCodeReference.js";
import { algorithmReferences } from "../algorithmReferences.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function CoinChange(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="coin-change-walkthrough" toolId="coin-change-walkthrough">
        <AnimationCodeReference code={algorithmReferences.coinChange}><CoinChangeTool /></AnimationCodeReference>
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
      <AnimationCodeReference code={algorithmReferences.activitySelection}><ActivitySelectionTool /></AnimationCodeReference>
    </AnimationToolSection>
  );
}

export function LargestFirstSelection(): React.JSX.Element {
  return (
    <AnimationToolSection key="largest-first-selection" toolId="largest-first-selection">
      <AnimationCodeReference code={algorithmReferences.largestFirst}><TwinsTool /></AnimationCodeReference>
    </AnimationToolSection>
  );
}

export function SubsequenceScanner(): React.JSX.Element {
  return (
    <AnimationToolSection key="subsequence-scanner" toolId="subsequence-scanner">
      <AnimationCodeReference code={algorithmReferences.subsequence}><ChatRoomTool /></AnimationCodeReference>
    </AnimationToolSection>
  );
}

export function SignBlockSelection(): React.JSX.Element {
  return (
    <AnimationToolSection key="sign-block-selection" toolId="sign-block-selection">
      <AnimationCodeReference code={algorithmReferences.signBlocks}><AlternatingTool /></AnimationCodeReference>
    </AnimationToolSection>
  );
}
