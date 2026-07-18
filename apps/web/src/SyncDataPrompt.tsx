import { RefreshCw } from "lucide-react";

import { Card } from "./components/ui.js";
import { useTranslation } from "react-i18next";

export function SyncDataPrompt(): React.JSX.Element {
  const { t } = useTranslation("upsolving");
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 size-4 text-blue-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-zinc-100">{t("noSyncedTitle")}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {t("noSyncedDescription")}
          </p>
        </div>
      </div>
    </Card>
  );
}
