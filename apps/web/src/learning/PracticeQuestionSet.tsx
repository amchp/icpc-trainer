import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";
import { GuideCodeBlock } from "./GuideCodeBlock.js";

export interface PracticeQuestion {
  readonly question: string;
  readonly code?: string;
  readonly options: readonly string[];
  readonly correctOption: number;
  readonly explanation: string;
}

export interface PracticeQuestionSetProps {
  readonly questions: readonly [PracticeQuestion, ...PracticeQuestion[]];
  readonly label?: string;
}

export function PracticeQuestionSet({
  questions,
  label
}: PracticeQuestionSetProps): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<readonly (number | null)[]>(() => questions.map(() => null));
  const activeQuestion = questions[questionIndex] ?? questions[0];
  const activeAnswer = answers[questionIndex] ?? null;
  const hasMultipleQuestions = questions.length > 1;

  const answerQuestion = (optionIndex: number): void => {
    setAnswers((currentAnswers) =>
      currentAnswers.map((answer, index) => index === questionIndex ? optionIndex : answer)
    );
  };

  return (
    <div className="my-10 rounded-lg border border-zinc-800 border-l-2 border-l-blue-400 bg-zinc-900/25 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-blue-300">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-blue-400" />
          {label ?? t("practice.label")}
        </span>
        {hasMultipleQuestions ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {t("practice.questionCount", { current: questionIndex + 1, total: questions.length })}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={t("practice.previousQuestion")}
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex((current) => current - 1)}
                className="grid size-8 place-items-center rounded-md border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={t("practice.nextQuestion")}
                disabled={questionIndex === questions.length - 1}
                onClick={() => setQuestionIndex((current) => current + 1)}
                className="grid size-8 place-items-center rounded-md border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <h3 aria-live="polite" className="mt-4 text-lg font-semibold leading-7 text-zinc-100">
        {activeQuestion.question}
      </h3>
      {activeQuestion.code === undefined ? null : (
        <div aria-label={t("practice.questionCode")} className="[&>div]:my-4">
          <GuideCodeBlock code={activeQuestion.code} />
        </div>
      )}
      <div className={cn("mt-4 grid gap-2", activeQuestion.options.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
        {activeQuestion.options.map((option, optionIndex) => {
          const selected = activeAnswer === optionIndex;
          const correct = optionIndex === activeQuestion.correctOption;

          return (
            <button
              key={optionIndex}
              type="button"
              aria-pressed={selected}
              onClick={() => answerQuestion(optionIndex)}
              className={cn(
                "flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                selected && correct && "border-emerald-400/60 bg-emerald-400/10 text-emerald-100",
                selected && !correct && "border-red-400/60 bg-red-400/10 text-red-100",
                !selected && "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900/60 hover:text-zinc-100"
              )}
            >
              <span className="min-w-0 break-words">{option}</span>
              {selected ? (
                correct ? (
                  <Check aria-hidden="true" className="size-4 shrink-0 text-emerald-300" />
                ) : (
                  <X aria-hidden="true" className="size-4 shrink-0 text-red-300" />
                )
              ) : null}
            </button>
          );
        })}
      </div>
      {activeAnswer !== null ? (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <p
            role="status"
            className={cn(
              "min-w-0 flex-1 text-sm leading-6",
              activeAnswer === activeQuestion.correctOption ? "text-emerald-300" : "text-red-200"
            )}
          >
            <strong className="font-semibold">
              {activeAnswer === activeQuestion.correctOption ? t("practice.correct") : t("practice.retry")}
            </strong>
            {activeQuestion.explanation}
          </p>
          {questionIndex < questions.length - 1 ? (
            <button
              type="button"
              aria-label={t("practice.continueToNextQuestion")}
              onClick={() => setQuestionIndex((current) => current + 1)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-blue-500 bg-blue-500 px-3 text-sm font-medium text-white transition-colors hover:border-blue-400 hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {t("practice.nextQuestion")}
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
