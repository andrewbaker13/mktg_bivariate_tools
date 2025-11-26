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

  const boosterDict = {
    very: 0.293,
    really: 0.293,
    extremely: 0.293,
    so: 0.293,
    super: 0.293,
    slightly: -0.293,
    somewhat: -0.293,
    kindof: -0.293,
    kind: -0.293,
    barely: -0.293
  };

  const negations = new Set([
    'not',
    'no',
    'never',
    'nothing',
    'nowhere',
    "n't"
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
