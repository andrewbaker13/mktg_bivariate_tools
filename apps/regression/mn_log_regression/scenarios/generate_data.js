
function buildFunnelScenarioCSV(rowCount = 1500) {
  const n = Math.max(500, Math.min(2000, rowCount || 1500));
  const lines = ['customer_id,stage,channel,frequency_segment,age_band'];

  const stages = ['Awareness', 'Consideration', 'Purchase'];
  const channels = ['Email', 'Social', 'Search'];
  const freqs = ['Low', 'Medium', 'High'];
  const ages = ['18-24', '25-34', '35-44', '45-54', '55+'];

  const softmax = scores => {
    const max = Math.max.apply(null, scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
    return exps.map(v => v / sum);
  };

  const sampleCategory = probs => {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) return i;
    }
    return probs.length - 1;
  };

  for (let i = 0; i < n; i++) {
    const customerId = `C${String(i + 1).padStart(4, '0')}`;

    // Draw predictors with realistic but not extreme marginals
    const channel = (() => {
      const r = Math.random();
      if (r < 0.45) return 'Email';
      if (r < 0.8) return 'Social';
      return 'Search';
    })();

    const frequency_segment = (() => {
      const r = Math.random();
      if (r < 0.55) return 'Low';
      if (r < 0.85) return 'Medium';
      return 'High';
    })();

    const age_band = (() => {
      const r = Math.random();
      if (r < 0.15) return '18-24';
      if (r < 0.40) return '25-34';
      if (r < 0.65) return '35-44';
      if (r < 0.88) return '45-54';
      return '55+';
    })();

    // Linear scores for each stage: Awareness, Consideration, Purchase.
    let scoreAw = 0.1;
    let scoreCons = 0;
    let scorePur = -0.1;

    // Channel effects
    if (channel === 'Social') {
      scoreAw += 0.1;
      scoreCons += 0.05;
    } else if (channel === 'Search') {
      scoreCons += 0.1;
      scorePur += 0.08;
    } else if (channel === 'Email') {
      scoreCons += 0.05;
      scorePur += 0.05;
    }

    // Frequency effects
    if (frequency_segment === 'Low') {
      scoreAw += 0.05;
    } else if (frequency_segment === 'Medium') {
      scoreCons += 0.05;
    } else if (frequency_segment === 'High') {
      scoreCons += 0.1;
      scorePur += 0.12;
    }

    // Age effects
    if (age_band === '25-34' || age_band === '35-44') {
      scoreCons += 0.05;
      scorePur += 0.05;
    } else if (age_band === '55+') {
      scoreAw += 0.05;
    }

    // Draw stage from softmax over scores
    const probs = softmax([scoreAw, scoreCons, scorePur]);
    const stageIndex = sampleCategory(probs);
    const stage = stages[stageIndex];

    lines.push([customerId, stage, channel, frequency_segment, age_band].join(','));
  }

  return lines.join('\n');
}

function buildBrandChoiceScenarioCSV(rowCount = 1500) {
  const n = Math.max(500, Math.min(2000, rowCount || 1500));
  const lines = ['respondent_id,brand_choice,price_sensitivity,age_band,channel'];

  const brands = ['Brand A', 'Brand B', 'Brand C', 'Brand D'];
  const priceLevels = ['Low', 'Medium', 'High'];
  const ageBands = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const channels = ['Email', 'Search', 'Social'];

  const softmax = scores => {
    const max = Math.max.apply(null, scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
    return exps.map(v => v / sum);
  };

  const sampleCategory = probs => {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) return i;
    }
    return probs.length - 1;
  };

  for (let i = 0; i < n; i++) {
    const respondentId = `R${String(i + 1).padStart(4, '0')}`;

    // Draw predictors
    const price_sensitivity = (() => {
      const r = Math.random();
      if (r < 0.25) return 'Low';
      if (r < 0.65) return 'Medium';
      return 'High';
    })();

    const age_band = (() => {
      const r = Math.random();
      if (r < 0.20) return '18-24';
      if (r < 0.45) return '25-34';
      if (r < 0.70) return '35-44';
      if (r < 0.9) return '45-54';
      return '55+';
    })();

    const channel = (() => {
      const r = Math.random();
      if (r < 0.5) return 'Search';
      if (r < 0.8) return 'Email';
      return 'Social';
    })();

    // Baseline brand scores
    let sA = 0.1;
    let sB = 0.05;
    let sC = -0.05;
    let sD = -0.1;

    // Price sensitivity effects
    if (price_sensitivity === 'Low') {
      sC += 0.1;
    } else if (price_sensitivity === 'Medium') {
      sA += 0.08;
      sB += 0.08;
    } else if (price_sensitivity === 'High') {
      sA += 0.12;
      sB += 0.08;
    }

    // Age effects
    if (age_band === '18-24') {
      sC += 0.08;
    } else if (age_band === '25-34') {
      sA += 0.08;
      sC += 0.05;
    } else if (age_band === '45-54' || age_band === '55+') {
      sB += 0.08;
      sD += 0.1;
    }

    // Channel effects
    if (channel === 'Search') {
      sA += 0.05;
      sB += 0.05;
    } else if (channel === 'Email') {
      sB += 0.05;
      sD += 0.05;
    } else if (channel === 'Social') {
      sC += 0.05;
    }

    const probs = softmax([sA, sB, sC, sD]);
    const brandIndex = sampleCategory(probs);
    const brand_choice = brands[brandIndex];

    lines.push([respondentId, brand_choice, price_sensitivity, age_band, channel].join(','));
  }

  return lines.join('\n');
}

console.log('---FUNNEL_STAGE_DATA_START---');
console.log(buildFunnelScenarioCSV());
console.log('---FUNNEL_STAGE_DATA_END---');
console.log('---BRAND_CHOICE_DATA_START---');
console.log(buildBrandChoiceScenarioCSV());
console.log('---BRAND_CHOICE_DATA_END---');
