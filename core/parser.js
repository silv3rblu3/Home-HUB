/**
 * NLPParser - Offline heuristic text processor for the Quick-Add command bar.
 */
const NLPParser = (() => {
    // Strict RegEx rule matrix defining module targets
    const routingRules = [
        {
            target: 'shopping',
            // Matches: "buy [item] from [store]" or "need to get [item]"
            pattern: /^(buy|get|need to buy|purchase)\s+(.*?)(?:\s+(from|at)\s+(.*))?$/i,
            extract: (match) => ({
                action: match[1].toLowerCase(),
                itemName: match[2].trim(),
                storeTarget: match[4] ? match[4].trim() : 'Any'
            })
        },
        {
            target: 'vehicles',
            // Matches: "replace [part] on my [vehicle]" or "fix [issue] for [vehicle]"
            pattern: /^(change|fix|repair|replace|check)\s+(.*?)(?:\s+(on|for)\s+(my\s+)?(.*))?$/i,
            extract: (match) => ({
                action: match[1].toLowerCase(),
                taskName: match[2].trim(),
                vehicleId: match[5] ? match[5].trim() : 'Unassigned'
            })
        }
    ];

    return {
        /**
         * Scans an input string and maps it to a module event payload.
         * @param {string} rawInput - The user's typed command
         * @returns {object} { targetModule: string, payload: object }
         */
        processCommand: (rawInput) => {
            const cleanString = rawInput.trim();
            
            for (const rule of routingRules) {
                const match = cleanString.match(rule.pattern);
                if (match) {
                    return {
                        targetModule: rule.target,
                        payload: rule.extract(match)
                    };
                }
            }
            
            // Fallback: If the parser can't confidently map it, return as an unknown draft
            return {
                targetModule: 'unknown',
                payload: { rawText: cleanString }
            };
        }
    };
})();