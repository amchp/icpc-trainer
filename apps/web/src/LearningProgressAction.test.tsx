import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearningProgressAction } from "./LearningProgressAction.js";

const auth = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => auth,
  SignInButton: ({ children }: { readonly children: ReactNode }) => children
}));

afterEach(cleanup);

describe("Learning progress action", () => {
  it("offers sign-in instead of a save action to guests", () => {
    auth.userId = null;
    const save = vi.fn();
    render(<LearningProgressAction><button onClick={save}>Mark complete</button></LearningProgressAction>);
    expect(screen.queryByRole("button", { name: "Mark complete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to save your progress" }));
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps the save action for signed-in learners", () => {
    auth.userId = "learner";
    const save = vi.fn();
    render(<LearningProgressAction><button onClick={save}>Mark complete</button></LearningProgressAction>);
    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(save).toHaveBeenCalledOnce();
  });
});
