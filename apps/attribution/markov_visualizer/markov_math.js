/**
 * Simple Linear Algebra for Markov Chains
 * Handling 7x7 matrices for marketing attribution
 */

class MarkovAttribution {
    constructor(channels) {
        this.channels = channels; // ['search', 'social', ...]
        this.states = ['(start)', ...channels, '(conversion)', '(null)'];
        this.matrix = []; // 2D array of probabilities
        this.stateIndex = {};
        
        this.states.forEach((s, i) => this.stateIndex[s] = i);
    }

    /**
     * Parses raw paths and builds the transition matrix
     * paths: [{ path: ['search', 'social'], converted: true }, ...]
     */
    train(paths) {
        const n = this.states.length;
        // Init counts matrix
        const counts = Array(n).fill(0).map(() => Array(n).fill(0));
        
        // Track Visits for Visualization sizing
        this.stateVisits = {};
        this.states.forEach(s => this.stateVisits[s] = 0);

        paths.forEach(p => {
            // Add Start -> First
            let prev = '(start)';
            this.stateVisits[prev]++; // Start is visited once per path
            
            p.path.forEach(step => {
                // Determine current state name (handle potential naming mismatches if needed)
                let curr = step; 
                this.recordTransition(counts, prev, curr);
                
                // Count visit
                if (this.stateVisits[curr] !== undefined) {
                    this.stateVisits[curr]++;
                }
                
                prev = curr;
            });

            // Add Final -> Conversion or Null
            let finalState = p.converted ? '(conversion)' : '(null)';
            this.recordTransition(counts, prev, finalState);
            if (this.stateVisits[finalState] !== undefined) {
                this.stateVisits[finalState]++;
            }
        });

        // Normalize to Probabilities
        this.matrix = counts.map(row => {
            const sum = row.reduce((a, b) => a + b, 0);
            if (sum === 0) return Array(n).fill(0); // absorbing state or unused
            return row.map(val => val / sum);
        });
        
        // Fix Absorbing States (Conversion and Null map to themselves 1.0)
        const convIdx = this.stateIndex['(conversion)'];
        const nullIdx = this.stateIndex['(null)'];
        
        this.matrix[convIdx] = Array(n).fill(0); this.matrix[convIdx][convIdx] = 1.0;
        this.matrix[nullIdx] = Array(n).fill(0); this.matrix[nullIdx][nullIdx] = 1.0;
    }

    /**
     * Sets the transition matrix directly from a transitions dictionary
     * transitions: { '(start)': {'search': 0.5, ...}, 'search': {'social': 0.2, ...}, ... }
     */
    setTransitionMatrix(transitions) {
        const n = this.states.length;
        this.matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        
        // Convert transitions dict to matrix format
        for (let fromState in transitions) {
            const fromIdx = this.stateIndex[fromState];
            if (fromIdx === undefined) continue;
            
            for (let toState in transitions[fromState]) {
                let toIdx;
                // Map '(end)' to either '(conversion)' or '(null)' - use conversion as primary
                if (toState === '(end)') {
                    toIdx = this.stateIndex['(conversion)'];
                } else {
                    toIdx = this.stateIndex[toState];
                }
                
                if (toIdx !== undefined) {
                    this.matrix[fromIdx][toIdx] = transitions[fromState][toState];
                }
            }
        }
        
        // Calculate null transitions: probability of NOT converting from each channel
        // For each channel, the remaining probability after all transitions goes to null
        this.channels.forEach(ch => {
            const chIdx = this.stateIndex[ch];
            const rowSum = this.matrix[chIdx].reduce((a, b) => a + b, 0);
            const nullIdx = this.stateIndex['(null)'];
            
            // If row doesn't sum to 1, the remainder goes to null (abandonment)
            if (rowSum < 1.0) {
                this.matrix[chIdx][nullIdx] = 1.0 - rowSum;
            }
        });
        
        // Fix Absorbing States
        const convIdx = this.stateIndex['(conversion)'];
        const nullIdx = this.stateIndex['(null)'];
        
        this.matrix[convIdx] = Array(n).fill(0); 
        this.matrix[convIdx][convIdx] = 1.0;
        this.matrix[nullIdx] = Array(n).fill(0); 
        this.matrix[nullIdx][nullIdx] = 1.0;
    }

    recordTransition(counts, fromState, toState) {
        const r = this.stateIndex[fromState];
        const c = this.stateIndex[toState];
        if (r !== undefined && c !== undefined) {
            counts[r][c]++;
        }
    }

