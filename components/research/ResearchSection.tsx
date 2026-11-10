import { projects, research } from "@/content";
import { ResearchIsland } from "./ResearchIsland";
import {
  INITIAL_RESEARCH_STATE,
  ResearchView,
  type ResearchData,
} from "./ResearchView";

const ID = "research";

export function ResearchSection() {
  // Public (reviewed) entries only.
  const data: ResearchData = {
    nainital: research.find((r) => r.slug === "nainital-urban-fieldwork"),
    sangamner: research.find((r) => r.slug === "sangamner-rural-fieldwork"),
    dashboard: projects.find(
      (p) => p.slug === "nainital-tourism-vulnerability-dashboard",
    ),
  };
  return (
    <section className="lab-section" aria-labelledby={`${ID}-heading`}>
      <h2 id={`${ID}-heading`}>Research &amp; fieldwork</h2>
      <p className="lab-intro">
        Analytics that starts in the field: household and resident surveys in
        Uttarakhand and Maharashtra, turned into indices people can act on.
        Hover the stages, the grids and the matrix.
      </p>
      <ResearchIsland idBase={ID} data={data}>
        <ResearchView {...INITIAL_RESEARCH_STATE} idBase={ID} data={data} />
      </ResearchIsland>
    </section>
  );
}
