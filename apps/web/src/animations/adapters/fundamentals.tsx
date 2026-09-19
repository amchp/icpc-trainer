import "../../i18n/i18n.js";
import { GuideCodeBlock } from "../../learning/GuideCodeBlock.js";
import { useProgrammingFundamentalsTraces } from "../../learning/GuideTraces.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function Conditionals(): React.JSX.Element {
  const traces = useProgrammingFundamentalsTraces();
  return (
    <AnimationToolSection key="conditionals-trace" toolId="conditionals-trace">
      <GuideCodeBlock trace={traces.conditionals} />
    </AnimationToolSection>
  );
}

export function Loops(): React.JSX.Element {
  const traces = useProgrammingFundamentalsTraces();
  return (
    <>
      <AnimationToolSection key="for-loop-trace" toolId="for-loop-trace">
        <GuideCodeBlock trace={traces.forLoop} />
      </AnimationToolSection>
      <AnimationToolSection key="while-loop-trace" toolId="while-loop-trace">
        <GuideCodeBlock trace={traces.whileLoop} />
      </AnimationToolSection>
      <AnimationToolSection key="loop-control-trace" toolId="loop-control-trace">
        <GuideCodeBlock trace={traces.loopControl} />
      </AnimationToolSection>
    </>
  );
}

export function VectorTraversal(): React.JSX.Element {
  const traces = useProgrammingFundamentalsTraces();
  return (
    <AnimationToolSection key="vector-traversal-trace" toolId="vector-traversal-trace">
      <GuideCodeBlock trace={traces.vectorTraversal} />
    </AnimationToolSection>
  );
}

export function FunctionCalls(): React.JSX.Element {
  const traces = useProgrammingFundamentalsTraces();
  return (
    <AnimationToolSection key="function-call-trace" toolId="function-call-trace">
      <GuideCodeBlock trace={traces.functionCall} />
    </AnimationToolSection>
  );
}

export function Recursion(): React.JSX.Element {
  const traces = useProgrammingFundamentalsTraces();
  return (
    <>
      <AnimationToolSection key="countdown-recursion" toolId="countdown-recursion">
        <GuideCodeBlock trace={traces.countdown} />
      </AnimationToolSection>
      <AnimationToolSection key="recursion-trace" toolId="recursion-trace">
        <GuideCodeBlock trace={traces.recursion} />
      </AnimationToolSection>
      <AnimationToolSection key="fibonacci-recursion-trace" toolId="fibonacci-recursion-trace">
        <GuideCodeBlock trace={traces.fibonacci} />
      </AnimationToolSection>
    </>
  );
}
