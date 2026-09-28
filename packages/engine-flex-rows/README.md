# @wirework/engine-flex-rows

The simplest Wirework layout engine: rows of cells with a width each, no
drag or resize. A good first engine to read, and the one the engine's own
tests use. Peer: `react`.

```ts
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import "@wirework/engine-flex-rows/styles.css";
layoutEngines.register(flexRowsEngine); // page templates use engine: "flex-rows"
```
