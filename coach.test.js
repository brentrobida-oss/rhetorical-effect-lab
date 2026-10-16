// Run: node --test coach.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Coach = require('./coach.js');

const base = {
  author: 'Frederick Douglass',
  title: 'What to the Slave Is the Fourth of July?',
  cite: '',
  intro: 'Turning the holiday against the celebrating crowd, Douglass tells them the Fourth of July is',
  quote: 'yours, not mine',
};

const STRONG = Coach.EXAMPLES.strong.analysis;
const ANNOUNCING = Coach.EXAMPLES.weak.analysis;

// A level-3 paragraph: one choice, finished reasons, audience named, no announcing, but short of 4's depth.
const LEVEL3 = 'Douglass’s antithesis splits the sentence into two owners, and this split produces the rhetorical effect of unsettling the audience because the holiday is suddenly theirs alone. The split leaves the crowd holding a celebration that Douglass cannot share with them.';

test('words counts only tokens with letters or digits', () => {
  assert.equal(Coach.words('yours, not mine').length, 3);
  assert.equal(Coach.words('  “yours,”  —  not   mine ').length, 3);
  assert.equal(Coach.words('').length, 0);
});

test('splitSentences handles closing quotes, parentheses, and abbreviations', () => {
  const s = Coach.splitSentences('Mr. Smith left. She said “go.” Then (quietly) he went home.');
  assert.equal(s.length, 3);
  assert.equal(Coach.splitSentences(STRONG).length, 2);
  assert.equal(Coach.splitSentences(ANNOUNCING).length, 2);
  assert.equal(Coach.splitSentences('One sentence only here').length, 1);
});

test('citation and paragraph assembly', () => {
  assert.equal(Coach.citation({ author: 'Frederick Douglass', cite: '' }), 'Douglass');
  assert.equal(Coach.citation({ author: 'Joan Didion', cite: '12' }), 'Didion 12');
  const p = Coach.buildParagraph({ ...base, analysis: 'Analysis here.' });
  assert.equal(p, 'Turning the holiday against the celebrating crowd, Douglass tells them the Fourth of July is “yours, not mine” (Douglass). Analysis here.');
  const noCite = Coach.buildParagraph({ intro: 'He says', quote: 'yours, not mine', author: '', analysis: '' });
  assert.equal(noCite, 'He says “yours, not mine”.');
});

test('strong example scores 4 when loaded as the example', () => {
  const r = Coach.analyze({ ...base, analysis: STRONG }, { isExample: true });
  assert.equal(r.score, 4, JSON.stringify(r.checks));
  assert.equal(r.major, 0, JSON.stringify(r.flags.map(f => f.id)));
  assert.ok(r.hasEffect && r.effectNamed);
  assert.ok(r.choices.includes('antithesis'));
  assert.ok(r.choices.includes('pronoun'));
  assert.ok(r.purpose && r.audience && r.echo && r.deep);
  assert.equal(r.sentenceCount, 2);
  assert.equal(r.bareThis, 0);
});

test('pasting the example as your own work scores 0', () => {
  const r = Coach.analyze({ ...base, analysis: STRONG });
  assert.equal(r.score, 0);
  assert.ok(r.exampleCopy);
  assert.ok(r.next.includes('Start mine'));
  // a light edit does not escape it
  const edited = Coach.analyze({ ...base, analysis: STRONG.replace('blunt', 'short').replace('ornate', 'fancy') });
  assert.equal(edited.score, 0);
});

test('announcing paragraph scores 1 and names the announcing moves first', () => {
  const r = Coach.analyze({ ...base, analysis: ANNOUNCING }, { isExample: true });
  assert.equal(r.score, 1);
  const ids = r.flags.map(f => f.id);
  assert.ok(ids.includes('quote-label'));
  assert.ok(ids.includes('shows-that'));
  assert.ok(ids.includes('uses-to-show'));
  assert.ok(r.next.toLowerCase().includes('announcing'), r.next);
});

test('level 3: one choice, finished reason, audience, no announcing, not deep enough for 4', () => {
  const r = Coach.analyze({ ...base, analysis: LEVEL3 });
  assert.equal(r.score, 3, JSON.stringify({ checks: r.checks, flags: r.flags.map(f => f.id) }));
  assert.ok(r.next.includes('reach 4'));
});

