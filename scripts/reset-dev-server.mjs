import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const files = [
  "apps/server/.local/icpc-trainer.sqlite"
];

for (const file of files) {
  const path = resolve(file);
  await rm(path, { force: true });
  console.log(`Deleted ${path}`);
}
