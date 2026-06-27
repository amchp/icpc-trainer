import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Video, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { appPaths } from "./appNavigation.js";
import { cn } from "./lib.js";

type ResourceLanguage = "en" | "es";
type ResourceKind = "text" | "video";

interface LocalizedResource {
  readonly title: Record<ResourceLanguage, string>;
  readonly url: Record<ResourceLanguage, string>;
}

interface ResourceTopic {
  readonly id: string;
  readonly title: Record<ResourceLanguage, string>;
  readonly resources: Record<ResourceKind, LocalizedResource>;
}

const storageKey = "icpc-trainer.resources.language";

const languages: Array<{
  readonly id: ResourceLanguage;
  readonly label: string;
}> = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" }
];

const copy = {
  en: {
    contestFinderUse: "for contests your friends solved.",
    findProblemsUse: "for targeted practice,",
    open: "Open",
    practiceIntro: "Practice these topics with",
    title: "Study these",
    upsolvingUse: "for missed contest tasks, and"
  },
  es: {
    contestFinderUse: "para concursos que resolvieron tus amigos.",
    findProblemsUse: "para practica dirigida,",
    open: "Abrir",
    practiceIntro: "Practica estos temas con",
    title: "Estudia estos temas",
    upsolvingUse: "para problemas pendientes, y"
  }
} satisfies Record<ResourceLanguage, Record<string, string>>;

