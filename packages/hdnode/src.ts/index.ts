"use strict";

// See: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
// See: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki


import { ExternallyOwnedAccount } from "@ethersproject/abstract-signer";
import { Base58 } from "@ethersproject/basex";
import { arrayify, BytesLike, concat, hexDataSlice, hexZeroPad, hexlify } from "@ethersproject/bytes";
import { BigNumber } from "@ethersproject/bignumber";
import { toUtf8Bytes, UnicodeNormalizationForm } from "@ethersproject/strings";
import { pbkdf2 } from "@ethersproject/pbkdf2";
import { defineReadOnly } from "@ethersproject/properties";
import { SigningKey } from "@ethersproject/signing-key";
import { computeHmac, ripemd160, sha256, SupportedAlgorithms } from "@ethersproject/sha2";
import { computeAddress } from "@ethersproject/transactions";
import { Wordlist, wordlists } from "@ethersproject/wordlists";

import { Logger } from "@ethersproject/logger";
import { version } from "./_version";
const logger = new Logger(version);

const N = BigNumber.from("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");


// "Bitcoin seed"
const MasterSecret = toUtf8Bytes("Bitcoin seed");

const HardenedBit = 0x80000000;

// Returns a byte with the MSB bits set
function getUpperMask(bits: number): number {
   return ((1 << bits) - 1) << (8 - bits);
}

// Returns a byte with the LSB bits set
function getLowerMask(bits: number): number {
   return (1 << bits) - 1;
}

function bytes32(value: BigNumber | Uint8Array): string {
    return hexZeroPad(hexlify(value), 32);
}

function base58check(data: Uint8Array): string {
    return Base58.encode(concat([ data, hexDataSlice(sha256(sha256(data)), 0, 4) ]));
}

function getWordlist(wordlist: string | Wordlist): Wordlist {
    if (wordlist == null) {
        return wordlists["en"];
    }

    if (typeof(wordlist) === "string") {
        const words = wordlists[wordlist];
        if (words == null) {
            logger.throwArgumentError("unknown locale", "wordlist", wordlist);
        }
        return words;
    }

    return wordlist;
}

const _constructorGuard: any = {};

export const defaultPath = "m/44'/60'/0'/0/0";

export interface Mnemonic {
    readonly phrase: string;
    readonly path: string;
    readonly locale: string;
};

export class HDNode implements ExternallyOwnedAccount {
    readonly privateKey: string;
    readonly publicKey: string;

    readonly fingerprint: string;
    readonly parentFingerprint: string;

    readonly address: string;

    readonly mnemonic?: Mnemonic;
    readonly path: string;

    readonly chainCode: string;

    readonly index: number;
    readonly depth: number;

    /**
     *  This constructor should not be called directly.
     *
     *  Please use:
     *   - fromMnemonic
     *   - fromSeed
     */
    constructor(constructorGuard: any, privateKey: string, publicKey: string, parentFingerprint: string, chainCode: string, index: number, depth: number, mnemonicOrPath: Mnemonic | string) {
        logger.checkNew(new.target, HDNode);

        if (constructorGuard !== _constructorGuard) {
            throw new Error("HDNode constructor cannot be called directly");
        }

        if (privateKey) {
            const signingKey = new SigningKey(privateKey);
            defineReadOnly(this, "privateKey", signingKey.privateKey);
            defineReadOnly(this, "publicKey", signingKey.compressedPublicKey);
        } else {
            defineReadOnly(this, "privateKey", null);
            defineReadOnly(this, "publicKey", hexlify(publicKey));
        }

        defineReadOnly(this, "parentFingerprint", parentFingerprint);
        defineReadOnly(this, "fingerprint", hexDataSlice(ripemd160(sha256(this.publicKey)), 0, 4));

        defineReadOnly(this, "address", computeAddress(this.publicKey));

        defineReadOnly(this, "chainCode", chainCode);

        defineReadOnly(this, "index", index);
        defineReadOnly(this, "depth", depth);

        if (mnemonicOrPath == null) {
            // From a source that does not preserve the path (e.g. extended keys)
            defineReadOnly(this, "mnemonic", null);
            defineReadOnly(this, "path", null);

        } else if (typeof(mnemonicOrPath) === "string") {
            // From a source that does not preserve the mnemonic (e.g. neutered)
            defineReadOnly(this, "mnemonic", null);
            defineReadOnly(this, "path", mnemonicOrPath);

        } else {
            // From a fully qualified source
            defineReadOnly(this, "mnemonic", mnemonicOrPath);
            defineReadOnly(this, "path", mnemonicOrPath.path);
        }
    }

