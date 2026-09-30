# Proposal 索引与状态

这里是 Veripaka 提案的统一入口，不是第二份产品规格。

- 当前实现设计：[VERIPAKA_DESIGN.md](../VERIPAKA_DESIGN.md)。
- 当前阶段范围：[IMPLEMENTATION_PHASES.md](../IMPLEMENTATION_PHASES.md)。
- 实际执行事实：[S1 验收记录](../implementation/S1_EVIDENCE_CHECKPOINT.md)。
- [原始 brief](../Draft.txt) 是需求来源；[introduction 草稿](../intro_draft.txt) 是产品表达，二者不作为新增接口或能力已交付的证明。

## 1. 当前提案

| ID | 提案 | 状态 | 影响范围 |
|---|---|---|---|
| P001 | [面向真实对象的测试策略探索](001_TESTING_STRATEGY_DISCOVERY.md) | **ACCEPTED（限定范围）** | 已合并方法探索、正文先行、迁移与对照方向到组合设计/阶段；详细采纳表见提案 §8；reviewer 已允许开始 S2，尚未验收 |

用户已经澄清：Veripaka 的主要目标是探索真实、高能动性的 test recipe；能动性还包含由对象基础属性推导测试方式的 meta 判断，证据核验是支撑。P001 的落地与评价方向已按用户要求纳入当前路线图；尚未决定的工具/schema 细节保留为未定，不自动宣布新的搜索/探索能力已经存在。

## 2. 历史提案：DEPRECATED

以下五份材料已原地封存，顶部弃用标记优先于正文中的历史状态。它们不再维护，不作为当前实现或验收依据。

| 历史材料 | 在讨论中的作用 | 现由什么承接 |
|---|---|---|
| [DESIGN_PROPOSAL.md](../DESIGN_PROPOSAL.md) | 初版结构、CLI 与路线建议 | 组合设计 / 实现阶段 |
| [DESIGN_V2.md](../../.claudes_proposal/DESIGN_V2.md) | 对初版的自审修订，收窄结构和范围 | 组合设计 / 实现阶段 |
| [TARGET_SHAPE_PROPOSAL.md](../TARGET_SHAPE_PROPOSAL.md) | 目标形态与工作台方向的建议 | 已经组合设计取舍，不作为另一条现行路线 |
| [veripaka-target-shape.md](../veripaka-target-shape.md) | 方法库、有界应用与骨架建议 | 组合设计的历史主线来源 |
| [edit_proposal.txt](../edit_proposal.txt) | 比较两个目标形态方案并提出合并取舍 | 已整合进组合设计，原比较不再继续维护 |

`.temp/research-0928/` 是本机历史调研，不属于现行 Proposal 或当前工具能力核验。

### 阅读关系

```text
原始 brief
  ├─ 初版设计 → v2 自审
  └─ 两份目标形态建议 → 合并取舍意见
                         ↓
                当前组合设计 + 实现阶段
                         ↓
                   S1 实施与验收

用户进一步澄清方法探索 / meta 能动性的重心
  ├─ introduction 草稿：对外表达，持续可修订
  └─ P001：限定范围采纳，保留决策依据
       └─ 已合并到当前组合设计 / 实现阶段（已获开工放行，非阶段验收）
```

这表示材料的承接关系，不声称所有历史分支都有完整逐次决策记录。P001 不是恢复旧方案，也不是替代 S1 的事实记录。

## 3. 文件组织约定

- 新提案放在 `docs/proposals/`，使用稳定编号和主题文件名，例如 `001_TESTING_STRATEGY_DISCOVERY.md`；正文有日期、状态、范围、依据、待决策项和与现行设计的关系。
- 历史文件暂不搬迁、不复制一份新的 archive：它们已有明确 DEPRECATED 标记，原地保留可避免旧链接和材料引用失效。历史清单只在本索引维护。
- 不再为不同模型或作者创建新的平行提案目录。`.claudes_proposal/` 仅保留既有历史材料。
- Introduction 是介绍草稿，不纳入技术提案编号；验收记录与原始 evidence 继续放在 `docs/implementation/`，不能混入候选设计目录。

## 4. 状态与接受规则

| 状态 | 含义 |
|---|---|
| **PROPOSED** | 待讨论的建议；没有自动修改实现、执行权限、阶段门槛或已验证能力 |
| **ACCEPTED** | 已明确接受，并记录哪些部分合并到了哪些现行文档；提案保留为决策依据，不成为并行规格 |
| **DEPRECATED** | 已封存或已被替代；保留历史，不继续实现其中的旧接口或旧路线 |

可以部分接受，但必须写清接受范围与仍未决定的内容。不要因为文件存在或 introduction 使用了某个描述，就把对应能力视为已经实现。

涉及产品/协议的接受项更新组合设计；涉及推进顺序或晋级条件的接受项更新阶段文件；实际执行结果另写实施记录。纯提案整理不追溯改写 S1 原始证据。
