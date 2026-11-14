const { EventEmitter } = require("node:events");

function createEventBus() {
    const emitter = new EventEmitter();
    return {
        subscribe(name, handler) {
            emitter.on(name, (event, pending) => {
                pending.push(Promise.resolve().then(() => handler(event)).catch(error => {
                    console.error(`[event:${name}] handler failed`, error.message);
                }));
            });
        },
        async publish(name, payload) {
            const pending = [];
            emitter.emit(name, { name, payload, occurredAt: new Date() }, pending);
            await Promise.all(pending);
        }
    };
}
module.exports = { createEventBus };
