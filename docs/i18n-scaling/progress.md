# progress.md - i18n Scaling

## Status table
| Phase | Status | Started | Completed |
|---|---|---|---|
| 0 - Layer rename (pre-packet) | DONE | - | (on branch `refactor/i18n-phase-naming`) |
| 1 - Foundation & split | DONE | 2026-06-16 | 2026-06-16 |
| 1 QA | DONE (PASS) | 2026-06-16 | 2026-06-16 |
| 2 - Resolved artifact | DONE | 2026-06-16 | 2026-06-16 |
| 2 QA | DONE (PASS) | 2026-06-16 | 2026-06-16 |
| 3 - Flatten overlays | DONE | 2026-06-16 | 2026-06-16 |
| 3 QA | DONE (PASS) | 2026-06-16 | 2026-06-16 |
| 4 - Dialect inheritance | DONE | 2026-06-16 | 2026-06-16 |
| 4 QA | DONE (PASS) | 2026-06-16 | 2026-06-16 |
| 5 - Status registry | NOT STARTED | | |
| 5 QA | NOT STARTED | | |
| 6 - Unlock + two-tier CI | NOT STARTED | | |
| 6 QA | NOT STARTED | | |
| 7 - Release fill tooling | NOT STARTED | | |
| 7 QA | NOT STARTED | | |
| 8 - Admin catalog | NOT STARTED | | |
| 8 QA | NOT STARTED | | |
| 9 - Pseudo-locale (optional) | NOT STARTED | | |
| 9 QA + teardown | NOT STARTED | | |

## Deliverable checklists

### Phase 1 - Foundation & monolith split
- [x] Authoritative nested `en` + `Leaves`/`TranslationKey`/`DeepPartial` machinery extracted to `src/ui/i18n.en.ts`
- [x] `src/ui/i18n.ts` is the thin runtime; ALL public exports unchanged (`t`, `tOptional`, `hasTranslation`, formatters, `getLanguage`/`setLanguage`, `supportedLanguages`, types)
- [x] Locale data split along seams into separate files (`src/ui/i18n.locales/<code>.ts`, 13 files; behavior-preserving; still nested `: typeof en`)
- [x] `scripts/i18n_resolved_hash.mjs` + committed `src/ui/i18n.resolved.sha256` baseline (`i18n:hash` npm script)
- [x] `tests/i18n_resolved_equivalence.test.ts` asserts the resolved table matches the baseline
- [x] tsc clean; full localization suite green (1239/1239); resolved table byte-identical to pre-change

