# Snap! 积木代码文档（多设备：双电机 + 控制器）

本文档配合托管脚本 **`coral.js`**（如 `https://fyx0730.github.io/coral-sdk/coral.js`）使用。通过 **`globalThis.coral`** 单例管理多台设备；**不要**为每台设备 `new Coral()`。

## 使用前准备

1. 在 Snap 中启用 **Extension Blocks**（齿轮 → 设置），并按环境要求允许 **JavaScript** / **src_load**。
2. 用 **`src_load(url)`** 或页面 `<script>` 加载 `coral.js`。
3. 积木内 **JavaScript function** 的形参必须是合法标识符（**不能**使用 `a.b` 带点号的形式）。

## 设备类型 `kind`（`CoralDeviceKind`）

构建后的 `coral.js` 会挂载 **`globalThis.CoralDeviceKind`**，可与数字互换：

| 含义       | 数字 | 常量名 (`CoralDeviceKind`) |
|------------|------|----------------------------|
| 单电机     | 0    | `SingleMotor`              |
| 双电机     | 1    | `DoubleMotor`              |
| 颜色传感器 | 2    | `ColorSensor`              |
| 控制器     | 3    | `Controller`               |

下文示例统一用 **`globalThis.CoralDeviceKind`**，避免多台设备时写错魔数。

## 推荐执行顺序（多台设备）

1. **Coral 初始化集线器**（一次）
2. **Coral 注册多设备事件监听**（一次，建议在第一次扫描前执行）
3. **Coral 扫描并连接** → 选第一台设备（如手柄）
4. **Coral 扫描并连接** → 再选第二台设备（如双电机）
5. 使用 **按类型驱动 / 读传感器** 等积木（内部按 `kind` 查找，**不**使用 `getDevices()[0]`）

Web Bluetooth 下每次 **`scan()`** 只配对一台；几台设备就执行几次「扫描并连接」。

---

## 积木一览

| 积木名称（建议） | 类型 | 说明 |
|------------------|------|------|
| Coral 初始化集线器 | 命令 | 创建 `globalThis.coral` |
| Coral 扫描并连接下一台设备 | 命令 | 对当前集线器再扫一台 |
| Coral 注册多设备事件监听 | 命令 | 监听 `discover`，为每台设备挂一次传感器回调 |
| Coral 按类型取设备信息 | 报告器，输入 `kindNum` | 返回名称/uuid 等字符串，便于显示 |
| Coral 指定类型是否已连接 | 报告器，输入 `kindNum` | `true` / `false` |
| Coral 双电机 坦克驱动 | 命令，输入 `左速`、`右速` | 仅操作 `kind === DoubleMotor` |
| Coral 双电机 停止 | 命令 | 仅停止双电机那台 |
| Coral 左电机角度 | 报告器 | 依赖监听里写入的 `__leftPos` |
| Coral 右电机角度 | 报告器 | 同上 |
| Coral 手柄 左摇杆 | 报告器 | `-100`～`100` |
| Coral 手柄 右摇杆 | 报告器 | 同上 |
| Coral 手柄 按键是否按下 | 报告器 | `true` / `false` |
| Coral 重置监听注册标记 | 命令 | 换设备或重连前可选 |

---

## 1. Coral 初始化集线器

**类型：** 命令（无输入，或仅用 `运行 JavaScript`）

```javascript
if (!globalThis.Coral) {
  console.error('Coral SDK 未加载，请先 src_load 或引入 coral.js');
  return;
}
if (!globalThis.coral) {
  globalThis.coral = new globalThis.Coral();
}
```

---

## 2. Coral 扫描并连接下一台设备

**类型：** 命令

```javascript
var hub = globalThis.coral;
if (!hub) return;
void hub.scan().catch(function (e) {
  console.error(e);
});
```

每台新设备执行一次；需用户手势弹出系统蓝牙选择框。

---

## 3. Coral 注册多设备事件监听

**类型：** 命令（整个项目 **只执行一次**，可放在绿旗第一条链）

