import "../../i18n/i18n.js";
import { FibonacciRecursionLab } from "../../learning/complexity/ProblemFirstComplexityLabs.js";
import { AnimationCodeReference } from "../AnimationCodeReference.js";
import { algorithmReferences } from "../algorithmReferences.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function FibonacciRecursionTree(): React.JSX.Element {
  return (
    <AnimationToolSection key="fibonacci-recursion-tree" toolId="fibonacci-recursion-tree">
      <AnimationCodeReference code={algorithmReferences.fibonacci}><FibonacciRecursionLab /></AnimationCodeReference>
    </AnimationToolSection>
  );
}
