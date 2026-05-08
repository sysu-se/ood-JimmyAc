# DESIGN.md

## 总览

当前版本在 Homework 1.1 的 `Sudoku` / `Game` 基线之上，继续演进了两个方向：

- Hint：提示分析与提示执行
- Explore Mode：探索子会话、试探分支、失败路径记忆

这两个功能都建立在已有领域对象之上，而不是重新把关键逻辑写回 UI。

职责划分保持不变：

- `Sudoku`：负责盘面规则、候选分析、提示分析
- `Game`：负责主会话、提示消费、探索模式、历史与状态切换

---

## Hint 设计

## 1. 职责划分

Hint 分成两层：

- `Sudoku` 负责分析“提示是什么”
- `Game` 负责决定“提示是只展示，还是执行到当前局面”

因此：

- `Sudoku` 提供候选数与提示对象
- `Game` 提供 `getHint()`、`applyHint()`、`propagateHint()`

---

## 2. `Sudoku` 的 Hint 接口

### `getCandidates(row, col)`

作用：

- 返回某个格子的合法候选数集合

规则：

- 固定格返回空集合
- 已填格返回空集合
- 空格返回基于当前行、列、宫约束计算出的合法候选数

这是整个 Hint 和 Explore 的基础分析能力。

### `getNextHint({ detailLevel })`

作用：

- 扫描当前盘面所有空格
- 找出候选数最少的格子
- 返回结构化提示对象

当前采用三档展示级别：

1. `detailLevel: 1`
   - 只提示建议查看的位置
2. `detailLevel: 2`
   - 提示位置和候选数个数
3. `detailLevel: 3`
   - 提示位置和完整候选集合

因此，多等级提示和提示原因说明统一由 `Sudoku.getNextHint()` 负责。

---

## 3. Hint 对象语义

Hint 对象内部保持统一语义，核心字段包括：

- `row`
- `col`
- `type`
- `kind`
- `candidateCount`
- `candidates`
- `suggestedValue`
- `canApplyDirectly`
- `reason`
- `detailLevel`

其中：

- 如果当前格只有一个候选值：
  - `kind = 'deterministic'`
  - `canApplyDirectly = true`
  - `suggestedValue` 为该值
- 如果当前格有多个候选值：
  - `kind = 'exploratory'`
  - `canApplyDirectly = false`
  - `suggestedValue = null`

这样可以同时支持：

- 只展示提示
- 单步执行提示
- 后续与 Explore 联动

---

## 4. `Game` 的 Hint 接口

### `getHint({ detailLevel })`

作用：

- 从当前活动局面中获取提示对象
- 不修改盘面

当前活动局面的含义：

- 正常模式下是主局面
- 探索模式下是探索局面

因此同一套 Hint 接口可以同时服务正常模式和探索模式。

### `applyHint()`

作用：

- 单步执行一次可直接应用的提示

行为：

- 内部获取完整提示
- 若提示是确定型（单候选）
  - 则通过正式输入接口写入当前活动局面
- 若提示是多候选
  - 当前不直接填入
  - 返回需要进入探索模式的语义

这样可以区分：

- 展示提示
- 单步应用提示

### `propagateHint()`

作用：

- 连续自动应用当前活动局面中的确定型提示

行为：

- 反复执行可直接应用的 Hint
- 直到：
  - 出现新的多候选点
  - 或失败
  - 或完成

这里不再把“自动推进”设计成 Explore 专属功能，而是作为 Hint 的第二种执行方式。这样正常模式和探索模式都可以统一使用。

---

## Explore Mode 设计

## 1. 核心思想

Explore Mode 的本质不是直接继续修改主局面，而是：

- 从当前主局面克隆出一个探索子会话
- 用户在探索局面中试填
- 如果失败，可以回退到最近试探点
- 如果结果合理，可以提交到主局面
- 如果不想继续，可以放弃探索

因此 Explore 的核心放在 `Game` 中，而不是 `Sudoku` 中。

---

## 2. 主局面与探索局面的关系

设计原则：

- 复制，不共享

进入探索时：

- 主局面保持不变
- 克隆当前 `Sudoku` 得到探索起点
- 后续探索输入只修改探索局面

这样做的原因是：

- 主局面不会被污染
- 放弃探索很简单
- 提交探索语义清楚
- 不会出现共享引用导致的历史污染

---

## 3. `Game` 中的新增状态

### `exploreSession`

结构：

- `origin`
- `current`
- `undoStack`
- `redoStack`

含义：

- `origin`：本次探索开始时的盘面
- `current`：当前探索中的盘面
- `undoStack` / `redoStack`：探索过程自己的历史

### `decisionPoints`

作用：

- 记录探索中的“试探分支点”

