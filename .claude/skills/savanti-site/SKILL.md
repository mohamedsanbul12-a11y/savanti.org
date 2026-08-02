---
name: savanti-site
description: Workflow, conventions, and guardrails for developing, previewing, and deploying the Savanti Health marketing site (savanti.org). Use whenever working in ~/savanti-site, or when asked to update, redesign, fix, or push changes to savanti.org — treat this as the standing runbook for that site, not a one-off task.
---

# Savanti.org site work

Mohamed treats this as a standing engagement: this repo is where he goes for
anything related to savanti.org. Don't treat requests here as one-off asks —
apply the conventions below consistently across sessions, and default to
just executing the full loop (edit → verify locally → commit → push →
confirm live) without re-explaining the mechanics each time.

## What this project is

- A single static page: `~/savanti-site/index.html` is effectively the
  whole site (inline `<style>` and `<script>`, no build step, no
  framework).
- Deployed via GitHub Pages from the `main` branch. `CNAME` in the repo
  points GitHub Pages at `savanti.org`.
- Repo: `git@github.com:mohamedsanbul12-a11y/savanti.org.git`.
- Other files in the repo (`access-demo.html`, `access-desk-demo.html`,
  `savanti_prospect_tracker.xlsx`) are Mohamed's working files — **never
  `git add` or commit these**. The repo is public; the `.xlsx` is his
  prospect list and must never be pushed.

## Auth is already solved — don't re-litigate it

`git push` used to require a GitHub personal access token typed at an
interactive prompt, which doesn't work through a non-interactive Bash tool
(no TTY) and caused a lot of pain in an earlier session (wrong token
permissions, a leaked token that had to be revoked, etc.). That's fixed:

- An SSH key (`~/.ssh/id_ed25519`, comment `savanti-site-macbook`) is
  registered on GitHub with Read/write access.
- The remote is set to the SSH URL
  (`git@github.com:mohamedsanbul12-a11y/savanti.org.git`), not HTTPS.
- This means `git push` from the Bash tool just works, no prompts. If a
  future `git remote -v` ever shows an `https://` URL again, that's a
  regression — switch it back to the SSH URL rather than re-doing the
  token dance.

## Local preview

```bash
cd ~/savanti-site && python3 -m http.server 8934 &>/tmp/savanti-site-server.log &
```

Then open `http://localhost:8934` in the Browser pane (`preview_start` /
`navigate`). Check console errors, scroll through every section you
touched, and resize to ~1400px wide to see the full-bleed hero pills and
gutter decorations properly (they're hidden below 640px).

**Screenshot tool caveat**: the Browser pane's `computer` screenshot
action has occasionally returned a blank/stale frame right after a
scroll or anchor-jump in this project, even though the DOM is correct.
If a screenshot looks suspiciously blank, don't conclude the page is
broken — cross-check with `get_page_text` or `read_page`, or re-screenshot
after a short wait, before assuming something regressed.

## Deploying

1. Commit and `git push` (SSH, no prompts — see above).
2. GitHub Pages rebuilds automatically (`pages build and deployment`
   workflow). This takes roughly 30s–2min, not instant.
3. macOS's stock shell has **no `timeout` command** (that's GNU
   coreutils). Don't use `timeout ...`; poll instead:
   ```bash
   i=0; while [ $i -lt 40 ]; do
     if curl -s https://savanti.org | grep -q "<distinctive string from the new commit>"; then
       echo DEPLOYED; exit 0
     fi
     sleep 5; i=$((i+1))
   done; echo TIMED_OUT
   ```
   Run this via `run_in_background: true` so you're not blocking, and
   report back once it resolves.
4. Before declaring success, diff the live HTML against the committed
   file (`curl -s https://savanti.org/ -o /tmp/live.html && diff
   /tmp/live.html index.html`) or check for the new content directly —
   don't just trust that the push succeeded.
5. If you check the live site in the Browser pane afterward and it still
   shows old content, that's very likely browser cache, not a failed
   deploy — hard-reload (`location.reload(true)` via `javascript_tool`,
   or a fresh `curl`) before concluding anything is wrong.

