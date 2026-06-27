import { Check, ChevronDown, Search, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, DropdownContent, DropdownItem, DropdownTrigger, Input, Label, TableCount } from "./components/ui.js";

export interface FindProblemTagOption {
  readonly name: string;
  readonly count: number;
}

export function FindProblemsTableFilters({
  searchQuery,
  minRating,
  maxRating,
  ratingFloor,
  ratingCeiling,
  tags,
  selectedTags,
  visibleCount,
  onSearchQueryChange,
  onMinRatingChange,
  onMaxRatingChange,
  onSelectedTagsChange,
  friendsSortActive,
  onSortByFriends,
  onRandom
}: {
  readonly searchQuery: string;
  readonly minRating: number;
  readonly maxRating: number;
  readonly ratingFloor: number;
  readonly ratingCeiling: number;
  readonly tags: readonly FindProblemTagOption[];
  readonly selectedTags: readonly string[];
  readonly visibleCount: number;
  readonly onSearchQueryChange: (value: string) => void;
  readonly onMinRatingChange: (value: number) => void;
  readonly onMaxRatingChange: (value: number) => void;
  readonly onSelectedTagsChange: (value: readonly string[]) => void;
  readonly friendsSortActive: boolean;
  readonly onSortByFriends: () => void;
  readonly onRandom: () => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <label className="relative min-w-0">
          <span className="sr-only">Search problems</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <Input
            className="pl-9"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search problem names"
          />
        </label>

        <RatingInput
          label="Min rating"
          value={minRating}
          min={ratingFloor}
          max={maxRating}
          onChange={onMinRatingChange}
        />
        <RatingInput
          label="Max rating"
          value={maxRating}
          min={minRating}
          max={ratingCeiling}
          onChange={onMaxRatingChange}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
        <TagFilterDropdown
          tags={tags}
          selectedTags={selectedTags}
          onChange={onSelectedTagsChange}
        />
        <Button
          type="button"
          variant={friendsSortActive ? "default" : "secondary"}
          disabled={visibleCount === 0}
          aria-pressed={friendsSortActive}
          onClick={onSortByFriends}
        >
          <UsersRound className="size-4" aria-hidden="true" />
          Most friends
        </Button>
        <Button
          type="button"
          disabled={visibleCount === 0}
          onClick={onRandom}
        >
          Random
        </Button>
        <TableCount count={visibleCount} itemName="problem" />
      </div>
    </div>
  );
}

function RatingInput({
  label,
  value,
  min,
  max,
  onChange
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <Label className="min-w-28">
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        step={100}
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) {
            onChange(next);
          }
        }}
      />
    </Label>
  );
}

function TagFilterDropdown({
  tags,
  selectedTags,
  onChange
}: {
  readonly tags: readonly FindProblemTagOption[];
  readonly selectedTags: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedTagSet = new Set(selectedTags);
  const selectedLabel = selectedTags.length === 0
    ? "All tags"
    : selectedTags.length === 1
      ? selectedTags[0]
      : `${selectedTags.length} tags`;

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <DropdownTrigger
        aria-label="Filter by tag"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      </DropdownTrigger>

      {open && (
        <DropdownContent
          role="menu"
          aria-label="Tag filter options"
          className="max-h-80 overflow-y-auto"
        >
          <DropdownItem
            role="menuitemcheckbox"
            aria-checked={selectedTags.length === 0}
            aria-label={`All tags, ${tags.length} options`}
            onClick={() => onChange([])}
          >
            <span className="w-4 text-blue-300">
              {selectedTags.length === 0 && <Check className="size-3.5" aria-hidden="true" />}
            </span>
            <span className="flex-1">All tags</span>
          </DropdownItem>

          {tags.map((tag) => {
            const selected = selectedTagSet.has(tag.name);
            return (
              <DropdownItem
                key={tag.name}
                role="menuitemcheckbox"
                aria-checked={selected}
                aria-label={`${tag.name}, ${tag.count} ${tag.count === 1 ? "problem" : "problems"}`}
                onClick={() => {
                  onChange(
                    selected
                      ? selectedTags.filter((value) => value !== tag.name)
                      : [...selectedTags, tag.name].sort((a, b) => a.localeCompare(b))
                  );
                }}
              >
                <span className="w-4 text-blue-300">
                  {selected && <Check className="size-3.5" aria-hidden="true" />}
                </span>
                <span className="flex-1">{tag.name}</span>
                <span className="tabular-nums text-zinc-500">{tag.count}</span>
              </DropdownItem>
            );
          })}
        </DropdownContent>
      )}
    </div>
  );
}
