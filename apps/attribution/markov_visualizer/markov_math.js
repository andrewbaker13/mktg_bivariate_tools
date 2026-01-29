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

        paths.forEach(p => {
            // Add Start -> First
            let prev = '(start)';
            
            p.path.forEach(step => {
                // Determine current state name (handle potential naming mismatches if needed)
                let curr = step; 
                this.recordTransition(counts, prev, curr);
                prev = curr;
            });

            // Add Final -> Conversion or Null
            let finalState = p.converted ? '(conversion)' : '(null)';
            this.recordTransition(counts, prev, finalState);
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
     * We multiply the transition matrix by itself N times until convergence.
     */
    getConversionProbability(customMatrix = null) {
        let M = customMatrix || this.matrix;
        
        // State vector: [1, 0, 0, ...] (Starts at 'start')
        let stateVec = Array(this.states.length).fill(0);
        stateVec[this.stateIndex['(start)']] = 1.0;

        // Propagate for maxPathLength + buffer steps (e.g., 10-15 steps)
        // Most marketing paths are < 10 steps.
        for (let step = 0; step < 20; step++) {
            stateVec = this.multiplyVectorMatrix(stateVec, M);
        }

        return stateVec[this.stateIndex['(conversion)']];
    }

    /**
     * Calculates Removal Effects for all channels
     */
    calculateAttributionProportional() {
        const baseProb = this.getConversionProbability();
        if (baseProb === 0) return {};

        const removalEffects = {};
        let totalEffect = 0;

        this.channels.forEach(ch => {
            // Create a matrix where this channel is effectively "removed"
            // Method: All transitions TO this channel in the matrix become transitions TO (null)
            
            const tempM = this.cloneMatrix(this.matrix);
            const chIdx = this.stateIndex[ch];
            const nullIdx = this.stateIndex['(null)'];

            // Iterate over all rows, redirect any flow aimed at chIdx to nullIdx
            for(let r=0; r<tempM.length; r++) {
                const flowToChannel = tempM[r][chIdx];
                if (flowToChannel > 0) {
                    tempM[r][chIdx] = 0;
                    tempM[r][nullIdx] += flowToChannel; // Redirect traffic to drop-off
                }
            }

            const newProb = this.getConversionProbability(tempM);
            const effect = 1 - (newProb / baseProb);
            
            // Effect can be small negative due to floating point noise, clamp 0
            removalEffects[ch] = Math.max(0, effect);
            totalEffect += removalEffects[ch];
        });

        // Normalize to sum to 1.0 (or 100%)
        const attribution = {};
        this.channels.forEach(ch => {
            if (totalEffect === 0) attribution[ch] = 0;
            else attribution[ch] = (removalEffects[ch] / totalEffect);
        });

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
