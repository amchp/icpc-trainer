import type { KeyboardEvent } from "react";

export interface ProviderConnectJudgeFormProps {
  readonly onChangeProvider: () => void;
  readonly tutorialUrl?: string;
}

export const submitFormOnTextareaEnter = (
  event: KeyboardEvent<HTMLTextAreaElement>,
  disabled: boolean
): void => {
  if (
    disabled ||
    event.key !== "Enter" ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.nativeEvent.isComposing
  ) {
    return;
  }

  event.preventDefault();

  const form = event.currentTarget.form;

  if (form === null) {
    return;
  }

  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
    return;
  }

  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};
