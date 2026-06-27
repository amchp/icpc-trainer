import process from "node:process";

interface CatalogSyncResponse {
  readonly ok: boolean;
}

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (value === undefined || value === "") {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const response = await fetch(new URL("/internal/tasks/catalog-sync", requiredEnv("ICPC_TRAINER_API_URL")), {
  method: "POST",
  headers: {
    accept: "application/json",
    authorization: `Bearer ${requiredEnv("TASK_TOKEN")}`
  }
});
const result = await response.json() as CatalogSyncResponse;

console.log(JSON.stringify(result, null, 2));

if (!response.ok || !result.ok) {
  process.exitCode = 1;
}
