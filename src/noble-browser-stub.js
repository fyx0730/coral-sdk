/**
 * Browser bundle only uses Web Bluetooth; the Noble (Node) path is never used.
 * A stub avoids pulling @stoprocent/noble into the bundle (and avoids load-time errors).
 */
const stub = {
    on() {},
    once() {},
    removeListener() {},
    stopScanning() {},
    state: 'unsupported'
};

export default stub;
