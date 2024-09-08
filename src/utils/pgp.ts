import openpgp, { PrivateKey, PublicKey } from 'openpgp';


class PGP {
  private static publicKey: PublicKey;
  private static privateKey: PrivateKey;

  static async initialize (publicKey: string, privateKey: string, passphrase: string) {
    this.publicKey = await openpgp.readKey({ armoredKey: publicKey });

    this.privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }),
      passphrase
    });
  }

  static async encrypt (message: string, key?: string) {
    if (this.privateKey === null || this.publicKey === null) {
      throw new Error('PGP keys not initialized');
    }

    let publicKey = this.publicKey;

    if (typeof key === 'string') {
      publicKey = await openpgp.readKey({ armoredKey: key });
    }

    return openpgp.encrypt({
      message: await openpgp.createMessage({ text: message}),
      encryptionKeys: publicKey,
      signingKeys: this.privateKey
    });
  }

  static async decrypt (message: string) {
    if (this.privateKey === null || this.publicKey === null) {
      throw new Error('PGP keys not initialized');
    }

    const armored = await openpgp.readMessage({ armoredMessage: message });
    const { data, signatures } = await openpgp.decrypt({
        message: armored,
        decryptionKeys: this.privateKey
    });

    return data;
  }
}

export default PGP;
