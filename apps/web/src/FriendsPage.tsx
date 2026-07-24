import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "./components/ui.js";
import { FriendSubmissionSyncPanel } from "./FriendSubmissionSyncPanel.js";
import { FriendsRoster } from "./FriendsRoster.js";
import { useFriendSubmissionSync } from "./useFriendSubmissionSync.js";
import { PeopleRouteTabs } from "./SectionRouteTabs.js";

export function FriendsPage(): React.JSX.Element {
  const { t } = useTranslation("roster");
  const friendSubmissionSync = useFriendSubmissionSync();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <PeopleRouteTabs />
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("friendsTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("friendsSubtitle")}</p>
        </div>
        <Button
          type="button"
          disabled={friendSubmissionSync.syncing}
          onClick={() => void friendSubmissionSync.syncFriendSubmissions()}
        >
          {friendSubmissionSync.syncing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          {t("syncFriends")}
        </Button>
      </section>

      <FriendSubmissionSyncPanel states={friendSubmissionSync.states} />

      <FriendsRoster />
    </main>
  );
}
