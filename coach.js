/* Rhetorical Effect Lab: scoring logic.
   Pure functions, no DOM. Loaded by index.html (window.Coach) and by coach.test.js (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Coach = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EFFECT_RE = /\bproduces?\s+the\s+rhetorical\s+effect\b/i;

  // Depth thresholds. Level 3 needs every sentence at MIN_WORDS; level 4 needs DEEP_WORDS each and DEEP_TOTAL overall.
  const MIN_WORDS = 10;
  const DEEP_WORDS = 14;
  const DEEP_TOTAL = 40;

  const EXAMPLES = {
    strong: {
      author: 'Frederick Douglass', title: 'What to the Slave Is the Fourth of July?', cite: '',
      intro: 'Turning the holiday against the celebrating crowd, Douglass tells them the Fourth of July is',
      quote: 'yours, not mine',
      analysis: 'Douglass’s antithesis splits one sentence into two owners, and this split produces the rhetorical effect of making the audience feel an ownership they have never had to notice, because the pronoun “yours” turns celebrants into the accused. The blunt monosyllables refuse the ornate patriotism of the occasion, so that the listeners’ comfort becomes the evidence for Douglass’s argument that the holiday is a hypocrisy.',
    },
    weak: {
      author: 'Frederick Douglass', title: 'What to the Slave Is the Fourth of July?', cite: '',
      intro: 'In his speech Douglass says the Fourth of July is',
      quote: 'yours, not mine',
      analysis: 'This quote shows that Douglass is upset about slavery. He uses antithesis to show the difference between him and the audience.',
    },
  };

  // Rhetorical choices a student might name. Each matches the word and its inflections.
  const CHOICE_TERMS = [
    'diction', 'syntax', 'juxtaposition', 'repetition', 'anaphora', 'epistrophe', 'imagery',
    'metaphor', 'simile', 'allusion', 'tone', 'irony', 'parallelism', 'antithesis',
    'rhetorical question', 'hyperbole', 'understatement', 'anecdote', 'concession',
    'qualification', 'pronoun', 'monosyllab', 'polysyndeton', 'asyndeton', 'apostrophe',
    'personification', 'analogy', 'ethos', 'pathos', 'logos', 'cumulative sentence',
    'periodic sentence', 'fragment', 'contrast', 'shift', 'connotation', 'euphemism',
    'paradox', 'satire', 'sarcasm', 'alliteration', 'symbol', 'motif', 'statistic',
    'counterargument', 'refutation', 'epithet', 'sentence length', 'punctuation',
    'capitalization', 'italics', 'appeal to', 'exclamation', 'question', 'list', 'detail',
    'verb', 'adjective', 'noun', 'rhythm', 'pacing', 'second person', 'first person',
    'inversion', 'enumeration', 'litotes', 'chiasmus', 'zeugma', 'oxymoron', 'synecdoche',
    'metonymy', 'pun', 'aphorism', 'clause', 'colon', 'semicolon', 'dash', 'italic',
  ];
  // Short device names match exactly (plus a plural), or "list" would match "listeners" and "pun" would match "punctuation".
  const EXACT_TERMS = new Set(['list', 'pun', 'colon', 'dash', 'verb', 'noun', 'clause', 'detail', 'question', 'shift', 'symbol']);
  const CHOICE_RES = CHOICE_TERMS.map(t => ({
    term: t,
    re: new RegExp('\\b' + t.replace(/ /g, '\\s+') + (EXACT_TERMS.has(t) ? '(s|es)?\\b' : '\\w*'), 'i'),
  }));

  // Words that carry reasoning: cause, consequence, and the verbs of positioning an audience.
  const REASONING_RES = [
    /\bbecause\b/i, /\bwhich\b/i, /\bso that\b/i, /\bin order to\b/i, /\bthereby\b/i,
    /\btherefore\b/i, /\bthus\b/i, /\bsince\b/i, /\bas a result\b/i, /\bforc(es|ing|ed)\b/i,
    /\binvit(es|ing|ed)\b/i, /\bcompel(s|ling|led)\b/i, /\bposition(s|ing|ed)\b/i,
    /\bcast(s|ing)\b/i, /\bfram(es|ing|ed)\b/i, /\bimpl(ies|ying|ied)\b/i,
    /\bsuggest(s|ing|ed)\b/i, /\bexpos(es|ing|ed)\b/i, /\bturn(s|ing|ed)\b/i,
    /\bpressur(es|ing|ed)\b/i, /\brefus(es|ing|ed)\b/i, /\bundercut(s|ting)\b/i,
    /\bdemand(s|ing|ed)\b/i, /\bdenies\b/i, /\bdeny(ing)?\b/i, /\bprevent(s|ing|ed)\b/i,
    /\ballow(s|ing|ed)\b/i, /\bso\b/i,
  ];
  // Connectives that promise a clause. If the promise is not kept (fewer than 4 words follow), the reason is unfinished.
  const CONNECTIVE_RE = /\b(because|which|so that|since|in order to|thereby|therefore|thus)\b/gi;

  const PURPOSE_RE = /\b(purpose|argument|argues?|arguing|claims?|message|thesis|persuad\w*|convinc\w*|warrant|point|case against|case for|indictment|accus\w*)\b/i;
  const AUDIENCE_RE = /\b(audience|readers?|listeners?|crowd|viewers?|public|congregation|jury|voters?|celebrants|onlookers|hearers)\b/i;
  const APPEAL_RE = /\b(ethos|pathos|logos)\b/i;

  // "This" followed by a verb, adverb, or modal is a bare demonstrative: the noun is missing.
  const BARE_THIS_RE = /\bthis(?=[,.;:!?)]|\s+(produces?|shows?|is|was|means|makes?|creates?|forces?|demonstrates?|suggests?|reveals?|causes?|allows?|gives?|helps?|lets?|has|does|becomes?|proves?|highlights?|illustrates?|emphasizes?|conveys?|implies?|leads?|serves?|works?|adds?|builds?|sets?|puts?|turns?|leaves?|positions?|invites?|compels?|pushes?|pulls?|draws?|establishes?|evokes?|appeals?|also|then|in turn|ultimately|further|thus|therefore|not only|can|could|would|should|will|may|might|might|develops?|strengthens?|supports?|reinforces?|connects?|contrasts?|signals?|marks?)\b)/gi;

  // Announcing moves. "major" ones cap the score; "minor" ones are nudges.
  const ANNOUNCE_RULES = [
    {
      id: 'quote-label', weight: 'major',
      re: /\b(this|that) (quote|quotation|evidence|example|statement|piece of evidence|passage|line|excerpt|sentence|phrase)\b|\bthe (quote|quotation)\b/gi,
      label: 'Names the quote instead of its work',
      fix: 'Open with the writer and the choice: "Douglass\'s antithesis splits the sentence..."',
    },
    {
      id: 'shows-that', weight: 'major',
      re: /\b(shows|proves|demonstrates|illustrates|highlights|displays|portrays|is saying|is trying to say|is showing|is telling)\b(?=\s+\w)/gi,
      label: '"Shows that" announces; it does not argue',
      fix: 'Replace with cause and effect: "...and this [noun] produces the rhetorical effect of ___ because ___."',
    },
    {
      id: 'uses-to-show', weight: 'major',
      re: /\b(uses|utilizes|employs|incorporates|applies)\b[^.!?]{0,40}?\bto (show|prove|demonstrate|illustrate|highlight|display|portray|get|make|emphasize)\b/gi,
      label: '"Uses X to show Y" is a label, not an argument',
      fix: 'Keep the choice, drop "to show": "The antithesis splits the sentence into two owners, and this split produces..."',
    },
    {
      id: 'example-of', weight: 'major',
      re: /\bthis is (an?|the) (great |good |strong |clear |perfect |powerful |prime )?(example|instance|use|case) of\b/gi,
      label: 'Points at the example instead of reading it',
      fix: 'Cut the pointer. Begin with what the words do.',
    },
    {
      id: 'wrapup', weight: 'major',
      re: /\b(in conclusion|overall|in summary|to sum up|all in all)\b/gi,
      label: 'Wrap-up announcement',
      fix: 'Two sentences of analysis need no closing announcement.',
    },
    {
      id: 'hollow', weight: 'minor',
      re: /\b(as you can see|clearly|obviously|it is clear that|it is obvious that|undoubtedly|without a doubt)\b/gi,
      label: 'Hollow certainty',
      fix: 'Delete the word and supply the reason that would have earned it.',
    },
    {
      id: 'filler', weight: 'minor',
      re: /\b(very|really|extremely|a lot|so much|kind of|sort of)\b/gi,
      label: 'Filler intensifier',
      fix: 'Replace it with a precise word or a reason.',
    },
    {
      id: 'vague-feel', weight: 'minor',
      re: /\bmakes? the (reader|readers|audience|listener|listeners) (feel|think|want|see|understand|realize)\b/gi,
      label: 'Vague effect',
      fix: 'Name the exact feeling or realization, then say why these words cause it.',
    },
    {
      id: 'author-generic', weight: 'minor',
      re: /\bthe (author|writer|speaker)\b/gi,
      label: 'Generic "the author"',
      fix: 'Use the writer\'s last name.',
    },
  ];

  const LEVELS = [
    { n: 0, title: 'Restates', desc: 'Repeats the quote, copies the example, or offers no analysis. (Row B: 0)' },
    { n: 1, title: 'Summarizes', desc: 'Evidence is present but the commentary summarizes, announces, or fills in blanks instead of explaining how the words work. (Row B: 1)' },
    { n: 2, title: 'Explains some', desc: 'Specific evidence, some explanation, but the line of reasoning is incomplete, thin, or interrupted by announcing. (Row B: 2)' },
    { n: 3, title: 'Argues a line of reasoning', desc: 'Specific evidence, two full sentences, and one rhetorical choice explained through its named effect on purpose or audience. (Row B: 3)' },
    { n: 4, title: 'Argues with multiple choices', desc: 'Consistently explains how the evidence supports the reasoning and how more than one choice contributes to the writer\'s purpose, returning to the quoted words. (Row B: 4)' },
  ];

  function words(text) {
    return String(text || '').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  }

  function splitSentences(text) {
    const guarded = String(text || '').replace(/\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|etc|e\.g|i\.e|No)\./gi, m => m.replace(/\./g, '§'));
    return guarded
      .split(/(?<=[.!?]["”’')\]]*)\s+/)
      .map(s => s.replace(/§/g, '.').trim())
      .filter(s => words(s).length >= 3);
  }

  function collect(text, re) {
    const out = [];
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = global.exec(text)) !== null) {
      if (m[0].length === 0) { global.lastIndex++; continue; }
      out.push({ index: m.index, length: m[0].length, text: m[0] });
    }
    return out;
  }

  // Words after `index` up to the next clause boundary (punctuation or a connective).
  function clauseWordsAfter(text, index) {
    const rest = text.slice(index);
    const cut = rest.search(/[,.;:!?]|\b(because|which|so that|since|in order to|thereby|therefore|thus)\b/i);
    return words(cut === -1 ? rest : rest.slice(0, cut)).length;
  }

  // Content words only (4+ letters), so shared function words do not count as shared writing.
  function contentWords(text) {
    return new Set(words(String(text).toLowerCase()).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(w => w.length > 3));
  }
  // Jaccard similarity of content words: 1 means the same words, 0 means none shared.
  function overlap(a, b) {
    const A = contentWords(a), B = contentWords(b);
    if (!A.size || !B.size) return 0;
    let shared = 0;
    for (const w of A) if (B.has(w)) shared++;
    return shared / (A.size + B.size - shared);
  }

  function lastName(author) {
    const parts = words(author);
    return parts.length ? parts[parts.length - 1].replace(/[,.]+$/, '') : '';
  }

  function citation(d) {
    const name = lastName(d.author);
    const loc = String(d.cite || '').trim();
    return [name, loc].filter(Boolean).join(' ');
  }

  function buildParagraph(d) {
    const intro = String(d.intro || '').trim();
    const quote = String(d.quote || '').trim().replace(/^["“”]+|["“”]+$/g, '');
    const cite = citation(d);
    const analysis = String(d.analysis || '').trim();
    const evidence = [intro, quote ? '“' + quote + '”' : '', cite ? '(' + cite + ').' : (quote ? '.' : '')]
      .filter(Boolean).join(' ').replace(/” \./, '”.');
    return [evidence, analysis].filter(Boolean).join(' ');
  }

  function analyze(d, opts) {
    opts = opts || {};
    const quote = String(d.quote || '').trim();
    const analysis = String(d.analysis || '').trim();
    const intro = String(d.intro || '').trim();
    const author = lastName(d.author);

    const quoteWords = words(quote).length;
    const quoteStatus = quoteWords === 0 ? 'empty' : quoteWords < 3 ? 'short' : quoteWords <= 5 ? 'ideal' : quoteWords <= 25 ? 'long' : 'toolong';
    const quoteOK = quoteWords >= 3;

    const sentences = splitSentences(analysis);
    const sentenceCount = sentences.length;
    const sentenceLengths = sentences.map(s => words(s).length);
    const analysisWords = words(analysis).length;
    const thinSentences = sentenceLengths.filter(n => n < MIN_WORDS).length;
    const deep = sentenceCount >= 2 && sentenceLengths.every(n => n >= DEEP_WORDS) && analysisWords >= DEEP_TOTAL;

    const effectMatches = collect(analysis, EFFECT_RE);
    const hasEffect = effectMatches.length > 0;
    // The phrase must be finished: "of" plus at least three words before the next clause boundary.
    const effectNamed = effectMatches.some(m => {
      const after = analysis.slice(m.index + m.length);
      const of = after.match(/^\s+of\b/i);
      return Boolean(of) && clauseWordsAfter(analysis, m.index + m.length + of[0].length) >= 3;
    });

    const choiceMatches = [];
    const choices = [];
    for (const c of CHOICE_RES) {
      const hits = collect(analysis, c.re);
      if (hits.length) { choices.push(c.term); choiceMatches.push(...hits); }
    }

    let reasoning = 0;
    for (const re of REASONING_RES) if (re.test(analysis)) reasoning++;
    const connectives = collect(analysis, CONNECTIVE_RE);
    const finishedConnectives = connectives.filter(c => clauseWordsAfter(analysis, c.index + c.length) >= 4);
    const reasonFinished = connectives.length ? finishedConnectives.length > 0 : reasoning > 0;

    const purpose = PURPOSE_RE.test(analysis);
    const audience = AUDIENCE_RE.test(analysis);

    const quoteContent = words(quote).map(w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')).filter(w => w.length > 3);
    const analysisLower = analysis.toLowerCase();
    const echo = quoteContent.length === 0 || quoteContent.some(w => new RegExp('\\b' + w + '\\b').test(analysisLower)) || /[“"][^”"]{2,}[”"]/.test(analysis);
    const restates = quoteContent.length > 0 && quoteContent.every(w => analysisLower.includes(w)) && reasoning === 0 && !hasEffect;

    const flags = [];
    for (const rule of ANNOUNCE_RULES) {
      const matches = collect(analysis, rule.re);
      if (!matches.length) continue;
      if (rule.id === 'author-generic' && !author) continue;
      flags.push({ id: rule.id, kind: 'announce', weight: rule.weight, label: rule.label, fix: rule.fix, matches });
    }
    if (APPEAL_RE.test(analysis) && reasoning === 0 && !hasEffect) {
      flags.push({
        id: 'appeal-only', kind: 'announce', weight: 'major',
        label: 'Names an appeal without explaining it',
        fix: 'Ethos, pathos, logos are labels. Say what the words do to the audience and why.',
        matches: collect(analysis, APPEAL_RE),
      });
    }

    // Precision and depth rules: these are what stop a paragraph from being assembled rather than written.
    const bareThis = collect(analysis, BARE_THIS_RE);
    if (bareThis.length) {
      flags.push({ id: 'bare-this', kind: 'precision', weight: 'major', label: 'Bare "This"', fix: 'Add the noun: "This split produces...", "This pronoun forces..." A reader must know what "this" is.', matches: bareThis });
    }
    if (hasEffect && !effectNamed) {
      flags.push({ id: 'effect-empty', kind: 'depth', weight: 'major', label: 'Effect not named', fix: 'Finish the phrase: "...the rhetorical effect of [what it does to the audience]," at least three words before the next comma.', matches: effectMatches });
    }
    if (connectives.length && !finishedConnectives.length) {
      flags.push({ id: 'reason-empty', kind: 'depth', weight: 'major', label: 'Unfinished reason', fix: 'After "because" or "which," give a full clause: who does what to whom.', matches: connectives });
    }
    if (analysisWords >= 8 && thinSentences) {
      const idx = sentenceLengths.findIndex(n => n < MIN_WORDS);
      flags.push({ id: 'thin', kind: 'depth', weight: 'major', label: 'Thin sentence', fix: 'A sentence of deep analysis carries a choice, an effect, and a reason. Sentence ' + (idx + 1) + ' has ' + sentenceLengths[idx] + ' words; it needs at least ' + MIN_WORDS + '.', matches: [] });
    }
    if (choices.length >= 4) {
      flags.push({ id: 'stuffing', kind: 'depth', weight: 'major', label: 'Device list', fix: 'Naming ' + choices.length + ' devices in two sentences is listing, not analyzing. Choose two and explain what each does.', matches: choiceMatches });
    }
    if (sentenceCount >= 2 && overlap(sentences[0], sentences[1]) >= 0.6) {
      flags.push({ id: 'duplicate', kind: 'depth', weight: 'major', label: 'Second sentence repeats the first', fix: 'Sentence two should add a new move: a second choice, or what the effect does for the writer\'s purpose.', matches: [] });
    }
    const exampleCopy = !opts.isExample && analysisWords >= 8 && Object.values(EXAMPLES).some(ex => overlap(ex.analysis, analysis) >= 0.5);
    if (exampleCopy) {
      flags.push({ id: 'example-copy', kind: 'precision', weight: 'major', label: 'That is the example, not your writing', fix: 'Press "Start mine" and write your own two sentences about your own quote.', matches: [] });
    }
    if (author && analysisWords >= 8 && !new RegExp('\\b' + author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(analysis)) {
      flags.push({ id: 'no-name', kind: 'precision', weight: 'minor', label: 'Never names the writer', fix: 'Say ' + author + '’s name at least once; agency belongs to the writer.', matches: [] });
    }

    const count = (pred) => flags.filter(pred).reduce((n, f) => n + Math.max(1, f.matches.length), 0);
    const major = count(f => f.weight === 'major');
    const minor = count(f => f.weight === 'minor');
    const announcing = count(f => f.kind === 'announce' && f.weight === 'major');

    let score;
    const explains = effectNamed || (reasonFinished && reasoning > 0);
    if (!quoteOK || analysisWords < 8 || restates || exampleCopy) score = 0;
    else if (!explains) score = 1;
    else if (major > 0 || sentenceCount < 2 || choices.length === 0 || !hasEffect || !effectNamed) score = 2;
    else if (!(purpose || audience) || reasoning < 1) score = 2;
    else score = (choices.length >= 2 && reasoning >= 2 && purpose && audience && minor === 0 && echo && deep) ? 4 : 3;
    if (quoteStatus === 'toolong') score = Math.min(score, 2);

    const checks = [
      { id: 'quote', ok: quoteOK && quoteStatus !== 'toolong', text: quoteOK ? (quoteStatus === 'toolong' ? 'Quote is over 25 words; keep only the words doing the work' : 'Quote has ' + quoteWords + ' words') : 'Quote at least 3 words' },
      { id: 'sentences', ok: sentenceCount >= 2 && !thinSentences, text: sentenceCount < 2 ? 'Two full sentences of analysis (you have ' + sentenceCount + ')' : thinSentences ? 'Two full sentences (one is under ' + MIN_WORDS + ' words)' : sentenceCount === 2 ? 'Two full sentences of analysis' : 'Two full sentences (you have ' + sentenceCount + '; trim)' },
      { id: 'effect', ok: hasEffect && effectNamed, text: !hasEffect ? 'Use the phrase "this [noun] produces the rhetorical effect of"' : effectNamed ? 'Names the rhetorical effect' : 'Finish the phrase: "the rhetorical effect of ___"' },
      { id: 'this', ok: bareThis.length === 0, text: bareThis.length ? 'Add a noun after "This" (' + bareThis.length + ' bare)' : 'Every "This" names its noun' },
      { id: 'choice', ok: choices.length > 0 && choices.length < 4, text: choices.length === 0 ? 'Name the rhetorical choice (diction, antithesis, syntax...)' : choices.length >= 4 ? 'Names ' + choices.length + ' devices; choose two' : 'Names a choice: ' + choices.slice(0, 3).join(', ') },
      { id: 'reason', ok: reasoning > 0 && reasonFinished, text: reasoning === 0 ? 'Give the reason: because, which, so that...' : reasonFinished ? 'Gives a finished reason (' + reasoning + ' reasoning move' + (reasoning === 1 ? '' : 's') + ')' : 'Finish the reason after "because"' },
      { id: 'link', ok: purpose || audience, text: (purpose || audience) ? 'Ties the effect to ' + [purpose ? 'purpose' : '', audience ? 'audience' : ''].filter(Boolean).join(' and ') : 'Tie the effect to the writer\'s purpose or the audience' },
      { id: 'echo', ok: echo, text: echo ? 'Returns to the quoted words' : 'Return to the quoted words (repeat one or two of them)' },
      { id: 'announce', ok: announcing === 0, text: announcing === 0 ? 'No announcing phrases' : announcing + ' announcing phrase' + (announcing === 1 ? '' : 's') + ' to rewrite' },
    ];

    let next = '';
    if (score === 4) next = 'Level 4. Now read it aloud: every clause should earn its place.';
    else if (score === 3) {
      const missing = [];
      if (choices.length < 2) missing.push('name a second choice');
      if (reasoning < 2) missing.push('add a second reason');
      if (!(purpose && audience)) missing.push('connect the effect to both purpose and audience');
      if (!echo) missing.push('return to the quoted words');
      if (!deep) missing.push('give each sentence at least ' + DEEP_WORDS + ' words (' + DEEP_TOTAL + ' total)');
      if (minor > 0) missing.push('clear the nudges');
      next = 'To reach 4: ' + missing.join('; ') + '.';
    } else {
      const failing = (exampleCopy ? checks.find(c => c.id === 'quote') && null : null)
        || (announcing > 0 ? checks.find(c => c.id === 'announce') : null)
        || (bareThis.length ? checks.find(c => c.id === 'this') : null)
        || checks.find(c => !c.ok);
      if (exampleCopy) next = 'Next: press "Start mine" and write your own two sentences.';
      else if (failing && failing.id === 'announce') next = 'Next: rewrite the announcing phrase' + (announcing === 1 ? '' : 's') + ' below as cause and effect.';
      else if (failing && failing.id === 'this') next = 'Next: put a noun after "This" so the reader knows what produces the effect.';
      else if (failing) next = 'Next: ' + failing.text.charAt(0).toLowerCase() + failing.text.slice(1);
      else next = 'Next: deepen the reasoning so each sentence carries a choice, an effect, and a reason.';
    }

    return {
      quoteWords, quoteStatus, quoteOK,
      sentences, sentenceCount, sentenceLengths, analysisWords, thinSentences, deep,
      hasEffect, effectNamed, effectMatches, choices, choiceMatches, reasoning, reasonFinished, purpose, audience, echo,
      flags, major, minor, announcing, bareThis: bareThis.length, restates, exampleCopy,
      score, level: LEVELS[score], checks, next,
      paragraph: buildParagraph(d), intro, author,
    };
  }

  return { analyze, buildParagraph, splitSentences, words, citation, lastName, overlap, LEVELS, EXAMPLES, EFFECT_RE, MIN_WORDS, DEEP_WORDS, DEEP_TOTAL };
});
