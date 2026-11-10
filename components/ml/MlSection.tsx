import { GithubIcon } from "@/components/GithubIcon";
import { LabPanel } from "@/components/LabPanel";
import { projects } from "@/content";
import { MlIsland } from "./MlIsland";
import { INITIAL_ML_STATE, MlView } from "./MlView";

const ID = "ml";

export function MlSection() {
  const repo = projects.find((p) => p.slug === "rinn-microcredit-risk")?.links
    .repo;
  return (
    <LabPanel
      actions={
        repo ? (
          <a className="lab-action" href={repo}>
            <GithubIcon />
            view repo
          </a>
        ) : null
      }
      id={`${ID}-heading`}
      title="ML laboratory"
      command="~/labs/rinn.ipynb"
      intro={
        <p className="lab-intro">
          Rinn, a microcredit default-risk study, taken apart. Every number is
          the study&apos;s own saved output. Compare models, move the decision
          threshold, and watch a model start to memorise.
        </p>
      }
    >
      <MlIsland idBase={ID}>
        <MlView {...INITIAL_ML_STATE} idBase={ID} />
      </MlIsland>
    </LabPanel>
  );
}
