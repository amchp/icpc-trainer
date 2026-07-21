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

export enum FRIEND_SUBMISSION_SYNC_EVENT_TYPES {
  Started = "started",
  FriendsSyncing = "friends.syncing",
  FriendSyncing = "friend.syncing",
  FriendSynced = "friend.synced",
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

export enum LEARNING_GUIDE_IDS {
  Introduction = "introduction",
  ProgrammingFundamentals = "programming-fundamentals",
  TimeComplexity = "time-complexity",
}

export type LearningGuideId = `${LEARNING_GUIDE_IDS}`;

export const LEARNING_GUIDE_ID_VALUES = Object.freeze(Object.values(LEARNING_GUIDE_IDS)) as readonly [
  LearningGuideId,
  ...LearningGuideId[]
];

export enum LEARNING_PROGRESS_STATUSES {
  InProgress = "in_progress",
  Completed = "completed",
}

export type LearningProgressStatus = `${LEARNING_PROGRESS_STATUSES}`;

export enum APP_LOCALES {
  English = "en",
  Spanish = "es",
}

export type AppLocale = `${APP_LOCALES}`;

export const APP_LOCALE_VALUES = Object.freeze(Object.values(APP_LOCALES)) as readonly [
  AppLocale,
  ...AppLocale[]
];

export const isAppLocale = (value: string): value is AppLocale =>
  (APP_LOCALE_VALUES as readonly string[]).includes(value);

export enum LOCALIZED_MESSAGE_CODES {
  GenericError = "generic_error",
  Unauthorized = "unauthorized",
  Forbidden = "forbidden",
  NotFound = "not_found",
  Conflict = "conflict",
  RateLimited = "rate_limited",
  Unavailable = "unavailable",
  SyncOperationFailed = "sync_operation_failed",
  SyncNotImplemented = "sync_not_implemented",
  FriendSyncPreparing = "friend_sync_preparing",
  FriendSyncNoFriends = "friend_sync_no_friends",
  FriendSyncing = "friend_syncing",
  FriendSyncingHandle = "friend_syncing_handle",
  FriendSyncedHandle = "friend_synced_handle",
  FriendSyncStatusUnavailable = "friend_sync_status_unavailable",
  FriendSyncWarning = "friend_sync_warning"
}

export type LocalizedMessageCode = `${LOCALIZED_MESSAGE_CODES}`;

export interface LocalizedMessageReference {
  readonly code: LocalizedMessageCode;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly technicalDetail?: string;
}
