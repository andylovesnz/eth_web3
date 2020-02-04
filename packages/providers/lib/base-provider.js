"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var abstract_provider_1 = require("@ethersproject/abstract-provider");
var bignumber_1 = require("@ethersproject/bignumber");
var bytes_1 = require("@ethersproject/bytes");
var hash_1 = require("@ethersproject/hash");
var networks_1 = require("@ethersproject/networks");
var properties_1 = require("@ethersproject/properties");
var strings_1 = require("@ethersproject/strings");
var web_1 = require("@ethersproject/web");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var formatter_1 = require("./formatter");
//////////////////////////////
// Event Serializeing
function checkTopic(topic) {
    if (topic == null) {
        return "null";
    }
    if (bytes_1.hexDataLength(topic) !== 32) {
        logger.throwArgumentError("invalid topic", "topic", topic);
    }
    return topic.toLowerCase();
}
function serializeTopics(topics) {
    // Remove trailing null AND-topics; they are redundant
    topics = topics.slice();
    while (topics[topics.length - 1] == null) {
        topics.pop();
    }
    return topics.map(function (topic) {
        if (Array.isArray(topic)) {
            // Only track unique OR-topics
            var unique_1 = {};
            topic.forEach(function (topic) {
                unique_1[checkTopic(topic)] = true;
            });
            // The order of OR-topics does not matter
            var sorted = Object.keys(unique_1);
            sorted.sort();
            return sorted.join("|");
        }
        else {
            return checkTopic(topic);
        }
    }).join("&");
}
function deserializeTopics(data) {
    return data.split(/&/g).map(function (topic) {
        return topic.split("|").map(function (topic) {
            return ((topic === "null") ? null : topic);
        });
    });
}
function getEventTag(eventName) {
    if (typeof (eventName) === "string") {
        eventName = eventName.toLowerCase();
        if (bytes_1.hexDataLength(eventName) === 32) {
            return "tx:" + eventName;
        }
        if (eventName.indexOf(":") === -1) {
            return eventName;
        }
    }
    else if (Array.isArray(eventName)) {
        return "filter:*:" + serializeTopics(eventName);
    }
    else if (abstract_provider_1.ForkEvent.isForkEvent(eventName)) {
        logger.warn("not implemented");
        throw new Error("not implemented");
    }
    else if (eventName && typeof (eventName) === "object") {
        return "filter:" + (eventName.address || "*") + ":" + serializeTopics(eventName.topics || []);
    }
    throw new Error("invalid event - " + eventName);
}
//////////////////////////////
// Helper Object
function getTime() {
    return (new Date()).getTime();
}
//////////////////////////////
// Provider Object
/**
 *  EventType
 *   - "block"
 *   - "pending"
 *   - "error"
 *   - filter
 *   - topics array
 *   - transaction hash
 */
