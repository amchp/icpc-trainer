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
  useAuth: () => ({ isSignedIn: false })
}));

vi.mock("./trpc", () => ({
  setAuthToken: vi.fn()
}));

vi.mock("./i18n/LanguageButton.js", () => ({
  LanguageButton: () => null
}));

describe("AuthGate public learning access", () => {
  beforeEach(() => { signInPropsMock.mockClear(); });
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it.each([
    "/resources", "/resources/introduction", "/resources/graphs?language=es",
    "/animations", "/animations/permutations", "/animations/missing",
    "/animations/permutations?preview=resources"
  ])("opens %s without signing in", (path) => {
    window.history.replaceState({}, "", path);
    render(<AuthGate><div>Learning content</div></AuthGate>);
    expect(screen.getByText("Learning content")).toBeInTheDocument();
    expect(signInPropsMock).not.toHaveBeenCalled();
  });

  it.each(["/", "/judges", "/connect-judges", "/contests?preview=resources", "/resources-old", "/animations-old"])("still protects %s", (path) => {
    window.history.replaceState({}, "", path);
    render(<AuthGate><div>Private content</div></AuthGate>);
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute("href", "/resources");
    expect(screen.getByRole("link", { name: "Animations" })).toHaveAttribute("href", "/animations");
  });

  it("reevaluates access during client-side navigation in both directions", async () => {
    window.history.replaceState({}, "", "/resources");
    render(<AuthGate><div>Route content</div></AuthGate>);
    await act(async () => { appHistory.push("/animations/permutations"); appHistory.flush(); });
    expect(screen.getByText("Route content")).toBeInTheDocument();
    await act(async () => { appHistory.push("/judges"); appHistory.flush(); });
    expect(screen.queryByText("Route content")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
    await act(async () => { appHistory.push("/resources/introduction"); appHistory.flush(); });
    expect(screen.getByText("Route content")).toBeInTheDocument();
    expect(screen.queryByTestId("sign-in")).not.toBeInTheDocument();
  });
});
