# EVOLUTION.md

## 总览

这次 Homework 2 没有推翻 Homework 1.1 的 `Sudoku` / `Game` 基线，而是在原有对象模型上继续演进两个能力：

- Hint
- Explore Mode

我尽量保持了 Homework 1 的基本分工：

- `Sudoku` 继续负责盘面规则与分析
- `Game` 继续负责会话、状态、history 与序列化

新的功能不是临时塞回 UI，而是先进入 domain，再由 store / UI 调用和展示。

下面按作业要求的 7 个问题说明这次设计演进。

---

## 1. 我如何实现提示功能

Hint 的实现分成两层。

第一层在 `Sudoku` 中完成分析：

- `getCandidates(row, col)`
- `getNextHint({ detailLevel })`

`getCandidates(row, col)` 会基于当前行、列、宫约束，返回某个空格的合法候选值集合。固定格和已填格返回空集合。

`getNextHint({ detailLevel })` 会扫描当前盘面的所有空格，选择候选数最少的格子，返回结构化 hint。当前实现支持三层：

- L1：只返回位置
- L2：返回位置和候选数个数
- L3：返回位置、完整候选、建议值以及是否可直接应用

第二层在 `Game` 中完成会话级能力：

- `getHint({ detailLevel })`
- `applyHint()`
- `propagateHint()`

`Game.getHint()` 不自己重新分析棋盘，而是把请求转发到“当前活动局面”：

- 正常模式下是主棋盘
- Explore 模式下是探索棋盘

`applyHint()` 只会应用 deterministic hint，也就是只有一个候选值的情况。对于多候选情况，它不会直接填数，而是返回 `explore-required` 语义。

`propagateHint()` 会连续调用 `applyHint()`，直到遇到以下任意一种情况：

- 分支点
- 失败
- 解完
- 没有新 hint

所以 Hint 在当前实现中不是单一按钮，而是一套完整的领域接口：

- 候选分析
- 下一步建议
- 单步自动填写
- 连续自动推进

---

## 2. 我认为提示功能更属于 `Sudoku` 还是 `Game`

我认为 Hint 同时涉及 `Sudoku` 和 `Game`，但职责不同。

更准确地说：

- Hint 的“分析能力”属于 `Sudoku`
- Hint 的“执行能力”属于 `Game`

原因是：

1. 候选数和下一步提示，本质上依赖的是盘面规则。它们只和当前 grid、givens、行列宫约束有关，因此应当放在 `Sudoku`。
2. 但 hint 是否只展示、是否真正写回棋盘、是否作用在主局面还是 Explore 局面，这些已经不是单纯的盘面规则，而是会话语义，所以应当由 `Game` 决定。

如果把所有 Hint 都放进 `Game`，那 `Game` 会过多知道 Sudoku 的细节；如果把自动填写也塞进 `Sudoku`，那 `Sudoku` 又会过多知道 history 和会话状态。

因此我最后采用的是协作方式，而不是单边归属。

---

## 3. 我如何实现探索模式

我把 Explore Mode 设计成 `Game` 内部的一个临时子会话，而不是直接让主棋盘进入“特殊状态后继续乱改”。

当前 `Game` 里有一个 `exploreSession`，主要包含：

- `origin`：本次探索开始时的棋盘
- `current`：当前探索棋盘
- `undoStack`
- `redoStack`
- `path`
- `focusedDecisionKey`

Explore 的核心接口包括：

- `enterExplore()`
- `exploreGuess()`
- `undoExplore()` / `redoExplore()`
- `resetExploreToOrigin()`
- `undoExploreToDecision()`
- `discardExplore()`
- `commitExplore()`

行为上：

1. 进入 Explore 时，从主棋盘克隆出一个探索棋盘。
2. 用户在 Explore 中输入时，只修改 `exploreSession.current`。
3. Explore 有自己的 undo / redo，不污染主 history。
4. 可以一键回到本次探索起点，也可以回到最近一次真正的 decision point。
5. 如果探索结果合理，可以 `commitExplore()`，把当前 Explore 结果作为一次主局面跃迁写回主 history。
6. 如果不想继续，可以 `discardExplore()`，直接丢弃探索会话。

当前实现还增加了失败判断：

- `invalid-cells`
- `dead-end`
- `known-failed-path`
- `known-failed-board`

并支持失败记忆，避免用户重复走到已经失败的状态。

---

## 4. 主局面与探索局面的关系是什么

我的设计是：

- 主局面与探索局面是复制关系，不共享对象

具体地说：

- `getSudoku()` 永远返回主棋盘
- `getActiveSudoku()` 返回当前活动棋盘
- 进入 Explore 时，`origin` 和 `current` 都来自主棋盘克隆

这样做有几个好处：

