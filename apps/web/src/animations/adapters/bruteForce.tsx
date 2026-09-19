import "../../i18n/registerBruteForceResources.js";
import { BruteForceGuideCodeBlock } from "../../learning/BruteForceGuideCodeBlock.js";
import { useBruteForceGuideTraces } from "../../learning/BruteForceGuideTraces.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function Permutations(): React.JSX.Element {
  const traces = useBruteForceGuideTraces();
  return (
    <>
      <AnimationToolSection key="recursive-permutations" toolId="recursive-permutations">
        <BruteForceGuideCodeBlock trace={traces.recursivePermutation} />
      </AnimationToolSection>
      <AnimationToolSection key="iterative-permutations" toolId="iterative-permutations">
        <BruteForceGuideCodeBlock trace={traces.iterativePermutation} />
      </AnimationToolSection>
    </>
  );
}

export function Subsets(): React.JSX.Element {
  const traces = useBruteForceGuideTraces();
  return (
    <>
      <AnimationToolSection key="recursive-subsets" toolId="recursive-subsets">
        <BruteForceGuideCodeBlock trace={traces.recursiveSubset} />
      </AnimationToolSection>
      <AnimationToolSection key="bitmask-subsets" toolId="bitmask-subsets">
        <BruteForceGuideCodeBlock trace={traces.bitmaskSubset} />
      </AnimationToolSection>
    </>
  );
}