    /**
     * Calculates the probability of absorption into (conversion) from (start)
     * using matrix multiplication (or fundamental matrix logic simplified)
     * 
     * Since we don't have a matrix library, we simulate the "power" method.
     * We multiply the transition matrix by itself until convergence.
     */
    getConversionProbability(customMatrix = null) {
        let M = customMatrix || this.matrix;
        
        // State vector: [1, 0, 0, ...] (Starts at 'start')
        let stateVec = Array(this.states.length).fill(0);
        stateVec[this.stateIndex['(start)']] = 1.0;

        // Iterate until convergence (or max iterations)
        const EPSILON = 0.0001; // Convergence threshold
        const MAX_ITERATIONS = 100; // Safety cap
        
        for (let step = 0; step < MAX_ITERATIONS; step++) {
            const prevVec = [...stateVec];
            stateVec = this.multiplyVectorMatrix(stateVec, M);
            
            // Check if converged (no significant change in any state probability)
            const maxDiff = Math.max(...stateVec.map((v, i) => Math.abs(v - prevVec[i])));
            if (maxDiff < EPSILON) {
                break; // Converged!
            }
        }

        return stateVec[this.stateIndex['(conversion)']];
    }

    /**
     * Calculates Removal Effects for all channels
     * Uses OUTGOING transition removal (not incoming)
     * 
     * Correct counterfactual: "What if users who touched this channel had nowhere to go next?"
     * This prevents negative removal effects from substitution dynamics.
     */
    calculateAttributionProportional() {
        const baseProb = this.getConversionProbability();
        console.log('🔍 Base Conversion Probability:', baseProb);
        
        if (baseProb === 0) return {};

        const removalEffects = {};
        let totalEffect = 0;

        this.channels.forEach(ch => {
            const tempM = this.cloneMatrix(this.matrix);
            const chIdx = this.stateIndex[ch];
            const nullIdx = this.stateIndex['(null)'];

            // Method 1: Remove OUTGOING transitions from this channel
            // The channel becomes a dead-end that sends everyone to (null)
            tempM[chIdx] = Array(this.states.length).fill(0);
            tempM[chIdx][nullIdx] = 1.0; // All traffic from this channel → Null
            
            /* 
               [ANDREW MODIFICATION]
               Disabled "Incoming Redistribution" (Method 2) to align with standard Markov Attribution.
               Standard definition: "If node X is removed, all paths traversing X satisfy P(conversion) = 0".
               
               Benefits:
               1. Guarantees shared credit for multi-touch paths (e.g., Social->Search->Conv). Use "Redistribution" implies Social was useless if Search could replace it.
               2. Prevents "100% attribution to the strongest node" syndrome.
               3. Eliminates negative removal effects (we are creating a hole, not optimizing traffic).
            */
            
            // Method 2 (DISABLED): Redirect incoming traffic proportionally
            /*
            for(let r=0; r<tempM.length; r++) {
                if (r === chIdx) continue;
                
                const flowToRemovedChannel = tempM[r][chIdx];
                if (flowToRemovedChannel > 0) {
                   // ... redistribution logic ...
                }
            }
            */

            const newProb = this.getConversionProbability(tempM);
            const effect = 1 - (newProb / baseProb);
            
            console.log(`   ${ch}: Base=${baseProb.toFixed(4)}, After removal=${newProb.toFixed(4)}, Effect=${effect.toFixed(4)} (${(effect*100).toFixed(1)}%)`);
            
            // Effect should always be >= 0 now (removing a channel can't improve conversion)
            removalEffects[ch] = Math.max(0, effect);
            totalEffect += removalEffects[ch];
        });

        console.log('📊 Total of all removal effects:', totalEffect.toFixed(4));
        console.log('📊 Raw removal effects:', removalEffects);

        // Normalize to sum to 1.0 (or 100%)
        const attribution = {};
        this.channels.forEach(ch => {
            if (totalEffect === 0) attribution[ch] = 0;
            else attribution[ch] = (removalEffects[ch] / totalEffect);
        });
        
        console.log('📊 Final normalized attribution:', attribution);

        return {
            attribution, // Shares (0.0 - 1.0)
            baseConversionRate: baseProb,
            removalEffects // Raw % drop
        };
    }

    // --- Helpers ---

    multiplyVectorMatrix(vec, mat) {
        const result = Array(vec.length).fill(0);
        for (let c = 0; c < mat.length; c++) { // cols
            for (let r = 0; r < vec.length; r++) { // rows
                result[c] += vec[r] * mat[r][c];
            }
        }
        return result;
    }

    cloneMatrix(m) {
        return m.map(row => [...row]);
    }
    
    getDisplayMatrix() {
        return {
            labels: this.states,
            values: this.matrix
        };
    }
}
