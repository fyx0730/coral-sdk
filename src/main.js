import {
    Coral,
    SingleMotorDevice,
    DoubleMotorDevice,
    MotorDirection,
    MotorPort
} from "node-coral/dist/web/index.js";

// 挂到全局（classic script 里用 globalThis 最稳）

const g = globalThis;

g.Coral = Coral;

g.SingleMotorDevice = SingleMotorDevice;

g.DoubleMotorDevice = DoubleMotorDevice;

g.MotorDirection = MotorDirection;

g.MotorPort = MotorPort;

console.log("Coral SDK Loaded");