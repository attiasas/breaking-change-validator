"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionResults = void 0;
class ActionResults {
    constructor() {
        this.errors = [];
    }
    AppendError(error) {
        this.errors.push(JSON.stringify(error));
    }
    hasErrors() {
        return this.errors.length > 0;
    }
    getErrorMessage() {
        return this.errors.join("\n");
    }
}
exports.ActionResults = ActionResults;
