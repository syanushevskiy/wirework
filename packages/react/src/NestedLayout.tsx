/**
 * A layout INSIDE a widget (doc/ADR/0009-containers.md): what a card, a tab
 * or a panel renders as its content. Render-only: logic in useNestedLayout.
 * Nothing is editable in place — a container's content is edited where a
 * page is edited.
 */
import { PageContext } from "./PageContext";
import { useNestedLayout } from "./useNestedLayout";

export interface NestedLayoutProps {
  /** The layout (a page template), as the widget's view model holds it. */
  template: unknown;
  /**
   * Where in the view model it sits — "content" for a card; "tabs.0.content"
   * for a tabs widget's first tab. Names the layout in the user overlay and
   * the event source, so two layouts of one widget never share one.
   */
  path?: string;
}

export function NestedLayout({ template, path = "content" }: NestedLayoutProps) {
  const layout = useNestedLayout(template, path);
  if (layout.kind === "preview") {
    return (
      <div className="ww-layout-preview" data-testid="layout-preview">
        {layout.cells === 1 ? "1 widget inside" : `${layout.cells} widgets inside`}
      </div>
    );
  }
  if (layout.kind === "problem") {
    return (
      <div role="alert" className="ww-cell-problem" data-testid="layout-problem">
        {layout.message}
      </div>
    );
  }
  const { Renderer, scope } = layout;
  return (
    <PageContext value={scope}>
      <div
        className="ww-layout"
        data-testid="layout"
        data-page={scope.page}
        data-engine={layout.template.engine}
        data-nested={scope.depth}
      >
        <Renderer
          template={layout.template}
          cells={layout.cells}
          cellById={layout.cellById}
          editable={false}
          renderCell={layout.renderCell}
        />
      </div>
    </PageContext>
  );
}
