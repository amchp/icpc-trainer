import "i18next";

import type { en } from "../locales/en/index.js";
import type { bruteForce } from "../locales/en/bruteForce.js";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof en & { bruteForce: typeof bruteForce };
  }
}
