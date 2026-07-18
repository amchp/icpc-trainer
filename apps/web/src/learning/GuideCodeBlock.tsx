import { Check, Clipboard } from "lucide-react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";

export function GuideCodeBlock({
  code,
  language = "cpp",
  copyLabel
}: {
  readonly code: string;
  readonly language?: Language;
  readonly copyLabel?: string;
}): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-8 overflow-hidden rounded-lg border border-zinc-800 bg-[#0d1117] text-sm">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 py-1.5 pl-4 pr-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {language === "cpp" ? "C++" : language}
        </span>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            copied ? "text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          )}
          aria-label={copyLabel ?? t("code.copyLabel")}
          onClick={() => void copy()}
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Clipboard className="size-3.5" aria-hidden="true" />}
          {copied ? t("code.copied") : t("code.copy")}
        </button>
      </div>
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(className, "overflow-x-auto p-5 font-mono text-[13px] leading-6 sm:p-6")}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, index) => (
              <div key={index} {...getLineProps({ line })} className="grid grid-cols-[2rem_1fr]">
                <span aria-hidden="true" className="select-none text-right pr-4 text-zinc-700">{index + 1}</span>
                <span>
                  {line.map((token, tokenIndex) => <span key={tokenIndex} {...getTokenProps({ token })} />)}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      <span className="sr-only" aria-live="polite">{copied ? t("code.announcement") : ""}</span>
    </div>
  );
}
