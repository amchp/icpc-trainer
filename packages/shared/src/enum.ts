export enum JUDGES {
  Codeforces = "codeforces",
  Qoj = "qoj",
}

export type JudgeProvider = `${JUDGES}`;

export const JUDGE_PROVIDERS = Object.freeze(Object.values(JUDGES)) as readonly [
  JudgeProvider,
  ...JudgeProvider[]
];

export const isJudgeProvider = (value: string): value is JudgeProvider =>
  (JUDGE_PROVIDERS as readonly string[]).includes(value);

export const judgeFromProvider = (provider: JudgeProvider): JUDGES =>
  provider as JUDGES;

export const providerFromJudge = (judge: JUDGES): JudgeProvider =>
  judge as JudgeProvider;

export enum USER_TYPES {
  User = "user",
  Team = "team",
  Friend = "friend",
}

export enum SUBMISSION_STATUSES {
  AC = "AC",
  WA = "WA",
  TLE = "TLE",
  RTE = "RTE",
  MLE = "MLE",
}

export enum UPSOLVING_PROBLEM_STATUSES {
  New = "new",
  Upsolved = "upsolved",
  Attempted = "attempted",
  Solved = "solved",
}

export type UpsolvingProblemStatus = `${UPSOLVING_PROBLEM_STATUSES}`;

export enum RUN_STATUSES {
  Idle = "idle",
  Running = "running",
  Completed = "completed",
  Error = "error",
}

export type RunStatus = `${RUN_STATUSES}`;

export enum SYNC_STEP_STATUSES {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Error = "error",
}

export enum JUDGE_SYNC_STEPS {
  Submissions = "submissions",
  Contests = "contests",
  RegularCatalog = "regularCatalog",
}

export enum JUDGE_SYNC_EVENT_TYPES {
  Started = "started",
  Step = "step",
  Error = "error",
  Completed = "completed",
}

export enum SYNC_OPERATION_PHASES {
  Submissions = "submissions",
  Contests = "contests",
  RegularCatalog = "regularCatalog",
  Database = "database",
}

export type SyncOperationPhase = `${SYNC_OPERATION_PHASES}`;

export enum SYNC_ERROR_PHASES {
  Database = "database",
  Concurrency = "concurrency",
}

export enum PLAYGROUND_OPERATIONS {
  Contests = "contests",
  Contest = "contest",
  User = "user",
  Submissions = "submissions",
}

export type PlaygroundOperation = `${PLAYGROUND_OPERATIONS}`;

export const PLAYGROUND_OPERATION_VALUES = Object.freeze(Object.values(PLAYGROUND_OPERATIONS)) as readonly [
  PlaygroundOperation,
  ...PlaygroundOperation[]
];

export enum JUDGE_RESOURCES {
  Contest = "contest",
  User = "user",
}

export type JudgeResource = `${JUDGE_RESOURCES}`;

export enum CONTEST_FINDER_REFRESH_STEPS {
  Catalog = "catalog",
  Friends = "friends",
}

export enum CONTEST_FINDER_REFRESH_EVENT_TYPES {
  Started = "started",
  CatalogSyncing = "catalog.syncing",
  CatalogSynced = "catalog.synced",
  FriendsSyncing = "friends.syncing",
  FriendsFriendSyncing = "friends.friendSyncing",
  FriendsFriendSynced = "friends.friendSynced",
  Warning = "warning",
  Completed = "completed",
}

export enum PROVIDER_STATE_EVENT_TYPES {
  State = "state",
}

export enum CONNECTED_JUDGES_STATUSES {
  Loading = "loading",
  Ready = "ready",
  Error = "error",
}

export type ConnectedJudgesStatus = `${CONNECTED_JUDGES_STATUSES}`;

export enum TOAST_VARIANTS {
  Error = "error",
  Warning = "warning",
  Success = "success",
}

export type ToastVariant = `${TOAST_VARIANTS}`;

export enum STARTER_STACK_STATUSES {
  Wired = "wired",
  Local = "local",
}

export enum CONTEST_FINDER_TABS {
  Contest = "contest",
  Friends = "friends",
}

export type ContestFinderTabId = `${CONTEST_FINDER_TABS}`;

export enum JUDGE_SOURCE_FILTERS {
  CodeforcesContest = "codeforces-contest",
  CodeforcesGym = "codeforces-gym",
  Qoj = "qoj",
}

export type JudgeSourceFilterId = `${JUDGE_SOURCE_FILTERS}`;

export enum BUTTON_VARIANTS {
  Default = "default",
  Secondary = "secondary",
  Ghost = "ghost",
}

export type ButtonVariant = `${BUTTON_VARIANTS}`;

export enum JUDGE_REQUEST_ERROR_KINDS {
  Api = "api",
  Credential = "credential",
}

export type JudgeRequestErrorKind = `${JUDGE_REQUEST_ERROR_KINDS}`;
