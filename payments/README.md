# Savanti payment checker

Static browser-local prototype at /payments/. No build or runtime dependencies.

## Run and test

From the repository root:

    python3 -m http.server 8936
    node --test tests/payments.test.mjs

Open http://localhost:8936/payments/.

## Scope

Synthetic or appropriately de-identified data only. No patient records, payer integrations, MFP entitlement calculation, banking verification, accounts, persistence, or billing. User-supplied expectations are compared with recorded payments; differences are investigation prompts, not amounts established as owed.

The import dialog downloads example CSV templates. Expectations require reference,date,expected_amount,drug. Payments require payment_id,reference,date,paid_amount. Extra columns are rejected. IDs must be unique per source file (payment references may repeat for split payments). Dates must be real ISO calendar dates no later than the report date. Plain USD decimal amounts with up to two fractional digits are converted to integer cents. Negative payments are allowed; negative expectations are rejected. Zero expectations represent full reversals.

Exact case-sensitive reference matching only. Open difference sums positive balances without offsetting overpayments or unlinked payments. Aging is measured from the supplied expected date, not a contractual due date. Reports include the current filter/search selection and the sample/imported indicator. Formula-like text fields are escaped for spreadsheet export.

Files stay in tab memory and are cleared on reload. Downloads persist on the user's device. The app makes no network requests for imported data, uses no external assets or local storage, and restricts connections with a content security policy. Hosting may log page requests. These design choices are not a compliance certification.

## Before a real-data pilot

Validate a specific source-system export and transaction lifecycle with a pharmacy; define the basis for expected amounts; test adjustments and duplicate-source scenarios; complete privacy/security and applicable contractual review. Do not market this prototype as production claims or MFP recovery software.
