# Stabilization Backlog

This backlog tracks cleanup work for making the PMZFX fork easier to operate
and safer to extend. Keep this list focused on foundation work, not gameplay
roadmap decisions.

## Triage Labels

- **Must fix before feature work**: blocks reliable development or hides real
  failures.
- **Should fix soon**: noisy, risky, or confusing, but not blocking a small
  feature.
- **Accept for now**: known issue with low immediate risk.
- **Needs investigation**: unclear impact or ownership.

## Must Fix Before Feature Work

| Item | Why It Matters | First Action | Status |
|---|---|---|---|
| Confirm GitHub Actions are enabled on the fork | CI is already defined, but pushed baseline had no visible check status through the connector. | Check the GitHub Actions tab for `PMZFX/world-of-claudecraft`; enable workflows if GitHub prompts. | External |
| Add branch protection for `main` | Prevents direct changes from bypassing the baseline checks. | Require PRs and passing CI once Actions is confirmed. | External |

## Should Fix Soon

| Item | Why It Matters | First Action | Status |
|---|---|---|---|
| Large client chunks | Large bundles slow iteration and can hurt player load time later. | Record current chunk sizes, then defer code splitting until after product direction is clearer. | Backlog |
| Local CI parity script adoption | Contributors should not have to infer the CI sequence from YAML. | Use `scripts/ci-parity.sh` before merging stabilization branches. | In progress |

## Completed

| Item | Result | Verification |
|---|---|---|
| `index.html` Meta Pixel/noscript parse warning | Moved the Meta Pixel no-script image fallback from `head` to the start of `body`, which keeps the fallback behavior while making the document valid for Vite's HTML parser. | `npm run build` passed without the parse5 `disallowed-content-in-noscript-in-head` warning. |
| Upstream analytics IDs | Removed the hardcoded Google Tag and Meta Pixel runtime snippets from the fork shell, removed the HUD Meta Pixel level-up hook, and tightened the malware scanner so analytics origins are not treated as suppressed egress by default. | `npx vitest run tests/client_shell.test.ts tests/malware_scan.test.ts`; `npm run security:gate`. |
| Cursor asset path warnings | Changed static shell cursor references from relative `./ui/cursors/...` paths to public-root `/ui/cursors/...` paths. | `npm run build` passed without unresolved cursor asset warnings. |
| Admin i18n dynamic import warnings | Removed the admin runtime import of `LOCALE_LOADERS`; the generated loaders remain as test/parity scaffolding, but the admin bundle now stays fully static as documented. | `npx vitest run tests/i18n_emit_shape.test.ts tests/i18n_admin_catalog.test.ts tests/admin_format_i18n.test.ts tests/localization_fixes.test.ts`; `npm run build` passed without ineffective admin dynamic import warnings. |
| Fresh-clone onboarding test | Cloned `git@github.com:PMZFX/world-of-claudecraft.git` into `/tmp`, installed dependencies from lockfile, and ran the full local CI parity gate from that clean checkout. | `npm ci`; `scripts/ci-parity.sh`. |

## Accept For Now

| Item | Reason | Revisit When |
|---|---|---|
| Existing Vite chunk-size warning | Build succeeds, and bundle splitting should be tied to actual UX/perf goals. | We start player-facing UI/performance work. |
| Existing malware scan non-high flags | `security:gate` passes with 0 high findings after priors. | Security-sensitive dependencies, wallet, auth, or networking code changes. |

## Needs Investigation

| Item | Question | Suggested Owner Doc |
|---|---|---|
| Upstream merge policy | How often should this fork pull from `levy-street/main`? | `docs/development/upstream-sync.md` |
| Release/deploy target | Will PMZFX deploy its own hosted instance, or stay local/private initially? | `docs/fork-notes.md` |
| Fork identity | Which branding, domain, and community links should diverge from upstream? | Future design note |

## Cleanup Branch Plan

All planned cleanup branches have been merged into `main`.

Last verified: 2026-06-23
