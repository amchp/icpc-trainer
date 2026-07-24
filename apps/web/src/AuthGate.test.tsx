import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "./AuthGate.js";

const signInPropsMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/clerk-react", () => ({
  SignIn: (props: Record<string, unknown>) => {
    signInPropsMock(props);
    return <div data-testid="sign-in" />;
  },
  SignedIn: () => null,
  SignedOut: ({ children }: { readonly children: ReactNode }) => children,
  useAuth: vi.fn()
}));

vi.mock("./trpc", () => ({
  setAuthToken: vi.fn()
}));

vi.mock("./i18n/LanguageButton.js", () => ({
  LanguageButton: () => null
}));

describe("AuthGate first-user redirects", () => {
  beforeEach(() => {
    signInPropsMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("returns users to an original resources subpath after authentication", () => {
    window.history.replaceState({}, "", "/resources/graphs?language=es");

    render(<AuthGate><div /></AuthGate>);

    expect(signInPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      signUpForceRedirectUrl: "/resources/graphs?language=es",
      fallbackRedirectUrl: "/resources/graphs?language=es"
    }));
  });

  it("keeps the normal signup destination for non-resource links", () => {
    window.history.replaceState({}, "", "/contests?source=invite");

    render(<AuthGate><div /></AuthGate>);

    expect(signInPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      signUpForceRedirectUrl: "/",
      fallbackRedirectUrl: "/"
    }));
  });
});
