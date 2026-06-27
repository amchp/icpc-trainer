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

const readResponse = async (response: Response): Promise<CatalogSyncResponse | string> => {
  const text = await response.text();
  try {
    return JSON.parse(text) as CatalogSyncResponse;
  } catch {
    return text;
  }
};

const response = await fetch(new URL("/internal/tasks/catalog-sync", requiredEnv("ICPC_TRAINER_API_URL")), {
  method: "POST",
  headers: {
    accept: "application/json",
    authorization: `Bearer ${requiredEnv("TASK_TOKEN")}`
  }
});
const result = await readResponse(response);

console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));

if (!response.ok || typeof result === "string" || !result.ok) {
  process.exitCode = 1;
}
