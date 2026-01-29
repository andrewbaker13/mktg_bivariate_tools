class ShapleyCalculator {
    constructor(channels) {
        this.channels = channels; // Array of channel IDs ['search', 'social', ...]
        this.coalitionValues = {}; // Map of "sorted_joined_ids" -> value
        this.memoizedShapley = null;
    }

    /**
     * Set the observed value (conversion rate) for a specific coalition of channels.
     * @param {Array<string>} coalition - Array of channel IDs in the coalition
     * @param {number} value - The observed value (e.g., Conversion Rate %)
     */
    setCoalitionValue(coalition, value) {
        const key = this._getCoalitionKey(coalition);
        this.coalitionValues[key] = value;
        this.memoizedShapley = null; // Invalidate cache
    }

    /**
     * Get the value of a specific coalition. Defaults to 0 if not set.
     */
    getCoalitionValue(coalition) {
        const key = this._getCoalitionKey(coalition);
        return this.coalitionValues[key] || 0;
    }

    /**
     * Generate a canonical key for a coalition (sorted and joined)
     */
    _getCoalitionKey(coalition) {
        return [...coalition].sort().join(',');
    }

    /**
     * Calculate Shapley Values for all channels.
     * returns {Object} - Map of channel_id -> shapley_value
     */
    calculate() {
        if (this.memoizedShapley) return this.memoizedShapley;

        const attribution = {};
        this.channels.forEach(c => attribution[c] = 0);
        
        const n = this.channels.length;
        // Total number of permutations is n!
        // Practically, iterating all subsets is 2^n. For n=4 (16 subsets), this is trivial.
        // For n=6 (64 subsets), still trivial.
        
        // We use the subset formula:
        // phi_i = sum ( (|S|! * (n-|S|-1)!) / n! ) * ( v(S U {i}) - v(S) )
        // where sum is over all subsets S that do NOT contain i
        
        const factorial = (num) => {
            if (num <= 1) return 1;
            let result = 1;
            for (let i = 2; i <= num; i++) result *= i;
            return result;
        };

        const factN = factorial(n);

        this.channels.forEach(player => {
            // Find all subsets extending to this player
            // Iterate through every possible subset that does NOT include 'player'
            const otherPlayers = this.channels.filter(p => p !== player);
            const numOther = otherPlayers.length;
            const totalSubsets = 1 << numOther; // 2^numOther

            for (let i = 0; i < totalSubsets; i++) {
                const subset = [];
                for (let j = 0; j < numOther; j++) {
                    if ((i & (1 << j)) !== 0) {
                        subset.push(otherPlayers[j]);
                    }
                }

                // S is the subset WITHOUT player
                // S_with_i is S UNION {player}
                const S = subset;
                const S_with_i = [...S, player];

                const val_S = this.getCoalitionValue(S);
                const val_S_with_i = this.getCoalitionValue(S_with_i);
                const marginalContribution = val_S_with_i - val_S;

                const sizeS = S.length;
                
                // Weight = (|S|! * (n - |S| - 1)!) / n!
                const weight = (factorial(sizeS) * factorial(n - sizeS - 1)) / factN;

                attribution[player] += weight * marginalContribution;
            }
        });

        this.memoizedShapley = attribution;
        return attribution;
    }

    /**
     * Get detailed breakdown of how Shapley Value was calculated for one channel.
     * @param {string} player - The channel ID to inspect
     */
    getDetailedCalculation(player) {
        const details = [];
        
        const n = this.channels.length;
        const factorial = (num) => {
            if (num <= 1) return 1;
            let result = 1;
            for (let i = 2; i <= num; i++) result *= i;
            return result;
        };
        const factN = factorial(n);

        const otherPlayers = this.channels.filter(p => p !== player);
        const numOther = otherPlayers.length;
        const totalSubsets = 1 << numOther;

        for (let i = 0; i < totalSubsets; i++) {
            const subset = [];
            for (let j = 0; j < numOther; j++) {
                if ((i & (1 << j)) !== 0) {
                    subset.push(otherPlayers[j]);
                }
            }

            const S = subset;
            const S_with_i = [...S, player];

            const val_S = this.getCoalitionValue(S);
            const val_S_with_i = this.getCoalitionValue(S_with_i);
            const marginalContribution = val_S_with_i - val_S;

            const sizeS = S.length;
            const weight = (factorial(sizeS) * factorial(n - sizeS - 1)) / factN;

            details.push({
                coalition: S,
                val_without: val_S,
                val_with: val_S_with_i,
                marginal: marginalContribution,
                weight: weight
            });
        }
        
        return details;
    }
}
