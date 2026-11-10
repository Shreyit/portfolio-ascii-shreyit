import { formatPeriod } from "@/components/ActivityList";
import { LabPanel } from "@/components/LabPanel";
import { experience } from "@/content";
import { InfraIsland } from "./InfraIsland";
import { InfraPanel } from "./InfraPanel";
import { infraText } from "./scene";
import {
  availability,
  createSim,
  currentRps,
  desiredCapacity,
  inService,
} from "./sim";

const ID = "infra";

export function InfraSection() {
  const s = createSim(120);
  const job = experience.find((e) => e.experience === "infra");
  return (
    <LabPanel
      id={`${ID}-heading`}
      title="Infrastructure simulator"
      command="~/labs/aws-sim"
      actions={
        job ? (
          <span className="lab-badge">
            <span className="lab-callout-tag">internship</span>
            <span className="lab-callout-role">
              {job.role}, {job.organisation}
            </span>
            <span className="lab-callout-meta">{formatPeriod(job.period)}</span>
          </span>
        ) : null
      }
      intro={
        <>
          <p className="lab-intro">
            The pattern behind my internship backend: FastAPI on EC2 in an Auto
            Scaling group behind a load balancer, static assets on S3 and
            CloudFront, rolling releases. Push traffic, crash a server, ship a
            new version. This is a teaching simulation, so the numbers are
            illustrative, not production metrics.
          </p>
        </>
      }
    >
      <InfraIsland idBase={ID}>
        <div className="infra">
          <div className="infra-view">
            <pre
              className="infra-pre"
              role="img"
              aria-label="Architecture diagram (static)"
            >
              {infraText(s)}
            </pre>
          </div>
          <InfraPanel
            idBase={ID}
            baseRps={s.baseRps}
            stats={{
              rps: currentRps(s),
              inService: inService(s).length,
              desired: desiredCapacity(currentRps(s)),
              cpu: 0,
              latencyMs: s.latencyMs,
              availability: availability(s),
              dropped: 0,
              deploying: false,
              events: [],
            }}
          />
        </div>
      </InfraIsland>
    </LabPanel>
  );
}
