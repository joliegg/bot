"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Action {
    static platforms = [];
    static enabled = true;
    static match(text, platform) {
        return false;
    }
    constructor(text, platform) {
    }
    run() {
        return Promise.resolve('');
    }
}
exports.default = Action;
