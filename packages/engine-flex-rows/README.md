# @wirework/engine-flex-rows

The simplest Wirework layout engine: rows of cells with a width each, no
drag or resize. A good first engine to read, and the one the engine's own
tests use. Peer: `react`.

```ts
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import "@wirework/engine-flex-rows/styles.css";
layoutEngines.register(flexRowsEngine); // page templates use engine: "flex-rows"
```

A cell's width is `full`, `auto` or a spec per breakpoint (`m-8/12 s-1/2`,
`l-1/3`): `m` is the basis, `s` applies on narrow screens and `l` on wide
ones. Exports: `flexRowsEngine`, the template schema and its types, and
`widthStyle` (the spec as the item's style — custom properties the
stylesheet's media queries apply).