    get extendedKey(): string {
        // We only support the mainnet values for now, but if anyone needs
        // testnet values, let me know. I believe current senitment is that
        // we should always use mainnet, and use BIP-44 to derive the network
        //   - Mainnet: public=0x0488B21E, private=0x0488ADE4
        //   - Testnet: public=0x043587CF, private=0x04358394

        if (this.depth >= 256) { throw new Error("Depth too large!"); }

        return base58check(concat([
            ((this.privateKey != null) ? "0x0488ADE4": "0x0488B21E"),
            hexlify(this.depth),
            this.parentFingerprint,
            hexZeroPad(hexlify(this.index), 4),
            this.chainCode,
            ((this.privateKey != null) ? concat([ "0x00", this.privateKey ]): this.publicKey),
        ]));
    }

    neuter(): HDNode {
        return new HDNode(_constructorGuard, null, this.publicKey, this.parentFingerprint, this.chainCode, this.index, this.depth, this.path);
    }

    private _derive(index: number): HDNode {
        if (index > 0xffffffff) { throw new Error("invalid index - " + String(index)); }

        // Base path
        let path = this.path;
        if (path) { path += "/" + (index & ~HardenedBit); }

        const data = new Uint8Array(37);

        if (index & HardenedBit) {
            if (!this.privateKey) {
                throw new Error("cannot derive child of neutered node");
            }

            // Data = 0x00 || ser_256(k_par)
            data.set(arrayify(this.privateKey), 1);

            // Hardened path
            if (path) { path += "'"; }

        } else {
            // Data = ser_p(point(k_par))
            data.set(arrayify(this.publicKey));
        }

        // Data += ser_32(i)
        for (let i = 24; i >= 0; i -= 8) { data[33 + (i >> 3)] = ((index >> (24 - i)) & 0xff); }

        const I = arrayify(computeHmac(SupportedAlgorithms.sha512, this.chainCode, data));
        const IL = I.slice(0, 32);
        const IR = I.slice(32);

        // The private key
        let ki: string = null

        // The public key
        let Ki: string = null;

        if (this.privateKey) {
            ki = bytes32(BigNumber.from(IL).add(this.privateKey).mod(N));
        } else {
            const ek = new SigningKey(hexlify(IL));
            Ki = ek._addPoint(this.publicKey);
        }

        let mnemonicOrPath: Mnemonic | string = path;

        const srcMnemonic =  this.mnemonic;
        if (srcMnemonic) {
            mnemonicOrPath = Object.freeze({
                phrase: srcMnemonic.phrase,
                path: path,
                locale: (srcMnemonic.locale || "en")
            });
        }

        return new HDNode(_constructorGuard, ki, Ki, this.fingerprint, bytes32(IR), index, this.depth + 1, mnemonicOrPath);
    }

    derivePath(path: string): HDNode {
        const components = path.split("/");

        if (components.length === 0 || (components[0] === "m" && this.depth !== 0)) {
            throw new Error("invalid path - " + path);
        }

        if (components[0] === "m") { components.shift(); }

        let result: HDNode = this;
        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            if (component.match(/^[0-9]+'$/)) {
                const index = parseInt(component.substring(0, component.length - 1));
                if (index >= HardenedBit) { throw new Error("invalid path index - " + component); }
                result = result._derive(HardenedBit + index);
            } else if (component.match(/^[0-9]+$/)) {
                const index = parseInt(component);
                if (index >= HardenedBit) { throw new Error("invalid path index - " + component); }
                result = result._derive(index);
            } else {
                throw new Error("invalid path component - " + component);
            }
        }

        return result;
    }


    static _fromSeed(seed: BytesLike, mnemonic: Mnemonic): HDNode {
        const seedArray: Uint8Array = arrayify(seed);
        if (seedArray.length < 16 || seedArray.length > 64) { throw new Error("invalid seed"); }

        const I: Uint8Array = arrayify(computeHmac(SupportedAlgorithms.sha512, MasterSecret, seedArray));

        return new HDNode(_constructorGuard, bytes32(I.slice(0, 32)), null, "0x00000000", bytes32(I.slice(32)), 0, 0, mnemonic);
    }

    static fromMnemonic(mnemonic: string, password?: string, wordlist?: string | Wordlist): HDNode {

        // If a locale name was passed in, find the associated wordlist
        wordlist = getWordlist(wordlist);

        // Normalize the case and spacing in the mnemonic (throws if the mnemonic is invalid)
        mnemonic = entropyToMnemonic(mnemonicToEntropy(mnemonic, wordlist), wordlist);

        return HDNode._fromSeed(mnemonicToSeed(mnemonic, password), {
            phrase: mnemonic,
            path: "m",
            locale: wordlist.locale
        });
    }

