'use strict';

// See: https://github.com/ethereum/wiki/wiki/JSON-RPC

import { getNetwork, Network, Networkish } from './networks';
import { BlockTag, Provider, TransactionRequest, TransactionResponse } from './provider';
import { Signer } from '../wallet/wallet';

import { getAddress } from '../utils/address';
import { BigNumber } from '../utils/bignumber';
import { Arrayish, hexlify, hexStripZeros } from '../utils/bytes';
import { defineReadOnly, resolveProperties } from '../utils/properties';
import { toUtf8Bytes } from '../utils/utf8';
import { ConnectionInfo, fetchJson } from '../utils/web';

import * as errors from '../utils/errors';

function timer(timeout: number): Promise<any> {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, timeout);
    });
}

function getResult(payload) {
    if (payload.error) {
        // @TODO: not any
        var error: any = new Error(payload.error.message);
        error.code = payload.error.code;
        error.data = payload.error.data;
        throw error;
    }

    return payload.result;
}

// Convert an ethers.js transaction into a JSON-RPC transaction
//  - gasLimit => gas
//  - All values hexlified
//  - All numeric values zero-striped
export function hexlifyTransaction(transaction: TransactionRequest) {
    var result: any = {};

    // Some nodes (INFURA ropsten; INFURA mainnet is fine) don't like extra zeros.
    ['gasLimit', 'gasPrice', 'nonce', 'value'].forEach(function(key) {
        if (transaction[key] == null) { return; }
        let value = hexStripZeros(hexlify(transaction[key]));
        if (key === 'gasLimit') { key = 'gas'; }
        result[key] = value;
    });

    ['from', 'to', 'data'].forEach(function(key) {
        if (transaction[key] == null) { return; }
        result[key] = hexlify(transaction[key]);
    });

    return result;
}

function getLowerCase(value: string): string {
    if (value) { return value.toLowerCase(); }
    return value;
}

export class JsonRpcSigner extends Signer {
    readonly provider: JsonRpcProvider;
    readonly _address: string;

    constructor(provider: JsonRpcProvider, address?: string) {
        super();
        errors.checkNew(this, JsonRpcSigner);

        defineReadOnly(this, 'provider', provider);

        // Statically attach to a given address
        if (address) {
            defineReadOnly(this, '_address', address);
        }
    }

    get address(): string {
        if (!this._address) {
            errors.throwError('no sync sync address available; use getAddress', errors.UNSUPPORTED_OPERATION, { operation: 'address' });
        }
        return this._address
    }

    getAddress(): Promise<string> {
        if (this._address) {
            return Promise.resolve(this._address);
        }

        return this.provider.send('eth_accounts', []).then((accounts) => {
            if (accounts.length === 0) {
                errors.throwError('no accounts', errors.UNSUPPORTED_OPERATION, { operation: 'getAddress' });
            }
            return getAddress(accounts[0]);
        });
    }

    getBalance(blockTag?: BlockTag): Promise<BigNumber> {
        return this.provider.getBalance(this.getAddress(), blockTag);
    }

    getTransactionCount(blockTag): Promise<number> {
        return this.provider.getTransactionCount(this.getAddress(), blockTag);
    }

    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
        let tx = hexlifyTransaction(transaction);

        if (tx.from == null) {
            tx.from = this.getAddress().then((address) => {
                if (!address) { return null; }
                return address.toLowerCase();
            });
        }

        return resolveProperties(tx).then((tx) => {
            return this.provider.send('eth_sendTransaction', [ transaction ]);
        });
    }

    signMessage(message: Arrayish | string): Promise<string> {
        var data = ((typeof(message) === 'string') ? toUtf8Bytes(message): message);
        return this.getAddress().then((address) => {

            // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
            return this.provider.send('eth_sign', [ address.toLowerCase(), hexlify(data) ]);
        });
    }

    unlock(password): Promise<boolean> {
        var provider = this.provider;

        return this.getAddress().then(function(address) {
            return provider.send('personal_unlockAccount', [ address.toLowerCase(), password, null ]);
        });
    }
}

export class JsonRpcProvider extends Provider {
    readonly connection: ConnectionInfo;

    private _pendingFilter: Promise<number>;