每个 `decisionPoint` 包含：

- `row`
- `col`
- `triedValues`
- `remainingValues`
- `snapshot`

这使得系统不仅能一步步撤销，还能快速回退到最近一次真正开始试探的位置。

### `failedStates`

作用：

- 记录整局游戏中已经确认失败的探索状态

它属于 `Game`，而不是某一次 `exploreSession`，因为它表示的是：

- 这局游戏已经积累的失败路径记忆

---

## 4. Explore 接口

### 生命周期

- `enterExplore()`
- `isExploring()`
- `discardExplore()`
- `commitExplore()`

作用：

- 进入探索
- 判断当前模式
- 放弃探索
- 提交探索结果回主局面

### 局面访问

- `getSudoku()`：返回主局面
- `getActiveSudoku()`：返回当前活动局面

其中：

- 正常模式下 `getActiveSudoku()` 返回主局面
- 探索模式下 `getActiveSudoku()` 返回探索局面

这个接口是 Hint 和 Explore 统一协作的关键。

### 探索输入与历史

- `exploreGuess(move)`
- `undoExplore()`
- `redoExplore()`
- `resetExploreToOrigin()`

作用：

- 在探索局面中输入
- 撤销 / 重做探索步骤
- 一键回到本次探索起点

### 分支点相关

- `undoExploreToDecision()`
- `getCurrentDecisionPoint()`

作用：

- 快速回退到最近一个试探分支点
- 读取最近一次试探点的信息

### 失败判断与记忆

- `isExploreFailed()`
- `getExploreFailureReason()`
- `hasSeenFailedExplorePath()`

作用：

- 判断当前探索盘面是否失败
- 判断当前探索失败的具体原因
- 判断当前探索状态是否命中过去已知失败路径

当前设计中：

- 当前盘面冲突：算失败
- 存在空格但没有合法候选值：算失败
- 当前路径包含已证伪的分支候选：算失败
- 命中已知失败路径：只提示，不强制中断

---

## 5. Explore 的关键业务逻辑

### 分支试探

当用户在一个多候选格中选一个值试填时：

- 该步通过 `exploreGuess(move)` 进入探索局面
- 同时记录一个 `decisionPoint`

这代表：

- 这里是一个正式的试探分支点

### 快速回退

如果探索失败或用户想换候选：

- 不一定只用 `undoExplore()` 一步步回退
- 可以直接调用 `undoExploreToDecision()`

它会：

- 恢复到最近一个 `decisionPoint.snapshot`

这很符合真实玩家的使用习惯：

- 回到最近一次“开始试探”的地方，再换一个值继续

### 提交探索

提交探索时：

- 不把探索过程中的每一步都并入主 history
- 而是把“探索结果进入主局面”看成一次主局面跃迁

这样：

- 主 history 更清晰
- 用户之后按一次 Undo，可以直接回到探索前的主局面

### 放弃探索

放弃探索时：

- 直接丢弃 `exploreSession`

因为探索局面本来就是克隆出来的，所以主局面不需要恢复。

---

## Hint 与 Explore 的联动

当前两者通过 `getActiveSudoku()` 统一起来：

- 正常模式下，Hint 作用于主局面
- 探索模式下，Hint 作用于探索局面

因此：

- `getHint()`
- `applyHint()`
- `propagateHint()`

都不需要再分成正常版和 Explore 专属版。

后续多候选 Hint 还可以继续作为进入 Explore 的入口：

- 当用户尝试应用多候选 Hint 时
- 系统可以提示需要进入 Explore Mode

当前版本明确不新增 `enterExploreForHint()`、`prepareExploreFromHint()` 这类高层领域接口。

- `Hint` 继续只负责分析和返回 `explore-required` 语义
- `Explore` 继续通过显式 `enterExplore()` 触发
- 这样保持当前领域接口更小，也避免把 Hint 和 Explore 绑定得过紧

UI 层已经通过 `@sudoku/stores/grid.js` 暴露这些领域能力：

- 单步 Hint
- 连续推进 Hint
- 进入 Explore
- 回退到最近试探点
- 提交 Explore
- 放弃 Explore

UI 只负责触发动作和展示状态，仍然不直接维护 Sudoku 规则。

---

## 总结

当前这版设计的核心思想是：

- `Sudoku` 负责分析：候选数、提示对象
- `Game` 负责流程：提示消费、探索子会话、分支回退、失败路径记忆
- Hint 负责“如何推进当前活动局面”
- Explore 负责“推进发生在哪个会话里，以及如何回退和提交”

这样可以在不推翻 Homework 1.1 设计的前提下，比较自然地演进出 Homework 2 所需要的 Hint 和 Explore 能力。
