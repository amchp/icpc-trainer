import { ExternalLink, FileText, Video, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "./lib.js";

type ResourceKind = "text" | "video";

interface LocalizedResource {
  readonly title: string;
  readonly url: string;
}

interface ResourceTopic {
  readonly id: string;
  readonly title: string;
  readonly resources: Record<ResourceKind, readonly LocalizedResource[]>;
}

const resourceTopics: readonly ResourceTopic[] = [
  {
    id: "learn",
    title: "How to Learn",
    resources: {
      text: [
        {
          title: "How to Learn",
          url: "https://drive.google.com/file/d/1J2x8pIYQ3MXANgvzOgBciWd3d79j_Exa/view"
        }
      ],
      video: [
        {
          title: "How to learn",
          url: "https://www.youtube.com/watch?v=9M5voWYmie4"
        }
      ]
    }
  },
  {
    id: "complexity",
    title: "Complexity",
    resources: {
      text: [
        {
          title: "Time complexity",
          url: "https://usaco.guide/bronze/time-comp"
        }
      ],
      video: [
        {
          title: "Introduction to Big-O",
          url: "https://www.youtube.com/watch?v=zUUkiEllHG0"
        }
      ]
    }
  },
  {
    id: "prefix-sums",
    title: "Prefix Sums",
    resources: {
      text: [
        {
          title: "Introduction to prefix sums",
          url: "https://usaco.guide/silver/prefix-sums"
        }
      ],
      video: [
        {
          title: "Prefix sums walkthrough",
          url: "https://www.youtube.com/watch?v=PhgtNY_-CiY"
        }
      ]
    }
  },

  {
    id: "binary-search",
    title: "Binary Search",
    resources: {
      text: [
        {
          title: "Binary search",
          url: "https://cp-algorithms.com/num_methods/binary_search.html"
        }
      ],
      video: [
        {
          title: "Binary search tutorial",
          url: "https://www.youtube.com/watch?v=GU7DpgHINWQ"
        }
      ]
    }
  },
  {
    id: "number-theory",
    title: "Number Theory",
    resources: {
      text: [
        {
          title: "A beginners guide to Combinatorics",
          url: "https://codeforces.com/blog/entry/143150"
        },
        {
          title: "GCD & LCM",
          url: "https://codeforces.com/blog/entry/148996"
        }
      ],
      video: [
        {
          title: "Number theory topic stream",
          url: "https://www.youtube.com/watch?v=KOzByAdxVZ8"
        }
      ]
    }
  },
  {
    id: "bitwise",
    title: "Bitwise Operations",
    resources: {
      text: [
        {
          title: "Bit manipulation",
          url: "https://cp-algorithms.com/algebra/bit-manipulation.html"
        }
      ],
      video: [
        {
          title: "Bitwise operations topic stream",
          url: "https://www.youtube.com/watch?v=1um-WUyjess"
        }
      ]
    }
  },
  {
    id: "graphs",
    title: "Graphs & Trees",
    resources: {
      text: [
        {
          title: "Introduction to graphs",
          url: "https://codeforces.com/blog/entry/114946"
        }
      ],
      video: [
        {
          title: "Graphs and trees walkthrough",
          url: "https://www.youtube.com/watch?v=mw2J6lvZZJ4"
        }
      ]
    }
  },
  {
    id: "dynamic-programming",
    title: "Dynamic Programming",
    resources: {
      text: [
        {
          title: "Introduction to dynamic programming",
          url: "https://cp-algorithms.com/dynamic_programming/intro-to-dp.html"
        }
      ],
      video: [
        {
          title: "Dynamic programming lecture",
          url: "https://www.youtube.com/watch?v=YBSt1jYwVfU"
        }
      ]
    }
  },
  {
    id: "combinatorics",
    title: "Combinatorics",
    resources: {
      text: [
        {
          title: "Combinatorics overview",
          url: "https://codeforces.com/blog/entry/110376"
        }
      ],
      video: [
        {
          title: "Combinatorics practice stream",
          url: "https://www.youtube.com/watch?v=aT0q71JESf8"
        }
      ]
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

export function ResourcesPage(): React.JSX.Element {
  const [selectedTopicId, setSelectedTopicId] = useState(defaultResourceTopic.id);
  const selectedTopic = useMemo(
    () => resourceTopics.find((topic) => topic.id === selectedTopicId) ?? defaultResourceTopic,
    [selectedTopicId]
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
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
                "flex min-h-11 w-full items-center justify-between border-l-2 border-transparent px-3 text-left text-sm font-medium text-zinc-400 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                topic.id === selectedTopic.id && "border-blue-500 text-zinc-100"
              )}
              aria-current={topic.id === selectedTopic.id ? "page" : undefined}
              onClick={() => setSelectedTopicId(topic.id)}
            >
              {topic.title}
            </button>
          ))}
        </nav>

        <section className="min-w-0" aria-live="polite">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-xl font-semibold tracking-tight">{selectedTopic.title}</h2>
          </div>

          <div className="divide-y divide-zinc-800 border-b border-zinc-800">
            {selectedTopic.resources.text.map((resource) => (
              <ResourceLink
                key={`${selectedTopic.id}-text-${resource.title}`}
                icon={FileText}
                title={resource.title}
                href={resource.url}
              />
            ))}
            {selectedTopic.resources.video.map((resource) => (
              <ResourceLink
                key={`${selectedTopic.id}-video-${resource.title}`}
                icon={Video}
                title={resource.title}
                href={resource.url}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function ResourceLink({
  icon: Icon,
  href,
  title
}: {
  readonly icon: LucideIcon;
  readonly href: string;
  readonly title: string;
}): React.JSX.Element {
  return (
    <div className="grid min-h-16 gap-3 py-4 text-zinc-100 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <span className="flex min-w-0 items-center gap-3 px-1">
        <Icon className="size-5 shrink-0 text-blue-300" aria-hidden="true" />
        <span className="truncate text-sm font-medium">{title}</span>
      </span>
      <span className="flex flex-wrap gap-2 sm:justify-end">
        <ResourceOpenLink href={href} resourceTitle={title} />
      </span>
    </div>
  );
}

function ResourceOpenLink({
  href,
  resourceTitle
}: {
  readonly href: string;
  readonly resourceTitle: string;
}): React.JSX.Element {
  return (
    <a
      className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-800 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-blue-500/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open resource for ${resourceTitle}`}
    >
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}