const searchUrl = (query: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;

const videoSearchUrl = (query: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

const resourceTopics: readonly ResourceTopic[] = [
  {
    id: "complexity",
    title: {
      en: "Complexity",
      es: "Complejidad"
    },
    resources: {
      text: {
        title: {
          en: "Complexity notes",
          es: "Notas de complejidad"
        },
        url: {
          en: searchUrl("competitive programming time complexity guide"),
          es: searchUrl("programacion competitiva complejidad algoritmica guia")
        }
      },
      video: {
        title: {
          en: "Complexity walkthrough",
          es: "Video de complejidad"
        },
        url: {
          en: videoSearchUrl("competitive programming time complexity"),
          es: videoSearchUrl("programacion competitiva complejidad algoritmica")
        }
      }
    }
  },
  {
    id: "arrays",
    title: {
      en: "Arrays",
      es: "Arreglos"
    },
    resources: {
      text: {
        title: {
          en: "Array patterns",
          es: "Patrones con arreglos"
        },
        url: {
          en: searchUrl("competitive programming arrays guide"),
          es: searchUrl("programacion competitiva arreglos guia")
        }
      },
      video: {
        title: {
          en: "Array walkthrough",
          es: "Video de arreglos"
        },
        url: {
          en: videoSearchUrl("competitive programming arrays"),
          es: videoSearchUrl("programacion competitiva arreglos")
        }
      }
    }
  },
  {
    id: "sorting",
    title: {
      en: "Sorting",
      es: "Ordenamiento"
    },
    resources: {
      text: {
        title: {
          en: "Sorting patterns",
          es: "Patrones de ordenamiento"
        },
        url: {
          en: searchUrl("competitive programming sorting guide"),
          es: searchUrl("programacion competitiva ordenamiento guia")
        }
      },
      video: {
        title: {
          en: "Sorting walkthrough",
          es: "Video de ordenamiento"
        },
        url: {
          en: videoSearchUrl("competitive programming sorting"),
          es: videoSearchUrl("programacion competitiva ordenamiento")
        }
      }
    }
  },
  {
    id: "binary-search",
    title: {
      en: "Binary Search",
      es: "Busqueda binaria"
    },
    resources: {
      text: {
        title: {
          en: "Binary search patterns",
          es: "Patrones de busqueda binaria"
        },
        url: {
          en: searchUrl("competitive programming binary search guide"),
          es: searchUrl("programacion competitiva busqueda binaria guia")
        }
      },
      video: {
        title: {
          en: "Binary search walkthrough",
          es: "Video de busqueda binaria"
        },
        url: {
          en: videoSearchUrl("competitive programming binary search"),
          es: videoSearchUrl("programacion competitiva busqueda binaria")
        }
      }
    }
  },
  {
    id: "graphs",
    title: {
      en: "Graphs",
      es: "Grafos"
    },
    resources: {
      text: {
        title: {
          en: "Graph traversal",
          es: "Recorridos en grafos"
        },
        url: {
          en: searchUrl("competitive programming graph traversal guide"),
          es: searchUrl("programacion competitiva recorridos en grafos guia")
        }
      },
      video: {
        title: {
          en: "Graph traversal walkthrough",
          es: "Video de recorridos en grafos"
        },
        url: {
          en: videoSearchUrl("competitive programming graph traversal"),
          es: videoSearchUrl("programacion competitiva recorridos en grafos")
        }
      }
    }
  },
  {
    id: "dynamic-programming",
    title: {
      en: "Dynamic Programming",
      es: "Programacion dinamica"
    },
    resources: {
      text: {
        title: {
          en: "Dynamic programming basics",
          es: "Bases de programacion dinamica"
        },
        url: {
          en: searchUrl("competitive programming dynamic programming basics guide"),
          es: searchUrl("programacion competitiva programacion dinamica basica guia")
        }
      },
      video: {
        title: {
          en: "Dynamic programming walkthrough",
          es: "Video de programacion dinamica"
        },
        url: {
          en: videoSearchUrl("competitive programming dynamic programming basics"),
          es: videoSearchUrl("programacion competitiva programacion dinamica basica")
        }
      }
    }
  }
];

const getDefaultResourceTopic = (): ResourceTopic => {
  const topic = resourceTopics[0];

  if (topic === undefined) {
    throw new Error("Resources require at least one topic.");
  }

  return topic;
};

const defaultResourceTopic = getDefaultResourceTopic();

const getInitialLanguage = (): ResourceLanguage => {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    return window.localStorage.getItem(storageKey) === "es" ? "es" : "en";
  } catch {
    return "en";
  }
};

export function ResourcesPage(): React.JSX.Element {
  const [language, setLanguage] = useState<ResourceLanguage>(getInitialLanguage);
  const [selectedTopicId, setSelectedTopicId] = useState(defaultResourceTopic.id);
  const selectedTopic = useMemo(
    () => resourceTopics.find((topic) => topic.id === selectedTopicId) ?? defaultResourceTopic,
    [selectedTopicId]
  );
  const selectedCopy = copy[language];

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, language);
    } catch {
      // Persistence is helpful but not required for the prototype.
    }
  }, [language]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{selectedCopy.title}</h1>
        <div
          className="inline-flex w-fit rounded-md border border-zinc-800 bg-zinc-950 p-1"
          aria-label="Resource language"
          role="group"
        >
          {languages.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-[5px] px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                language === option.id
                  ? "bg-blue-500 text-white"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              )}
              aria-pressed={language === option.id}
              onClick={() => setLanguage(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <nav
          className="grid gap-1 border-y border-zinc-800 py-2 lg:border-y-0 lg:border-r lg:py-0 lg:pr-4"
          aria-label="Resource topics"
        >
          {resourceTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center justify-between border-l-2 border-transparent px-3 text-left text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                topic.id === selectedTopic.id && "border-blue-500 text-zinc-100"
              )}
              aria-current={topic.id === selectedTopic.id ? "page" : undefined}
              onClick={() => setSelectedTopicId(topic.id)}
            >
              {topic.title[language]}
            </button>
          ))}
        </nav>

        <section className="min-w-0" aria-live="polite">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-xl font-semibold tracking-tight">{selectedTopic.title[language]}</h2>
          </div>

          <div className="divide-y divide-zinc-800 border-b border-zinc-800">
            <ResourceLink
              href={selectedTopic.resources.text.url[language]}
              icon={FileText}
              label={selectedCopy.open}
              title={selectedTopic.resources.text.title[language]}
            />
            <ResourceLink
              href={selectedTopic.resources.video.url[language]}
              icon={Video}
              label={selectedCopy.open}
              title={selectedTopic.resources.video.title[language]}
            />
          </div>
        </section>
      </section>

      <p className="mt-8 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
        {selectedCopy.practiceIntro}{" "}
        <Link to={appPaths.findProblems} className="text-blue-300 hover:text-blue-200 hover:underline">
          Find Problems
        </Link>{" "}
        {selectedCopy.findProblemsUse}{" "}
        <Link to={appPaths.upsolving} className="text-blue-300 hover:text-blue-200 hover:underline">
          Upsolving
        </Link>{" "}
        {selectedCopy.upsolvingUse}{" "}
        <Link to={appPaths.contestFinder} className="text-blue-300 hover:text-blue-200 hover:underline">
          Contest Finder
        </Link>{" "}
        {selectedCopy.contestFinderUse}
      </p>
    </main>
  );
}

function ResourceLink({
  href,
  icon: Icon,
  label,
  title
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly title: string;
}): React.JSX.Element {
  return (
    <a
      className="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-zinc-100 outline-none transition-colors hover:bg-zinc-900/40 focus-visible:bg-zinc-900/40 focus-visible:ring-2 focus-visible:ring-blue-400"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <span className="flex min-w-0 items-center gap-3 px-1">
        <Icon className="size-5 shrink-0 text-blue-300" aria-hidden="true" />
        <span className="truncate text-sm font-medium">{title}</span>
      </span>
      <span className="mr-1 inline-flex h-8 items-center gap-2 rounded-md border border-zinc-800 px-3 text-xs font-medium text-zinc-300 transition-colors group-hover:border-blue-500/70 group-hover:text-zinc-100">
        {label}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </span>
    </a>
  );
}
