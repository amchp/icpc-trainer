import "../../i18n/i18n.js";
import { DataStructureSimulator } from "../../learning/DataStructureSimulator.js";
import { VectorBoundsExplorer } from "../../learning/dataStructures/VectorBoundsExplorer.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function Vectors(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="vector-simulator" toolId="vector-simulator">
        <DataStructureSimulator kind="vector" accent="blue" />
      </AnimationToolSection>
      <AnimationToolSection key="vector-bounds-explorer" toolId="vector-bounds-explorer">
        <VectorBoundsExplorer />
      </AnimationToolSection>
    </>
  );
}

export function Stacks(): React.JSX.Element {
  return (
    <AnimationToolSection key="stack-simulator" toolId="stack-simulator">
      <DataStructureSimulator kind="stack" accent="violet" />
    </AnimationToolSection>
  );
}

export function Queues(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="queue-simulator" toolId="queue-simulator">
        <DataStructureSimulator kind="queue" accent="amber" />
      </AnimationToolSection>
      <AnimationToolSection key="deque-simulator" toolId="deque-simulator">
        <DataStructureSimulator kind="deque" accent="amber" />
      </AnimationToolSection>
    </>
  );
}

export function Sets(): React.JSX.Element {
  return (
    <AnimationToolSection key="set-simulator" toolId="set-simulator">
      <DataStructureSimulator kind="set" accent="emerald" />
    </AnimationToolSection>
  );
}

export function Maps(): React.JSX.Element {
  return (
    <AnimationToolSection key="map-simulator" toolId="map-simulator">
      <DataStructureSimulator kind="map" accent="rose" />
    </AnimationToolSection>
  );
}

export function Structs(): React.JSX.Element {
  return (
    <AnimationToolSection key="struct-simulator" toolId="struct-simulator">
      <DataStructureSimulator kind="struct" accent="cyan" />
    </AnimationToolSection>
  );
}
