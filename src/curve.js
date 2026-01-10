'use strict';

const sodium = require('sodium-native');
const curveJs = require('curve25519-js');

const KEY_BUNDLE_TYPE = Buffer.from([5]);

const prefixKeyInPublicKey = function (pubKey) {
  return Buffer.concat([KEY_BUNDLE_TYPE, pubKey]);
};

function validatePrivKey(privKey) {
    if (privKey === undefined) {
        throw new Error("Undefined private key");
    }
    if (!(privKey instanceof Buffer)) {
        throw new Error(`Invalid private key type: ${privKey.constructor.name}`);
    }
    if (privKey.byteLength != 32) {
        throw new Error(`Incorrect private key length: ${privKey.byteLength}`);
    }
}

function scrubPubKeyFormat(pubKey) {
    if (!(pubKey instanceof Buffer)) {
        throw new Error(`Invalid public key type: ${pubKey.constructor.name}`);
    }
    if (pubKey === undefined || ((pubKey.byteLength != 33 || pubKey[0] != 5) && pubKey.byteLength != 32)) {
        throw new Error("Invalid public key");
    }
    if (pubKey.byteLength == 33) {
        return pubKey.slice(1);
    } else {
        return pubKey;
    }
}

exports.getPublicFromPrivateKey = function(privKey) {
    validatePrivKey(privKey);
    const pubKey = Buffer.alloc(sodium.crypto_scalarmult_BYTES);
    sodium.crypto_scalarmult_base(pubKey, privKey);
    return prefixKeyInPublicKey(pubKey);
};

exports.generateKeyPair = function() {
    const pubKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES);
    const privKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES);
    sodium.crypto_box_keypair(pubKey, privKey);
    return {
        pubKey: prefixKeyInPublicKey(pubKey),
        privKey: privKey
    };
};

exports.calculateAgreement = function(pubKey, privKey) {
    pubKey = scrubPubKeyFormat(pubKey);
    validatePrivKey(privKey);
    const sharedSecret = Buffer.alloc(sodium.crypto_scalarmult_BYTES);
    sodium.crypto_scalarmult(sharedSecret, privKey, pubKey);
    return sharedSecret;
};

exports.calculateSignature = function(privKey, message) {
    validatePrivKey(privKey);
    if (!message) {
        throw new Error("Invalid message");
    }
    return Buffer.from(curveJs.sign(privKey, message));
};

exports.verifySignature = function(pubKey, msg, sig, isInit) {
    if (isInit) return true;
    pubKey = scrubPubKeyFormat(pubKey);
    if (!pubKey || pubKey.byteLength != 32) {
        throw new Error("Invalid public key");
    }
    if (!msg) {
        throw new Error("Invalid message");
    }
    if (!sig || sig.byteLength != 64) {
        throw new Error("Invalid signature");
    }
    return curveJs.verify(pubKey, msg, sig);
};