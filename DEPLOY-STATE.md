# Deploy state — moved

**This is not the deploy ledger. Do not record anything here, and do not read
production facts from this file.**

This branch used to carry its own copy of `DEPLOY-STATE.md`. So did three other
branches, and an untracked file in the primary checkout. All five disagreed
about which worker was live, and four of them were confidently wrong — which is
exactly the condition that caused the 2026-07-19 production outage. They were
merged into a single ledger on 2026-07-22 and this copy was replaced by this
pointer.

This file deliberately contains **no worker version, no commit, no migration
version, and no deploy history**. A file with no facts in it cannot go stale. A
synced duplicate would drift again within days — that is precisely what
happened here.

## Where the ledger is

The authoritative copy lives on the production lineage branch
`fix/live-compare-data-remove-declared-style`. Read it without checking anything
out:

```
git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md
```

That Git object is the only canonical copy. The file at
`C:\Users\izzyh\Documents\Terraforming Mars\DEPLOY-STATE.md` is **not** a
synchronized mirror of it and is now a pointer stub too. It was left behind at
the 2026-07-22 reconciliation, no deploy session refreshed it, and the planning
pack published that stale cache until the updater was changed to read the Git
ref directly.

## If you need to record a deploy or a migration

Write it into the canonical file and commit it **on that branch**, even if your
work is on this one. Do not restore a copy here. Do not start a copy on any
other branch.

## Before you act on anything you read there

Re-derive it. The ledger is a record, not a live source — rows go stale between
the moment they are written and the moment you read them.

```
npx wrangler deployments list
```

and read the migration ledger from the live database. If reality disagrees with
the file, reality wins: act on reality and correct the file.