## Verifying third-party integrations (Formspree, etc.) — use curl, not just the Browser pane

The Browser pane is a sandboxed preview environment. In this project, a
`fetch()` POST to a real third-party endpoint (Formspree) resolved with an
apparent success in the Browser pane's JS context, but no submission ever
reached Formspree's dashboard. Do not trust a browser-pane fetch test
alone as proof a third-party integration works end to end. To get ground
truth, hit the real endpoint directly from Bash (real network path):

```bash
curl -s -i -X POST https://formspree.io/f/<id> \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"field":"value"}'
```

Formspree's own JSON body (`{"ok":true,...}`) is the actual signal, not
just the HTTP status. Also check Formspree's **Spam** tab, not just the
main submissions list — their filter can silently accept-but-drop
submissions that look automated (e.g. addresses containing "test").

Clean up test submissions/rows you create while verifying — mention it to
Mohamed if you can't delete them yourself (e.g. Formspree dashboard
entries).

## Design system (don't touch without being asked)

- Palette — "old-money apothecary": paper `#F3F2ED` background, ink navy
  `#12213F`, brass `#A9834E`, burgundy `#7A2438`. All section backgrounds
  are the *same* paper shade now (no alternating stripes) — Mohamed
  explicitly wants one continuous shade down the page.
- Fonts: `Playfair Display` (serif, headings/logo) + `Inter` (sans, body).
  Not Fraunces — that was tried and rejected as "goofy."
- Logo/wordmark: plain text "Savanti." (no italic on the S, no separate
  icon image) — a hand-vectorized S icon was tried and rejected.
- Decorative floating pills/tablets: reusable `.hero-pills` (absolute
  `inset:0` layer) / `.hero-pill` (positioned via inline `left/top %`) /
  `.floaty` (the bob animation) classes, used in the hero *and* scattered
  through every major section so they appear throughout the scroll, not
  just at the top. Each pill/tablet is its own small inline `<svg>` — give
  it `overflow: visible` (already set globally via `.hero-pill svg`) or
  the float animation clips mid-cycle. SVG element `id`s (clipPaths etc.)
  must be unique across the *whole page*, not just per-section — check
  with `grep -oE 'id="[a-zA-Z0-9_-]+"' index.html | sort | uniq -d` after
  adding new ones.
- EKG heartbeat strip: a tiling CSS background (SVG data URI) with
  animated `background-position`, not duplicated DOM elements — that
  approach left visible gaps on wide screens.

## Copy rules — apply to every content change, not just when restated

- **No em dashes anywhere.**
- **Never call Mohamed "pharmacist."** He's a PharmD Candidate (2027),
  not yet licensed. Use "PharmD Candidate" / "behind a pharmacy counter" /
  similar, never "pharmacist" as his title.
- **No testimonials, client logos, case studies, "customers served"
  metrics, or any claim of existing clients/practices using the
  product.** There are none yet — don't invent social proof.
- The pricing hub table is explicitly labeled as worked examples, not
  live prices — keep that framing if touching that section.
- Current site framing (as of 2026-08-02) targets **independent
  specialty practices** (rheumatology/gastro/dermatology), not patients
  directly — hero and about copy were repositioned for this. Confirm
  with Mohamed before assuming this framing again if a lot of time has
  passed, since positioning has changed more than once already.

## Forms

Both the waitlist and partner forms used to be fake: `preventDefault()`,
hide form, show a canned success message, no data captured anywhere. The
waitlist form is now wired for real via Formspree — see
`submitToFormspree()` in the `<script>` block for the shared pattern
(fetch POST JSON with `Accept: application/json` to keep the inline
success UI instead of Formspree's redirect, `_gotcha` honeypot field
Formspree recognizes natively — no CAPTCHA, button disabled +
"Sending..." while in flight, `role="alert"` error focused on failure).
The partner form was still on the old fake handler as of 2026-08-02,
pending Mohamed providing a second Formspree endpoint — check
`FORMSPREE_PARTNER` in the script; if it's still `null`, wire the partner
form the same way `handleWaitlist` works before assuming it's real.
Test both the success and forced-failure paths (see verification section
above) before treating a forms change as done.
