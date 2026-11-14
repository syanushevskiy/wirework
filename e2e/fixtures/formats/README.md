# Saved documents, frozen per data format

What a user of the demo application had SAVED under each data format
(doc/ADR/0017-versioning-and-upgrades.md): `formats/<n>/saved-views.json`
is a user's own views as the application stored them at its format `n`.
`upgrades.feature` opens the application with each of them.

Never edit these files. When the application's data format changes, add a
folder for the format left behind — copy what the application stores today
— and a scenario that opens it.

Format 1: the status badge's widget type was still `run-badge`; no stamp.
