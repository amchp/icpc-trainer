import { auth } from "./auth.js";
import { common } from "./common.js";
import { contests } from "./contests.js";
import { contestFinder } from "./contestFinder.js";
import { findProblems } from "./findProblems.js";
import { judges } from "./judges.js";
import { introduction } from "./introduction.js";
import { leaderboard } from "./leaderboard.js";
import { playground } from "./playground.js";
import { programmingFundamentals } from "./programmingFundamentals.js";
import { resources } from "./resources.js";
import { roster } from "./roster.js";
import { shell } from "./shell.js";
import { upsolving } from "./upsolving.js";

export const es = { auth, common, contestFinder, contests, findProblems, introduction, judges, leaderboard, playground, programmingFundamentals, resources, roster, shell, upsolving } as const;
