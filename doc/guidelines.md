---

### Separating Business Logic from Presentation

Components are render-only. All state, effects, derived values and event
logic live in custom hooks. Styling uses semantic CSS classes defined in a
co-located stylesheet — no utility-class frameworks (Tailwind and the like),
no hardcoded colors/spacing in markup. Inline `style` is allowed ONLY for
values computed from data at runtime (e.g. a width coming from a view model).

#### GOOD

```tsx
// hooks/use-node-panel.ts — ALL logic lives here
export function useNodePanel(nodeId: string) {
  const { nodes, updateNode, removeNode } = useInternalFlow();
  const { sendEvent } = useMessageService();

  const node = useMemo(() => nodes.find((n) => n.id === nodeId) ?? null, [nodes, nodeId]);

  const updateLabel = useCallback(
    (label: string) => {
      updateNode(nodeId, { data: { ...node?.data, label } });
      sendEvent({ type: "NODE_UPDATED", payload: { id: nodeId, data: { label } } });
    },
    [nodeId, node, updateNode, sendEvent],
  );

  const updatePosition = useCallback(
    (position: { x: number; y: number }) => {
      updateNode(nodeId, { position });
      sendEvent({ type: "NODE_MOVED", payload: { nodeId, position } });
    },
    [nodeId, updateNode, sendEvent],
  );

  const deleteNode = useCallback(() => {
    removeNode(nodeId);
    sendEvent({ type: "NODE_DELETED", payload: { nodeId } });
  }, [nodeId, removeNode, sendEvent]);

  return { node, updateLabel, updatePosition, deleteNode };
}

// components/node-panel.tsx — ONLY presentation
// components/node-panel.css — semantic classes for this component
export function NodePanel({ nodeId }: NodePanelProps) {
  const { node, updateLabel, deleteNode } = useNodePanel(nodeId);

  if (!node) return <EmptyState message="Select a node to edit" />;

  return (
    <div className="node-panel">
      <div className="node-panel__header">
        <h3 className="node-panel__title">Node Properties</h3>
        <Button variant="ghost" size="icon" onClick={deleteNode} aria-label="Delete node">
          <Trash2 className="icon" />
        </Button>
      </div>
      <div className="node-panel__field">
        <Label htmlFor="node-label">Label</Label>
        <Input
          id="node-label"
          value={node.data.label}
          onChange={(e) => updateLabel(e.target.value)}
        />
      </div>
      <NodeTypeBadge type={node.type} />
    </div>
  );
}
```

```css
/* components/node-panel.css */
.node-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.node-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.node-panel__title {
  font-size: var(--font-size-h4);
}
.node-panel__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
```

#### GOOD — Provider with hook

```tsx
// hooks/use-theme-state.ts — ALL logic lives here
export function useThemeState(defaultTheme: string) {
  const [theme, setTheme] = useState(() => localStorage.getItem("flow-theme") || defaultTheme);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("flow-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}

// components/theme-provider.tsx — ONLY context wiring
export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  const value = useThemeState(defaultTheme);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

> **Rule:** Even providers follow the render-only principle. The component creates the context
> wrapper; all `useState`, `useEffect`, and derived values live in a custom hook.

#### BAD

```tsx
// BAD: everything in one component
export function NodePanel({ nodeId }: { nodeId: string }) {
  const [node, setNode] = useState(null);
  const { nodes } = useInternalFlow();
  const { sendEvent } = useMessageService();

  useEffect(() => {
    setNode(nodes.find((n) => n.id === nodeId) ?? null);
  }, [nodes, nodeId]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...node, data: { ...node.data, label: e.target.value } };
    setNode(updated);
    sendEvent({ type: "NODE_UPDATED", payload: { id: nodeId, data: { label: e.target.value } } });
  };

  const handleDelete = () => {
    sendEvent({ type: "NODE_DELETED", payload: { id: nodeId } });
  };

  if (!node) return <div>No node selected</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ❌ inline styles for static layout, ❌ business logic in component,
          ❌ duplicating state from context */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ fontWeight: 600 }}>Node Properties</h3>
        <button onClick={handleDelete} style={{ color: "red" }}>
          Delete
        </button>
        {/* ❌ raw <button> instead of the design-system Button, ❌ hardcoded color */}
      </div>
      <label>Label</label>
      <input value={node.data.label} onChange={handleLabelChange} />
      {/* ❌ raw <input> instead of the design-system Input, ❌ no htmlFor/id */}
    </div>
  );
}
```

#### GOOD — Editor toolbar with hook

```tsx
// hooks/use-editor-toolbar.ts
export function useEditorToolbar() {
  const { mode, setMode } = useEditor();
  const { undo, redo, canUndo, canRedo } = useHistory();
  const { zoomIn, zoomOut, fitView } = useViewport();

  return { mode, setMode, undo, redo, canUndo, canRedo, zoomIn, zoomOut, fitView };
}