为多台设备自动注册：每发现一台，按 `kind` 只挂 **一轮** `motor` / `notification` 或 `joystick`（`device.__snapHooks === true` 防重复）。

```javascript
var hub = globalThis.coral;
if (!hub || !hub.on) return;

if (globalThis.__coralDiscoverHooked) return;
globalThis.__coralDiscoverHooked = true;

var K = globalThis.CoralDeviceKind || { DoubleMotor: 1, Controller: 3 };

hub.on('discover', function (device) {
  if (!device || device.__snapHooks) return;
  device.__snapHooks = true;

  function hookMotorFromChunks(chunks) {
    if (!chunks || !chunks.length) return;
    for (var i = 0; i < chunks.length; i++) {
      var item = chunks[i];
      if (!item || item.kind !== 'motor') continue;
      if (item.motorBitMask === 1) globalThis.__leftPos = item.absolutePosition;
      if (item.motorBitMask === 2) globalThis.__rightPos = item.absolutePosition;
      if (item.motorBitMask === 3) {
        globalThis.__leftPos = item.absolutePosition;
        globalThis.__rightPos = item.absolutePosition;
      }
    }
  }

  function hookPadFromChunks(chunks) {
    if (!chunks || !chunks.length) return;
    for (var j = 0; j < chunks.length; j++) {
      var ev = chunks[j];
      if (!ev) continue;
      if (ev.kind === 'joystick') {
        globalThis.__joyL = ev.leftPercent;
        globalThis.__joyR = ev.rightPercent;
        globalThis.__joyLdeg = ev.leftAngle;
        globalThis.__joyRdeg = ev.rightAngle;
      }
      if (ev.kind === 'button') {
        globalThis.__btnPressed = ev.pressed;
      }
    }
  }

  function attachDoubleMotor(d) {
    void d.connect()
      .then(function () {
        d.on('motor', function (item) {
          hookMotorFromChunks([item]);
        });
      })
      .catch(function () {
        d.connection.on('notification', hookMotorFromChunks);
      });
  }

  function attachController(d) {
    void d.connect()
      .then(function () {
        d.on('joystick', function (p) {
          hookPadFromChunks([p]);
        });
        d.on('button', function (p) {
          hookPadFromChunks([p]);
        });
      })
      .catch(function () {
        d.connection.on('notification', hookPadFromChunks);
      });
  }

  if (device.kind === K.DoubleMotor) {
    attachDoubleMotor(device);
  } else if (device.kind === K.Controller) {
    attachController(device);
  }
});
```

**说明：** 若旧版本 `coral.js` 没有 `CoralDeviceKind`，请将 `K.DoubleMotor` / `K.Controller` 改为数字 **`1`** / **`3`**。

---

## 4. Coral 按类型查找设备（内部逻辑）

以下积木用同一策略：**遍历 `getDevices()`，匹配 `kind`**，绝不假定下标 `0`。

```javascript
function coralFindByKind(kindNum) {
  var hub = globalThis.coral;
  if (!hub) return null;
  var n = Number(kindNum);
  var list = hub.getDevices();
  for (var i = 0; i < list.length; i++) {
    if (list[i].kind === n) return list[i];
  }
  return null;
}
```

Snap 中可将上述逻辑 **展开**进每个积木（见下文），因为自定义块里通常不能共享函数声明。

---

## 5. Coral 按类型取设备信息

**类型：** 报告器 · **输入：** `kindNum`（可与枚举一致：双电机为 `CoralDeviceKind.DoubleMotor` 的数值）

```javascript
JavaScript function (kindNum) {
  var hub = globalThis.coral;
  if (!hub) return '';
  var n = Number(kindNum);
  var list = hub.getDevices();
  for (var i = 0; i < list.length; i++) {
    if (list[i].kind !== n) continue;
    var d = list[i];
    var name = (d.info && d.info.name) ? String(d.info.name) : '';
    var uuid = (d.info && d.info.uuid) ? String(d.info.uuid) : '';
    return name || uuid || 'connected';
  }
  return '';
}
```

