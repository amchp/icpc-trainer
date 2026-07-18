import { cn } from "../lib.js";
import { useTranslation } from "react-i18next";

export interface GuideSectionLink {
  readonly id: string;
  readonly label: string;
}

export function GuideSidebar({
  sections,
  activeSection
}: {
  readonly sections: readonly GuideSectionLink[];
  readonly activeSection: string;
}): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const activeIndex = Math.max(0, sections.findIndex(({ id }) => id === activeSection));

  return (
    <aside
      className="sticky top-0 z-20 -mx-5 self-start border-y border-zinc-800 bg-[#09090b]/95 py-3 backdrop-blur sm:-mx-8 lg:top-6 lg:z-10 lg:mx-0 lg:border-y-0 lg:bg-transparent lg:py-20 lg:backdrop-blur-none"
      aria-label={t("sidebar.label")}
    >
      <div className="flex items-center gap-4 px-5 sm:px-8 lg:block lg:px-0">
        <p className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 sm:block lg:mb-4">
          {t("sidebar.progress", { current: activeIndex + 1, total: sections.length })}
        </p>
        <nav className="min-w-0 flex-1 overflow-x-auto lg:overflow-visible" aria-label={t("sidebar.label")}>
          <ol className="flex min-w-max items-center lg:min-w-0 lg:flex-col lg:items-stretch lg:gap-1" role="list">
            {sections.map(({ id, label }, index) => (
              <li key={id} className="flex items-center lg:block">
                {index > 0 ? <span aria-hidden="true" className="w-5 border-t border-zinc-700 sm:w-8 lg:hidden" /> : null}
                <a
                  href={`#${id}`}
                  aria-current={activeSection === id ? "location" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:w-full lg:whitespace-normal lg:rounded-md lg:border-transparent lg:px-3 lg:py-2",
                    activeSection === id
                      ? "border-blue-400 bg-blue-400/10 font-medium text-zinc-100 lg:border-blue-400/30"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 lg:hover:border-zinc-700 lg:hover:bg-zinc-900/60"
                  )}
                >
                  <span className={cn("font-mono text-[10px]", activeSection === id ? "text-blue-300" : "text-zinc-600")}>{String(index + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </aside>
  );
}
