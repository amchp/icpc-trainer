import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "./components/ui.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";

export interface TableLoadingState {
  readonly isPartial: boolean;
  readonly isFetching: boolean;
  readonly error: Error | null;
  readonly refetch: () => unknown;
}

export function TableLoadState({ query }: { readonly query: TableLoadingState }): React.JSX.Element | null {
  const { t } = useTranslation("common");
  if (!query.isPartial) return null;
  if (query.error) {
    return <div className="flex flex-col items-center gap-2 border-t border-zinc-800 px-5 py-6">
      <p role="alert" className="text-sm text-red-300">{localizedErrorMessage(query.error)}</p>
      <Button variant="secondary" onClick={() => void query.refetch()}>{t("retry")}</Button>
    </div>;
  }
  return query.isFetching ? (
    <div role="status" aria-label={t("loading")} className="flex items-center justify-center gap-2 border-t border-zinc-800 px-5 py-6 text-sm text-zinc-400">
      <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden="true" />
      {t("loading")}
    </div>
  ) : null;
}
