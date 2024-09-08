"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openpgp_1 = __importDefault(require("openpgp"));
class PGP {
    static publicKey;
    static privateKey;
    static async initialize(publicKey, privateKey, passphrase) {
        this.publicKey = await openpgp_1.default.readKey({ armoredKey: publicKey });
        this.privateKey = await openpgp_1.default.decryptKey({
            privateKey: await openpgp_1.default.readPrivateKey({ armoredKey: privateKey }),
            passphrase
        });
    }
    static async encrypt(message, key) {
        if (this.privateKey === null || this.publicKey === null) {
            throw new Error('PGP keys not initialized');
        }
        let publicKey = this.publicKey;
        if (typeof key === 'string') {
            publicKey = await openpgp_1.default.readKey({ armoredKey: key });
        }
        return openpgp_1.default.encrypt({
            message: await openpgp_1.default.createMessage({ text: message }),
            encryptionKeys: publicKey,
            signingKeys: this.privateKey
        });
    }
    static async decrypt(message) {
        if (this.privateKey === null || this.publicKey === null) {
            throw new Error('PGP keys not initialized');
        }
        const armored = await openpgp_1.default.readMessage({ armoredMessage: message });
        const { data, signatures } = await openpgp_1.default.decrypt({
            message: armored,
            decryptionKeys: this.privateKey
        });
        return data;
    }
}
exports.default = PGP;