var Event = /** @class */ (function () {
    function Event(tag, listener, once) {
        properties_1.defineReadOnly(this, "tag", tag);
        properties_1.defineReadOnly(this, "listener", listener);
        properties_1.defineReadOnly(this, "once", once);
    }
    Event.prototype.pollable = function () {
        return (this.tag.indexOf(":") >= 0 || this.tag === "block" || this.tag === "pending");
    };
    return Event;
}());
var defaultFormatter = null;
var nextPollId = 1;
var BaseProvider = /** @class */ (function (_super) {
    __extends(BaseProvider, _super);
    function BaseProvider(network) {
        var _newTarget = this.constructor;
        var _this = this;
        logger.checkNew(_newTarget, abstract_provider_1.Provider);
        _this = _super.call(this) || this;
        _this.formatter = _newTarget.getFormatter();
        if (network instanceof Promise) {
            properties_1.defineReadOnly(_this, "ready", network.then(function (network) {
                properties_1.defineReadOnly(_this, "_network", network);
                return network;
            }));
            // Squash any "unhandled promise" errors; that do not need to be handled
            _this.ready.catch(function (error) { });
        }
        else {
            var knownNetwork = properties_1.getStatic((_newTarget), "getNetwork")(network);
            if (knownNetwork) {
                properties_1.defineReadOnly(_this, "_network", knownNetwork);
                properties_1.defineReadOnly(_this, "ready", Promise.resolve(_this._network));
            }
            else {
                logger.throwArgumentError("invalid network", "network", network);
            }
        }
        _this._maxInternalBlockNumber = -1024;
        _this._lastBlockNumber = -2;
        // Events being listened to
        _this._events = [];
        _this._pollingInterval = 4000;
        _this._emitted = { block: -2 };
        _this._fastQueryDate = 0;
        return _this;
    }
    BaseProvider.getFormatter = function () {
        if (defaultFormatter == null) {
            defaultFormatter = new formatter_1.Formatter();
        }
        return defaultFormatter;
    };
    BaseProvider.getNetwork = function (network) {
        return networks_1.getNetwork((network == null) ? "homestead" : network);
    };
    BaseProvider.prototype._getInternalBlockNumber = function (maxAge) {
        return __awaiter(this, void 0, void 0, function () {
            var internalBlockNumber, result, reqTime;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _a.sent();
                        internalBlockNumber = this._internalBlockNumber;
                        if (!(maxAge > 0 && this._internalBlockNumber)) return [3 /*break*/, 3];
                        return [4 /*yield*/, internalBlockNumber];
                    case 2:
                        result = _a.sent();
                        if ((getTime() - result.respTime) <= maxAge) {
                            return [2 /*return*/, result.blockNumber];
                        }
                        _a.label = 3;
                    case 3:
                        reqTime = getTime();
                        this._internalBlockNumber = this.perform("getBlockNumber", {}).then(function (blockNumber) {
                            var respTime = getTime();
                            blockNumber = bignumber_1.BigNumber.from(blockNumber).toNumber();
                            if (blockNumber < _this._maxInternalBlockNumber) {
                                blockNumber = _this._maxInternalBlockNumber;
                            }
                            _this._maxInternalBlockNumber = blockNumber;
                            _this._setFastBlockNumber(blockNumber); // @TODO: Still need this?
                            return { blockNumber: blockNumber, reqTime: reqTime, respTime: respTime };
                        });
                        return [4 /*yield*/, this._internalBlockNumber];
                    case 4: return [2 /*return*/, (_a.sent()).blockNumber];
                }
            });
        });
    };
    BaseProvider.prototype.poll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pollId, runners, blockNumber, i;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pollId = nextPollId++;
                        this.emit("willPoll", pollId);
                        runners = [];
                        return [4 /*yield*/, this._getInternalBlockNumber(100 + this.pollingInterval / 2)];
                    case 1:
                        blockNumber = _a.sent();
                        this._setFastBlockNumber(blockNumber);
                        // If the block has not changed, meh.
                        if (blockNumber === this._lastBlockNumber) {
                            return [2 /*return*/];
                        }
                        // First polling cycle, trigger a "block" events
                        if (this._emitted.block === -2) {
                            this._emitted.block = blockNumber - 1;
                        }
                        // Notify all listener for each block that has passed
                        for (i = this._emitted.block + 1; i <= blockNumber; i++) {
                            this.emit("block", i);
                        }
                        // The emitted block was updated, check for obsolete events
                        if (this._emitted.block !== blockNumber) {
                            this._emitted.block = blockNumber;
                            Object.keys(this._emitted).forEach(function (key) {
                                // The block event does not expire
                                if (key === "block") {
                                    return;
                                }
                                // The block we were at when we emitted this event
                                var eventBlockNumber = _this._emitted[key];
                                // We cannot garbage collect pending transactions or blocks here
                                // They should be garbage collected by the Provider when setting
                                // "pending" events
                                if (eventBlockNumber === "pending") {
                                    return;
                                }
                                // Evict any transaction hashes or block hashes over 12 blocks
                                // old, since they should not return null anyways
                                if (blockNumber - eventBlockNumber > 12) {
                                    delete _this._emitted[key];
                                }
                            });
                        }
                        // First polling cycle
                        if (this._lastBlockNumber === -2) {
                            this._lastBlockNumber = blockNumber - 1;
                        }
                        // Find all transaction hashes we are waiting on
                        this._events.forEach(function (event) {
                            var comps = event.tag.split(":");
                            switch (comps[0]) {
                                case "tx": {
                                    var hash_2 = comps[1];
                                    var runner = _this.getTransactionReceipt(hash_2).then(function (receipt) {
                                        if (!receipt || receipt.blockNumber == null) {
                                            return null;
                                        }
                                        _this._emitted["t:" + hash_2] = receipt.blockNumber;
                                        _this.emit(hash_2, receipt);
                                        return null;
                                    }).catch(function (error) { _this.emit("error", error); });
                                    runners.push(runner);
                                    break;
                                }
                                case "filter": {
                                    var topics = deserializeTopics(comps[2]);
                                    var filter_1 = {
                                        address: comps[1],
                                        fromBlock: _this._lastBlockNumber + 1,
                                        toBlock: blockNumber,
                                        topics: topics
                                    };
                                    if (!filter_1.address) {
                                        delete filter_1.address;
                                    }
                                    var runner = _this.getLogs(filter_1).then(function (logs) {
                                        if (logs.length === 0) {
                                            return;
                                        }
                                        logs.forEach(function (log) {
                                            _this._emitted["b:" + log.blockHash] = log.blockNumber;
                                            _this._emitted["t:" + log.transactionHash] = log.blockNumber;
                                            _this.emit(filter_1, log);
                                        });
                                        return null;
                                    }).catch(function (error) { _this.emit("error", error); });
                                    runners.push(runner);
                                    break;
                                }
                            }
                        });
                        this._lastBlockNumber = blockNumber;
                        Promise.all(runners).then(function () {
                            _this.emit("didPoll", pollId);
                        });
                        return [2 /*return*/, null];
                }
            });
        });
    };
    BaseProvider.prototype.resetEventsBlock = function (blockNumber) {
        this._lastBlockNumber = blockNumber - 1;
        if (this.polling) {
            this.poll();
        }
    };
    Object.defineProperty(BaseProvider.prototype, "network", {
        get: function () {
            return this._network;
        },
        enumerable: true,
        configurable: true
    });
    BaseProvider.prototype.getNetwork = function () {
        return this.ready;
    };
    Object.defineProperty(BaseProvider.prototype, "blockNumber", {
        get: function () {
            return this._fastBlockNumber;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseProvider.prototype, "polling", {
        get: function () {
            return (this._poller != null);
        },
        set: function (value) {
            var _this = this;
            setTimeout(function () {
                if (value && !_this._poller) {
                    _this._poller = setInterval(_this.poll.bind(_this), _this.pollingInterval);
                    _this.poll();
                }
                else if (!value && _this._poller) {
                    clearInterval(_this._poller);
                    _this._poller = null;
                }
            }, 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseProvider.prototype, "pollingInterval", {
        get: function () {
            return this._pollingInterval;
        },
        set: function (value) {
            var _this = this;
            if (typeof (value) !== "number" || value <= 0 || parseInt(String(value)) != value) {
                throw new Error("invalid polling interval");
            }
            this._pollingInterval = value;
            if (this._poller) {
                clearInterval(this._poller);
                this._poller = setInterval(function () { _this.poll(); }, this._pollingInterval);
            }
        },
        enumerable: true,
        configurable: true
    });
    BaseProvider.prototype._getFastBlockNumber = function () {
        var _this = this;
        var now = getTime();
        // Stale block number, request a newer value
        if ((now - this._fastQueryDate) > 2 * this._pollingInterval) {
            this._fastQueryDate = now;
            this._fastBlockNumberPromise = this.getBlockNumber().then(function (blockNumber) {
                if (_this._fastBlockNumber == null || blockNumber > _this._fastBlockNumber) {
                    _this._fastBlockNumber = blockNumber;
                }
                return _this._fastBlockNumber;
            });
        }
        return this._fastBlockNumberPromise;
    };
    BaseProvider.prototype._setFastBlockNumber = function (blockNumber) {
        // Older block, maybe a stale request
        if (this._fastBlockNumber != null && blockNumber < this._fastBlockNumber) {
            return;
        }
        // Update the time we updated the blocknumber
        this._fastQueryDate = getTime();
        // Newer block number, use  it
        if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
            this._fastBlockNumber = blockNumber;
            this._fastBlockNumberPromise = Promise.resolve(blockNumber);
        }
    };
    // @TODO: Add .poller which must be an event emitter with a 'start', 'stop' and 'block' event;
    //        this will be used once we move to the WebSocket or other alternatives to polling
    BaseProvider.prototype.waitForTransaction = function (transactionHash, confirmations, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var receipt;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (confirmations == null) {
                            confirmations = 1;
                        }
                        return [4 /*yield*/, this.getTransactionReceipt(transactionHash)];
                    case 1:
                        receipt = _a.sent();
                        // Receipt is already good
                        if ((receipt ? receipt.confirmations : 0) >= confirmations) {
                            return [2 /*return*/, receipt];
                        }
                        // Poll until the receipt is good...
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var timer = null;
                                var done = false;
                                var handler = function (receipt) {
                                    if (receipt.confirmations < confirmations) {
                                        return;
                                    }
                                    if (timer) {
                                        clearTimeout(timer);
                                    }
                                    if (done) {
                                        return;
                                    }
                                    done = true;
                                    _this.removeListener(transactionHash, handler);
                                    resolve(receipt);
                                };
                                _this.on(transactionHash, handler);
                                if (typeof (timeout) === "number" && timeout > 0) {
                                    timer = setTimeout(function () {
                                        if (done) {
                                            return;
                                        }
                                        timer = null;
                                        done = true;
                                        _this.removeListener(transactionHash, handler);
                                        reject(logger.makeError("timeout exceeded", logger_1.Logger.errors.TIMEOUT, { timeout: timeout }));
                                    }, timeout);
                                    if (timer.unref) {
                                        timer.unref();
                                    }
                                }
                            })];
                }
            });
        });
    };
    BaseProvider.prototype.getBlockNumber = function () {
        return this._getInternalBlockNumber(0);
    };
    BaseProvider.prototype.getGasPrice = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _c.sent();
                        _b = (_a = bignumber_1.BigNumber).from;
                        return [4 /*yield*/, this.perform("getGasPrice", {})];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.getBalance = function (addressOrName, blockTag) {
        return __awaiter(this, void 0, void 0, function () {
            var params, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({
                                address: this._getAddress(addressOrName),
                                blockTag: this._getBlockTag(blockTag)
                            })];
                    case 2:
                        params = _c.sent();
                        _b = (_a = bignumber_1.BigNumber).from;
                        return [4 /*yield*/, this.perform("getBalance", params)];
                    case 3: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.getTransactionCount = function (addressOrName, blockTag) {
        return __awaiter(this, void 0, void 0, function () {
            var params, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({
                                address: this._getAddress(addressOrName),
                                blockTag: this._getBlockTag(blockTag)
                            })];
                    case 2:
                        params = _c.sent();
                        _b = (_a = bignumber_1.BigNumber).from;
                        return [4 /*yield*/, this.perform("getTransactionCount", params)];
                    case 3: return [2 /*return*/, _b.apply(_a, [_c.sent()]).toNumber()];
                }
            });
        });
    };
    BaseProvider.prototype.getCode = function (addressOrName, blockTag) {
        return __awaiter(this, void 0, void 0, function () {
            var params, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({
                                address: this._getAddress(addressOrName),
                                blockTag: this._getBlockTag(blockTag)
                            })];
                    case 2:
                        params = _b.sent();
                        _a = bytes_1.hexlify;
                        return [4 /*yield*/, this.perform("getCode", params)];
                    case 3: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.getStorageAt = function (addressOrName, position, blockTag) {
        return __awaiter(this, void 0, void 0, function () {
            var params, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({
                                address: this._getAddress(addressOrName),
                                blockTag: this._getBlockTag(blockTag),
                                position: Promise.resolve(position).then(function (p) { return bytes_1.hexValue(p); })
                            })];
                    case 2:
                        params = _b.sent();
                        _a = bytes_1.hexlify;
                        return [4 /*yield*/, this.perform("getStorageAt", params)];
                    case 3: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                }
            });
        });
    };
    // This should be called by any subclass wrapping a TransactionResponse
    BaseProvider.prototype._wrapTransaction = function (tx, hash) {
        var _this = this;
        if (hash != null && bytes_1.hexDataLength(hash) !== 32) {
            throw new Error("invalid response - sendTransaction");
        }
        var result = tx;
        // Check the hash we expect is the same as the hash the server reported
        if (hash != null && tx.hash !== hash) {
            logger.throwError("Transaction hash mismatch from Provider.sendTransaction.", logger_1.Logger.errors.UNKNOWN_ERROR, { expectedHash: tx.hash, returnedHash: hash });
        }
        // @TODO: (confirmations? number, timeout? number)
        result.wait = function (confirmations) { return __awaiter(_this, void 0, void 0, function () {
            var receipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // We know this transaction *must* exist (whether it gets mined is
                        // another story), so setting an emitted value forces us to
                        // wait even if the node returns null for the receipt
                        if (confirmations !== 0) {
                            this._emitted["t:" + tx.hash] = "pending";
                        }
                        return [4 /*yield*/, this.waitForTransaction(tx.hash, confirmations)];
                    case 1:
                        receipt = _a.sent();
                        if (receipt == null && confirmations === 0) {
                            return [2 /*return*/, null];
                        }
                        // No longer pending, allow the polling loop to garbage collect this
                        this._emitted["t:" + tx.hash] = receipt.blockNumber;
                        if (receipt.status === 0) {
                            logger.throwError("transaction failed", logger_1.Logger.errors.CALL_EXCEPTION, {
                                transactionHash: tx.hash,
                                transaction: tx,
                                receipt: receipt
                            });
                        }
                        return [2 /*return*/, receipt];
                }
            });
        }); };
        return result;
    };
    BaseProvider.prototype.sendTransaction = function (signedTransaction) {
        return __awaiter(this, void 0, void 0, function () {
            var hexTx, tx, hash, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Promise.resolve(signedTransaction).then(function (t) { return bytes_1.hexlify(t); })];
                    case 2:
                        hexTx = _a.sent();
                        tx = this.formatter.transaction(signedTransaction);
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.perform("sendTransaction", { signedTransaction: hexTx })];
                    case 4:
                        hash = _a.sent();
                        return [2 /*return*/, this._wrapTransaction(tx, hash)];
                    case 5:
                        error_1 = _a.sent();
                        error_1.transaction = tx;
                        error_1.transactionHash = tx.hash;
                        throw error_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    BaseProvider.prototype._getTransactionRequest = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var values, tx, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, transaction];
                    case 1:
                        values = _c.sent();
                        tx = {};
                        ["from", "to"].forEach(function (key) {
                            if (values[key] == null) {
                                return;
                            }
                            tx[key] = Promise.resolve(values[key]).then(function (v) { return (v ? _this._getAddress(v) : null); });
                        });
                        ["gasLimit", "gasPrice", "value"].forEach(function (key) {
                            if (values[key] == null) {
                                return;
                            }
                            tx[key] = Promise.resolve(values[key]).then(function (v) { return (v ? bignumber_1.BigNumber.from(v) : null); });
                        });
                        ["data"].forEach(function (key) {
                            if (values[key] == null) {
                                return;
                            }
                            tx[key] = Promise.resolve(values[key]).then(function (v) { return (v ? bytes_1.hexlify(v) : null); });
                        });
                        _b = (_a = this.formatter).transactionRequest;
                        return [4 /*yield*/, properties_1.resolveProperties(tx)];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype._getFilter = function (filter) {
        return __awaiter(this, void 0, void 0, function () {
            var result, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(filter instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, filter];
                    case 1:
                        filter = _c.sent();
                        _c.label = 2;
                    case 2:
                        result = {};
                        if (filter.address != null) {
                            result.address = this._getAddress(filter.address);
                        }
                        ["blockHash", "topics"].forEach(function (key) {
                            if (filter[key] == null) {
                                return;
                            }
                            result[key] = filter[key];
                        });
                        ["fromBlock", "toBlock"].forEach(function (key) {
                            if (filter[key] == null) {
                                return;
                            }
                            result[key] = _this._getBlockTag(filter[key]);
                        });
                        _b = (_a = this.formatter).filter;
                        return [4 /*yield*/, properties_1.resolveProperties(filter)];
                    case 3: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.call = function (transaction, blockTag) {
        return __awaiter(this, void 0, void 0, function () {
            var params, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({
                                transaction: this._getTransactionRequest(transaction),
                                blockTag: this._getBlockTag(blockTag)
                            })];
                    case 2:
                        params = _b.sent();
                        _a = bytes_1.hexlify;
                        return [4 /*yield*/, this.perform("call", params)];
                    case 3: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.estimateGas = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var params, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({
                                transaction: this._getTransactionRequest(transaction)
                            })];
                    case 2:
                        params = _c.sent();
                        _b = (_a = bignumber_1.BigNumber).from;
                        return [4 /*yield*/, this.perform("estimateGas", params)];
                    case 3: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype._getAddress = function (addressOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var address;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveName(addressOrName)];
                    case 1:
                        address = _a.sent();
                        if (address == null) {
                            logger.throwError("ENS name not configured", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                                operation: "resolveName(" + JSON.stringify(addressOrName) + ")"
                            });
                        }
                        return [2 /*return*/, address];
                }
            });
        });
    };
    BaseProvider.prototype._getBlock = function (blockHashOrBlockTag, includeTransactions) {
        return __awaiter(this, void 0, void 0, function () {
            var blockNumber, params, _a, _b, _c, error_2;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _d.sent();
                        if (!(blockHashOrBlockTag instanceof Promise)) return [3 /*break*/, 3];
                        return [4 /*yield*/, blockHashOrBlockTag];
                    case 2:
                        blockHashOrBlockTag = _d.sent();
                        _d.label = 3;
                    case 3:
                        blockNumber = -128;
                        params = {
                            includeTransactions: !!includeTransactions
                        };
                        if (!bytes_1.isHexString(blockHashOrBlockTag, 32)) return [3 /*break*/, 4];
                        params.blockHash = blockHashOrBlockTag;
                        return [3 /*break*/, 7];
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        _a = params;
                        _c = (_b = this.formatter).blockTag;
                        return [4 /*yield*/, this._getBlockTag(blockHashOrBlockTag)];
                    case 5:
                        _a.blockTag = _c.apply(_b, [_d.sent()]);
                        if (bytes_1.isHexString(params.blockTag)) {
                            blockNumber = parseInt(params.blockTag.substring(2), 16);
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        error_2 = _d.sent();
                        logger.throwArgumentError("invalid block hash or block tag", "blockHashOrBlockTag", blockHashOrBlockTag);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/, web_1.poll(function () { return __awaiter(_this, void 0, void 0, function () {
                            var block, blockNumber_1, i, tx, confirmations;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.perform("getBlock", params)];
                                    case 1:
                                        block = _a.sent();
                                        // Block was not found
                                        if (block == null) {
                                            // For blockhashes, if we didn't say it existed, that blockhash may
                                            // not exist. If we did see it though, perhaps from a log, we know
                                            // it exists, and this node is just not caught up yet.
                                            if (params.blockHash != null) {
                                                if (this._emitted["b:" + params.blockHash] == null) {
                                                    return [2 /*return*/, null];
                                                }
                                            }
                                            // For block tags, if we are asking for a future block, we return null
                                            if (params.blockTag != null) {
                                                if (blockNumber > this._emitted.block) {
                                                    return [2 /*return*/, null];
                                                }
                                            }
                                            // Retry on the next block
                                            return [2 /*return*/, undefined];
                                        }
                                        if (!includeTransactions) return [3 /*break*/, 8];
                                        blockNumber_1 = null;
                                        i = 0;
                                        _a.label = 2;
                                    case 2:
                                        if (!(i < block.transactions.length)) return [3 /*break*/, 7];
                                        tx = block.transactions[i];
                                        if (!(tx.blockNumber == null)) return [3 /*break*/, 3];
                                        tx.confirmations = 0;
                                        return [3 /*break*/, 6];
                                    case 3:
                                        if (!(tx.confirmations == null)) return [3 /*break*/, 6];
                                        if (!(blockNumber_1 == null)) return [3 /*break*/, 5];
                                        return [4 /*yield*/, this._getInternalBlockNumber(100 + 2 * this.pollingInterval)];
                                    case 4:
                                        blockNumber_1 = _a.sent();
                                        _a.label = 5;
                                    case 5:
                                        confirmations = (blockNumber_1 - tx.blockNumber) + 1;
                                        if (confirmations <= 0) {
                                            confirmations = 1;
                                        }
                                        tx.confirmations = confirmations;
                                        _a.label = 6;
                                    case 6:
                                        i++;
                                        return [3 /*break*/, 2];
                                    case 7: return [2 /*return*/, this.formatter.blockWithTransactions(block)];
                                    case 8: return [2 /*return*/, this.formatter.block(block)];
                                }
                            });
                        }); }, { onceBlock: this })];
                }
            });
        });
    };
    BaseProvider.prototype.getBlock = function (blockHashOrBlockTag) {
        return (this._getBlock(blockHashOrBlockTag, false));
    };
    BaseProvider.prototype.getBlockWithTransactions = function (blockHashOrBlockTag) {
        return (this._getBlock(blockHashOrBlockTag, true));
    };
    BaseProvider.prototype.getTransaction = function (transactionHash) {
        return __awaiter(this, void 0, void 0, function () {
            var params;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _a.sent();
                        if (!(transactionHash instanceof Promise)) return [3 /*break*/, 3];
                        return [4 /*yield*/, transactionHash];
                    case 2:
                        transactionHash = _a.sent();
                        _a.label = 3;
                    case 3:
                        params = { transactionHash: this.formatter.hash(transactionHash, true) };
                        return [2 /*return*/, web_1.poll(function () { return __awaiter(_this, void 0, void 0, function () {
                                var result, tx, blockNumber, confirmations;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.perform("getTransaction", params)];
                                        case 1:
                                            result = _a.sent();
                                            if (result == null) {
                                                if (this._emitted["t:" + transactionHash] == null) {
                                                    return [2 /*return*/, null];
                                                }
                                                return [2 /*return*/, undefined];
                                            }
                                            tx = this.formatter.transactionResponse(result);
                                            if (!(tx.blockNumber == null)) return [3 /*break*/, 2];
                                            tx.confirmations = 0;
                                            return [3 /*break*/, 4];
                                        case 2:
                                            if (!(tx.confirmations == null)) return [3 /*break*/, 4];
                                            return [4 /*yield*/, this._getInternalBlockNumber(100 + 2 * this.pollingInterval)];
                                        case 3:
                                            blockNumber = _a.sent();
                                            confirmations = (blockNumber - tx.blockNumber) + 1;
                                            if (confirmations <= 0) {
                                                confirmations = 1;
                                            }
                                            tx.confirmations = confirmations;
                                            _a.label = 4;
                                        case 4: return [2 /*return*/, this._wrapTransaction(tx)];
                                    }
                                });
                            }); }, { onceBlock: this })];
                }
            });
        });
    };
    BaseProvider.prototype.getTransactionReceipt = function (transactionHash) {
        return __awaiter(this, void 0, void 0, function () {
            var params;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _a.sent();
                        if (!(transactionHash instanceof Promise)) return [3 /*break*/, 3];
                        return [4 /*yield*/, transactionHash];
                    case 2:
                        transactionHash = _a.sent();
                        _a.label = 3;
                    case 3:
                        params = { transactionHash: this.formatter.hash(transactionHash, true) };
                        return [2 /*return*/, web_1.poll(function () { return __awaiter(_this, void 0, void 0, function () {
                                var result, receipt, blockNumber, confirmations;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.perform("getTransactionReceipt", params)];
                                        case 1:
                                            result = _a.sent();
                                            if (result == null) {
                                                if (this._emitted["t:" + transactionHash] == null) {
                                                    return [2 /*return*/, null];
                                                }
                                                return [2 /*return*/, undefined];
                                            }
                                            // "geth-etc" returns receipts before they are ready
                                            if (result.blockHash == null) {
                                                return [2 /*return*/, undefined];
                                            }
                                            receipt = this.formatter.receipt(result);
                                            if (!(receipt.blockNumber == null)) return [3 /*break*/, 2];
                                            receipt.confirmations = 0;
                                            return [3 /*break*/, 4];
                                        case 2:
                                            if (!(receipt.confirmations == null)) return [3 /*break*/, 4];
                                            return [4 /*yield*/, this._getInternalBlockNumber(100 + 2 * this.pollingInterval)];
                                        case 3:
                                            blockNumber = _a.sent();
                                            confirmations = (blockNumber - receipt.blockNumber) + 1;
                                            if (confirmations <= 0) {
                                                confirmations = 1;
                                            }
                                            receipt.confirmations = confirmations;
                                            _a.label = 4;
                                        case 4: return [2 /*return*/, receipt];
                                    }
                                });
                            }); }, { onceBlock: this })];
                }
            });
        });
    };
    BaseProvider.prototype.getLogs = function (filter) {
        return __awaiter(this, void 0, void 0, function () {
            var params, logs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, properties_1.resolveProperties({ filter: this._getFilter(filter) })];
                    case 2:
                        params = _a.sent();
                        return [4 /*yield*/, this.perform("getLogs", params)];
                    case 3:
                        logs = _a.sent();
                        logs.forEach(function (log) {
                            if (log.removed == null) {
                                log.removed = false;
                            }
                        });
                        return [2 /*return*/, formatter_1.Formatter.arrayOf(this.formatter.filterLog.bind(this.formatter))(logs)];
                }
            });
        });
    };
    BaseProvider.prototype.getEtherPrice = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ready];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.perform("getEtherPrice", {})];
                }
            });
        });
    };
    BaseProvider.prototype._getBlockTag = function (blockTag) {
        return __awaiter(this, void 0, void 0, function () {
            var blockNumber;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(blockTag instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, blockTag];
                    case 1:
                        blockTag = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(typeof (blockTag) === "number" && blockTag < 0)) return [3 /*break*/, 4];
                        if (blockTag % 1) {
                            logger.throwArgumentError("invalid BlockTag", "blockTag", blockTag);
                        }
                        return [4 /*yield*/, this._getInternalBlockNumber(100 + 2 * this.pollingInterval)];
                    case 3:
                        blockNumber = _a.sent();
                        blockNumber += blockTag;
                        if (blockNumber < 0) {
                            blockNumber = 0;
                        }
                        return [2 /*return*/, this.formatter.blockTag(blockNumber)];
                    case 4: return [2 /*return*/, this.formatter.blockTag(blockTag)];
                }
            });
        });
    };
    BaseProvider.prototype._getResolver = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var network, transaction, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getNetwork()];
                    case 1:
                        network = _c.sent();
                        // No ENS...
                        if (!network.ensAddress) {
                            logger.throwError("network does not support ENS", logger_1.Logger.errors.UNSUPPORTED_OPERATION, { operation: "ENS", network: network.name });
                        }
                        transaction = {
                            to: network.ensAddress,
                            data: ("0x0178b8bf" + hash_1.namehash(name).substring(2))
                        };
                        _b = (_a = this.formatter).callAddress;
                        return [4 /*yield*/, this.call(transaction)];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.resolveName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var resolverAddress, transaction, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(name instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, name];
                    case 1:
                        name = _c.sent();
                        _c.label = 2;
                    case 2:
                        // If it is already an address, nothing to resolve
                        try {
                            return [2 /*return*/, Promise.resolve(this.formatter.address(name))];
                        }
                        catch (error) {
                            // If is is a hexstring, the address is bad (See #694)
                            if (bytes_1.isHexString(name)) {
                                throw error;
                            }
                        }
                        return [4 /*yield*/, this._getResolver(name)];
                    case 3:
                        resolverAddress = _c.sent();
                        if (!resolverAddress) {
                            return [2 /*return*/, null];
                        }
                        transaction = {
                            to: resolverAddress,
                            data: ("0x3b3b57de" + hash_1.namehash(name).substring(2))
                        };
                        _b = (_a = this.formatter).callAddress;
                        return [4 /*yield*/, this.call(transaction)];
                    case 4: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    BaseProvider.prototype.lookupAddress = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var reverseName, resolverAddress, bytes, _a, length, name, addr;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(address instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, address];
                    case 1:
                        address = _b.sent();
                        _b.label = 2;
                    case 2:
                        address = this.formatter.address(address);
                        reverseName = address.substring(2).toLowerCase() + ".addr.reverse";
                        return [4 /*yield*/, this._getResolver(reverseName)];
                    case 3:
                        resolverAddress = _b.sent();
                        if (!resolverAddress) {
                            return [2 /*return*/, null];
                        }
                        _a = bytes_1.arrayify;
                        return [4 /*yield*/, this.call({
                                to: resolverAddress,
                                data: ("0x691f3431" + hash_1.namehash(reverseName).substring(2))
                            })];
                    case 4:
                        bytes = _a.apply(void 0, [_b.sent()]);
                        // Strip off the dynamic string pointer (0x20)
                        if (bytes.length < 32 || !bignumber_1.BigNumber.from(bytes.slice(0, 32)).eq(32)) {
                            return [2 /*return*/, null];
                        }
                        bytes = bytes.slice(32);
                        // Not a length-prefixed string
                        if (bytes.length < 32) {
                            return [2 /*return*/, null];
                        }
                        length = bignumber_1.BigNumber.from(bytes.slice(0, 32)).toNumber();
                        bytes = bytes.slice(32);
                        // Length longer than available data
                        if (length > bytes.length) {
                            return [2 /*return*/, null];
                        }
                        name = strings_1.toUtf8String(bytes.slice(0, length));
                        return [4 /*yield*/, this.resolveName(name)];
                    case 5:
                        addr = _b.sent();
                        if (addr != address) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, name];
                }
            });
        });
    };
    BaseProvider.prototype.perform = function (method, params) {
        return logger.throwError(method + " not implemented", logger_1.Logger.errors.NOT_IMPLEMENTED, { operation: method });
    };
    BaseProvider.prototype._startPending = function () {
        console.log("WARNING: this provider does not support pending events");
    };
    BaseProvider.prototype._stopPending = function () {
    };
    // Returns true if there are events that still require polling
    BaseProvider.prototype._checkPolling = function () {
        this.polling = (this._events.filter(function (e) { return e.pollable(); }).length > 0);
    };
    BaseProvider.prototype._addEventListener = function (eventName, listener, once) {
        this._events.push(new Event(getEventTag(eventName), listener, once));
        if (eventName === "pending") {
            this._startPending();
        }
        // Do we still now have any events that require polling?
        this._checkPolling();
        return this;
    };
    BaseProvider.prototype.on = function (eventName, listener) {
        return this._addEventListener(eventName, listener, false);
    };
    BaseProvider.prototype.once = function (eventName, listener) {
        return this._addEventListener(eventName, listener, true);
    };
    BaseProvider.prototype.emit = function (eventName) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var result = false;
        var eventTag = getEventTag(eventName);
        this._events = this._events.filter(function (event) {
            if (event.tag !== eventTag) {
                return true;
            }
            setTimeout(function () {
                event.listener.apply(_this, args);
            }, 0);
            result = true;
            return !(event.once);
        });
        // Do we still have any events that require polling? ("once" events remove themselves)
        this._checkPolling();
        return result;
    };
    BaseProvider.prototype.listenerCount = function (eventName) {
        if (!eventName) {
            return this._events.length;
        }
        var eventTag = getEventTag(eventName);
        return this._events.filter(function (event) {
            return (event.tag === eventTag);
        }).length;
    };
    BaseProvider.prototype.listeners = function (eventName) {
        if (eventName == null) {
            return this._events.map(function (event) { return event.listener; });
        }
        var eventTag = getEventTag(eventName);
        return this._events
            .filter(function (event) { return (event.tag === eventTag); })
            .map(function (event) { return event.listener; });
    };
    BaseProvider.prototype.off = function (eventName, listener) {
        if (listener == null) {
            return this.removeAllListeners(eventName);
        }
        var found = false;
        var eventTag = getEventTag(eventName);
        this._events = this._events.filter(function (event) {
            if (event.tag !== eventTag || event.listener != listener) {
                return true;
            }
            if (found) {
                return true;
            }
            found = true;
            return false;
        });
        if (eventName === "pending" && this.listenerCount("pending") === 0) {
            this._stopPending();
        }
        // Do we still have any events that require polling?
        this._checkPolling();
        return this;
    };
    BaseProvider.prototype.removeAllListeners = function (eventName) {
        if (eventName == null) {
            this._events = [];
            this._stopPending();
        }
        else {
            var eventTag_1 = getEventTag(eventName);
            this._events = this._events.filter(function (event) {
                return (event.tag !== eventTag_1);
            });
            if (eventName === "pending") {
                this._stopPending();
            }
        }
        // Do we still have any events that require polling?
        this._checkPolling();
        return this;
    };
    return BaseProvider;
}(abstract_provider_1.Provider));
exports.BaseProvider = BaseProvider;
