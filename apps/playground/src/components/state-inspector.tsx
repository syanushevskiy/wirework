/**
 * State inspector — ONLY presentation (logic in use-state-inspector).
 * Live, editable JSON view of the whole store: view models + data models.
 */
import type { Store } from "@wirework/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useStateInspector } from "../hooks/use-state-inspector";

export function StateInspector({ store }: { store: Store }) {
  const { text, dirty, error, edit, apply, reset } = useStateInspector(store);

  return (
    <Card data-testid="state-inspector" className="self-start">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          State
          <span
            data-testid="state-mode"
            className="text-xs font-normal text-muted-foreground"
          >
            {dirty ? "edited — apply to commit" : "live"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Textarea
          data-testid="state-editor"
          aria-label="Store state as JSON"
          className="h-[36rem] resize-y font-mono text-xs leading-snug"
          spellCheck={false}
          value={text}
          onChange={(event) => edit(event.target.value)}
        />
        {error ? (
          <p role="alert" data-testid="state-error" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" data-testid="state-apply" disabled={!dirty} onClick={apply}>
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="state-reset"
            disabled={!dirty}
            onClick={reset}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
