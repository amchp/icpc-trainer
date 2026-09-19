import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "./AuthGate.js";
import { appHistory } from "./appHistory.js";

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
  it.each(["/animations", "/animations/permutations", "/animations/missing"])("requires an account at %s, even with a preview flag", (path) => {
    window.history.replaceState({}, "", `${path}?preview=resources`);
    render(<AuthGate><div>Private tools</div></AuthGate>);
    expect(screen.queryByText("Private tools")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
    expect(signInPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      signUpForceRedirectUrl: `${path}?preview=resources`, fallbackRedirectUrl: `${path}?preview=resources`
    }));
  });

  it("closes the development preview bypass when navigating from a lesson to the library", async () => {
    window.history.replaceState({}, "", "/resources?preview=resources");
    render(<AuthGate><div>Preview content</div></AuthGate>);
    expect(screen.getByText("Preview content")).toBeInTheDocument();
    await act(async () => { appHistory.push("/animations/permutations?preview=resources"); appHistory.flush(); });
    expect(screen.queryByText("Preview content")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
  });
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
