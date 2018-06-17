import { Arrayish } from '../utils/convert';
import { HDNode } from './hdnode';
import { Signature } from '../utils/secp256k1';
export declare class SigningKey {
    readonly privateKey: string;
    readonly publicKey: string;
    readonly address: string;
    readonly mnemonic: string;
    readonly path: string;
    private readonly keyPair;
    constructor(privateKey: Arrayish | HDNode);
    signDigest(digest: Arrayish): Signature;
}
export declare function recoverAddress(digest: Arrayish, signature: Signature): string;
export declare function computeAddress(key: string): string;
