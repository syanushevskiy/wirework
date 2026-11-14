/**
 * The FORMAT STAMP of a stored document (doc/ADR/0017-versioning-and-upgrades.md):
 * which data format it was written in, a number per OWNER of shapes —
 * `wirework` for everything the standard packages own, `app` for what the
 * host registered, a name of its own for a third party's widget package.
 *
 *   { "versions": { "wirework": 7, "app": 3 }, "pages": { … } }
 *
 * An owner missing from the stamp is at format 1, so a document without a
 * stamp — everything stored before there were stamps — is format 1 for
 * everybody. Every stored document carries it at its root: the view models,
 * a user's overlay, a page file, a view file.
 */
import { z } from "zod";
import { KEBAB_NAME } from "../contracts/names";

/** The standard packages' own shapes. */
export const WIREWORK_OWNER = "wirework";
/** What the host registered: its kinds, actions, predicates, widget types. */
export const APP_OWNER = "app";

export const formatStampSchema = z.record(
  z.string().regex(KEBAB_NAME, "a format owner is a kebab-case name"),
  z.number().int().min(1),
);
export type FormatStamp = z.infer<typeof formatStampSchema>;
