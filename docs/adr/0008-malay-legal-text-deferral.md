# ADR-0008: Malay Legal Text Deferral

**Status:** Accepted  
**Date:** 2026-04-29  
**Decision-makers:** @jouda

## Context

The guest portal's Terms & Conditions and Privacy Policy pages contain
legally binding text. At launch the only approved text is in English.
Professional Malay translation has not yet been commissioned.

The rest of the guest portal is fully localised with `next-intl` — every
runtime string lives in `messages/en.json` and `messages/ms.json`. The
question is how to handle the legal pages in the `ms` locale.

## Decision

1. **Keep ms.json legal keys as English.** The `ms.json` entries under
   `guest.terms.*` and `guest.privacy.*` will carry the same English body
   text as `en.json`. This ensures the legal content is always rendered
   even when the user selects Malay.

2. **Add a one-line Malay disclosure banner.** Both ms.json files include
   a `legalDisclaimer` key:

   > _"Halaman ini belum diterjemahkan. Sila rujuk versi Bahasa Inggeris."_

   ("This page has not yet been translated. Please refer to the English
   version.") This banner is rendered at the top of each legal page only
   when the active locale is `ms`.

3. **Non-legal keys are fully translated.** Page titles, meta
   descriptions, section headings, back-link labels, and footer nav are
   in proper Malay.

## Consequences

- **Users see accurate legal text** at all times, avoiding liability from
  a machine-translated terms page.
- **Professional translation can be dropped in** later by replacing the
  English values in `ms.json` and removing the disclaimer — no code change
  required.
- **The i18n key structure is ready** for a full Malay translation; no
  schema migration needed.

## Alternatives Considered

| Option                            | Rejected because                              |
| --------------------------------- | --------------------------------------------- |
| Machine-translate via DeepL / GPT | Legally risky; terms must be lawyer-reviewed  |
| Hide legal pages in `ms` locale   | Breaks the T&C checkbox link, eroding trust   |
| Skip ms.json keys entirely        | Causes `next-intl` missing-key warnings in CI |
