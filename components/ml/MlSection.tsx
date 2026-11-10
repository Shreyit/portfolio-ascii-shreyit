import { MlIsland } from "./MlIsland";
import { INITIAL_ML_STATE, MlView } from "./MlView";

const ID = "ml";

export function MlSection() {
  return (
    <section className="lab-section" aria-labelledby={`${ID}-heading`}>
      <h2 id={`${ID}-heading`}>ML laboratory</h2>
      <p className="lab-intro">
        Rinn, a microcredit default-risk study, taken apart. Every number is the
        study&apos;s own saved output. Compare models, move the decision
        threshold, and watch a model start to memorise.
      </p>
      <MlIsland idBase={ID}>
        <MlView {...INITIAL_ML_STATE} idBase={ID} />
      </MlIsland>
    </section>
  );
}
