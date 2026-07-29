import "i18next";

import type { en } from "../locales/en/index.js";
import type { bruteForce } from "../locales/en/bruteForce.js";
import type { binarySearch } from "../locales/en/binarySearch.js";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof en & { binarySearch: typeof binarySearch; bruteForce: typeof bruteForce };
  }
}
