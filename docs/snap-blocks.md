# Snap! 积木代码文档（多设备：双电机 + 控制器）

本文档配合托管脚本 **`coral.js`**（如 `https://fyx0730.github.io/coral-sdk/coral.js`）使用。通过 **`globalThis.coral`** 单例管理多台设备；**不要**为每台设备 `new Coral()`。**双电机主机**上的 **IMU** 与官方 Scratch **Motion Sensor** 类积木对应关系见 **§11**。

## 使用前准备

1. 在 Snap 中启用 **Extension Blocks**（齿轮 → 设置），并按环境要求允许 **JavaScript** / `src_load`。
2. 用 **`src_load(url)`** 或页面 `<script>` 加载 `coral.js`。
3. 积木内 **JavaScript function** 的形参必须是合法标识符（**不能**使用 `a.b` 带点号的形式）。

## 设备类型 `kind`（`CoralDeviceKind`）

构建后的 `coral.js` 会挂载 **`globalThis.CoralDeviceKind`**：

| 含义       | 数字 | 常量名 (`CoralDeviceKind`) |
|------------|------|----------------------------|
| 单电机     | 0    | `SingleMotor`              |
| 双电机     | 1    | `DoubleMotor`              |
| 颜色传感器 | 2    | `ColorSensor`              |
| 控制器     | 3    | `Controller`               |

## 推荐执行顺序（多台设备）

1. **Coral 初始化集线器**（一次）
2. **Coral 注册多设备事件监听**（一次，建议在第一次扫描前执行）
3. **Coral 扫描并连接** → 第一台（如手柄）
4. **Coral 扫描并连接** → 第二台（如双电机）
5. 其余积木（均按 **`kind`** 查找，**不**使用 `getDevices()[0]`）

---

## 积木一览

| 积木名称（建议） | 类型 | 说明 |
|------------------|------|------|
| Coral 初始化集线器 | 命令 | 创建 `globalThis.coral` |
| Coral 扫描并连接下一台设备 | 命令 | 再扫一台 |
| Coral 注册多设备事件监听 | 命令 | `discover` 上挂电机/手柄监听 |
| Coral 按类型取设备信息 | 报告器 `kindNum` | 名称或 uuid 字符串 |
| Coral 指定类型是否已连接 | 报告器 `kindNum` | `true` / `false` |
| Coral 双电机 坦克驱动 | 命令 `leftSpeed, rightSpeed` | 仅 `DoubleMotor` |
| Coral 双电机 停止 | 命令 `which` | 仅双电机；**`left`** / **`right`** / **`both`** |
| Coral 双电机 · **`[left ▾] motor angle`** | 报告器 `side` | 编码器 **`__leftPos`** / **`__rightPos`**；见 **§9** |
| **`when [left] lever is [up]`**（帽子等价） | 报告器 `side, state` | 见 **§10.4** 上沿 |
| **`[left] lever is [up] ?`** | 谓词 `side, state` | 见 **§10.3**（`side` 含 **both** / **any**） |
| **`[left] lever position`** | 报告器 `side` | 见 **§10.1** |
| **`[left] lever angle`** | 报告器 `side` | 见 **§10.2** |
| Controller 按键是否按下 | 报告器 | 见 **§10.6** |
| **`when tapped`**（Motion / 帽子等价） | 报告器 | 见 **§11.2** |
| **`reset yaw angle`** | 命令 | 见 **§11.3** |
| **`tilted … ?`** | 谓词 `direction` | 见 **§11.4** |
| **`[pitch ▾] angle`** | 报告器 `axis` | 见 **§11.5** |
| **`[linear acceleration ▾] on [x ▾]-axis`** | 报告器 `measure, axis` | 见 **§11.6** |
| Coral 重置监听注册标记 | 命令 | 见 **§12** |

**界面英文对照（Controller / Motion）：**

| Snap 界面文案 | 文档 § |
|---------------|--------|
| `when … lever is …` | §10.4 |
| `… lever is … ?` | §10.3 |
| `… lever position` | §10.1 |
| `… lever angle` | §10.2 |
| `when tapped` / `reset yaw angle` / `tilted … ?` / `… angle` / `… on …-axis` | §11 |

---

## 1. Coral 初始化集线器

**类型：** 命令

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

每台新设备执行一次（需用户手势）。

