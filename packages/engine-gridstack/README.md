# @wirework/engine-gridstack

The gridstack layout engine for Wirework: a draggable, resizable grid.
Peers: `react`, `react-dom`.

```ts
import { gridstackEngine } from "@wirework/engine-gridstack";
import "@wirework/engine-gridstack/styles.css";
layoutEngines.register(gridstackEngine); // page templates use engine: "gridstack"
```

A drop or resize while editing reports placements by cell id. Exports:
`gridstackEngine`, the template and placement schemas and their types.
gridstack renders items through one library-wide callback; this engine
installs its dispatcher when the first grid mounts and leaves a grid it did
not create to whatever callback the host had set.
