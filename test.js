// @TODO: Move to an actual unit test system

var crypto = require('crypto');

var ethereumTx = require('ethereumjs-tx');
var ethereumUtil = require('ethereumjs-util');
var iban = require('./node_modules/web3/lib/web3/iban.js');

var Wallet = require('./index.js');

function randomBytes(length) {
    return crypto.randomBytes(length);
}

function randomHex(length) {
    if (length === 0) { return undefined; }
    var bytes = randomBytes(length);
    var hex = bytes.toString('hex');

    if (length) {
        if (bytes[0] >= 128) {
            hex = hex.toUpperCase();
        } else {
            hex = hex.toLowerCase();
        }
    }

    return '0x' + hex;
}

(function() {
    var abi = {
        "SimpleStorage": [
            {
                "constant":true,
                "inputs":[],
                "name":"getValue",
                "outputs":[{"name":"","type":"string"}],
                "type":"function"
            }, {
                "constant":false,
                "inputs":[{"name":"value","type":"string"}],
                "name":"setValue",
                "outputs":[],
                "type":"function"
            }, {
                "anonymous":false,
                "inputs":[
                    {"indexed":false,"name":"oldValue","type":"string"},
                    {"indexed":false,"name":"newValue","type":"string"}
                ],
                "name":"valueChanged",
                "type":"event"
            }
        ]
    }
/*
    var privateKey = Wallet.utils.Buffer(32);
    privateKey.fill(0x42);

    var wallet = new Wallet(privateKey);
*/
    var contract = new Wallet._Contract(abi.SimpleStorage);
    var getValue = contract.getValue()
    var setValue = contract.setValue("foobar");
    var valueChanged = contract.valueChanged()
    console.log(getValue, setValue, valueChanged);
})();

(function() {
    for (var i = 0; i < 1000; i++) {
        var privateKey = randomBytes(32);
        var official = '0x' + ethereumUtil.privateToAddress(privateKey).toString('hex');
        var ethers = (new Wallet(privateKey)).address;
        if (ethers !== ethereumUtil.toChecksumAddress(official)) {
            console.log(i);
            console.log('A', official);
            console.log('B', ethers);
            throw new Error('What?');
        }
    }
})();

(function() {
    function testAddress(address) {
        var officialIban = (iban.fromAddress(address))._iban;

        var ethersAddress = Wallet.getAddress(officialIban);
        var officialAddress = ethereumUtil.toChecksumAddress(address)

        if (officialAddress !== ethersAddress) {
            console.log('A', officialAddress);
            console.log('B', ethersAddress);
            throw new Error('waht?! address');
        }

        var ethersIban = Wallet.getIcapAddress(address);

        if (officialIban !== ethersIban) {
            console.log('A', officialIban);
            console.log('B', ethersIban);
            throw new Error('waht?! icap');
        }
    }

    testAddress('0x0000000000000000000000000000000000000000');
    testAddress('0xffffffffffffffffffffffffffffffffffffffff');
    for (var i = 0; i < 10000; i++) {
        testAddress(randomHex(20));
    }
})();

(function() {
    function testAddress(address) {
        var official = ethereumUtil.toChecksumAddress(address);
        var ethers = Wallet.getAddress(address);
        if (official !== ethers) {
            console.log('A', official);
            console.log('B', ethers);
            throw new Error('waht?!');
        }
    }
    testAddress('0x0000000000000000000000000000000000000000');
    testAddress('0xffffffffffffffffffffffffffffffffffffffff');
    for (var i = 0; i < 10000; i++) {
        testAddress(randomHex(20));
    }
})();

(function() {
    function testTransaction(privateKey, transaction, signature) {
        var rawTransaction = new ethereumTx(transaction);
        rawTransaction.sign(privateKey);
        var official = '0x' + rawTransaction.serialize().toString('hex');

        var ethers = (new Wallet(privateKey)).sign(transaction);

        if (ethers !== official) {
            console.log('A', ethers);
            console.log('B', official);
            throw new Error('What?');
        }
    }

    for (var i = 0; i < 1000; i++) {
        var transaction = {
            to: randomHex(20),
            data: randomHex(parseInt(10 * Math.random())),
            gasLimit: randomHex(parseInt(10 * Math.random())),
            gasPrice: randomHex(parseInt(10 * Math.random())),
            value: randomHex(parseInt(10 * Math.random())),
            nonce: randomHex(parseInt(10 * Math.random())),
        };

        testTransaction(randomBytes(32), transaction);
    }

    // See: https://github.com/ethereumjs/ethereumjs-tx/blob/master/test/txs.json
    testTransaction(new Buffer('164122e5d39e9814ca723a749253663bafb07f6af91704d9754c361eb315f0c1', 'hex'), {
        nonce: "0x",
        gasPrice: "0x09184e72a000",
        gasLimit: "0x2710",
        to: "0x0000000000000000000000000000000000000000",
        value: "0x",
        data: "0x7f7465737432000000000000000000000000000000000000000000000000000000600057",
    }, {
        v: "0x1c",
        r: "0x5e1d3a76fbf824220eafc8c79ad578ad2b67d01b0c2425eb1f1347e8f50882ab",
        s: "0x5bd428537f05f9830e93792f90ea6a3e2d1ee84952dd96edbae9f658f831ab13"
    });

    testTransaction(new Buffer('e0a462586887362a18a318b128dbc1e3a0cae6d4b0739f5d0419ec25114bc722', 'hex'), {
        nonce: "0x06",
        gasPrice: "0x09184e72a000",
        gasLimit: "0x01f4",
        to: "0xbe862ad9abfe6f22bcb087716c7d89a26051f74c",
        value: "0x016345785d8a0000",
        data: "0x",
    }, {
        v: "0x1c",
        r: "0x24a484bfa7380860e9fa0a9f5e4b64b985e860ca31abd36e66583f9030c2e29d",
        s: "0x4d5ef07d9e73fa2fbfdad059591b4f13d0aa79e7634a2bb00174c9200cabb04d"
    });

    testTransaction(new Buffer('164122e5d39e9814ca723a749253663bafb07f6af91704d9754c361eb315f0c1', 'hex'), {
        nonce: "0x06",
        gasPrice: "0x09184e72a000",
        gasLimit: "0x0974",
        to: "0xbe862ad9abfe6f22bcb087716c7d89a26051f74c",
        value: "0x016345785d8a0000",
        data: "0x00000000000000000000000000000000000000000000000000000000000000ad000000000000000000000000000000000000000000000000000000000000fafa0000000000000000000000000000000000000000000000000000000000000dfa0000000000000000000000000000000000000000000000000000000000000dfa00000000000000000000000000000000000000000000000000000000000000ad000000000000000000000000000000000000000000000000000000000000000f000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000df000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000df000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000d",
    }, {
        v: "0x1c",
        r: "0x5e9361ca27e14f3af0e6b28466406ad8be026d3b0f2ae56e3c064043fb73ec77",
        s: "0x29ae9893dac4f9afb1af743e25fbb6a63f7879a61437203cb48c997b0fcefc3a"
    });
})();

