import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  type PracticeQuestion,
  PracticeQuestionSet
} from "./PracticeQuestionSet.js";

const questions = [
  {
    question: "First question?",
    options: ["Alpha", "Beta", "Gamma"],
    correctOption: 1,
    explanation: "Beta is correct."
  },
  {
    question: "Second question?",
    options: ["One", "Two", "Three"],
    correctOption: 2,
    explanation: "Three is correct."
  }
] as const satisfies readonly [PracticeQuestion, ...PracticeQuestion[]];

afterEach(cleanup);

describe("PracticeQuestionSet", () => {
  it("shows one question at a time without decorative option letters", () => {
    render(<PracticeQuestionSet questions={questions} />);

    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("First question?")).toBeInTheDocument();
    expect(screen.queryByText("Second question?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveTextContent(/^Alpha$/);
    expect(screen.getByRole("button", { name: "Beta" })).toHaveTextContent(/^Beta$/);
    expect(screen.getByRole("button", { name: "Gamma" })).toHaveTextContent(/^Gamma$/);
    expect(screen.queryByText(/^A$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^B$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^C$/)).not.toBeInTheDocument();
  });

  it("supports retrying and exposes selection and non-color feedback", () => {
    render(<PracticeQuestionSet questions={questions} />);

    expect(screen.queryByRole("button", { name: "Continue to next question" })).not.toBeInTheDocument();
    const alpha = screen.getByRole("button", { name: "Alpha" });
    fireEvent.click(alpha);
    expect(alpha).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Try again. Beta is correct.");
    expect(alpha.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Continue to next question" })).toBeInTheDocument();

    const beta = screen.getByRole("button", { name: "Beta" });
    fireEvent.click(beta);
    expect(alpha).toHaveAttribute("aria-pressed", "false");
    expect(beta).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Correct. Beta is correct.");
    expect(beta.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("offers a prominent next action after answering and hides it on the final question", () => {
    render(<PracticeQuestionSet questions={questions} />);

    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to next question" }));

    expect(screen.getByText("Second question?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to next question" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Three" }));
    expect(screen.queryByRole("button", { name: "Continue to next question" })).not.toBeInTheDocument();
  });

  it("navigates freely and preserves each question's answer", () => {
    render(<PracticeQuestionSet questions={questions} />);

    const previous = screen.getByRole("button", { name: "Previous question" });
    const next = screen.getByRole("button", { name: "Next question" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    fireEvent.click(next);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Second question?")).toBeInTheDocument();
    expect(screen.queryByText("First question?")).not.toBeInTheDocument();
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Three" }));
    fireEvent.click(previous);
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Correct. Beta is correct.");

    fireEvent.click(next);
    expect(screen.getByRole("button", { name: "Three" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Correct. Three is correct.");
  });

  it("hides progress and navigation for a single question", () => {
    render(<PracticeQuestionSet questions={[questions[0]]} />);

    expect(screen.queryByText(/Question 1 of/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous question" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next question" })).not.toBeInTheDocument();
  });
});
