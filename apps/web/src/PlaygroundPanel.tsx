import type { PlaygroundOperation, PlaygroundProvider, PlaygroundResult } from "@icpc-trainer/api";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Braces, Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { trpc } from "./trpc.js";
import { Button, Card, Separator } from "./components/ui.js";

type QojCookieKey =
  | "uoj_remember_token"
  | "uoj_remember_token_checksum"
  | "uoj_username"
  | "uoj_username_checksum"
  | "uojsessid";

const operations: Array<{ value: PlaygroundOperation; label: string }> = [
  { value: "contests", label: "Contests" },
  { value: "contest", label: "Contest" },
  { value: "user", label: "User" },
  { value: "submissions", label: "Submissions" }
];

const qojCookieKeys: Array<{ key: QojCookieKey; label: string }> = [
  { key: "uoj_remember_token", label: "uoj_remember_token" },
  { key: "uoj_remember_token_checksum", label: "uoj_remember_token_checksum" },
  { key: "uoj_username", label: "uoj_username" },
  { key: "uoj_username_checksum", label: "uoj_username_checksum" },
  { key: "uojsessid", label: "uojsessid" }
];

const emptyCookies = (): Record<QojCookieKey, string> => ({
  uoj_remember_token: "",
  uoj_remember_token_checksum: "",
  uoj_username: "",
  uoj_username_checksum: "",
  uojsessid: ""
});

