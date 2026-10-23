# Rhetorical Effect Lab

An evidence coach for AP English Language students at Scheck Hillel Community School. Students introduce a quotation, quote at least three words, attribute it, and write two sentences of analysis. The page scores the paragraph 0 to 4 on the AP rubric's Row B (Evidence and Commentary) and marks up the writing live: green for the required phrase "this [noun] produces the rhetorical effect of," blue for named rhetorical choices, pink for announcing instead of arguing.

**Live page:** https://brentrobida-oss.github.io/rhetorical-effect-lab/

## What it checks

- Quote of at least 3 words (3 to 5 is the sweet spot; over 25 caps the score at 2)
- Two full sentences of analysis (10 or more words each; 14 or more each and 40 total for a 4)
- The phrase "this [noun] produces the rhetorical effect of," followed by a named effect
- A noun after every "This" (a bare "This produces" caps the score at 2)
- A named rhetorical choice (four or more reads as a device list)
- A finished reason after "because," "which," or "so that"
- A tie to the writer's purpose or the audience
- A return to the quoted words (required for a 4)
- No announcing phrases: "this quote shows," "uses X to show," "this is an example of," wrap-ups
- No pasting the built-in examples (scores 0)

Drafts stay in the student's own browser. Nothing a student types is sent anywhere. A GoatCounter visit counter records only that the page was opened, so the teacher can see whether the class used it (dashboard: https://brentrobida.goatcounter.com). The coach reads patterns, not meaning; the teacher's grade is final.

## Files

- `index.html`: the page (vanilla JS, no build step, no backend)
- `coach.js`: the scoring logic, a pure module with no DOM
- `coach.test.js`: 24 tests, `node --test coach.test.js`

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.
