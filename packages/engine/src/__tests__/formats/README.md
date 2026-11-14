# The frozen corpus

Documents as they were STORED under each data format
(doc/ADR/0017-versioning-and-upgrades.md): `formats/<n>/` holds what the
format-`n` shapes looked like at rest. `migrations.test.ts` reads every one
through the door (`upgradeTrees`) and then through the boot validation
against TODAY's widgets, engine and actions.

These files are never edited. A step that changes a shape adds a folder for
the format it leaves behind; a test that fails here means the step breaks
data somebody saved — fix the step, not the document.

The shapes are the test suite's own small application (a `counter` that
became a `tally`, a list engine whose `items` became `cells`): the chain in
the test is what brings them forward.