// components/editor-toolbar.tsx — active state via aria-pressed + CSS,
// not conditional utility classes
export function EditorToolbar() {
  const { mode, setMode, undo, redo, canUndo, canRedo, zoomIn, zoomOut, fitView } =
    useEditorToolbar();

  return (
    <Toolbar className="editor-toolbar">
      <ToolbarButton tooltip="Select" aria-pressed={mode === "select"} onClick={() => setMode("select")}>
        <MousePointer className="icon" />
      </ToolbarButton>
      <ToolbarButton tooltip="Pan" aria-pressed={mode === "pan"} onClick={() => setMode("pan")}>
        <Hand className="icon" />
      </ToolbarButton>
      <Separator orientation="vertical" className="editor-toolbar__separator" />
      <ToolbarButton tooltip="Undo" onClick={undo} disabled={!canUndo}>
        <Undo2 className="icon" />
      </ToolbarButton>
      <ToolbarButton tooltip="Redo" onClick={redo} disabled={!canRedo}>
        <Redo2 className="icon" />
      </ToolbarButton>
      <Separator orientation="vertical" className="editor-toolbar__separator" />
      <ToolbarButton tooltip="Zoom in" onClick={zoomIn}>
        <ZoomIn className="icon" />
      </ToolbarButton>
      <ToolbarButton tooltip="Zoom out" onClick={zoomOut}>
        <ZoomOut className="icon" />
      </ToolbarButton>
      <ToolbarButton tooltip="Fit view" onClick={fitView}>
        <Maximize className="icon" />
      </ToolbarButton>
    </Toolbar>
  );
}
```

```css
/* components/editor-toolbar.css */
.editor-toolbar {
  border-bottom: 1px solid var(--color-border);
}
.editor-toolbar__separator {
  margin-inline: var(--space-xs);
  height: 1.5rem;
}
.editor-toolbar [aria-pressed="true"] .icon {
  color: var(--color-primary);
}
```

#### BAD — Toolbar with inline logic

```tsx
// BAD: all logic inlined, raw elements, hardcoded styles
export function EditorToolbar() {
  const [mode, setMode] = useState("select");
  const [history, setHistory] = useState<any[]>([]); // ❌ any
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      // ❌ complex undo logic directly in component
    }
  };

  return (
    <div style={{ display: "flex", gap: 4, padding: 8, borderBottom: "1px solid #e5e7eb" }}>
      {/* ❌ inline styles for static layout, ❌ hardcoded border color */}
      <button
        onClick={() => setMode("select")}
        style={{ background: mode === "select" ? "#3b82f6" : "transparent" }}
      >
        {/* ❌ hardcoded active color, ❌ no tooltip, ❌ raw button */}
        Select
      </button>
      <button onClick={handleUndo} disabled={historyIndex <= 0}>
        Undo
      </button>
    </div>
  );
}
```
