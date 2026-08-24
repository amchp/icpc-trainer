import "i18next";

import type { en } from "../locales/en/index.js";
import type { bruteForce } from "../locales/en/bruteForce.js";
import type { binarySearch } from "../locales/en/binarySearch.js";
import type { greedy } from "../locales/en/greedy.js";
import type { graphTheory } from "../locales/en/graphTheory.js";
import type { dynamicProgramming } from "../locales/en/dynamicProgramming.js";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof en & { binarySearch: typeof binarySearch; bruteForce: typeof bruteForce; dynamicProgramming: typeof dynamicProgramming; graphTheory: typeof graphTheory; greedy: typeof greedy };
  }
}