const buildQojCookieJar = (values: Record<QojCookieKey, string>): string =>
  qojCookieKeys
    .map(({ key }) => [key, values[key].trim()] as const)
    .filter((entry) => entry[1] !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

const normalizeStoredQojCookies = (
  values: Partial<Record<QojCookieKey, string>> | undefined
): Record<QojCookieKey, string> => ({
  ...emptyCookies(),
  ...values
});

const fieldClass =
  "h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500";

const storedAuthKey = "icpc-trainer.playground.auth.v1";

const isPlaygroundFailure = (value: unknown): value is Extract<PlaygroundResult, { ok: false }> =>
  typeof value === "object" && value !== null && "ok" in value && value.ok === false;

interface StoredAuth {
  readonly codeforces?: {
    readonly apiKey?: string;
    readonly apiSecret?: string;
  };
  readonly qojCookies?: Partial<Record<QojCookieKey, string>>;
}

const readStoredAuth = (): StoredAuth | undefined => {
  try {
    if (typeof window.localStorage.getItem !== "function") {
      return undefined;
    }

    const raw = window.localStorage.getItem(storedAuthKey);
    return raw === null ? undefined : (JSON.parse(raw) as StoredAuth);
  } catch {
    return undefined;
  }
};

const writeStoredAuth = (value: StoredAuth): void => {
  if (typeof window.localStorage.setItem === "function") {
    window.localStorage.setItem(storedAuthKey, JSON.stringify(value));
  }
};

const clearStoredAuth = (): void => {
  if (typeof window.localStorage.removeItem === "function") {
    window.localStorage.removeItem(storedAuthKey);
  }
};

export function PlaygroundPanel(): React.JSX.Element {
  const [provider, setProvider] = useState<PlaygroundProvider>("codeforces");
  const [operation, setOperation] = useState<PlaygroundOperation>("contest");
  const [contestId, setContestId] = useState("");
  const [userHandle, setUserHandle] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [qojCookies, setQojCookies] = useState<Record<QojCookieKey, string>>(emptyCookies);
  const [rememberAuth, setRememberAuth] = useState(false);

  useEffect(() => {
    const stored = readStoredAuth();

    if (stored === undefined) {
      return;
    }

    setApiKey(stored.codeforces?.apiKey ?? "");
    setApiSecret(stored.codeforces?.apiSecret ?? "");
    setQojCookies(normalizeStoredQojCookies(stored.qojCookies));
    setRememberAuth(true);
  }, []);

  const effectiveQojCookieJar = buildQojCookieJar(qojCookies);

  const mutation = useMutation({
    mutationFn: () =>
      trpc.playground.run.mutate({
        provider,
        operation,
        contestId,
        userHandle,
        codeforces: {
          apiKey,
          apiSecret
        },
        qoj: {
          cookieJar: effectiveQojCookieJar
        }
      })
  });

  const output = useMemo(() => {
    if (mutation.isError) {
      return JSON.stringify(
        {
          ok: false,
          error: {
            message: mutation.error.message
          }
        },
        null,
        2
      );
    }

    if (mutation.data === undefined) {
      return "{\n  \"result\": null\n}";
    }

    return JSON.stringify(mutation.data, null, 2);
  }, [mutation.data, mutation.error, mutation.isError]);

  const needsContest = operation === "contest";
  const needsUser = operation === "user" || operation === "submissions";
  const hasApiError = isPlaygroundFailure(mutation.data);

  const clearAuth = (): void => {
    setApiKey("");
    setApiSecret("");
    setQojCookies(emptyCookies());
    setRememberAuth(false);
    clearStoredAuth();
  };

  const runPlayground = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (rememberAuth) {
      writeStoredAuth({
        codeforces: {
          apiKey,
          apiSecret
        },
        qojCookies
      });
    } else {
      clearStoredAuth();
    }

    mutation.mutate();
  };

  const resetInputs = (): void => {
    setContestId("");
    setUserHandle("");
    clearAuth();
    mutation.reset();
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={runPlayground}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Braces className="size-4 text-emerald-300" aria-hidden="true" />
              API playground
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Run judge calls with optional Codeforces keys or QOJ cookies.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800" onClick={resetInputs}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              Run
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Provider</span>
                <select
                  className={fieldClass}
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as PlaygroundProvider)}
                >
                  <option value="codeforces">Codeforces</option>
                  <option value="qoj">QOJ</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Operation</span>
                <select
                  className={fieldClass}
                  value={operation}
                  onChange={(event) => setOperation(event.target.value as PlaygroundOperation)}
                >
                  {operations.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Contest ID</span>
                <input
                  className={fieldClass}
                  value={contestId}
                  onChange={(event) => setContestId(event.target.value)}
                  placeholder={provider === "qoj" ? "1113" : "566"}
                  required={needsContest}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">User handle</span>
                <input
                  className={fieldClass}
                  value={userHandle}
                  onChange={(event) => setUserHandle(event.target.value)}
                  placeholder={provider === "qoj" ? "qoj_handle" : "tourist"}
                  required={needsUser}
                />
              </label>
            </div>

            {provider === "codeforces" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-zinc-500">apiKey</span>
                    <input
                      className={fieldClass}
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Codeforces API key"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-zinc-500">apiSecret</span>
                    <input
                      className={fieldClass}
                      value={apiSecret}
                      onChange={(event) => setApiSecret(event.target.value)}
                      placeholder="Codeforces API secret"
                    />
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    checked={rememberAuth}
                    className="size-4 rounded border-zinc-700 bg-zinc-950"
                    onChange={(event) => setRememberAuth(event.target.checked)}
                    type="checkbox"
                  />
                  Remember auth on this browser
                </label>
                <Button
                  type="button"
                  className="h-8 w-fit bg-zinc-900 px-2 text-xs text-zinc-100 hover:bg-zinc-800"
                  onClick={clearAuth}
                >
                  Clear saved auth
                </Button>
              </>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {qojCookieKeys.map((cookie) => (
                    <label key={cookie.key} className="block">
                      <span className="text-xs font-medium uppercase text-zinc-500">{cookie.label}</span>
                      <input
                        className={fieldClass}
                        value={qojCookies[cookie.key]}
                        onChange={(event) =>
                          setQojCookies((current) => ({
                            ...current,
                            [cookie.key]: event.target.value
                          }))
                        }
                        placeholder={cookie.label}
                      />
                    </label>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    checked={rememberAuth}
                    className="size-4 rounded border-zinc-700 bg-zinc-950"
                    onChange={(event) => setRememberAuth(event.target.checked)}
                    type="checkbox"
                  />
                  Remember auth on this browser
                </label>
                <Button
                  type="button"
                  className="h-8 w-fit bg-zinc-900 px-2 text-xs text-zinc-100 hover:bg-zinc-800"
                  onClick={clearAuth}
                >
                  Clear saved auth
                </Button>
              </>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase text-zinc-500">Output</span>
              {mutation.isError || hasApiError ? (
                <span className="inline-flex items-center gap-1 text-xs text-red-300">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  Error
                </span>
              ) : null}
            </div>
            <pre className="max-h-[34rem] min-h-80 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-zinc-300">
              <code>{output}</code>
            </pre>
          </div>
        </div>
      </form>
    </Card>
  );
}
