import {
    Coral,
    CoralDeviceKind,
    SingleMotorDevice,
    DoubleMotorDevice,
    ControllerDevice,
    MotorDirection,
    MotorPort,
    MotionGesture
} from "node-coral/dist/web/index.js";
import { createImuResetYawAxisCommand } from "node-coral/dist/web/protocol.js";

// 挂到全局（classic script 里用 globalThis 最稳）

const g = globalThis;

g.Coral = Coral;

g.CoralDeviceKind = CoralDeviceKind;

g.SingleMotorDevice = SingleMotorDevice;

g.DoubleMotorDevice = DoubleMotorDevice;

g.ControllerDevice = ControllerDevice;

g.MotorDirection = MotorDirection;

g.MotorPort = MotorPort;

g.MotionGesture = MotionGesture;

g.createImuResetYawAxisCommand = createImuResetYawAxisCommand;

console.log("Coral SDK Loaded");