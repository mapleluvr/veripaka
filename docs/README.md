# veripaka 文档入口

## 1. 先区分目标、规格与事实

| 要了解什么 | 入口 | 文档性质 |
|---|---|---|
| 最初要解决的问题 | [原始 brief](Draft.txt) | 需求来源，不是完整实现规格 |
| 当前怎样介绍产品 | [Introduction 草稿](intro_draft.txt) | 持续修订的表达；目标不等于已交付能力 |
| 如何运行当前实现 | [根 README](../README.md) | 实际使用入口和支持范围 |
| 如何开发、安装及恢复运行 | [开发与运行说明](development.md) | 本地打包、取消与恢复、内部 E2E 约定 |
| 当前实现遵循什么设计 | [组合设计](VERIPAKA_DESIGN.md) | 唯一当前设计基线；未来部分仍须按阶段实现 |
| 推进顺序及晋级条件 | [实现阶段](IMPLEMENTATION_PHASES.md) | S1 已闭合，S2—S4 未实施验收 |
| 什么已经真正执行过 | [S1 验收记录](implementation/S1_EVIDENCE_CHECKPOINT.md) | 声明环境内的结论、原始证据与限制 |
| 方法探索已推进到哪里 | [S2 首轮记录](implementation/S2_START_CHECKPOINT.md) | 环境、指导入口、候选方法及失败校准；不是 S2 验收 |
| 模型图像输入的当前结论 | [read 恢复复验](implementation/IMAGE_READ_REVALIDATION_2026-09-30.md)；[此前诊断](implementation/IMAGE_TRANSPORT_DIAGNOSIS_2026-09-30.md) | 上游排查后，本地 PNG/JPEG 经 read/data URI 已通过原图、新图和普通 CLI 复验 |
| 什么正在讨论、什么已封存 | [Proposal 索引](proposals/README.md) | 提案状态、承接关系和历史材料清单 |

设计、提案和介绍均不能代替实测证据；一个功能出现在文档中，不意味着它已经实现或通过验收。

## 2. 当前路线

用户已将产品重心澄清为：**探索真实、高能动性的 test recipe，包括由对象基础属性决定测试方式的 meta 判断。** 保存/复用与 evidence-verification 是支撑，不应代替核心方法探索能力。

[P001 · 面向真实对象的测试策略探索](proposals/001_TESTING_STRATEGY_DISCOVERY.md) 已 **ACCEPTED（限定范围）**，采纳项见其 §8；当前规范已合并到组合设计与阶段文件，不再把提案作为平行规格。

新路线：**S1 执行基础（已闭合）→ S2 真实对象上的方法探索 → S3 条件化迁移与方法改进 → S4 探索/复用价值归因。** 工具适配按任务需要建设，不把截图接通或三个 Profile 齐全当作核心目标。

本轮设计已完成自我反思并获独立 reviewer 放行，见 [复审记录](implementation/ROADMAP_REVIEW_2026-09-30.md)；父 Agent 已开始 S2 单线推进。S1 验收继续证明原有执行和冷复用基础，不追溯证明广域方法探索能力；S2—S4 仍未实施验收。

## 3. 文档维护与历史

- 新提案统一放在 `docs/proposals/`；接受的内容按职责合并到组合设计与阶段文件，不平行维护第二套权威方案。
- 五份历史方案已标记 **DEPRECATED** 并原地封存。完整清单与承接关系统一见 [Proposal 索引](proposals/README.md)，不再在多个入口各维护一份列表。
- `.claudes_proposal/` 只保留历史材料，不再按模型/作者增加新提案目录。
- `.temp/research-0928/` 是本地历史调研，不属于当前工具可用性或产品能力的验收证明。
- 已归档的 S1 记录及 evidence 不因新产品提案而改写；新的能力必须留下新的实测记录。