1. 主棋盘不会被探索输入污染。
2. 放弃探索时不需要逆向撤销一大串主历史，只要丢掉 Explore session 即可。
3. 提交探索时语义很清楚：不是把 Explore 的每一步历史塞进主 history，而是把 Explore 终局作为一次主局面更新写入。
4. 可以避免共享引用导致的深拷贝问题和历史污染问题。

因此，我没有选择共享对象，也没有把 Explore 做成主棋盘上的“标记模式”。

---

## 5. 我的 history 结构在本次作业中是否发生了变化

有变化，但不是彻底推翻。

Homework 1 中，history 主要是主局面的线性：

- `historyUndo`
- `historyRedo`

Homework 2 之后，history 结构演进为两层：

1. 主局面 history 仍然保留线性栈
2. Explore session 内部再拥有一套独立 history

也就是：

- 主局面：`historyUndo` / `historyRedo`
- 探索局面：`exploreSession.undoStack` / `exploreSession.redoStack`

除此之外，我还引入了决策路径信息：

- `decisionPointBook`
- `exploreSession.path`

所以当前结构不是完整树状 history，但也不再只是一个简单的线性栈。更准确地说，它是：

- 主 history 仍是线性
- Explore 内部局部线性
- 另外保留 decision path 作为分支解释信息

这符合本次作业的要求，也避免过早引入 DAG 合并等过重语义。

---

## 6. Homework 1 中哪些设计在 Homework 2 中暴露了局限

Homework 1 的设计在做 Undo / Redo 时已经够用，但到了 Homework 2 暴露出几个局限。

### 1. 只有“主棋盘”概念，不够表达 Explore

Homework 1 默认所有输入都作用在一个当前棋盘上。这个模型一旦加入 Explore，就会遇到问题：

- 哪个棋盘才是当前用户正在编辑的棋盘？
- 哪个棋盘才是最终正式局面？

因此后来必须引入：

- `getSudoku()`
- `getActiveSudoku()`

把“主局面”和“当前活动局面”区分开。

### 2. history 只有单层线性，不够表达探索会话

Homework 1 的线性 undo / redo 只能表示“正式输入历史”。

但 Explore 需要：

- 独立试填
- 独立回退
- 独立放弃

因此后来必须把 Explore history 从主 history 中分离出去。

### 3. `Sudoku` 只存盘面，不分析盘面

Homework 1 中如果 `Sudoku` 只有 `guess()`、`getGrid()` 之类的能力，那么 Hint 会被迫写进 UI 或 `Game`。

为了让 Hint 真正成为领域能力，后来必须让 `Sudoku` 演进出：

- 候选分析
- 下一步提示分析

### 4. 原先没有失败记忆语义

Homework 1 中，冲突只意味着“当前输入错了”。

Homework 2 引入 Explore 后，失败不再只是即时冲突，而开始涉及：

- 某个棋盘已经失败过
- 某条路径已经失败过

所以后续必须补出失败记忆模型。

---

## 7. 如果重做一次 Homework 1，我会如何修改原设计

如果重新做 Homework 1，我不会改成完全不同的系统，但会提前做三件事。

### 1. 更早区分“盘面对象”和“会话对象”

虽然现在也是 `Sudoku` / `Game` 分层，但如果一开始就更明确地把：

- `Sudoku` = 纯盘面规则对象
- `Game` = 会话与状态对象

写得更严格，Homework 2 的演进会更自然。

### 2. 提前设计“活动局面”抽象

Homework 1 时我可能会加一个更明确的概念，例如：

- 主局面
- 当前活动局面

这样 Homework 2 加 Explore 时，就不需要后期再补较多适配。

### 3. 提前让 history 设计具备扩展点

Homework 1 不一定要直接实现 Explore history，但我会让主 history 结构在接口层面更容易扩展成“多会话历史”，而不是完全默认只有一个线性世界。

### 4. 更早把“分析能力”留给 `Sudoku`

如果 Homework 1 时就把 `Sudoku` 视为“可分析盘面”的对象，而不是只会存 grid 的对象，那么 Homework 2 的 Hint 增加会更顺滑。

---

## 总结

这次 Homework 2 的关键，不是简单增加两个按钮，而是让原有对象模型继续成长。

我最终采取的路线是：

- Hint 的分析在 `Sudoku`
- Hint 的执行在 `Game`
- Explore 作为 `Game` 内部的临时子会话
- 主局面与探索局面复制隔离
- 主 history 与 Explore history 分离
- 失败记忆进入 domain，而不是停留在 UI 临时变量中

我认为这种演进方式符合本次作业最核心的要求：

- 保持对象模型整体一致
- 通过对象协作实现新功能
- 让 Homework 1 的设计自然演进到 Homework 2，而不是推倒重来