    constructor(url?: ConnectionInfo | string, network?: Networkish) {

        // One parameter, but it is a network name, so swap it with the URL
        if (typeof(url) === 'string') {
            if (network === null && getNetwork(url)) {
                network = url;
                url = null;
            }
        }

        if (network) {
            // The network has been specified explicitly, we can use it
            super(network);

        } else {

            // The network is unknown, query the JSON-RPC for it
            let ready: Promise<Network> = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.send('net_version', [ ]).then((result) => {
                        let chainId = parseInt(result);

                        resolve(getNetwork(chainId));
                    });
                });
            });
            super(ready);
        }

        errors.checkNew(this, JsonRpcProvider);

        // Default URL
        if (!url) { url = 'http://localhost:8545'; }

        if (typeof(url) === 'string') {
            this.connection = {
                url: url
            };
        } else {
            this.connection = url;
        }

    }

    getSigner(address: string): JsonRpcSigner {
        return new JsonRpcSigner(this, address);
    }

    listAccounts(): Promise<Array<string>> {
        return this.send('eth_accounts', []).then((accounts) => {
            return accounts.map((a) => getAddress(a));
        });
    }

    send(method: string, params: any): Promise<any> {
        var request = {
            method: method,
            params: params,
            id: 42,
            jsonrpc: "2.0"
        };

        return fetchJson(this.connection, JSON.stringify(request), getResult);
    }

    perform(method: string, params: any): Promise<any> {
        switch (method) {
            case 'getBlockNumber':
                return this.send('eth_blockNumber', []);

            case 'getGasPrice':
                return this.send('eth_gasPrice', []);

            case 'getBalance':
                return this.send('eth_getBalance', [ getLowerCase(params.address), params.blockTag ]);

            case 'getTransactionCount':
                return this.send('eth_getTransactionCount', [ getLowerCase(params.address), params.blockTag ]);

            case 'getCode':
                return this.send('eth_getCode', [ getLowerCase(params.address), params.blockTag ]);

            case 'getStorageAt':
                return this.send('eth_getStorageAt', [ getLowerCase(params.address), params.position, params.blockTag ]);

            case 'sendTransaction':
                return this.send('eth_sendRawTransaction', [ params.signedTransaction ]);

            case 'getBlock':
                if (params.blockTag) {
                    return this.send('eth_getBlockByNumber', [ params.blockTag, false ]);
                } else if (params.blockHash) {
                    return this.send('eth_getBlockByHash', [ params.blockHash, false ]);
                }
                return Promise.reject(new Error('invalid block tag or block hash'));

            case 'getTransaction':
                return this.send('eth_getTransactionByHash', [ params.transactionHash ]);

            case 'getTransactionReceipt':
                return this.send('eth_getTransactionReceipt', [ params.transactionHash ]);

            case 'call':
                return this.send('eth_call', [ hexlifyTransaction(params.transaction), 'latest' ]);

            case 'estimateGas':
                return this.send('eth_estimateGas', [ hexlifyTransaction(params.transaction) ]);

            case 'getLogs':
                if (params.filter && params.filter.address != null) {
                    params.filter.address = getLowerCase(params.filter.address);
                }
                return this.send('eth_getLogs', [ params.filter ]);

            default:
                break;
        }

        errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
        return null;
    }

    _startPending(): void {
        if (this._pendingFilter != null) { return; }
        var self = this;

        var pendingFilter: Promise<number> = this.send('eth_newPendingTransactionFilter', []);
        this._pendingFilter = pendingFilter;

        pendingFilter.then(function(filterId) {
            function poll() {
                self.send('eth_getFilterChanges', [ filterId ]).then(function(hashes) {
                    if (self._pendingFilter != pendingFilter) { return null; }

                    var seq = Promise.resolve();
                    hashes.forEach(function(hash) {
                        self._emitted['t:' + hash.toLowerCase()] = 'pending';
                        seq = seq.then(function() {
                            return self.getTransaction(hash).then(function(tx) {
                                self.emit('pending', tx);
                            });
                        });
                    });

                    return seq.then(function() {
                        return timer(1000);
                    });
                }).then(function() {
                    if (self._pendingFilter != pendingFilter) {
                        self.send('eth_uninstallFilter', [ filterId ]);
                        return;
                    }
                    setTimeout(function() { poll(); }, 0);
                });
            }
            poll();

            return filterId;
        });
    }

    _stopPending(): void {
        this._pendingFilter = null;
    }
}