在 Snap 里可把 **`kindNum`** 换成常量积木：`globalThis.CoralDeviceKind.DoubleMotor`（需在 JS 里写成能算出数字的表达式，或直接填 **`1`** / **`3`**）。

---

## 6. Coral 指定类型是否已连接

**类型：** 报告器 · **输入：** `kindNum`

```javascript
JavaScript function (kindNum) {
  var hub = globalThis.coral;
  if (!hub) return false;
  var n = Number(kindNum);
  var list = hub.getDevices();
  for (var i = 0; i < list.length; i++) {
    if (list[i].kind !== n) continue;
    var d = list[i];
    return Boolean(d.connection && d.connection.isOpen);
  }
  return false;
}
```

---

## 7. Coral 双电机 坦克驱动

**类型：** 命令 · **输入：** `左速`、`右速`（-100～100）

```javascript
JavaScript function (左速, 右速) {
  var hub = globalThis.coral;
  if (!hub) return;
  var K = globalThis.CoralDeviceKind ? globalThis.CoralDeviceKind.DoubleMotor : 1;
  var list = hub.getDevices();
  var d = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].kind === K && list[i].moveAtDualSpeed) {
      d = list[i];
      break;
    }
  }
  if (!d) return;
  void d.moveAtDualSpeed(Number(左速), Number(右速)).catch(function (e) {
    console.error(e);
  });
}
```

若 Snap 不接受中文参数名，可改为 **`JavaScript function (L, R)`**，体内把 **`左速`/`右速`** 换成 **`L`/`R`**。

---

## 8. Coral 双电机 停止

**类型：** 命令

```javascript
var hub = globalThis.coral;
if (!hub) return;
var K = globalThis.CoralDeviceKind ? globalThis.CoralDeviceKind.DoubleMotor : 1;
var list = hub.getDevices();
var d = null;
for (var i = 0; i < list.length; i++) {
  if (list[i].kind === K) {
    d = list[i];
    break;
  }
}
if (!d) return;
if (d.stopMoving) {
  void d.stopMoving().catch(function (e) {
    console.error(e);
  });
} else if (globalThis.MotorPort && d.stopMotor) {
  void d.stopMotor(globalThis.MotorPort.Both).catch(function (e) {
    console.error(e);
  });
}
```

---

## 9. Coral 左电机角度 / 右电机角度

**类型：** 报告器（无输入）

左：

```javascript
return globalThis.__leftPos;
```

右：

```javascript
return globalThis.__rightPos;
```

需已执行 **「注册多设备事件监听」** 且双电机已 `discover`；可先转动电机再读数。

---

## 10. Coral 手柄 左摇杆 / 右摇杆 / 按键

**类型：** 报告器

左摇杆百分比：

```javascript
return globalThis.__joyL;
```

右摇杆百分比：

```javascript
return globalThis.__joyR;
```

按键是否按下：

```javascript
return globalThis.__btnPressed === true;
```

---

## 11. Coral 重置监听注册标记

**类型：** 命令（重新扫新设备前若需重新挂 `discover`，可先清标记；一般刷新页面更简单）

```javascript
globalThis.__coralDiscoverHooked = false;
```

注意：将 `false` 后需 **再次执行「注册多设备事件监听」**；已挂过钩的旧设备对象上的 **`__snapHooks`** 不会自动清除，复杂场景建议 **刷新页面** 再起项目。

---

## 多设备场景注意点

| 问题 | 做法 |
|------|------|
| 两台设备只看到一个 | 确认 **`scan()` 执行了两次**，且始终用 **`globalThis.coral` 单例** |
| 控制错了设备 | 所有驱动积木 **按 `kind` 查找**，禁止写死 `getDevices()[0]` |
| 角度/摇杆无数据 | 确认已 **先注册 discover 监听** 再扫描；必要时让电机或摇杆动起来 |
| 不支持 `await` | 使用 **`void x.then(...).catch(...)`**（文内已按此写法） |

---

## 版本与脚本

重新部署 `coral.js` 后，`globalThis` 上会包含 **`CoralDeviceKind`**、**`ControllerDevice`** 等与本文一致的符号（见仓库 `src/main.js`）。
