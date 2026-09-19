import "../../i18n/registerGraphTheoryResources.js";
import { ConnectivityConceptPlayer, GridDfsToolTrace, BfsLayerConceptPlayer, GridBfsToolTrace, BipartiteToolTrace, IndegreeConceptPlayer, KahnToolTrace, RelaxationConceptPlayer, DijkstraToolTrace } from "../../learning/graph/GraphTheoryInteractions.js";
import { AnimationToolSection } from "../AnimationToolSection.js";

export function Dfs(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="graph-connectivity" toolId="graph-connectivity">
        <ConnectivityConceptPlayer />
      </AnimationToolSection>
      <AnimationToolSection key="dfs-grid-traversal" toolId="dfs-grid-traversal">
        <GridDfsToolTrace />
      </AnimationToolSection>
    </>
  );
}

export function Bfs(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="bfs-layers" toolId="bfs-layers">
        <BfsLayerConceptPlayer />
      </AnimationToolSection>
      <AnimationToolSection key="bfs-grid-traversal" toolId="bfs-grid-traversal">
        <GridBfsToolTrace />
      </AnimationToolSection>
    </>
  );
}

export function BipartiteDfs(): React.JSX.Element {
  return (
    <AnimationToolSection key="bipartite-dfs" toolId="bipartite-dfs">
      <BipartiteToolTrace />
    </AnimationToolSection>
  );
}

export function TopologicalSort(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="graph-indegree" toolId="graph-indegree">
        <IndegreeConceptPlayer />
      </AnimationToolSection>
      <AnimationToolSection key="kahn-topological-sort" toolId="kahn-topological-sort">
        <KahnToolTrace />
      </AnimationToolSection>
    </>
  );
}

export function Dijkstra(): React.JSX.Element {
  return (
    <>
      <AnimationToolSection key="edge-relaxation" toolId="edge-relaxation">
        <RelaxationConceptPlayer />
      </AnimationToolSection>
      <AnimationToolSection key="dijkstra-traversal" toolId="dijkstra-traversal">
        <DijkstraToolTrace />
      </AnimationToolSection>
    </>
  );
}