---

## 3. Coral 注册多设备事件监听

**类型：** 命令（**整个项目只执行一次**）

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

  function hookImuFromChunks(chunks) {
    if (!chunks || !chunks.length) return;
    for (var k = 0; k < chunks.length; k++) {
      var im = chunks[k];
      if (!im) continue;
      if (im.kind === 'motion-sensor') {
        globalThis.__motionOrientation = im.orientation;
        globalThis.__motionYawFace = im.yawFace;
        globalThis.__motionYaw = im.yaw;
        globalThis.__motionPitch = im.pitch;
        globalThis.__motionRoll = im.roll;
        globalThis.__motionAccX = im.accelerometerX;
        globalThis.__motionAccY = im.accelerometerY;
        globalThis.__motionAccZ = im.accelerometerZ;
        globalThis.__motionGyroX = im.gyroscopeX;
        globalThis.__motionGyroY = im.gyroscopeY;
        globalThis.__motionGyroZ = im.gyroscopeZ;
      }
      if (im.kind === 'motion-gesture') {
        globalThis.__lastMotionGesture = im.gesture;
        var MG = globalThis.MotionGesture;
        var tapped =
          MG && typeof MG.Tapped === 'number' ? MG.Tapped : 0;
        if (im.gesture === tapped) {
          globalThis.__motionTapPending = true;
        }
      }
    }
  }

  function attachDoubleMotor(d) {
    globalThis.__coralImuDevice = d;
    void d.connect()
      .then(function () {
        d.on('motor', function (item) {
          hookMotorFromChunks([item]);
        });
        d.on('motion', function (p) {
          hookImuFromChunks([p]);
        });
        d.on('motion-gesture', function (p) {
          hookImuFromChunks([p]);
        });
      })
      .catch(function () {
        d.connection.on('notification', function (chunks) {
          hookMotorFromChunks(chunks);
          hookImuFromChunks(chunks);
        });
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

若无 `CoralDeviceKind`，把 **`K.DoubleMotor` / `K.Controller`** 改为 **`1` / `3`**。**`MotionGesture`**、`**createImuResetYawAxisCommand`** 由托管 **`coral.js`** 挂到 **`globalThis`**（见仓库 **`src/main.js`**）；若自搭 bundle 未包含，§11.2 / §11.3 需自行从 **`node-coral`** 导出同名符号。

---

## 4. Coral 按类型查找设备（内部逻辑说明）

遍历 **`hub.getDevices()`**，匹配 **`kind`**，不要假定下标 `0`。

---

## 5. Coral 按类型取设备信息

**类型：** 报告器 · **输入：** `kindNum`

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

**名称建议：** `Coral double-motor tank drive`  
**类型：** 命令 · **输入：** `leftSpeed`、`rightSpeed`（-100～100）

```javascript
JavaScript function (leftSpeed, rightSpeed) {
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
  void d.moveAtDualSpeed(Number(leftSpeed), Number(rightSpeed)).catch(function (e) {
    console.error(e);
  });
}
```

形参在 Snap 里也可缩短为 **`L`**、**`R`**（需与编辑器里槽位一致）。

---

## 8. Coral 双电机 停止

**名称建议：** `Coral double-motor stop`（Snap 上可做下拉：**left** / **right** / **both**）  
**类型：** 命令 · **输入：** `which` → **`left`** / **`right`** / **`both`**（文本或下拉；亦 **`l`** / **`r`** / **`0`** / **`1`** / **`b`**）

对应 SDK 的 **`DoubleMotorDevice.stopMotor(port)`**（`node-coral` 里 **`MotorPort`** 为字符串 **`"left"`**、**`"right"`**、**`"both"`**，与 `globalThis.MotorPort.Left` 等一致）。**优先**用 **`stopMotor`**；仅当设备上没有 **`stopMotor`**、且 **`which`** 为 **`both`** 时，才回退 **`stopMoving()`**（仅 stopMoving 时无法单独停一侧）。

```javascript
JavaScript function (which) {
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

  var MP = globalThis.MotorPort;
  var w = String(which == null ? 'both' : which).toLowerCase();
  var port;
  if (w === 'left' || w === 'l' || w === '0') {
    port = MP ? MP.Left : 'left';
  } else if (w === 'right' || w === 'r' || w === '1') {
    port = MP ? MP.Right : 'right';
  } else {
    port = MP ? MP.Both : 'both';
  }

  if (d.stopMotor) {
    void d.stopMotor(port).catch(function (e) {
      console.error(e);
    });
  } else if (d.stopMoving && port === (MP ? MP.Both : 'both')) {
    void d.stopMoving().catch(function (e) {
      console.error(e);
    });
  }
}
```

---

## 9. Coral 双电机 · 电机角度（下拉 left / right）

**图示：** **`[left ▾]  `**（与 §10 摇杆块同样可做 **left / right** 下拉）  
**名称建议：** `Coral motor angle`（或 `Coral double-motor motor angle`）  
**类型：** 报告器 · **输入：** `side` → **`left`** / **`right`**（文本或下拉；亦 **`l`** / **`r`** / **`0`** / **`1`**）

读数来自 **§3** 写入的 **`globalThis.__leftPos`** / **`__rightPos`**（`motor` 通知里的 `absolutePosition`; 实为设备上报的电机位置量，文档中仍称「角度」时与历史命名一致）。非 **`left`** 侧别时默认读 **右** 电机（与 §10.1 一致）。

```javascript
JavaScript function (side) {
  var s = String(side).toLowerCase();
  var v;
  if (s === 'left' || s === 'l' || s === '0') {
    v = globalThis.__leftPos;
  } else {
    v = globalThis.__rightPos;
  }
  if (v == null || v !== v) return 0;
  return Number(v);
}
```

固定单侧的简写仍可用：`return globalThis.__leftPos;` / `return globalThis.__rightPos;`（两块积木、无下拉）。

---

## 10. Controller 类别积木（与界面图示对应）

**lever** 对应协议里的 **joystick**（`JoystickPayload`）。数据来自 **§3** 写入的全局量：

| 全局变量 | 含义 |
|----------|------|
| `globalThis.__joyL` / `__joyR` | 左/右行程 **-100～100**（一般都有） |
| `globalThis.__joyLdeg` / `__joyRdeg` | 协议里的角度（度）；**不少固件恒为 `0`，仅 percent 有效** |

**多台控制器：** 当前为「最后一次推送」；多手柄需按 `uuid` 分桶（可扩展 §3）。

**up / down / released：** 用阈值 **`globalThis.__coralLeverThreshold`**（默认 **35**）：**up** → 读数 **\> TH**；**down** → **\< -TH**；**released**（回中 / 松开）→ **\|读数\| ≤ TH**。可在初始化里设：`globalThis.__coralLeverThreshold = 40;`

---

### 10.1 图示：`[left ▾] lever position` — 摇杆行程（报告器）

**名称建议：** `Controller left lever position` / **控制器 左摇杆行程**  
**输入：** `side` → `left` / `right`（文本或下拉）

```javascript
JavaScript function (side) {
  var s = String(side).toLowerCase();
  var v;
  if (s === 'left' || s === 'l' || s === '0') {
    v = globalThis.__joyL;
  } else {
    v = globalThis.__joyR;
  }
  if (v == null || v !== v) return 0;
  return Number(v);
}
```

---

### 10.2 图示：`[left ▾] lever angle` — 摇杆角度（报告器）

**名称建议：** `Controller left lever angle` / **控制器 左摇杆角度**

协议在同一条 `joystick` 通知里会带上 `leftAngle` / `rightAngle`（见 `node-coral` 对 `InfoHubNotification` 的可选尾部解析）。**实际硬件/固件经常把这两项填成 `0`，只有 `leftPercent` / `rightPercent` 会随拨杆变化。**  
因此：**若 §10.1 的行程会动，但本节一直为 `0`，多半不是 Snap 代码写错，而是设备没在角度字段上报数据。**

**排查：**

1. 先确认 **§10.1（lever position）** 在推手柄时是否变化。  
2. 临时用报告器打印：`return JSON.stringify({ L: globalThis.__joyL, R: globalThis.__joyR, La: globalThis.__joyLdeg, Ra: globalThis.__joyRdeg });`  
3. 若 `La`/`Ra` 始终为 `0` 而 `L`/`R` 有变化 → 请改用 **行程** 做逻辑，或用下面「显示用近似角度」。

**原始角度（与协议一致）：**

```javascript
JavaScript function (side) {
  var s = String(side).toLowerCase();
  var v;
  if (s === 'left' || s === 'l' || s === '0') {
    v = globalThis.__joyLdeg;
  } else {
    v = globalThis.__joyRdeg;
  }
  if (v == null || v !== v) return 0;
  return Number(v);
}
```

**显示用近似角度（仅教学：用 percent 线性映射到 ±90°）：**  
当固件角度恒为 `0`、你希望积木仍显示「角度感」时可用（**不是**设备真实编码器角度）。

```javascript
JavaScript function (side) {
  var s = String(side).toLowerCase();
  var isLeft = s === 'left' || s === 'l' || s === '0';
  var p = Number(isLeft ? globalThis.__joyL : globalThis.__joyR);
  if (p !== p) p = 0;
  var rawDeg = Number(isLeft ? globalThis.__joyLdeg : globalThis.__joyRdeg);
  // 固件常把角度钉在 0；只有在「有位移」却仍是 0 时，用行程映射成示意角度
  if (
    (rawDeg !== rawDeg || rawDeg === 0) &&
    Math.abs(p) > 0.5
  ) {
    return (p * 90) / 100;
  }
  if (rawDeg !== rawDeg) return 0;
  return rawDeg;
}
```

若你希望 **最大对应 ±180°**，把 **`90`** 改成 **`180`**。

---

### 10.3 图示：`[left ▾] lever is [up ▾] ?` — 谓词（六角）

**名称建议：** `Controller left lever is up ?`  
**输入：** `side` → **`left`** / **`right`** / **`both`** / **`any`**（亦可 **`all`** 同 both、**`either`** 同 any）；`state` → 仅 **`up`** / **`released`** / **`down`**（小写即可）

**语义：**

| `side` | 含义 |
|--------|------|
| `left` / `l` / `0` | 仅左摇杆行程是否满足 `state` |
| `right` / `r` / `1` | 仅右摇杆 |
| `both` / `all` | **左、右都要**满足 `state`（逻辑与） |
| `any` / `either` | **左或右其一**满足即可（逻辑或） |

```javascript
JavaScript function (side, state) {
  var TH =
    typeof globalThis.__coralLeverThreshold === 'number'
      ? globalThis.__coralLeverThreshold
      : 35;
  var st = String(state).toLowerCase();
  function matchState(p) {
    if (p !== p) p = 0;
    if (st === 'up') return p > TH;
    if (st === 'down') return p < -TH;
    if (st === 'released') {
      return Math.abs(p) <= TH;
    }
    return false;
  }
  var pL = Number(globalThis.__joyL);
  var pR = Number(globalThis.__joyR);
  var s = String(side).toLowerCase();
  if (s === 'left' || s === 'l' || s === '0') return matchState(pL);
  if (s === 'right' || s === 'r' || s === '1') return matchState(pR);
  if (s === 'both' || s === 'all') return matchState(pL) && matchState(pR);
  if (s === 'any' || s === 'either') return matchState(pL) || matchState(pR);
  return false;
}
```

---

### 10.4 图示：`when [left ▾] lever is [up ▾]` — 帽子等价（上沿报告器）

Snap 的 **JavaScript function** 不能当真帽子；在 **`重复执行`** 里用本块，**`true`** 表示刚进入该状态的一帧。

**名称建议：** `Controller when left lever becomes up`

**输入：** 同 §10.3：`side`、`state`

```javascript
JavaScript function (side, state) {
  globalThis.__coralLeverEdge = globalThis.__coralLeverEdge || {};
  var key = String(side) + '|' + String(state);

  var TH =
    typeof globalThis.__coralLeverThreshold === 'number'
      ? globalThis.__coralLeverThreshold
      : 35;
  var st = String(state).toLowerCase();
  function matchState(p) {
    if (p !== p) p = 0;
    if (st === 'up') return p > TH;
    if (st === 'down') return p < -TH;
    if (st === 'released') {
      return Math.abs(p) <= TH;
    }
    return false;
  }
  var pL = Number(globalThis.__joyL);
  var pR = Number(globalThis.__joyR);
  var s = String(side).toLowerCase();
  var cur;
  if (s === 'left' || s === 'l' || s === '0') cur = matchState(pL);
  else if (s === 'right' || s === 'r' || s === '1') cur = matchState(pR);
  else if (s === 'both' || s === 'all') cur = matchState(pL) && matchState(pR);
  else if (s === 'any' || s === 'either') cur = matchState(pL) || matchState(pR);
  else cur = false;

  var prev = globalThis.__coralLeverEdge[key];
  globalThis.__coralLeverEdge[key] = cur;
  return cur === true && prev !== true;
}
```

**用法：** `重复执行` → `如果 < 本报告器> 那么 …`。

---

### 10.5 简写：固定左右（无下拉）

| 积木简称 | JavaScript |
|----------|------------|
| 左摇杆行程 | `return globalThis.__joyL == null ? 0 : Number(globalThis.__joyL);` |
| 右摇杆行程 | `return globalThis.__joyR == null ? 0 : Number(globalThis.__joyR);` |
| 左摇杆角度 | `return globalThis.__joyLdeg == null ? 0 : Number(globalThis.__joyLdeg);` |
| 右摇杆角度 | `return globalThis.__joyRdeg == null ? 0 : Number(globalThis.__joyRdeg);` |

---

### 10.6 按键（Button 通知）

**名称建议：** `Controller button pressed?` / **控制器 按键是否按下**

```javascript
return globalThis.__btnPressed === true;
```

---

## 11. Motion Sensor 积木（双电机主机 IMU，与图示一致）

协议里是 **`motion-sensor`** / **`motion-gesture`** 通知（`MotionSensorPayload`、`MotionGesturePayload`，见 **`node-coral`**）。**§3** 在连接 **`DoubleMotor`** 时已把最新读数写入 **`globalThis`**，并令 **`__coralImuDevice`** 指向当前主机（供 **reset yaw**）。

**多台双电机：** 全局量为「最后一次 **discover** 里挂上本监听的那台」；多主机请按 `uuid` 分桶扩展 §3。

**依赖：** 托管 **`coral.js`** 会在 **`globalThis`** 上挂载 **`MotionGesture`**、**createImuResetYawAxisCommand**（见仓库 **`src/main.js`**）。

### 11.1 全局量（§3 写入）

| 全局变量 | 含义 |
|----------|------|
| `__motionOrientation` | `orientation`（uint8，与 **`HubFace`** / 面朝上方向一致） |
| `__motionYawFace` | `yawFace` |
| `__motionYaw` / `__motionPitch` / `__motionRoll` | `yaw` / `pitch` / `roll`（int16） |
| `__motionAccX` … `__motionAccZ` | `accelerometerX` … |
| `__motionGyroX` … `__motionGyroZ` | `gyroscopeX` … |
| `__lastMotionGesture` | 最近一次 `MotionGesture` 数值 |
| `__motionTapPending` | 收到 **tap** 后置 **`true`**，由 §11.2 读后清零 |

**数值单位：** 与固件一致，多为 **int16**（角度常见为 **0.1°** 或整度，加计为 **mg** 量级）；作阈值前请在实机上打印一次再定标。

**「倾斜」与 `orientation`（同 `node-coral` / LEGO `HubFace`）：**

| 积木下拉 | 含义 | `__motionOrientation` |
|----------|------|-------------------------|
| **flat** | 平放（默认面朝上） | `0`（Top） |
| **up** | 朝一面前倾（与官方「up」一致时用 Front） | `1`（Front） |
| **down** | 后仰 | `4`（Back） |
| **left** | 向左倾 | `5`（Left） |
| **right** | 向右倾 | `2`（Right） |
| **upside down** | 翻转 | `3`（Bottom） |
| **any** | 非平放 | `≠ 0` |

若与手中 Scratch 体感不符，请用报告器打印 **`__motionOrientation`** 对照实机后改 §11.4 的映射。

---

### 11.2 图示：`when tapped` — 帽子等价（上沿）

Snap 的 **JavaScript function** 不能当真帽子；在 **`重复执行`** 里用本块，**`true`** 表示刚检测到敲击的一帧。

**名称建议：** `Motion when tapped`

```javascript
JavaScript function () {
  if (globalThis.__motionTapPending) {
    globalThis.__motionTapPending = false;
    return true;
  }
  return false;
}
```

§3 在 **`motion-gesture`** 且 **`gesture === MotionGesture.Tapped`**（与数值 **`0`** 相同）时置 **`__motionTapPending`**。

**用法：** `重复执行` → `如果 < 本报告器> 那么 …`。

---

### 11.3 图示：`reset yaw angle` — 命令

**名称建议：** `Motion reset yaw angle`

将当前 **yaw 读数零点** 对齐到协议 **IMU reset yaw**（`ImuResetYawAxisCommand`，参数 **`0`**）。需 **`globalThis.createImuResetYawAxisCommand`** 与 **`__coralImuDevice.connection`**。

```javascript
var d = globalThis.__coralImuDevice;
var create = globalThis.createImuResetYawAxisCommand;
if (!d || !d.connection || !create) return;
void d.connection.request(create(0)).catch(function (e) {
  console.error(e);
});
```

---

### 11.4 图示：`tilted [up ▾] ?` — 谓词（六角）

**名称建议：** `Motion tilted up ?`（下拉：**up** / **down** / **left** / **right** / **any** / **upside down** / **flat**）

**输入：** `direction`（文本或下拉，小写）

```javascript
JavaScript function (direction) {
  var o = globalThis.__motionOrientation;
  if (o !== o || o == null) o = 0;
  o = Number(o);
  var d = String(direction).toLowerCase().replace(/\s+/g, ' ');
  if (d === 'flat' || d === 'top') return o === 0;
  if (d === 'upside down' || d === 'upsidedown' || d === 'bottom')
    return o === 3;
  if (d === 'right') return o === 2;
  if (d === 'left') return o === 5;
  if (d === 'up') return o === 1;
  if (d === 'down') return o === 4;
  if (d === 'any') return o !== 0;
  return false;
}
```

---

### 11.5 图示：`[pitch ▾] angle` — 报告器

**名称建议：** `Motion pitch angle`（下拉：**pitch** / **roll** / **yaw**）

**输入：** `axis` → **`pitch`** / **`roll`** / **`yaw`**（**`p`** / **`r`** / **`y`** 可简写）

```javascript
JavaScript function (axis) {
  var s = String(axis).toLowerCase();
  var v;
  if (s === 'pitch' || s === 'p') v = globalThis.__motionPitch;
  else if (s === 'roll' || s === 'r') v = globalThis.__motionRoll;
  else v = globalThis.__motionYaw;
  if (v == null || v !== v) return 0;
  return Number(v);
}
```

---

### 11.6 图示：`[linear acceleration ▾] on [x ▾]-axis` — 报告器

**名称建议：** `Motion linear acceleration on x axis`（第一下拉：**linear acceleration** / **angular velocity**；第二下拉：**x** / **y** / **z**）

**输入：** `measure`、`axis`

```javascript
JavaScript function (measure, axis) {
  var m = String(measure).toLowerCase();
  var a = String(axis).toLowerCase();
  var letter = a.charAt(0);
  if (letter !== 'x' && letter !== 'y' && letter !== 'z') letter = 'x';
  var useAcc =
    m.indexOf('linear') >= 0 ||
    (m.indexOf('accel') >= 0 && m.indexOf('angular') < 0);
  var key = (useAcc ? '__motionAcc' : '__motionGyro') + letter.toUpperCase();
  var v = globalThis[key];
  if (v == null || v !== v) return 0;
  return Number(v);
}
```

**说明：** **linear acceleration** → **`accelerometerX/Y/Z`**；**angular velocity** → **`gyroscopeX/Y/Z`**。

---

## 12. Coral 重置监听注册标记

**类型：** 命令

```javascript
globalThis.__coralDiscoverHooked = false;
```

之后需再次执行 **§3**；刷新页面最干净。

---

## 多设备场景注意点

| 问题 | 做法 |
|------|------|
| 两台设备只看到一个 | 同一 **`globalThis.coral`** 下 **`scan()`** 多次 |
| 控制错设备 | 一律按 **`kind`** 查找 |
| 无数值 | 先 §3，再扫描，再摇动/转动；**IMU** 需已连接 **双电机** 主机（§11） |
| 无 `await` | **`void … .then(…).catch(…)`** |

---

## 版本与脚本

`coral.js` 提供 **`CoralDeviceKind`**、**`ControllerDevice`**、**`MotionGesture`**、**`createImuResetYawAxisCommand`** 等（见仓库 `src/main.js`）。
