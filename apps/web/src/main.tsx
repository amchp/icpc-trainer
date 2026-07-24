import { ClerkProvider } from "@clerk/clerk-react";
import { enUS, esMX } from "@clerk/localizations";
import { APP_LOCALES } from "@icpc-trainer/shared";
import { shadcn } from "@clerk/ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { AuthGate } from "./AuthGate.js";
import { ConnectedJudgesProvider } from "./ConnectedJudgesContext.js";
import { env } from "./env.js";
import "./i18n/i18n.js";
import { LocaleProvider, useLocale } from "./i18n/LocaleProvider.js";
import { router } from "./router.js";
import { SyncProvider } from "./SyncContext.js";
import { ToasterProvider } from "./Toaster.js";

const queryClient = new QueryClient();
const root = document.getElementById("root");
const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorBackground: "#18181b",
    colorInputBackground: "#09090b",
    colorInputText: "#fafafa",
    colorPrimary: "#3b82f6",
    colorText: "#f4f4f5",
    colorTextOnPrimaryBackground: "#ffffff",
    colorTextSecondary: "#d4d4d8",
    colorNeutral: "#a1a1aa",
    borderRadius: "0.5rem"
  },
  elements: {
    rootBox: {
      width: "100%"
    },
    cardBox: {
      width: "100%"
    },
    card: {
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      boxShadow: "0 18px 56px rgba(0, 0, 0, 0.42)"
    },
    modalContent: {
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      boxShadow: "0 18px 56px rgba(0, 0, 0, 0.42)"
    },
    popoverBox: {
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      boxShadow: "0 16px 48px rgba(0, 0, 0, 0.44)"
    },
    headerTitle: {
      color: "#fafafa"
    },
    headerSubtitle: {
      color: "#d4d4d8"
    },
    socialButtonsBlockButton: {
      backgroundColor: "#09090b",
      borderColor: "#3f3f46",
      color: "#f4f4f5"
    },
    socialButtonsBlockButtonText: {
      color: "#f4f4f5"
    },
    formFieldInput: {
      backgroundColor: "#09090b",
      borderColor: "#3f3f46",
      color: "#f4f4f5"
    },
    formFieldLabel: {
      color: "#e4e4e7"
    },
    footerActionText: {
      color: "#d4d4d8"
    },
    footerActionLink: {
      color: "#60a5fa"
    },
    formButtonPrimary: {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      boxShadow: "none"
    },
    dividerLine: {
      backgroundColor: "#3f3f46"
    },
    dividerText: {
      color: "#a1a1aa"
    },
    userButtonPopoverCard: {
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      boxShadow: "0 16px 48px rgba(0, 0, 0, 0.44)"
    },
    userButtonPopoverActionButton: {
      color: "#f4f4f5"
    },
    userButtonPopoverActionButtonText: {
      color: "#f4f4f5"
    }
  }
} as const;

if (!root) {
  throw new Error("Root element not found");
}

function LocalizedClerkProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { locale } = useLocale();
  return (
    <ClerkProvider
      publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      localization={locale === APP_LOCALES.Spanish ? esMX : enUS}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <LocalizedClerkProvider>
          <ToasterProvider>
            <AuthGate>
              <ConnectedJudgesProvider>
                <SyncProvider>
                  <RouterProvider router={router} />
                </SyncProvider>
              </ConnectedJudgesProvider>
            </AuthGate>
          </ToasterProvider>
        </LocalizedClerkProvider>
      </LocaleProvider>
    </QueryClientProvider>
  </StrictMode>,
);
