/**
 * EventBroker - The strict Inter-Module Communication (IMC) layer.
 * Enforces data contracts and routes payloads between isolated apps.
 */
const EventBroker = (() => {
    const topics = {};
    const hasOwnProperty = topics.hasOwnProperty;

    return {
        /**
         * Listen for a specific event broadcast across the Hub.
         * @param {string} topic - The event name (e.g., 'SHOPPING:ADD_ITEM')
         * @param {function} listener - The callback to run when received
         * @returns {object} Object with a remove() method to destroy the listener
         */
        subscribe: (topic, listener) => {
            if (!hasOwnProperty.call(topics, topic)) {
                topics[topic] = [];
            }
            const index = topics[topic].push(listener) - 1;
            
            return {
                remove: () => {
                    delete topics[topic][index];
                }
            };
        },

        /**
         * Fire an event across the Hub for other modules to intercept.
         * @param {string} topic - The event name
         * @param {object} payload - The structured data object to send
         */
        broadcast: (topic, payload) => {
            if (!hasOwnProperty.call(topics, topic)) return;
            
            // Strict Contract Enforcement: Reject non-object or null payloads
            if (!payload || typeof payload !== 'object') {
                console.error(`EventBroker [BLOCKED]: Module attempted to broadcast malformed payload on topic [${topic}]`);
                return;
            }

            topics[topic].forEach((listener) => {
                if (listener) listener(payload);
            });
        }
    };
})();