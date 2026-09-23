import { SignInButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";

import { Button } from "./components/ui.js";

export function SignInAction({ forProgress = false }: { readonly forProgress?: boolean }): React.JSX.Element {
  const { t } = useTranslation("shell");
  return (
    <SignInButton mode="modal" forceRedirectUrl={window.location.href}>
      <Button type="button" variant="secondary">{t(forProgress ? "signInProgress" : "signIn")}</Button>
    </SignInButton>
  );
}
