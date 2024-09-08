import openpgp from 'openpgp';
declare class PGP {
    private static publicKey;
    private static privateKey;
    static initialize(publicKey: string, privateKey: string, passphrase: string): Promise<void>;
    static encrypt(message: string, key?: string): Promise<openpgp.WebStream<string>>;
    static decrypt(message: string): Promise<openpgp.MaybeStream<openpgp.Data> & openpgp.WebStream<string>>;
}
export default PGP;
