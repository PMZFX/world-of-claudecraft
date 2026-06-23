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
| Fresh-clone onboarding test | Verifies the fork can be recreated without hidden local state. | Clone into a temporary directory, run `npm ci`, `scripts/ci-parity.sh`, and local Docker setup notes. | Backlog |

## Should Fix Soon

| Item | Why It Matters | First Action | Status |
|---|---|---|---|
| `index.html` Meta Pixel/noscript parse warning | Vite reports invalid HTML around a `noscript` image in `head`, which can hide future HTML regressions. | Inspect the analytics block and move/reshape it in a standards-compliant way. | Backlog |
| Cursor asset path warnings | Vite cannot resolve cursor PNG references at build time. | Trace CSS references for `./ui/cursors/*.png` and decide whether paths should use `public/`, imported URLs, or CSS rewrite. | Backlog |
| Admin i18n dynamic import warnings | Locale modules are both statically and dynamically imported, defeating chunk splitting. | Inspect `src/admin/i18n.resolved.generated/index.ts` and `loaders.ts`; decide whether generator output should separate eager and lazy entry points. | Backlog |
| Large client chunks | Large bundles slow iteration and can hurt player load time later. | Record current chunk sizes, then defer code splitting until after product direction is clearer. | Backlog |
| Local CI parity script adoption | Contributors should not have to infer the CI sequence from YAML. | Use `scripts/ci-parity.sh` before merging stabilization branches. | In progress |

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
| Fork identity | Which branding, domain, analytics, and community links should diverge from upstream? | Future design note |

## Cleanup Branch Plan

1. `dev-stabilization`: backlog, verification scripts, and repo workflow setup.
2. `fix/html-analytics-noscript`: remove or correct the HTML parse warning.
3. `fix/cursor-assets`: make cursor asset paths build-clean.
4. `chore/admin-i18n-chunks`: reduce admin i18n warning noise if generator
   changes are low risk.
5. `docs/fresh-clone-onboarding`: verify and tighten setup docs from a clean
   clone.

Last verified: 2026-06-23
