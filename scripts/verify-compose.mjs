import { execFileSync } from "node:child_process";

const compose = JSON.parse(
  execFileSync("docker", ["compose", "config", "--format", "json"], {
    encoding: "utf8",
  }),
);

const failures = [];

function requireCondition(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

for (const [name, service] of Object.entries(compose.services)) {
  for (const port of service.ports ?? []) {
    requireCondition(
      port.host_ip === "127.0.0.1",
      `${name} port ${port.published}:${port.target} must bind to 127.0.0.1`,
    );
  }
}

const postgresVolume = compose.services.postgres.volumes?.find(
  (volume) => volume.source === "postgres-data",
);
requireCondition(
  postgresVolume?.target === "/var/lib/postgresql",
  "PostgreSQL 18 named volume must mount at /var/lib/postgresql",
);

for (const name of ["postgres", "redis", "control-api", "web"]) {
  requireCondition(
    Array.isArray(compose.services[name]?.healthcheck?.test),
    `${name} must define a health check`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Compose invariants verified.");
