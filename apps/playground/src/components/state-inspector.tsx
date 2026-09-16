/**
 * State inspector — ONLY presentation (logic in use-state-inspector).
 * Live, editable JSON view of the whole store: view models + data models.
 */
import { Alert, Button, Card, Flex, Input, Typography } from "antd";
import type { Store } from "@wirework/schema";
import { useStateInspector } from "../hooks/use-state-inspector";

export function StateInspector({ store }: { store: Store }) {
  const { text, dirty, error, edit, apply, reset } = useStateInspector(store);

  return (
    <Card
      data-testid="state-inspector"
      title="State"
      extra={
        <Typography.Text type="secondary" data-testid="state-mode">
          {dirty ? "edited — apply to commit" : "live"}
        </Typography.Text>
      }
    >
      <Flex vertical gap="small">
        <Input.TextArea
          data-testid="state-editor"
          aria-label="Store state as JSON"
          className="pg-state-editor"
          rows={24}
          spellCheck={false}
          value={text}
          onChange={(event) => edit(event.target.value)}
        />
        {error ? <Alert type="error" data-testid="state-error" title={error} /> : null}
        <Flex gap="small">
          <Button type="primary" data-testid="state-apply" disabled={!dirty} onClick={apply}>
            Apply
          </Button>
          <Button data-testid="state-reset" disabled={!dirty} onClick={reset}>
            Reset
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
