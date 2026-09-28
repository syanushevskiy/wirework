---

### Wirework's own rules

The engine and its packages follow the presentation rules below and these
on top. Every one of them is enforced somewhere — by the compiler
(`tsconfig.base.json`), by ESLint (`eslint.config.js`), by a registry
invariant or by a test — so a reviewer checks the exception, not the rule.

#### Types and casts

- A cast is a boundary, and there is one per boundary, commented with what
  it erases: `// The one cast: the loop above builds exactly
  EventBindingsShape<E>`. `as unknown as` only where a generic zod shape is
  rebuilt from an untyped loop; never to silence a mismatch.
- No `!`. A value that may be absent is narrowed by a discriminant
  (`if (cell.problem)`) or handled (`?? fallback`); the lint rule refuses the
  assertion.
- An INPUT type — a hook's input object, a component's props — declares
  `field?: T | undefined` when a caller may forward a value it does not
  have. A RECORD — a definition, a resolved plan, a saved tree — keeps
  `field?: T` and is built with a conditional spread
  (`...(note === undefined ? {} : { note })`), so `undefined` never sits in
  it (`exactOptionalPropertyTypes`).
- antd's own prop types refuse an explicit `undefined`: a prop that may be
  absent is spread in (`{...(color === undefined ? {} : { color })}`) or
  given antd's own "unset" value (`status=""`).
- What a caller must not change is `readonly`: the arrays of a resolved
  plan and of a validation report, what a registry lists, the cells a
  layout renderer receives. What a caller builds (a fresh array, a draft) is
  mutable.

#### Errors and problems

- A configuration problem is DATA, never a throw: a cell that cannot render
  is a `CellProblem` on the plan, a boot problem a `ValidationProblem` with a
  severity, and every placeholder names what is wrong. `problemText` turns
  a validator's issues into that sentence; `errorText` any thrown value.
- What is thrown is a bug or a misuse, at the moment it is made: a
  registration that breaks an invariant (`RegistrationError`, at boot), a
  path that would silently replace a value it walks through (`setPath`), a
  contract whose settings shadow its bindings (`defineContract`). The
  message says what to fix, in the words the reader used.
- A crash inside a widget or a layout renderer is isolated by a boundary
  and REPORTED (`PageView.onError`), never swallowed. Nothing in a package
  writes to the console except the one documented default a host can
  replace (`use-commit.ts`); `no-console` is an error in `packages/**/src`.
- A reason a control is locked is a code (`AddLock`, `EditLock`,
  `EngineLock`, `OverlayLock`), and the UI says it in words: the headless
  packages carry no user-facing text.

#### Naming

- Identities are kebab-case: widget types, contract kinds, event names,
  layout-engine names (`KEBAB_NAME`); action names may carry one namespace
  (`ACTION_NAME`: `table-view/load`). A store path is dot-separated
  segments of `PATH_SEGMENT`; nothing else (`names.ts` is the one grammar).
- A hook holds ALL the logic of one component and is named for it
  (`use-widget-form.ts` → `useWidgetForm`, its component `WidgetForm`);
  files are kebab-case, React components PascalCase, the `react` adapter's
  files after their export (`PageView.tsx`, `usePort.ts`).
- A boolean says what is true (`editing`, `hasCells`, `valid`); a lock says
  why (`addLock`, `editLock`); a function says what it does
  (`resolvePage`, `bindReactions`, `commitTrees`). A test id names the
  thing (`page-save`, `widget-card`, `port-input-<port>`), never its look.
- The word for a thing is the same everywhere: a page has TEMPLATES, a
  widget has a VIEW MODEL, a user has an OVERLAY, a cell has a KEY on the
  plan and an ID in the template, a reaction SETS a path or CALLS an action.

#### Testing

- Every package under `packages/` has a `test` script and
  `scripts/check-test-scripts.mjs` fails the run when one has not. Pure
  logic is tested in vitest (node); hooks and components in jsdom with
  Testing Library (`renderHook`, `render`, `screen`), each package's
  `vitest.config.ts` naming the environment and `__tests__/setup.ts` the
  cleanup; a story is a browser test in Chromium — its `play` function is
  the assertion — and every standard contract has a conformance set any
  implementation runs.
- A test says what it pins: its name is the promise, and a test written for
  a bug starts with `regression:`. It asserts on what the contract exposes —
  roles, names, test ids, `data-*` facts, the store — never on a library's
  DOM (`support/antd.ts` is the one place the e2e suite knows antd's).
- Nothing waits by sleeping. A test waits for a FACT: an element, a store
  value, the fake servers having nothing in flight (`wirework.requests()`),
  a box that stopped moving.
- The demo's scenarios are Gherkin a non-technical reader can follow; a
  step reads like a sentence and hides the mechanics (`e2e/steps/*.steps.ts`
  by area, helpers in `e2e/support/`).

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
        <Input id="node-label" value={node.data.label} onChange={(e) => updateLabel(e.target.value)} />
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
  const { mode, setMode, undo, redo, canUndo, canRedo, zoomIn, zoomOut, fitView } = useEditorToolbar();

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
      <button onClick={() => setMode("select")} style={{ background: mode === "select" ? "#3b82f6" : "transparent" }}>
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
