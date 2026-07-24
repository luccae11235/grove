# Aflora operations ownership

Aflora is currently a single-owner publication. The primary operator is the
GitHub, Railway, Resend, DNS, and domain-account owner represented by GitHub
account `luccae11235`. A second operator is not assigned; that is a continuity
risk, not an unrecorded assumption.

| System | Operational responsibility | Recovery path |
| --- | --- | --- |
| GitHub | Source, CI, releases, delivery dispatch | GitHub account recovery; repository is `luccae11235/grove` |
| Railway | Web, API, PostgreSQL, deploy rollback, usage controls | Railway workspace account recovery and project dashboard |
| Resend | Sending domain, contacts, broadcasts, suppressions, webhooks | Resend account recovery; reconcile provider state after any database restore |
| Domain and DNS | `aflora.page`, API and sending records, renewal | Registrar and DNS-provider account recovery |

## Incident path

The production smoke workflow runs every six hours. A failure opens or updates
one GitHub issue labeled `production-incident`; recovery closes it
automatically. For a manually discovered incident, create the same issue and
record the start time, affected surface, last known good release SHA, and actions
taken.

Use this order:

1. stop newsletter delivery;
2. disable public signup only when API, database, CORS, consent, or audience
   policy is unsafe—the static website should remain readable;
3. identify the last verified web/API release pair;
4. prefer a forward fix, or roll both application services back to the same
   compatible commit;
5. run the exact-SHA production smoke;
6. reconcile newsletter provider and database state before sending; and
7. close the incident with cause, recovery evidence, and prevention work.

Railway currently records a $5 usage alert and a $10 hard usage limit. The hard
limit can take workloads offline; changing it is an owner financial decision.
Review usage and account-recovery access quarterly and whenever a provider or
owner changes.
