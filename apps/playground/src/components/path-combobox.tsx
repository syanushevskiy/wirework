/**
 * Store-path combobox — ONLY presentation. Autocomplete helper for binding a
 * typed input port: suggestions are existing store paths whose current value
 * is compatible with the port's declared type (computed lazily on open via
 * the `suggestions` callback). A custom path can still be typed for wiring
 * state that does not exist yet.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface PathComboboxProps {
  id: string;
  testId: string;
  value: string;
  placeholder?: string;
  /** Called when the popover opens — returns the compatible existing paths. */
  suggestions: () => string[];
  onSelect: (path: string) => void;
}

export function PathCombobox({
  id,
  testId,
  value,
  placeholder = "select a store path…",
  suggestions,
  onSelect,
}: PathComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [available, setAvailable] = useState<string[]>([]);

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setAvailable(suggestions());
      setQuery("");
    }
  };

  const pick = (path: string) => {
    onSelect(path);
    setOpen(false);
  };

  const filtered = available.filter((path) => path.includes(query.trim()));
  const custom = query.trim();
  const showCustom = custom !== "" && !filtered.includes(custom);

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          data-testid={testId}
          className="w-64 justify-start font-mono font-normal"
        >
          {value === "" ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            data-testid="path-query"
            placeholder="search or type a path…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No compatible paths.</CommandEmpty>
            <CommandGroup heading="Compatible paths">
              {filtered.map((path) => (
                <CommandItem key={path} value={path} onSelect={() => pick(path)}>
                  {path}
                </CommandItem>
              ))}
              {showCustom ? (
                <CommandItem value={custom} onSelect={() => pick(custom)}>
                  Use &quot;{custom}&quot;
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
