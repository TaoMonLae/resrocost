# Translation catalogs

RestroCost keeps gettext catalogs in this directory:

- `my/LC_MESSAGES/restrocost.po` — Burmese
- `mnw/LC_MESSAGES/restrocost.po` — Mon

The Mon catalog is intentionally marked `fuzzy` until a native Mon translator
reviews each string. Gettext tooling excludes fuzzy entries from compiled
catalogs, allowing the source-language text to remain visible rather than
showing unreviewed copy.

These catalogs are source assets. A gettext-compatible internationalization
layer must be configured before the application loads compiled `.mo` files at
runtime.