test('bare "This" caps at 2 and is named as the next step', () => {
  const a = LEVEL3.replace('this split produces', 'this produces');
  const r = Coach.analyze({ ...base, analysis: a });
  assert.equal(r.bareThis, 1);
  assert.equal(r.score, 2);
  assert.ok(r.flags.some(f => f.id === 'bare-this'));
  assert.ok(r.next.includes('noun after'), r.next);
  // "This quote" and "This split" are not bare; "This also" and "This can" are.
  assert.equal(Coach.analyze({ ...base, analysis: 'This split works well for Douglass and the crowd listening to him speak.' }).bareThis, 0);
  assert.equal(Coach.analyze({ ...base, analysis: 'This also works. This can work too for Douglass and the crowd listening.' }).bareThis, 2);
});

test('mad-libs gaming (phrase plus connectives plus a device list) scores 1', () => {
  const a = 'Douglass’s diction produces the rhetorical effect of because which. The audience and the purpose argument antithesis syntax tone imagery pronoun shift.';
  const r = Coach.analyze({ ...base, analysis: a });
  assert.equal(r.score, 1, JSON.stringify(r.flags.map(f => f.id)));
  const ids = r.flags.map(f => f.id);
  assert.ok(ids.includes('effect-empty'));
  assert.ok(ids.includes('reason-empty'));
  assert.ok(ids.includes('stuffing'));
});

test('an unnamed effect or unfinished reason caps at 2', () => {
  const noEffect = LEVEL3.replace('of unsettling the audience because', 'because');
  assert.equal(Coach.analyze({ ...base, analysis: noEffect }).effectNamed, false);
  assert.equal(Coach.analyze({ ...base, analysis: noEffect }).score, 2);
  const stub = 'Douglass’s antithesis splits the sentence into two owners, and this split produces the rhetorical effect of unsettling the audience because. The split leaves the crowd holding a celebration that Douglass cannot share with them.';
  const r = Coach.analyze({ ...base, analysis: stub });
  assert.ok(r.flags.some(f => f.id === 'reason-empty'));
  assert.equal(r.score, 2);
});

test('thin sentences and duplicated sentences cap at 2', () => {
  const thin = 'Douglass’s antithesis splits the sentence into two owners, and this split produces the rhetorical effect of unsettling the audience because the holiday is suddenly theirs alone. Douglass argues well here.';
  const r = Coach.analyze({ ...base, analysis: thin });
  assert.ok(r.flags.some(f => f.id === 'thin'));
  assert.equal(r.score, 2);
  const one = 'Douglass’s antithesis splits the sentence into two owners, and this split produces the rhetorical effect of unsettling the audience because the holiday is suddenly theirs alone.';
  const dup = Coach.analyze({ ...base, analysis: one + ' ' + one.replace('unsettling', 'shaking') });
  assert.ok(dup.flags.some(f => f.id === 'duplicate'));
  assert.equal(dup.score, 2);
});

test('level 4 requires returning to the quoted words', () => {
  const noEcho = STRONG.replace('the pronoun “yours” turns', 'the second-person pronoun turns');
  const r = Coach.analyze({ ...base, analysis: noEcho }, { isExample: true });
  assert.equal(r.echo, false);
  assert.equal(r.score, 3);
  assert.ok(r.next.includes('quoted words'));
});

test('quote under three words scores 0 and says so', () => {
  const r = Coach.analyze({ ...base, quote: 'yours', analysis: LEVEL3 });
  assert.equal(r.score, 0);
  assert.equal(r.quoteStatus, 'short');
  assert.equal(r.checks[0].ok, false);
});

test('quote word status bands', () => {
  assert.equal(Coach.analyze({ ...base, quote: '', analysis: '' }).quoteStatus, 'empty');
  assert.equal(Coach.analyze({ ...base, quote: 'yours, not mine', analysis: '' }).quoteStatus, 'ideal');
  assert.equal(Coach.analyze({ ...base, quote: 'this Fourth of July is yours not mine you may rejoice', analysis: '' }).quoteStatus, 'long');
  const thirty = Array.from({ length: 30 }, (_, i) => 'w' + i).join(' ');
  const r = Coach.analyze({ ...base, quote: thirty, analysis: LEVEL3 });
  assert.equal(r.quoteStatus, 'toolong');
  assert.ok(r.score <= 2);
});

