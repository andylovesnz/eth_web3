var rlp = require('rlp');

var Contract = require('./lib/contract.js');
var secretStorage = require('./lib/secret-storage.js');
var SigningKey = require('./lib/signing-key.js');
var Wallet = require('./lib/wallet.js');

var utils = require('./lib/utils.js');
var BN = utils.BN;


var exportUtils = {};
utils.defineProperty(Wallet, 'utils', exportUtils);

utils.defineProperty(exportUtils, 'BN', BN);
utils.defineProperty(exportUtils, 'Buffer', Buffer);

utils.defineProperty(exportUtils, 'sha3', utils.sha3);
utils.defineProperty(exportUtils, 'sha256', utils.sha256);

// http://ethereum.stackexchange.com/questions/760/how-is-the-address-of-an-ethereum-contract-computed
utils.defineProperty(exportUtils, 'getContractAddress', function(transaction) {
    return SigningKey.getAddress('0x' + utils.sha3(rlp.encode([
        utils.hexOrBuffer(utils.getAddress(transaction.from)),
        utils.hexOrBuffer(utils.hexlify(transaction.nonce, 'nonce'))
    ])).slice(12).toString('hex'));
});

module.exports = Wallet;


utils.defineProperty(Wallet, 'getAddress', SigningKey.getAddress);
utils.defineProperty(Wallet, 'getIcapAddress', SigningKey.getIcapAddress);

utils.defineProperty(Wallet, 'isCrowdsaleWallet', secretStorage.isCrowdsaleWallet);
utils.defineProperty(Wallet, 'isValidWallet', secretStorage.isValidWallet);

utils.defineProperty(Wallet, 'decryptCrowdsale', function(json, password) {
    return new Wallet(secretStorage.decryptCrowdsale(json, password));
});

utils.defineProperty(Wallet, 'decrypt', function(json, password, callback) {
    if (typeof(callback) !== 'function') { throw new Error('invalid callback'); }

    secretStorage.decrypt(json, password, function(error, signingKey, progress) {
        if (signingKey) {
            return callback(error, new Wallet(signingKey), progress);
        }
        return callback(error, signingKey, progress);
    });
});

utils.defineProperty(Wallet.prototype, 'encrypt', function(password, options, callback) {
    if (typeof(options) === 'function' && !callback) {
        callback = options;
        options = {};
    }
    if (typeof(callback) !== 'function') { throw new Error('invalid callback'); }

    secretStorage.encrypt(this.privateKey, password, options, callback);
});

module.exports = Wallet;
