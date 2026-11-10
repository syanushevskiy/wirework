/**
 * State inspector — ONLY presentation (logic in use-state-inspector). The
 * store as live, editable JSON in SECTIONS (state-sections.ts): on a demo
 * page the page's own data, the page's own views, the global settings and
 * the global session, each an editor of its own; in the builder one editor.
 */
import { Alert, Button, Card, Flex, Input, Typography } from "antd";
import type { Store } from "@wirework/schema";
import { useStateInspector } from "../hooks/use-state-inspector";
import type { StateSection } from "../state-sections";

function StateSectionEditor({ store, section }: { store: Store; section: StateSection }) {
  const { text, dirty, error, edit, apply, reset } = useStateInspector(store, section);

  return (
    <Flex vertical gap="small" data-testid="state-section" data-section={section.key}>
      <Flex justify="space-between" align="baseline" gap="small">
        <Typography.Text strong>{section.title}</Typography.Text>
        <Typography.Text type="secondary" data-testid="state-mode" data-section={section.key}>
          {dirty ? "edited — apply to commit" : "live"}
        </Typography.Text>
      </Flex>
      <Typography.Text type="secondary" className="pg-state-note">
        {section.note}
      </Typography.Text>
      <Input.TextArea
        data-testid="state-editor"
        data-section={section.key}
        aria-label={`${section.title} as JSON`}
        className="pg-state-editor"
        rows={section.rows}
        spellCheck={false}
        value={text}
        onChange={(event) => edit(event.target.value)}
      />
      {error ? <Alert type="error" data-testid="state-error" data-section={section.key} title={error} /> : null}
      <Flex gap="small">
        <Button type="primary" data-testid="state-apply" data-section={section.key} disabled={!dirty} onClick={apply}>
          Apply
        </Button>
        <Button data-testid="state-reset" data-section={section.key} disabled={!dirty} onClick={reset}>
          Reset
        </Button>
      </Flex>
    </Flex>
  );
}

export function StateInspector({ store, sections }: { store: Store; sections: readonly StateSection[] }) {
  return (
    <Card data-testid="state-inspector" title="State">
      <Flex vertical gap="large">
        {sections.map((section) => (
          <StateSectionEditor key={section.key} store={store} section={section} />
        ))}
      </Flex>
    </Card>
  );
}
