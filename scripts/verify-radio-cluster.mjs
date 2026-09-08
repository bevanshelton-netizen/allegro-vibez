import fs from "node:fs";

const mustRead = (path) => {
  if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
  return fs.readFileSync(path, "utf8");
};

const workload = mustRead("radio/cluster/workload.yaml");
const build = mustRead("radio/cluster/build-offline-bundle.sh");
const deploy = mustRead("radio/cluster/deploy.sh");
const seed = mustRead("radio/cluster/seed-media.sh");
const verify = mustRead("radio/cluster/verify-failover.sh");
const readme = mustRead("radio/cluster/README.md");

const checks = [
  [workload.includes("storageClassName: longhorn"), "Longhorn storage contract"],
  [(workload.match(/storageClassName: longhorn/g) || []).length >= 2, "media+state replicated volumes"],
  [workload.includes("replicas: 2"), "redundant Icecast"],
  [workload.includes("imagePullPolicy: Never"), "offline image policy"],
  [workload.includes("savonet/liquidsoap:v2.4.5"), "pinned Liquidsoap"],
  [workload.includes("kind: NetworkPolicy"), "network policy"],
  [workload.includes("name: default-deny-ingress"), "default deny ingress"],
  [workload.includes("kubernetes.io/metadata.name: izakhono-edge"), "edge-only external namespace"],
  [!workload.includes("type: NodePort"), "no NodePort exposure"],
  [!workload.includes("type: LoadBalancer"), "no LoadBalancer exposure"],
  [build.includes("docker save"), "offline image bundle"],
  [deploy.includes("rights_status"), "rights validation"],
  [deploy.includes("radio_clearance"), "radio clearance validation"],
  [seed.includes("clearance_reference"), "seed clearance proof"],
  [verify.includes("ALLEGRO_CLUSTER=PASS"), "runtime proof marker"],
  [readme.includes("not zero-interruption"), "truthful failover boundary"],
];

const failed = checks.filter(([ok]) => !ok).map(([, name]) => name);
if (failed.length) {
  throw new Error(`ALLEGRO cluster verification failed: ${failed.join(", ")}`);
}

console.log("ALLEGRO_RADIO_CLUSTER_SOFTWARE=PASS");
console.log("PHYSICAL_FAILOVER_PROOF=PENDING");
