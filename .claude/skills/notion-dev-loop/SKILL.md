---
name: notion-dev-loop
description: Pick up one task from the Notion "Tâches" board (status "à développer"), implement it end-to-end, open a PR, and update the board. Meant to be run repeatedly (e.g. via `/loop 2m /notion-dev-loop`).
---

# Notion dev loop

One iteration = at most one task. Do not loop internally — the recurrence comes from whatever invoked this skill (typically `/loop`).

Data source: `collection://2d2c7034-fa0c-810a-8859-000b5cf54c52` (database "Tâches" in the `assistant-urbanisme` Notion workspace).

Schema reminder: `Status` (one of `Nouveau`, `à prioriser`, `à développer`, `En cours`, `à merger`, `à tester`, `Terminé`), `Priority` (`prio forte`/`prio moyenne`/`prio faible`), `Type de tâche`, `Project name` (title).

## 1. Pick a task

Query with `notion-query-data-sources` (SQL mode) for rows where `Status = 'à développer'`, ordered by `Priority` (`prio forte` first) then `createdTime` ascending. Take the first row.

If there are none: stop. Nothing else to do this iteration.

## 2. Claim it

- `notion-update-page`: set `Status` to `En cours` on the picked task, immediately, before doing any work — this is what prevents two iterations from picking the same task.
- `notion-fetch` the task's page to read its full content (the "Project name" title alone is rarely enough — the description/acceptance criteria live in the page body and possibly in comments; check `notion-get-comments` too).

## 3. Isolate and implement

- Use `EnterWorktree` to isolate the work (name it after the task, e.g. a short slug of the title).
- Read enough of the surrounding code to follow existing conventions (backend is NestJS under `backend/`, frontend is Next.js under `frontend/`). Don't introduce new patterns where an existing one already covers the case.
- Implement only what the task describes. If the task is ambiguous or clearly needs information that isn't in the page/comments, treat it as a failure (see §5) rather than guessing broadly.
- Before committing, run the relevant checks for whatever you touched:
  - backend: `npm run lint` and `npm run test` in `backend/`
  - frontend: `npm run lint` and `npm run build` in `frontend/`

## 4. Ship it

- Commit with a concise, descriptive message in the same style as the repo's existing history (lowercase, imperative, no fluff — check `git log --oneline -10` if unsure).
- Push the branch and open a PR with `gh pr create` — **ready for review, not `--draft`** (this was an explicit choice; the human wants these visible as normal PRs, not hidden as drafts).
- Note the PR URL.

## 5. Update the board

**On success:**
- `notion-update-page`: set `Status` to `à merger`.
- `notion-create-comment` on the task page: a short description of what was implemented, plus the PR URL.

**On failure / can't cleanly finish** (ambiguous spec, blocked on something, tests won't pass, etc.):
- `notion-update-page`: set `Status` back to `à développer` (not left in `En cours`) so it's clearly unstarted again.
- `notion-create-comment` explaining precisely what's blocking it or what clarification is needed.
- Don't open a PR for incomplete/broken work.

Either way, clean up the worktree (`ExitWorktree`) once the branch is pushed (or once you've given up on it).
