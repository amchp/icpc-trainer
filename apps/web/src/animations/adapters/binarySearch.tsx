import "../../i18n/registerBinarySearchResources.js";
import { MotivationLab, ConditionPatternLab, BinarySearchToolTrace } from "../../learning/BinarySearchInteractions.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function BinarySearchComparison(): React.JSX.Element {
  return (
    <AnimationToolSection key="binary-search-comparison" toolId="binary-search-comparison">
      <MotivationLab showCode />
    </AnimationToolSection>
  );
}

export function MonotoneConditionPattern(): React.JSX.Element {
  return (
    <AnimationToolSection key="monotone-condition-pattern" toolId="monotone-condition-pattern">
      <ConditionPatternLab />
    </AnimationToolSection>
  );
}

export function FirstOccurrenceTrace(): React.JSX.Element {
  return (
    <AnimationToolSection key="first-occurrence-trace" toolId="first-occurrence-trace">
      <BinarySearchToolTrace example="first" orientation="false-true" />
    </AnimationToolSection>
  );
}

export function ClosestValueTrace(): React.JSX.Element {
  return (
    <AnimationToolSection key="closest-value-trace" toolId="closest-value-trace">
      <BinarySearchToolTrace example="closest" orientation="true-false" />
    </AnimationToolSection>
  );
}

export function NumericBinarySearchTrace(): React.JSX.Element {
  return (
    <AnimationToolSection key="numeric-binary-search-trace" toolId="numeric-binary-search-trace">
      <BinarySearchToolTrace example="numeric" orientation="true-false" />
    </AnimationToolSection>
  );
}

export function FirstTrueBoundaryTrace(): React.JSX.Element {
  return (
    <AnimationToolSection key="first-true-boundary-trace" toolId="first-true-boundary-trace">
      <BinarySearchToolTrace example="bad" orientation="false-true" />
    </AnimationToolSection>
  );
}

export function LastTrueBoundaryTrace(): React.JSX.Element {
  return (
    <AnimationToolSection key="last-true-boundary-trace" toolId="last-true-boundary-trace">
      <BinarySearchToolTrace example="magic" orientation="true-false" />
    </AnimationToolSection>
  );
}
