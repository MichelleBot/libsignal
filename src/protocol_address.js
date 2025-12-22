// vim: ts=4:sw=4:expandtab

class ProtocolAddress {

    static from(encodedAddress) {
        if (typeof encodedAddress !== 'string') {
            throw new Error('Invalid address encoding: not a string');
        }

        // This allows the ID part to contain dots (e.g. 'user.name' or '123@s.whatsapp.net')
        const lastDotIndex = encodedAddress.lastIndexOf('.');
        
        if (lastDotIndex === -1) {
            throw new Error('Invalid address encoding: missing device ID separator');
        }

        const id = encodedAddress.substring(0, lastDotIndex);
        const deviceIdString = encodedAddress.substring(lastDotIndex + 1);
        const deviceId = parseInt(deviceIdString, 10);

        if (isNaN(deviceId)) {
            throw new Error('Invalid address encoding: device ID is not a number');
        }

        return new this(id, deviceId);
    }

    constructor(id, deviceId) {
        if (typeof id !== 'string') {
            throw new TypeError('id required for addr');
        }
        
        this.id = id;
        
        if (typeof deviceId !== 'number') {
            throw new TypeError('number required for deviceId');
        }
        this.deviceId = deviceId;
    }

    toString() {
        return `${this.id}.${this.deviceId}`;
    }

    is(other) {
        if (!(other instanceof ProtocolAddress)) {
            return false;
        }
        return other.id === this.id && other.deviceId === this.deviceId;
    }
}

module.exports = ProtocolAddress