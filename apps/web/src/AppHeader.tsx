import { APP_NAME } from "@icpc-trainer/shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Plus, RefreshCw, User } from "lucide-react";
import { useState } from "react";

import { Button, DropdownContent, DropdownItem, Separator } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { useSync } from "./SyncContext.js";
import { trpc } from "./trpc.js";

export function AppHeader(): React.JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { connectedJudges, refresh } = useConnectedJudges();
  const { startSync, status: syncStatus } = useSync();

  const profileLabel = connectedJudges.length > 0
    ? connectedJudges.map((judge) => judge.label).join(" + ")
    : "Profile";

  const logout = async (): Promise<void> => {
    await Promise.allSettled(
      connectedJudges.map((judge) => trpc.credentials.clear.mutate(judge.id))
    );
    await refresh();
    setOpen(false);
    void navigate({ to: "/connect-judges" });
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur sm:px-8">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-2 text-zinc-100">
          <img src="/icpc_trainer.png" alt="" className="size-8 object-contain" />
          <span className="truncate text-sm font-semibold">{APP_NAME}</span>
        </Link>

        <Link
          to="/upsolving"
          className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 sm:inline-flex"
        >
          Upsolving
        </Link>

        <Button
          type="button"
          variant="secondary"
          disabled={connectedJudges.length === 0 || syncStatus === "running"}
          onClick={() => {
            startSync(connectedJudges.map((judge) => judge.id));
          }}
        >
          <RefreshCw className={syncStatus === "running" ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
          Synced
        </Button>

        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            className="max-w-[52vw] rounded-full sm:max-w-56"
            onClick={() => setOpen((current) => !current)}
          >
            <User className="size-4 text-zinc-400" aria-hidden="true" />
            <span className="truncate">{profileLabel}</span>
          </Button>

          {open ? (
            <DropdownContent>
              <div className="px-2 py-2">
                <p className="text-xs font-medium uppercase text-zinc-500">Account</p>
                <p className="mt-1 truncate text-sm text-zinc-200">{profileLabel}</p>
              </div>
              <Separator className="my-1" />
              <DropdownItem
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/connect-judges" });
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Connect judge
              </DropdownItem>
              {connectedJudges.length > 0 ? (
                <>
                  <Separator className="my-1" />
                  <div className="px-2 py-2">
                    <p className="mb-1.5 text-xs font-medium uppercase text-zinc-500">Connected judges</p>
                    <div className="space-y-1">
                      {connectedJudges.map((judge) => (
                        <p key={judge.id} className="text-sm text-zinc-300">
                          {judge.label}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Separator className="my-1" />
                  <DropdownItem
                    className="text-zinc-400"
                    onClick={() => void logout()}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Clear connected judges
                  </DropdownItem>
                </>
              ) : null}
            </DropdownContent>
          ) : null}
        </div>
      </div>
    </header>
  );
}