    static fromSeed(seed: BytesLike): HDNode {
        return HDNode._fromSeed(seed, null);
    }

    static fromExtendedKey(extendedKey: string): HDNode {
        const bytes = Base58.decode(extendedKey);

        if (bytes.length !== 82 || base58check(bytes.slice(0, 78)) !== extendedKey) {
            logger.throwArgumentError("invalid extended key", "extendedKey", "[REDACTED]");
        }

        const depth = bytes[4];
        const parentFingerprint = hexlify(bytes.slice(5, 9));
        const index = parseInt(hexlify(bytes.slice(9, 13)).substring(2), 16);
        const chainCode = hexlify(bytes.slice(13, 45));
        const key = bytes.slice(45, 78);

        switch (hexlify(bytes.slice(0, 4))) {
            // Public Key
            case "0x0488b21e": case "0x043587cf":
                return new HDNode(_constructorGuard, null, hexlify(key), parentFingerprint, chainCode, index, depth, null);

            // Private Key
            case "0x0488ade4": case "0x04358394 ":
                if (key[0] !== 0) { break; }
                return new HDNode(_constructorGuard, hexlify(key.slice(1)), null, parentFingerprint, chainCode, index, depth, null);
        }

        return logger.throwError("invalid extended key", "extendedKey", "[REDACTED]");
    }
}

export function mnemonicToSeed(mnemonic: string, password?: string): string {
    if (!password) { password = ""; }

    const salt = toUtf8Bytes("mnemonic" + password, UnicodeNormalizationForm.NFKD);

    return pbkdf2(toUtf8Bytes(mnemonic, UnicodeNormalizationForm.NFKD), salt, 2048, 64, "sha512");
}

export function mnemonicToEntropy(mnemonic: string, wordlist?: string | Wordlist): string {
    wordlist = getWordlist(wordlist);

    logger.checkNormalize();

    const words = wordlist.split(mnemonic);
    if ((words.length % 3) !== 0) { throw new Error("invalid mnemonic"); }

    const entropy = arrayify(new Uint8Array(Math.ceil(11 * words.length / 8)));

    let offset = 0;
    for (let i = 0; i < words.length; i++) {
        let index = wordlist.getWordIndex(words[i].normalize("NFKD"));
        if (index === -1) { throw new Error("invalid mnemonic"); }

        for (let bit = 0; bit < 11; bit++) {
            if (index & (1 << (10 - bit))) {
                entropy[offset >> 3] |= (1 << (7 - (offset % 8)));
            }
            offset++;
        }
    }

    const entropyBits = 32 * words.length / 3;

    const checksumBits = words.length / 3;
    const checksumMask = getUpperMask(checksumBits);

    const checksum = arrayify(sha256(entropy.slice(0, entropyBits / 8)))[0] & checksumMask;

    if (checksum !== (entropy[entropy.length - 1] & checksumMask)) {
        throw new Error("invalid checksum");
    }

    return hexlify(entropy.slice(0, entropyBits / 8));
}

export function entropyToMnemonic(entropy: BytesLike, wordlist?: string | Wordlist): string {
    wordlist = getWordlist(wordlist);

    entropy = arrayify(entropy);

    if ((entropy.length % 4) !== 0 || entropy.length < 16 || entropy.length > 32) {
        throw new Error("invalid entropy");
    }

    const indices: Array<number> = [ 0 ];

    let remainingBits = 11;
    for (let i = 0; i < entropy.length; i++) {

        // Consume the whole byte (with still more to go)
        if (remainingBits > 8) {
            indices[indices.length - 1] <<= 8;
            indices[indices.length - 1] |= entropy[i];

            remainingBits -= 8;

        // This byte will complete an 11-bit index
        } else {
            indices[indices.length - 1] <<= remainingBits;
            indices[indices.length - 1] |= entropy[i] >> (8 - remainingBits);

            // Start the next word
            indices.push(entropy[i] & getLowerMask(8 - remainingBits));

            remainingBits += 3;
        }
    }

    // Compute the checksum bits
    const checksumBits = entropy.length / 4;
    const checksum = arrayify(sha256(entropy))[0] & getUpperMask(checksumBits);

    // Shift the checksum into the word indices
    indices[indices.length - 1] <<= checksumBits;
    indices[indices.length - 1] |= (checksum >> (8 - checksumBits));

    return wordlist.join(indices.map((index) => (<Wordlist>wordlist).getWord(index)));
}

export function isValidMnemonic(mnemonic: string, wordlist?: Wordlist): boolean {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
        return true;
    } catch (error) { }
    return false;
}
