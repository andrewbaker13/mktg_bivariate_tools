// Minimal VADER-style sentiment analyzer for browser use.
// Exposes polarityScores(text) and explain(text) for educational breakdowns.

(function () {
  let lexicon = {};
  let lexiconLoaded = false;

  function parseLexicon(text) {
    const map = {};
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split(/\s+/);
      const term = parts[0];
      const score = parseFloat(parts[1]);
      if (!Number.isNaN(score)) {
        map[term.toLowerCase()] = score;
      }
    });
    lexicon = map;
    lexiconLoaded = true;
  }

  if (typeof fetch === 'function') {
    fetch('vader_lexicon.txt')
      .then(resp => resp.ok ? resp.text() : '')
      .then(text => {
        if (text) parseLexicon(text);
      })
      .catch(() => {
        lexiconLoaded = false;
      });
  }

  const B_INCR = 0.293;
  const B_DECR = -0.293;

  const boosterDict = {
    absolutely: B_INCR,
    amazingly: B_INCR,
    awfully: B_INCR,
    completely: B_INCR,
    considerable: B_INCR,
    considerably: B_INCR,
    decidedly: B_INCR,
    deeply: B_INCR,
    effing: B_INCR,
    enormous: B_INCR,
    enormously: B_INCR,
    entirely: B_INCR,
    especially: B_INCR,
    exceptional: B_INCR,
    exceptionally: B_INCR,
    extreme: B_INCR,
    extremely: B_INCR,
    fabulously: B_INCR,
    flipping: B_INCR,
    flippin: B_INCR,
    frackin: B_INCR,
    fracking: B_INCR,
    fricking: B_INCR,
    frickin: B_INCR,
    frigging: B_INCR,
    friggin: B_INCR,
    fully: B_INCR,
    fuckin: B_INCR,
    fucking: B_INCR,
    fuggin: B_INCR,
    fugging: B_INCR,
    greatly: B_INCR,
    hella: B_INCR,
    highly: B_INCR,
    hugely: B_INCR,
    incredible: B_INCR,
    incredibly: B_INCR,
    intensely: B_INCR,
    major: B_INCR,
    majorly: B_INCR,
    more: B_INCR,
    most: B_INCR,
    particularly: B_INCR,
    purely: B_INCR,
    quite: B_INCR,
    really: B_INCR,
    remarkably: B_INCR,
    so: B_INCR,
    substantially: B_INCR,
    thoroughly: B_INCR,
    total: B_INCR,
    totally: B_INCR,
    tremendous: B_INCR,
    tremendously: B_INCR,
    uber: B_INCR,
    unbelievably: B_INCR,
    unusually: B_INCR,
    utter: B_INCR,
    utterly: B_INCR,
    very: B_INCR,
    almost: B_DECR,
    barely: B_DECR,
    hardly: B_DECR,
    'just enough': B_DECR,
    'kind of': B_DECR,
    kinda: B_DECR,
    kindof: B_DECR,
    'kind-of': B_DECR,
    less: B_DECR,
    little: B_DECR,
    marginal: B_DECR,
    marginally: B_DECR,
    occasional: B_DECR,
    occasionally: B_DECR,
    partly: B_DECR,
    scarce: B_DECR,
    scarcely: B_DECR,
    slight: B_DECR,
    slightly: B_DECR,
    somewhat: B_DECR,
    'sort of': B_DECR,
    sorta: B_DECR,
    sortof: B_DECR,
    'sort-of': B_DECR
  };

  const negations = new Set([
    'aint',
    'arent',
    'cannot',
    'cant',
    'couldnt',
    'darent',
    'didnt',
    'doesnt',
    "ain't",
    "aren't",
    "can't",
    "couldn't",
    "daren't",
    "didn't",
    "doesn't",
    'dont',
    'hadnt',
    'hasnt',
    'havent',
    'isnt',
    'mightnt',
    'mustnt',
    'neither',
    "don't",
    "hadn't",
    "hasn't",
    "haven't",
    "isn't",
    "mightn't",
    "mustn't",
    'neednt',
    "needn't",
    'never',
    'none',
    'nope',
    'nor',
    'not',
    'nothing',
    'nowhere',
    'oughtnt',
    'shant',
    'shouldnt',
    'uhuh',
    'wasnt',
    'werent',
    "oughtn't",
    "shan't",
    "shouldn't",
    'uh-uh',
    "wasn't",
    "weren't",
    'without',
    'wont',
    'wouldnt',
    "won't",
    "wouldn't",
    'rarely',
    'seldom',
    'despite'
  ]);

  function isUpper(str) {
    return /[A-Z]/.test(str) && str === str.toUpperCase();
  }

  function stripPunctuation(token) {
    return token.replace(/^[^\w]+|[^\w]+$/g, '');
  }

  function tokenize(text) {
    if (!text) return [];
    return text
      .split(/\s+/)
      .map(t => t.trim())
      .filter(Boolean);
  }

  function sentimentValence(token) {
    const key = token.toLowerCase();
    return Object.prototype.hasOwnProperty.call(lexicon, key) ? lexicon[key] : 0;
  }

  function isNegated(tokens, index) {
    for (let i = Math.max(0, index - 3); i < index; i++) {
      const t = tokens[i].toLowerCase();
      if (negations.has(t)) return true;
    }
    return false;
  }

  function applyBooster(tokens, index, valence) {
    let scalar = 0;
    const word = tokens[index];
    const lower = word.toLowerCase();

    if (boosterDict[lower]) {
      scalar += boosterDict[lower];
      if (valence < 0) scalar *= -1;
    }

    // Look backward one token for booster words
    if (index > 0) {
      const prevLower = tokens[index - 1].toLowerCase();
      if (boosterDict[prevLower]) {
        scalar += boosterDict[prevLower];
      }
    }

    return scalar;
  }

  function amplifyExclamation(text, valence) {
    const exclamations = (text.match(/!/g) || []).length;
    if (exclamations === 0) return valence;
    const increment = Math.min(0.292 * exclamations, 0.292 * 3);
    return valence >= 0 ? valence + increment : valence - increment;
  }

  function scoreSentence(text) {
    const tokens = tokenize(text);
    const strippedTokens = tokens.map(stripPunctuation);
    const hasCapDiff = tokens.some(t => isUpper(t));

    const details = [];
    let sumValence = 0;

    strippedTokens.forEach((tok, i) => {
      const base = sentimentValence(tok);
      if (base === 0) {
        details.push({
          token: tokens[i],
          baseValence: 0,
          modifiers: [],
          finalValence: 0
        });
        return;
      }

      let valence = base;
      const modifiers = [];

      // Booster / dampener
      const boosterScalar = applyBooster(strippedTokens, i, valence);
      if (boosterScalar !== 0) {
        valence += boosterScalar;
        modifiers.push(`booster: ${boosterScalar.toFixed(3)}`);
      }

      // Negation
      if (isNegated(strippedTokens, i)) {
        valence *= -0.74;
        modifiers.push('negation: x -0.74');
      }

      // Capitalization emphasis
      if (hasCapDiff && isUpper(tokens[i])) {
        valence += valence >= 0 ? 0.733 : -0.733;
        modifiers.push('casing emphasis');
      }

      details.push({
        token: tokens[i],
        baseValence: base,
        modifiers,
        finalValence: valence
      });
      sumValence += valence;
    });

    // Exclamation emphasis at the sentence level
    const amplified = amplifyExclamation(text, sumValence);

    // Normalize similar to VADER compound: between -1 and 1
    const norm = amplified !== 0 ? amplified / Math.sqrt(amplified * amplified + 15) : 0;

    let posSum = 0;
    let negSum = 0;
    let neuCount = 0;
    details.forEach(d => {
      if (d.finalValence > 0) posSum += d.finalValence;
      else if (d.finalValence < 0) negSum += d.finalValence;
      else neuCount += 1;
    });

    const total = posSum + Math.abs(negSum) + neuCount || 1;
    const pos = posSum / total;
    const neg = Math.abs(negSum) / total;
    const neu = neuCount / total;

    return {
      tokens: details,
      sumValence,
      sumValenceAmplified: amplified,
      compound: norm,
      pos,
      neu,
      neg
    };
  }

  const VaderAnalyzer = {
    polarityScores(text) {
      const scored = scoreSentence(text || '');
      return {
        compound: Number(scored.compound.toFixed(4)),
        pos: Number(scored.pos.toFixed(4)),
        neu: Number(scored.neu.toFixed(4)),
        neg: Number(scored.neg.toFixed(4))
      };
    },
    explain(text) {
      return scoreSentence(text || '');
    }
  };

  window.VaderAnalyzer = VaderAnalyzer;
})();