test('restating the quote with no reasoning scores 0', () => {
  const r = Coach.analyze({ ...base, analysis: 'Douglass says the Fourth of July is yours and not mine, meaning the holiday belongs to them.' });
  assert.equal(r.restates, true);
  assert.equal(r.score, 0);
});

test('explanation without the required phrase caps at 2', () => {
  const a = 'Douglass’s antithesis splits the sentence into two owners because the pronoun forces the audience to notice what they own. The monosyllables refuse ornament so that comfort becomes the argument against them.';
  const r = Coach.analyze({ ...base, analysis: a });
  assert.equal(r.score, 2);
  assert.equal(r.checks.find(c => c.id === 'effect').ok, false);
});

test('one sentence with the phrase caps at 2', () => {
  const a = 'Douglass’s antithesis produces the rhetorical effect of making the audience feel accused because the pronoun assigns them the holiday.';
  const r = Coach.analyze({ ...base, analysis: a });
  assert.equal(r.sentenceCount, 1);
  assert.equal(r.score, 2);
});

test('a single announcing phrase caps an otherwise strong paragraph at 2', () => {
  const a = 'This quote shows Douglass’s antithesis splitting one sentence into two owners, and this split produces the rhetorical effect of unsettling the audience because the pronoun assigns them the holiday. The monosyllables refuse ornament so that comfort becomes the argument against the crowd.';
  const r = Coach.analyze({ ...base, analysis: a });
  assert.equal(r.score, 2);
  assert.equal(r.flags.find(f => f.id === 'quote-label').matches.length, 1);
});

test('naming an appeal with no reasoning is flagged', () => {
  const r = Coach.analyze({ ...base, analysis: 'Douglass is using pathos here with the audience. It is emotional for everyone there.' });
  assert.ok(r.flags.some(f => f.id === 'appeal-only'));
});

test('generic "the author" is only flagged when an author is given', () => {
  const a = 'The author uses antithesis and this split produces the rhetorical effect of unsettling readers because the holiday becomes theirs alone. The split leaves the crowd holding a celebration the author cannot share.';
  assert.ok(Coach.analyze({ ...base, analysis: a }).flags.some(f => f.id === 'author-generic'));
  assert.ok(!Coach.analyze({ ...base, author: '', analysis: a }).flags.some(f => f.id === 'author-generic'));
});

test('overlap is Jaccard over content words', () => {
  assert.equal(Coach.overlap('alpha beta gamma', 'alpha beta gamma'), 1);
  assert.equal(Coach.overlap('alpha beta gamma', 'delta epsilon zeta'), 0);
  assert.equal(Coach.overlap('', 'alpha'), 0);
  assert.equal(Coach.overlap('the of and alpha', 'the of and beta'), 0);
  assert.ok(Coach.overlap(STRONG, LEVEL3) < 0.5, 'a different paragraph about the same quote is not a copy');
  assert.ok(Coach.overlap(STRONG, STRONG.replace('blunt', 'short')) > 0.8);
});

test('device names match exactly: "listeners" is not the device "list"', () => {
  const r = Coach.analyze({ ...base, analysis: 'The listeners hear Douglass and the punctuation marks pause, a colonial crowd dashing home to question nothing.' });
  assert.ok(!r.choices.includes('list'), r.choices.join());
  assert.ok(!r.choices.includes('pun'));
  assert.ok(!r.choices.includes('colon'));
  assert.ok(!r.choices.includes('dash'));
  assert.ok(r.choices.includes('punctuation'));
  assert.ok(r.choices.includes('question'));
  assert.ok(Coach.analyze({ ...base, analysis: 'Douglass builds a list of grievances and the pun on owners lands.' }).choices.includes('list'));
});

test('bare "this" before punctuation is flagged', () => {
  assert.equal(Coach.analyze({ ...base, analysis: 'The crowd cannot escape this. Douglass makes sure of it with the pronoun.' }).bareThis, 1);
});

test('empty form scores 0 with a clear next step', () => {
  const r = Coach.analyze({ author: '', title: '', cite: '', intro: '', quote: '', analysis: '' });
  assert.equal(r.score, 0);
  assert.ok(r.next.toLowerCase().includes('quote'));
});
