/**
 * Collapsible card — ONLY presentation. Radix Collapsible owns the open
 * state (uncontrolled, CLOSED by default); the header stays visible with a
 * summary so a collapsed panel still says what it holds.
 */
import type { ReactNode } from "react";
import { Collapsible } from "radix-ui";
import { ChevronRightIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CollapsibleCardProps {
  /** Test-id root: `panel-<id>` on the card, `panel-<id>-toggle` on the header. */
  id: string;
  title: string;
  /** Shown in the header even when collapsed (counts, status). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleCard({ id, title, summary, defaultOpen = false, children }: CollapsibleCardProps) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} asChild>
      <Card data-testid={`panel-${id}`} className="self-start">
        <CardHeader>
          <Collapsible.Trigger asChild>
            <button
              type="button"
              data-testid={`panel-${id}-toggle`}
              className="group flex w-full items-center justify-between gap-2 text-left"
            >
              <CardTitle className="flex items-center gap-2">
                <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]:rotate-90" />
                {title}
              </CardTitle>
              {summary ? (
                <span className="text-xs font-normal text-muted-foreground">{summary}</span>
              ) : null}
            </button>
          </Collapsible.Trigger>
        </CardHeader>
        <Collapsible.Content>
          <CardContent className="grid gap-2">{children}</CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  );
}