Commits: `573bd5a` (extract en base + types), `20e8cca` (thin runtime + locale split), `d918244` (byte-equivalence baseline + gate).
Baseline: SHA-256 `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b`, 1,584,856 bytes (see state.md for why this differs from the doc's stale 1,583,881).

### Phase 2 - Dense resolved artifact - DONE (2026-06-16)
- [x] `scripts/i18n_build.mjs` overlays locales onto `en`, emits `src/ui/i18n.resolved.generated.ts` (nested, `: EnTranslations` = `typeof en`, do-not-edit banner)
- [x] Client imports the generated artifact through the runtime; `t`/`tOptional`/`hasTranslation`/`translationValue` repointed at the dense table. (Admin: N/A this phase - `src/admin/` is independent of `src/ui` and ships its own flat DICT; the main table is not an admin consumer, so the phase-doc "admin imports the generated artifact" line is a no-op here. Admin catalog is Phase 8.)
- [x] `i18n:build` wired into `npm run build` (before vite) + `pretest`; reproducibility `git diff --exit-code` test green (plus a tracked-file assertion so the gate is not vacuous on an untracked artifact)
- [x] Resolved table byte-identical to Phase 1 output (SHA-256 `d9db528..` unchanged)

Commits: `3f1ed8d` (build script + generated dense table + `EnTranslations` + wiring), `a92ff37` (runtime consumes the dense table), `ffb40e5` (reproducibility test).
Validation: `tsc --noEmit` clean; targeted suite 77/77 (localization_fixes + localization_coverage + server_i18n + i18n_resolved_equivalence); byte-equivalence SHA `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b` (14 locales, 1,584,856 bytes); regeneration byte-identical; `npm run build` clean (client + admin).
Bundle delta (locale data now fully inlined, losing cross-locale spread-sharing): main bundle gzip 966.77 -> 1120.64 KB (+153.9 KB, +15.9%); admin bundle unchanged. A naive repoint balloons +479.8 KB gzip because the `gameStrings` re-export dragged the full ~1 MB `i18n.en` base in alongside the inlined table; sourcing `gameStrings` from the generated `en.game` recovers ~326 KB gzip of pure duplication. The residual +154 KB is inherent to a dense table (no cross-locale sharing) plus `world_entity_i18n` entity data being inlined in the table AND still bundled for the `hud`/`entity_i18n` resolver - see state.md gotchas.

### Phase 3 - Flatten non-English locales - DONE (2026-06-16)
- [x] 13 main-table non-English locales converted to flat dotted-key overlays in `src/ui/i18n.locales/<lang>.ts` (`Record<string, string>`, 1925 keys each, dense). Produced by the one-time migration `scripts/i18n_flatten_locales.mjs`; they no longer import `i18n.en`/`world_entity_i18n` (standalone flat literals)
- [x] `en` stays nested + authoritative (`src/ui/i18n.en.ts` untouched); generator unflattens each overlay onto a deep copy of `en` and emits the byte-identical dense artifact
- [x] Overlays still dense (every key present); temporary key-completeness test passes (`tests/i18n_flat_overlay_dense.test.ts`, exact key-set vs `flatten(en)` + non-empty-string values)
- [x] Resolved table byte-identical (SHA-256 `d9db528..` unchanged; generated-file blob `90b4326..` unchanged; `git diff --exit-code` clean)
- [~] DEVIATION (deliberate, sign-off via maintainer "do whatever is best"): the two island files were NOT flattened. `world_entity_i18n.ts` is all-string but has ZERO runtime path-indexers and its non-English data is superseded by the inlined overlays (flattening it would be dead-code churn); its `.en` slice still feeds nested `en`. `talent_i18n.ts` is a SEPARATE channel (not in the byte-frozen table), read at runtime by `hud.ts`/`tTalent`, and its `localeText` has FUNCTION-valued leaves (`chooseOne`/`specDescription`/`grant`/`increase`/`reduce`) that cannot become a flat string map; `titleOverrides` is already a flat string map. Both deferred to Phase 4 (which already owns `world_entity_i18n` dialect/overlay semantics).

Commits: `refactor(i18n): flatten non-English locales to dotted-key overlays` (contract `i18n_flatten.mjs` + build overlay path + migration + 13 overlays), `test(i18n): assert flat overlays match en leaf set and stay dense`, this doc commit.
Validation: `tsc --noEmit` clean; targeted suite 31/31 (flat-overlay-dense + resolved-equivalence) and 77/77 (localization_fixes + localization_coverage + server_i18n + i18n_resolved_equivalence); full suite 1268/1268; `npm run build` (client+admin) + `build:env` + `build:server` clean; byte-equivalence SHA `d9db528..` (14 locales, 1,584,856 bytes) unchanged; regeneration byte-identical. Main bundle gzip 1120.64 KB (unchanged from Phase 2 - overlays are build-time source, not bundled).
Reviews (coverage mode, whole diff): privacy-security-review PASS (no BLOCKING/SHOULD-FIX), cross-platform-sync PASS (no BLOCKING; islands-left-nested confirmed correct), correctness review PASS (round-trip proven total in both directions vs git HEAD; could not break it). Hardening applied from review NICE-TO-HAVEs: `flatten`/`unflatten` now throw on a dotted key segment or a prefix collision (fail-loud instead of silent corruption); neither is reachable in today's data.
Type note: overlays are typed `Record<string, string>`, not `Record<TranslationKey, string>` - `TranslationKey = Leaves<typeof en, 5>` stops at depth 5, but the deepest real leaves (`entities.quests.<id>.objectives.0.label`, `entities.zones.<id>.pois.<n>.label`) are 6 segments deep, so they are not in `TranslationKey`. Key validity is enforced by the temporary completeness test + the byte gate instead.

### Phase 4 - Dialect inheritance dedup - DONE (2026-06-16)
- [x] `es_ES` overlay carries only divergences from `es` (72 keys); `fr_CA` only from `fr_FR` (37 keys); `en_CA` thin alias of `en` (3 keys: `classDetails.labels.armor`+paladin/druid lore "armour"/"defence")
- [x] Resolver applies base then dialect overlay; base declared data-driven via `DIALECT_BASE` map in `scripts/i18n_build.mjs` (`es_ES`->`es`, `fr_CA`->`fr_FR`, `en_CA`->`en`). Resolve order for a dialect: nested `en` -> base overlay -> dialect overlay; omitted keys fall through to base, then English.
- [x] `{} as WorldEntityTranslations` casts removed (`src/ui/world_entity_i18n.ts` reduced to English-only; the dead non-English datasets + `makeLocaleWorldEntities` deleted - they had zero runtime consumers after the Phase 3 inline). The equivalent `{} as TalentLocaleText` casts in `src/ui/talent_i18n.ts` `localeText` replaced by explicit dialect aliases over a `satisfies`-typed base record (no cast, no post-hoc reassignment).
- [x] Resolved table byte-identical (SHA-256 `d9db528..` unchanged; generated file regenerates byte-identical, `git diff --exit-code` clean)

Commits: `feat(i18n): add declared-base dialect overlay resolution`, `refactor(i18n): dedup es_ES/fr_CA/en_CA to divergence-only overlays`, `refactor(i18n): remove unsafe world-entity and talent dialect casts`, this doc commit.
Validation: `tsc --noEmit` clean; targeted suite 126/126 (localization_fixes + localization_coverage + server_i18n + i18n_resolved_equivalence + i18n_flat_overlay_dense + i18n_overlay_key_membership); full suite 1290/1290; `npm run build` (client+admin) + `build:env` + `build:server` clean; byte-equivalence SHA `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b` (14 locales, 1,584,856 bytes) unchanged; regeneration byte-identical. Main bundle gzip 1,120.64 KB unchanged (overlays are build-time source; the deleted world_entity non-English data was not in the client bundle).
DESIGN NOTE (world_entity keep-vs-remove): the Phase 3 handoff left `world_entity_i18n.ts` non-English data dead (overlays superseded it; `tEntity` resolves via the resolved table, not this object; zero `worldEntityText[lang]` indexers). Chose DELETE (English-only) over re-establishing it as the single source (which would reverse Phase 3's full-inline) - maintainer-confirmed. The flat overlays are now the single non-English entity-name source; `worldEntityText.en` still feeds nested `en`.
OUT OF SCOPE (untouched, deferred): talent `titleOverrides` es_ES/fr_CA full blocks left as-is (live, not byte-gated, no cast there; deduping them was not in the phase cadence); no sparseness for non-dialect locales (Phase 6); no locale registry (Phase 5); no `t()`-miss change; admin DICT untouched (Phase 8).

### Phase 5 - Status registry + scanner
- [ ] `scripts/i18n_scan.mjs` (no LLM/network) walks `en` + matcher + admin keys, computes `srcHash` (English text + sorted placeholders), writes `src/ui/i18n.status.json`
- [ ] Registry states: `translated` (with `srcHash`, `by`), `pending`, `blocked` (with `reason`)
- [ ] `COPIED_ALLOW` / `ALLOW_V07_SLASH` become generated views over the registry
- [ ] `i18n:scan` in build + `pretest`; registry reproducibility + registry-in-sync tests green
- [ ] `pending` set empty at this stage (everything still dense)

### Phase 6 - The unlock: relax types + two-tier CI
- [ ] Flat overlays relaxed to `Partial<Record<TranslationKey,string>>` (sparse legal)
- [ ] `t()` throws on untracked key in dev/test; renders English for `pending` keys on non-release builds only; release build asserts empty `pending`
- [ ] `.github/workflows/ci.yml` split by ref: PR gate (tsc on dense artifact, registry-in-sync, `s3_registered`, placeholder parity for existing) vs release gate (14-locale H3/H3b, copied-English content, `s3_localized`, empty-pending)
- [ ] S3 guard split into `s3_registered` (PR) + `s3_localized` (release); content tests moved to release tier
- [ ] Proof: English-only sample key passes PR tier; deliberately incomplete locale fails release tier

### Phase 7 - Release fill worklist + docs
- [ ] `scripts/i18n_fill_worklist.mjs` emits per-language `pending` delta (`{key, english, placeholders, siblings}`), one batch per language
- [ ] Locked-terms glossary shipped with the worklist
- [ ] Contributor + maintainer workflow documented (in `src/ui/CLAUDE.md` and/or `docs/`)
- [ ] Worklist round-trip: fill an overlay -> scan -> `pending` shrinks

### Phase 8 - Admin catalog into the model
- [ ] `src/admin/i18n.ts` brought under the overlay + registry + release-gate model (English-only admin PRs legal; 14-locale completeness gated at release)
- [ ] Hardcoded `window.alert(...)` at ~`src/admin/main.ts:401` localized
- [ ] Admin renders all 14 locales; admin build clean; non-client-consumer audit (RFC §9.7) passes

### Phase 9 - `en_XA` pseudo-locale (optional)
- [ ] Generated accent/bracket pseudo-locale over every `en` leaf, selected via `?lang=en_XA`
- [ ] Excluded from `supportedLanguages`, hreflang, and the release gate
- [ ] Surfaces hard-coded literals that never became `t()` keys

## QA-phase checklists (fixes applied, tests added, dead code removed)
Filled in by each QA session.

### Phase 1 QA - PASS (2026-06-16)
Verdict: PASS. Issues found: 6, all NICE-TO-HAVE; fixed: 0; deferred: 6. No BLOCKING or SHOULD-FIX. No source changes were needed, so no fix commit.
- Method: 1 context loader + 5 parallel read-only audits (correctness, dead-code/cleanup, privacy-security-review, cross-platform-sync, qa-checklist), all PASS, plus a test-coverage mutation proof run directly in the main loop.
- Validation matrix, all green: `tsc --noEmit`; `vitest run` of localization_fixes + localization_coverage + server_i18n + i18n_resolved_equivalence (4 files, 75 tests); byte-equivalence gate SHA `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b` (14 locales, 1,584,856 bytes); `npm run build` (client + admin).
- Mutation proof (the gate is meaningful, not vacuous): temporarily changed one inline `es` value (`nav.home` "Inicio" to "InicioQA"); the resolved SHA changed to `e2f70bc8...`, `--check` exited 1, and both equivalence tests went red. Reverted via explicit-path `git checkout`; SHA and tests green again.
- Behavior-preserving confirmed against pre-work commit `a9a1a67`: the `./i18n` public export surface is unchanged name-for-name and signature-for-signature (only additive new export `DeepPartial`); thin-runtime function bodies (t, tOptional, hasTranslation, interpolate, formatMoney/moneyParts, getLanguage/setLanguage, formatNumber/formatDateTime) are byte-identical to the monolith; `en` still nested and authoritative; 13 locales still nested `: typeof en`; `src/sim` import invariant intact (`world_entity_i18n` imports only `../sim/data`).
- Deferred NICE-TO-HAVE for later phases: (1) shared content layers + per-locale gameStrings variants + `DeepPartial` are now `export` on `i18n.en` (necessary so locale files can spread them; NOT on the public `./i18n` barrel, so the surface stays unchanged); (2) `tsconfig` `noUnusedLocals:false` will not catch a future orphaned layer import once Phase 3 churns the locale files; (3) hash script `data:`-URL import is safe but obscures parse errors and skips the module cache (dev/CI tooling only); (4) the byte-equivalence gate covers locale data only, not the runtime function/type surface (tsc covers that); (5) cosmetic `./` vs `../` worldNames import path differs between the en base and the locale files (same module).

### Phase 2 QA - PASS (2026-06-16)
Verdict: PASS. Findings across 6 lanes: 0 BLOCKING, 1 SHOULD-FIX acted on (1 new test), the rest NICE-TO-HAVE (deferred, all pre-existing or out of scope). Stopping rule (byte-equivalence / reproducibility) never tripped. Run together with Phase 4 QA in one session per the user's request to run both.
- Method: deterministic gates run in the main loop + a 12-lane coverage-mode review Workflow (6 lanes each for Phase 2 and Phase 4: correctness, test-coverage, dead-code, privacy-security-review, cross-platform-sync, qa-checklist) with adversarial verification of every BLOCKING/SHOULD-FIX finding. Plus two main-loop mutation proofs (below).
- Validation matrix, all green: `tsc --noEmit` clean; targeted suite 137/137 across the 6 prior i18n files + the 2 new tests; byte-equivalence SHA `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b` (14 locales, 1,584,856 bytes) unchanged; regenerate + `git diff --exit-code` clean (reproducible); `npm run build` (client + admin) clean (main bundle gzip 1,120.64 KB unchanged).
- Confirmed (correctness lane): all four runtime read-paths (`t`, `translationValue`, `hasTranslation`, `tOptional` in `src/ui/i18n.ts`) read the dense generated `translations` from `./i18n.resolved.generated`; no raw `i18n.locales/*` value read remains (verified the import block + each helper body). Do-not-edit banner present + manifest-style; every locale typed `: EnTranslations`. `i18n:build` wired into `npm run build` before vite and into `pretest`. Generator uses Node built-ins + esbuild (existing devDep), no new runtime dependency. Admin N/A confirmed: `src/admin/` keeps its own independent flat DICT and consumes neither the generated table nor `ui/i18n` (the phase-doc "admin imports the generated artifact" acceptance line is a verified no-op; progress.md already records this).
- Mutation proof A - byte-equivalence + reproducibility have teeth (the gates are complementary): (1) mutated one `es.ts` source value (`nav.home` -> "InicioQA_MUTATION"); `tests/i18n_resolved_equivalence.test.ts` reproducibility test went RED (regenerate -> `git diff --exit-code` non-clean). The hash test stayed green because post-Phase-2 the hash script bundles `i18n.ts`, whose per-locale exports now come from the COMMITTED generated artifact (not raw source); so the hash gates artifact->baseline while the reproducibility test gates source->artifact - together they are complete. (2) Then mutated the committed generated artifact directly (one `"Home"` -> "HomeQA"): SHA flipped `d9db528..` -> `8004e774..` and `--check` exited 1. Both restored via explicit-path `git checkout` + regen; tree clean, SHA back to `d9db528..`.
- Fix (SHOULD-FIX, commit `0d49b25`): `tests/i18n_build_gapfill.test.ts` - the Phase 2 QA packet explicitly directs the test-coverage lane to ADD build gap-fill coverage; none existed (the prior tests assert SOURCE overlay shape or the opaque byte SHA, never the deepMerge OUTPUT by representative key). New test asserts on the generated table: a leaf a sparse overlay omits is filled from English (`en_CA.nav.home` == en "Home"); a present translated leaf is preserved (`es.nav.home` == "Inicio", not English); a present divergent override is preserved (`en_CA.classDetails.labels.armor` == "Armour", not en "Armor"); and a sparse overlay resolves to the full en leaf set (dense output, no gaps). One adversarial verifier refuted this as out-of-scope ("Phase 2 QA not started"), but that is moot - the user asked to run Phase 2 QA in this session, and the packet scopes the test; a second verifier agreed the gap is real (downgraded only the severity label).
- Deferred NICE-TO-HAVE (pre-existing / out of scope, not Phase 2 regressions): (1) the `{} as typeof <layer>En` placeholder casts + sibling non-en slices in `src/ui/i18n.en.ts` shared content layers are orphaned dead code after Phase 3 made the overlays standalone full-inline - pre-existing Phase 1/2 code, already tracked as deferred cleanup in state.md (the `en` base still spreads its own `.en` slices, so the module must stay). (2) The byte-equivalence baseline can be co-rewritten with the table and still pass green - by design (the file header states it changes only in a phase that deliberately changes output; caught by review of the `.sha256` diff). (3) Per-locale value re-exports from `i18n.ts` have no downstream value-importers - kept as stable public surface per the Phase 1 decision. (4) Pre-existing em dashes in source English copy are mirrored into the generated artifact - content issue, neither introduced nor in scope for this build-tooling phase.

### Phase 3 QA - PASS (2026-06-16)
Verdict: PASS. Findings: 4, all non-blocking (0 BLOCKING, 0 SHOULD-FIX). 2 acted on (1 new test, 1 comment correction); 2 deferred (already tracked). Stopping rule (byte-equivalence) never tripped.
- Method: deterministic gates run in the main loop + a 6-agent coverage-mode review Workflow (correctness, test-coverage, dead-code, plus privacy-security-review, cross-platform-sync, qa-checklist), each reviewing the whole diff (range `ea7addb..HEAD`). Augmented with an independent per-locale adversarial verifier (own unflatten/merge, not the project's) confirming each of the 13 locales resolves byte-identical to the committed artifact.
- Validation matrix, all green: `tsc --noEmit` clean; targeted suite 120/120 across localization_fixes + localization_coverage + server_i18n + i18n_resolved_equivalence + i18n_flat_overlay_dense + the new i18n_overlay_key_membership; byte-equivalence SHA `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b` (14 locales, 1,584,856 bytes) unchanged; regenerate + `git diff --exit-code` clean (reproducible); `npm run build` (client + admin) clean.
- Adversarial per-locale verify: all 13 non-English locales have exactly 1925 keys == `Leaves(en)`, 0 extra/typo'd, 0 missing (dense), all string-valued, flat (0 object openers); `en` still nested; each resolves byte-identical to the committed `i18n.resolved.generated.ts` slice via an independent unflatten/merge.
- Fix 1 (test added, commit `2c2066f`): `tests/i18n_overlay_key_membership.test.ts` - a PERMANENT subset guard that every overlay key is a member of `Leaves(en)`, with positive teeth tests that a typo'd / invented / misspelled dotted key is flagged. Closes the "a typo'd dotted key must fail tsc OR a test" invariant in a way that survives Phase 6 (the dense exact-equality check does not - sparse overlays legally omit keys, but must still never carry a non-`en` key).
- Fix 2 (comment correction, commit `c5f6738`): `scripts/i18n_flatten_locales.mjs` header + loader comments claimed the migration was "idempotent / safe to re-run"; it is not - re-running now throws (the locale files are flat, and `flatten` rejects their dotted top-level keys by the fail-loud contract). Comments corrected to "one-shot, throws on re-run by design." No behavior change.
- Deferred (non-blocking, already tracked in state.md): (1) the non-English slices of the shared content layers in `src/ui/i18n.en.ts` (e.g. `gameStringsEs`, non-en sub-keys of `shellStrings`/`hudStrings`/...) are now orphaned (the flat overlays no longer spread them); `en` still spreads its own `.en` slices so the module must stay - removal is Phase 4+ cleanup. (2) the dense key/non-empty test does not catch a wrong-but-non-empty value, but the byte-equivalence + reproducibility gates do (and the adversarial verifier confirmed every value byte-identical), so no coverage gap ships.
- SHA note (resolved during QA): a reviewer flagged the generated file's on-disk sha256 `554a0e6c..` (2,003,477 bytes) and git blob `90b4326..` as differing from the cited `d9db528..` / 1,584,856. Confirmed NOT a discrepancy: `d9db528..` is the canonical recursive-key-sorted serialization of the 14-locale `translations` (the documented gate, `i18n_resolved_hash.mjs`); `554a0e6c`/`90b4326` are sha256 / git-blob of the formatted `.ts` FILE. All three are stable; byte-equivalence holds.
- Islands deferral confirmed CORRECT (not a QA defect): `world_entity_i18n.ts` and `talent_i18n.ts` remain nested by design (Phase 4); cross-platform-sync confirmed their nested read paths (`tTalent`, `worldEntityText`) are unaffected and no matcher/parity surface drifted.

### Phase 4 QA - PASS (2026-06-16)
Verdict: PASS. Findings across 6 lanes: 0 BLOCKING, 1 SHOULD-FIX acted on (1 new test), the rest NICE-TO-HAVE (deferred, all explicitly out of scope or pre-existing). Stopping rule (byte-equivalence drift) never tripped - the resolved table is byte-identical, so no divergence was misclassified.
- Method: shared the 12-lane coverage Workflow + adversarial verify with Phase 2 QA (above). Deterministic gates run in the main loop; the dialect invariants independently re-proven in the main loop with an esbuild-bundled adversarial check (own merge, not the project's).
- Validation matrix, all green: `tsc --noEmit` clean; targeted suite 137/137; byte-equivalence SHA `d9db528bea1c7a1e02835c4d3edb3fabcee3687aad2186608f1f1d2ac83b3b9b` (14 locales, 1,584,856 bytes) unchanged; regenerate + `git diff --exit-code` clean; `npm run build` (client + admin) clean.
- Independent dialect proof (main loop, esbuild-bundled): es_ES = 72 divergence-only overlay keys, fr_CA = 37, en_CA = 3 - ZERO equal-to-base in any of the three (divergence-only holds). Fall-through: of the keys each dialect OMITS, es_ES 1853/1853 resolve to the es base (1815 of them where es diverges from en, 0 wrongly to en); fr_CA 1888/1888 to fr_FR (1834 base-divergent, 0 to en); en_CA omits -> en (base is en). Resolver order in `scripts/i18n_build.mjs` is data-driven via `DIALECT_BASE` + base-then-dialect `deepMerge` (no scattered locale-code branching). Casts: `world_entity_i18n.ts` is English-only (no dialect `{} as` cast; only benign local builder accumulators like `const mobs = {} as MobTranslations`); `talent_i18n.ts` aliases es_ES/fr_CA via a `satisfies Record<Exclude<...>, TalentLocaleText>` base record (no cast, no reassignment). No new `as any`/`@ts-ignore`/`!` fudge introduced.
- Fix (SHOULD-FIX, commit `e20700f`): `tests/i18n_dialect_resolution.test.ts` - the Phase 4 QA packet requires a test proving (a) a dialect overlay key OVERRIDES the base and (b) an OMITTED dialect key falls through to the BASE, not en directly when the base diverges from en. Two lanes raised this and both verifiers ruled STANDS (SHOULD-FIX): no committed test pinned the resolved-table base-then-overlay semantic - only the opaque byte SHA did, so a reversed/dropped base merge would have surfaced as a hash mismatch, not a readable "expected JcJ got PvP". New test asserts on the generated table, data-driven per dialect: every overlay key wins and diverges from base; every omitted key resolves to base and (where base diverges from en, >100 such keys) never to en; plus readable anchors (`es_ES`/`fr_CA` `realmTypes.pvp` == "JcJ" not "PvP"; `en_CA.classDetails.labels.armor` == "Armour").
- Deferred NICE-TO-HAVE (explicitly out of Phase 4 scope, documented): (1) talent `titleOverrides` es_ES/fr_CA remain full duplicated blocks (live, not byte-gated, no cast there; deduping them was out of the phase cadence). (2) The same orphaned `i18n.en.ts` shared-layer non-en slices noted in Phase 2 QA - pre-existing, not Phase 4 dead code. (3) Asymmetric dialect model (talent `localeText` deduped to aliases while `titleOverrides` stays full) is a future-maintenance trap but correct today. (4) `DIALECT_BASE` restates the dialect graph at build time without a single shared source object - acceptable; world_entity is English-only now and talent owns its own aliasing.
- Timing-artifact finding dismissed (not a defect): the p4-privsec lane flagged an "uncommitted es.ts sentinel" - that was this session's mutation-proof edit observed mid-flight while it was briefly applied; it was restored (explicit-path `git checkout` + regen) and the tree was re-verified clean (SHA `d9db528..`, no sentinel, generated artifact == HEAD) before any commit.

## Notes (per phase, post-completion)
- Phase 0: pure rename, verified byte-identical resolved table (SHA-256), 73 localization tests green. Prerequisite readability step, already on the branch.
