# Veripaka：目标形态与设计收敛建议

> **DEPRECATED — 已封存，仅供历史追溯。** 本文不再维护，不作为实现或验收依据；下文状态描述的是封存前的历史提案。当前设计以 [VERIPAKA_DESIGN.md](VERIPAKA_DESIGN.md) 为准，阶段与验收以 [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md) 为准。保留原路径以避免历史引用失效。

日期：2026-09-29  
状态：设计建议，不是已实现功能，也不是已批准规格。  
输入：`docs/Draft.txt`、`.temp/research-0928/REPORT.md` 及其原始 README、`docs/DESIGN_PROPOSAL.md`、`.claudes_proposal/DESIGN_V2.md`。

> 核心建议：Veripaka 应成为 **pi 优先、项目本地的验证方法工作台**。它把“这个项目应该怎样验证”保存为可发现、可绑定、可执行或可遵循、可审查的 Recipe，并让一次实际验证留下与方法版本相连的证据。
>
> 不是再做一个通用测试 runner，不是把所有方法塞进一份 Skill，也不是先建设完整 QA 平台。

---

## 0. 阅读材料后的校准

本次直接阅读全部相关原始 README；`jettbrains__-L-.md` 开头已足以确认是无关 W3C 内容，排除，不作为设计依据。没有重新访问 GitHub、运行这些项目或核查它们的实现代码。因此：下文引用的是提供的材料及其接口描述，不把 README 宣称等同于独立验证。

### 0.1 调研支持“值得做”，不支持“市场真空”

`REPORT.md` 的关键词搜索没有找到完全同形产品，可以支持一个定位假设，但不能证明不存在同类实现，更不能证明需求、护城河和商业价值。

原始材料还要求收窄其几个结论：

- `oh-my-agent` 已有 Frontend、Backend 等 presets，`verdict` 已有项目 QA profile。它们不等同于 Veripaka 的方法选择 Profile，但“没有 Profile 系统”这个宽泛说法不成立。
- Skills、test-design catalog、项目 protocol 已经在保存某种方法知识。“别人只保存结果、不保存方法”过于绝对。更准确的机会是：**把方法知识、项目绑定和运行反馈做成同一个可管理闭环**。
- `eval-harness` README 明确说共享预算账本尚未交付，现有预算限制是 per-process。不能把它当成已经解决跨运行预算控制的基础设施。
- `mythify` 明确说自己的小样本结果没有证明任务成功率或速度提升。`agent-charter` 的 IFEval 结果说明特定可验证指令能受益，不证明软件缺陷检出率同样提升。
- “确定性断言”只是判定过程可重复，不等于断言正确、覆盖充分或没有执行成本。
- 三次输出相同，不能证明不 flaky；三次自然语言输出不同，也不能证明验证结果 flaky。

因此，本项目的价值论证应来自 Draft 中的真实痛点，而不是来自“搜不到竞品”。

### 0.2 V2 的改进应保留，但还不能直接开工

认同 V2 的方向：

1. 意图与运行事实分开。
2. 项目方法文档进入版本控制；临时日志与产物默认不进入。
3. 派生统计不写进 Recipe 定义。
4. 暂不引入索引服务、并发框架和完整全局 registry。
5. 不占用已有的 `vp` 命令名。

需要进一步修正的是语义，而不只是继续删字段：

- Recipe 仍被压成单个 command/checks YAML，难以保存方法学。
- 模板、项目 Recipe、具体测试实例尚未区分。
- `category` 混用了测试层级、技术、执行媒介和依赖替身。
- 隔离要求不满足只警告，会把“没有能力满足要求”伪装成正常执行。
- `pass_count/run_count` 不是方法可靠性。
- 变化的 hash 是诊断线索，不是根因证明；V2 甚至未明确记录被测代码版本这一核心维度。
- `runs/` 被清理后 baseline 可能跟着丢失；时间戳目录本身也不是防篡改审计链。
- MVP 保留 delta，却删去搜索、没有明确方法沉淀与 pi/Skill 消费路径，优先级偏离 Draft。

---

## 1. 产品究竟替用户做什么

### 1.1 从 Draft 推导出的三个任务

Draft 提出的不是一般的“提高代码质量”，而是三个具体任务：

1. **代替用户重复设计自测过程。** 便宜、快但较弱的模型，不必每次从零决定如何测试。
2. **代替用户重复组织精确反馈。** 测试发现异常后，能给出预期、实测、证据、复现和下一步，而不是等用户手动点击后重新描述。
3. **让已建立的方法在下一次工作中继续生效。** 项目已经知道的测试入口、环境准备、关键风险、判定方法，不能随会话结束而丢失。

它的核心资产不是“跑过多少次”，而是：

> **这个项目在某类变化下应该验证什么，为什么这样验证，怎样执行，什么才算有效结果。**

### 1.2 推荐定位

**对用户的一句话：**

> 让 Agent 记住这个项目怎样才算测过，并在下次改动时真正用起来。

**对架构的一句话：**

> pi-based verification-method workbench：方法库 + 项目绑定 + 有界应用流程 + 证据收据。

“Method library”是数据核心，但不宜把产品终态理解成一个 Awesome List 或命令收藏夹。

### 1.3 默认不做的事

- 不接管整个开发生命周期，不做另一个完整 coding agent。
- 不替代 pytest、Vitest、Playwright、已有 CI。
- 不重做浏览器驱动、Windows computer-use 或图像分析工具。
- 不承诺自动发现所有缺陷、保证正确或完全取消人工 QA。
- 不默认启用自动修复、自动修改基线、自动提交或自动发布。
- 不从第一天建设云端团队平台、市场、向量数据库、分布式调度器。

可以在测试框架之上管理方法，也可以管理 Agent 执行的探索式流程；这不是非此即彼。

---

## 2. 哪些内容实际上具有确定性

这里的“确定性”指：**在接受 Draft 目标的前提下，哪些约束不应再被随意摇摆**，而不是某种实现已经证明最优。

### 2.1 四类判断

| 层次 | 含义 | 例子 | 处理方式 |
|---|---|---|---|
| A：需求承诺 | Draft 已经给出 | pi 基础、Agent-native CLI、项目内方法管理、方法多样性、默认 profiles | 作为当前产品边界 |
| B：必要契约 | 不具备就无法诚实兑现 A | 方法与运行分离、项目绑定、结果有范围、不能把未验证算通过 | 现在收敛并写规范 |
| C：推荐决策 | 多个合理方案中，当前最合适的一种 | `.veripaka/`、`RECIPE.md`、`paka`、copy-on-import、串行 MVP | 给出默认，不冒充唯一解 |
| D：效果假设 | 必须经过真实使用才能知道 | 弱模型能省多少成本、自动选法效果、跨项目迁移颗粒度 | 设计实验，不提前写收益承诺 |

### 2.2 可现在固定的必要契约

| 契约 | 为什么稳定 | 不代表什么 |
|---|---|---|
| 方法定义不等于运行记录 | 一个方法必须复用多次；运行观察会变化 | 不决定用 JSON 还是 YAML |
| 方法的通用部分与项目绑定分开 | 同一验证技术在不同项目的入口、账号、阈值不同 | 不要求一开始就有全局服务 |
| Recipe 必须表达判定依据和边界 | 只有动作，没有何为正确，无法产生有效反馈 | 不要求所有判定都能机器自动化 |
| 缺证据、缺环境、失败必须可区分 | 弱模型最容易把流程完成当验证成功 | 不决定具体 exit code 数字 |
| 稳定标识、格式版本、内容修订必须可区分 | 搜索、引用、升级、历史比较依赖它们 | 不要求人工维护全局递增编号 |
| 运行必须说明绑定了哪些方法、输入和 SUT 状态 | 否则旧结果可以被误用于新代码 | 不代表记录 hash 就是可信证明 |
| 机器可测事实由程序写，判断和假设明确标注 | 不该让模型编时间戳、计数和文件 hash | 不代表程序能机械决定业务预期 |
| 文档需要渐进披露 | 全库塞进上下文违背弱模型和低成本目标 | 不证明某个 token 上限最优 |
| 方法获取与代码执行分开授权 | 安装一份方法不应顺带执行其中脚本 | 不代表本地脚本天然安全 |
| 有界执行、停止与失败出口 | 否则省下的模型费会被无限重试消耗 | 不要求默认开启自动修复循环 |
| 搜索和复用必须进入最小闭环 | 它们就是 Draft 的产品价值，不是后续装饰 | 不需要高级检索引擎 |

### 2.3 不能伪装成“确定性”的内容

- “别人采用了 `.qa/`，所以双层全局库是确定设计。”只能说明有先例。
- “所有 Recipe 都必须只读。”测试可以合法写入隔离数据；只读不等于安全。
- “所有 Recipe 必须有美元估算。”未知费用必须允许未知，不能强填一个数字。
- “LLM judge 必须有 deterministic fallback。”若存在等价确定判据，本来就应优先采用；若不存在，不能伪造一个不等价 fallback。
- “某测试类型天然 deterministic。”单元测试可能读时钟，E2E 也可能高度稳定；层级不能决定稳定性。
- “全局 slug 唯一。”没有中央协调，裸 slug 无法保证全局唯一。
- “四周能完成”“四并发一定把两分钟缩成三十秒”。没有实施和测量依据。

**收敛原则：先冻结语义关系和诚实边界，再选择一个便于修改的物理表示。**

---

## 3. 推荐目标体验：两个闭环，而不是一个 run 命令

### 3.1 日常使用闭环

```text
收到任务 / 代码变化
  → 读取项目验证地图
  → 找到相关 Recipe，说明选中理由与未覆盖风险
  → 绑定本次目标、环境与输入，检查前置条件
  → 冻结一个具体验证计划
  → 用现有 runner 或 pi 的工具执行
  → 收集证据，按事先明确的 oracle 判定
  → 输出复现友好的反馈 / 交给开发 Agent 修复
  → 重新验证修改后的目标
```

其中“冻结”是固定本次执行的输入与标准，不是冻结整个产品 spec，也不要求创建分支。

### 3.2 方法积累闭环

```text
用户曾经教过一种自测法 / Agent 临时找到有效方法 / 某次漏测暴露新风险
  → 提取最小可复用方法
  → 分开通用步骤与项目特定参数
  → 草拟 Recipe，关联原始失败与成功证据
  → 审查 oracle、假通过路径、安全边界
  → 在已知好样本和已知坏样本上试用
  → 纳入项目 Profile
  → 下一会话真实发现并复用
```

不是每次运行都生成一份新 Recipe，也不是把聊天记录全文保存下来。方法没有变化时只新增 run。

### 3.3 一个最能证明价值的演示

1. 用户说：“这个弹窗改完要验证键盘打开、焦点不能跑出弹窗、Esc 关闭后焦点回到原按钮。”
2. Agent 第一次将这套方法绑定到本项目的真实入口、定位方式和 runner。
3. 形成项目 Recipe，记录普通单元测试未覆盖的风险。
4. 第二个新会话再改弹窗，不重新问用户如何测，能检索到该 Recipe。
5. 发现回焦点错误时，反馈具体入口、按键、预期控件、实际控件、trace/截图，而不是“可访问性似乎有问题”。
6. 修复后在新代码上重跑；旧结果不自动移用。

**这比演示两个 YAML 包装后的 shell 命令更接近产品本身。**

---

## 4. 概念模型：拆语义，不把每个名词都做成新子系统

| 名词 | 含义 | 例子 |
|---|---|---|
| Technique / 方法原理 | 通用测试知识，不必作为独立实体存储 | 边界值、状态转移、变形关系 |
| Recipe template | 尚未绑定项目的可复用方法包 | 如何验证模态框的键盘和焦点行为 |
| Project Recipe | 对本项目已作适配、可以被应用的方法包 | 本项目的设置弹窗键盘回归 |
| Case / binding | 某次具体目标、数据和环境组合 | settings-dialog × Chromium × desktop |
| Profile | 针对一类工作选择方法、提出验证义务的默认方案 | frontend、backend、debugging |
| Plan | 一次任务的明确方法集合、绑定、顺序、预算与缺口 | 此次变更要跑哪些步骤，哪些没跑 |
| Run / attempt | 针对一个固定 plan 的实际执行及重试 | 第一次运行失败，修复后另开一次运行 |
| Evidence / assessment | 观察产物，以及基于 oracle 的结论 | trace、断言结果、人工裁决 |
| Finding | 值得跨运行跟踪的具体问题，不是每条失败日志 | 弹窗关闭后焦点丢到 body |

实施时不需要九张表、九套命令或九个目录。第一版只需四类主要文档：**项目说明、Recipe、Profile、Run**；plan、case、证据作为其中的结构。

### Recipe 不是以下任何一个东西

- **不是 test case 的别名。** 一个 Recipe 可产生多个 case，也可指向现有测试集合。
- **不是 test runner。** runner 负责执行；Recipe 解释为什么运行它、怎样绑定以及结果能说明什么。
- **不是一般 Skill。** Skill 教 Agent 如何操作 Veripaka；Recipe 是可被选择的领域方法内容。
- **不是 requirements 的替代品。** Recipe 引用预期行为来源；缺少来源时保留待决问题，而不是根据当前实现反推正确答案。
- **不是单一命令的包装。** 单命令是允许的退化形式，但不是语义上限。

---

## 5. CLI 维护的文档目录：推荐现在定下来的设计

### 5.1 项目目录

```text
<project-root>/
├── AGENTS.md                       # 可选：只添加短入口，不复制整库
├── tests/                          # 现有测试照旧，不要求迁移
└── .veripaka/
    ├── README.md                   # 稳定阅读入口：本目录约定、最短使用路径
    ├── project.yaml                # 唯一机器配置：目标、命令绑定、默认 profiles
    ├── CONTEXT.md                  # 可选：项目特有解释、历史陷阱、规范链接
    ├── recipes/
    │   └── modal-keyboard/
    │       ├── RECIPE.md           # 小型 frontmatter + 标准化方法正文
    │       ├── scripts/            # 可选：方法特有 helper，不复制现有测试
    │       ├── fixtures/           # 可选：方法自有的小型、非敏感数据
    │       └── references/         # 可选：深层解释、校准样本、历史依据
    ├── profiles/
    │   ├── frontend.yaml
    │   ├── backend.yaml
    │   └── debugging.yaml
    ├── baselines/                  # 可选：被显式接受的参考，不放在临时 runs 里
    │   └── <baseline-id>/
    │       ├── BASELINE.yaml       # 来源、条件、批准理由、内容摘要
    │       └── ...                 # 小文件；大文件可使用明确外部存储引用
    └── local/                     # 整个目录默认忽略，不作为共享意图来源
        ├── config.yaml            # 本机地址等覆盖；密钥仍优先来自环境/密钥存储
        ├── drafts/                # 未审查的方法候选；接受后进入 recipes/
        ├── runs/
        │   └── <run-id>/
        │       ├── plan.json      # 固定的本次计划、方法版本、绑定及缺口
        │       ├── manifest.json  # 实际 SUT、环境、工具和 fixture 的身份
        │       ├── result.json    # 运行状态、各 claim 结论、未验证项
        │       ├── report.md      # 从 result 渲染，禁止另一套独立事实
        │       └── artifacts/     # stdout/stderr、runner report、截图、trace
        ├── cache/                 # 可随时重建；第一版无需检索索引
        └── locks/                 # 运行协调；不承诺跨机器分布式锁
```

此树是目标布局，**不要求 init 创建全部空目录和空文件**。`init` 只创建必要入口、配置、忽略规则；其他按需生成。

### 5.2 为什么这样分

1. **以对象生命周期分目录，而不是以技术类型分目录。** 不能把一个同时涉及 UI、API 与 mock 的方法硬塞进唯一分类路径。
2. **一个方法一个可搬运的包。** 正文、helper、fixture、引用一起走；`RECIPE.md` 既能直接阅读也能被 CLI 检索。
3. **计划、事实、索引各有唯一职责。** 不再同时维护 registry 的启用列表、profile 列表和 state 的活跃列表三份真相。
4. **可共享知识与本机痕迹物理分开。** 不靠每个新增文件的作者都记住写 gitignore。
5. **baseline 与运行日志不同生命周期。** 清理旧 run 不得破坏现在仍在使用的判定参考。
6. **不要求 Git 才能使用。** Git 是共享与版本标识工具，不是方法管理的前提；当前项目本身也不是 Git 仓库。

### 5.3 谁能写、谁是事实来源

| 内容 | 维护者 | 是否推荐进入版本控制 |
|---|---|---|
| `project.yaml` | 用户/Agent 经明确修改；CLI 做校验与有限更新 | 是 |
| `CONTEXT.md` | 用户/Agent；存解释，不重复机器绑定 | 是 |
| `RECIPE.md` 与配套文件 | 用户/Agent；CLI 不在每次 run 重写 | 是 |
| `profiles/*.yaml` | 用户/Agent；由明确操作变更 | 是 |
| baseline | 显式接受流程；不由失败运行自动改写 | 小型非敏感内容是；其余用明确存储策略 |
| `local/runs/*` | CLI/adapter 记录；终态后不原地改写 | 默认否；CI 可存为 CI artifacts |
| `report.md`、检索 cache | 程序从规范数据派生 | 默认否 |
| 运行统计 | 从保留的 run 派生，注明样本范围 | 默认否 |

`README.md` 不承担需要持续同步的详细 recipe 全量索引。CLI 不可用时，可直接阅读该入口、`profiles/` 和各 Recipe；CLI 可用时用 `list/search` 获取实时目录。

### 5.4 对 AGENTS.md 的修改范围

建议仅插入一个有清晰边界的短块：

```text
本项目的验证方法在 .veripaka/README.md。
验证当前改动前，检索相关 Recipe；缺少环境或证据时报告未验证项。
不要把历史 run 的通过结果当成当前代码已通过。
```

`init` 默认给出 diff；确认或显式选项后写入。只修改自己拥有的块，不重写已有 Agent 指令，不假设写进去就必然被执行。

### 5.5 跨项目库：可延后实现，但语义现在明确

推荐未来使用三种来源：`builtin`、个人库、项目库。但这不是“所有层同时合并后按优先级静默覆盖”。

- 内置库主要保存通用 templates 和精选 Profile 模板。
- 项目库保存本项目权威的 bindings、oracle 选择和风险背景。
- 个人库保存经过脱敏和参数化的方法；不自动带走项目账号、截图、业务规则或 baseline。
- 使用命名空间，例如 `builtin/frontend/modal-keyboard`、`personal/dialog-check`、`project/settings-dialog`。裸 slug 仅在当前范围唯一且无歧义时允许解析。
- **推荐 copy-on-import。** 首次引入时复制到项目并记录 `derived_from` 的来源、版本与 digest；本项目运行读取这份内容，不依赖用户机器上的全局最新版本。
- 更新上游时生成差异，显式接受；不自动覆盖本地适配。改写可执行语义或 oracle 后需要重新资格验证。
- 第一版可以只实现 builtin → project，不实现个人库。

这里可移植的是“方法知识 + 参数接口 + 支撑文件”，不是保证某份 E2E 在所有项目零配置运行。

---

## 6. Test Recipe 的功能语义

### 6.1 定义

> **Test Recipe 是一个有适用边界、前置条件、操作过程、观察要求与结论规则的可复用验证过程。**

它至少能回答：

1. 要验证哪个行为/风险？
2. 在什么场景下应该选它，又什么时候不该选？
3. 需要什么项目知识、输入、环境和权限？
4. 怎么操作，在哪里观察？
5. 什么证据支持或反驳目标主张？
6. 如果无法判定，怎样停止和反馈？
7. 它没有覆盖什么？

### 6.2 三种执行程度，不能只支持“已有脚本”

| 形式 | 实际执行方式 | 适合什么 | 结论限制 |
|---|---|---|---|
| Scripted | 现有 runner / 明确进程 | 已成熟回归、API/契约/静态检查 | runner 返回不等于断言充分 |
| Guided | pi 按方法调用工具，收集结构化观察 | CU、交互检查、尚未脚本化的流程 | 只能按明确 oracle 对具体 claim 下结论 |
| Mixed | 脚本准备/采集 + Agent 局部判断 | 视觉、探索、复杂复现 | 自动结论与 judgment 分开标注 |

这是同一个 Recipe 概念的执行策略，不应分裂为三个互不兼容的库。

**MVP 的受管执行可以只覆盖 scripted；但格式与 pi 消费路径必须能保留 guided 方法。** 没有实现 host 执行能力时，CLI 明确返回 `host_required`，不假装已跑。

### 6.3 Verification 与 investigation 的区别

不是每份好方法一开始就能给出二值判定。

- **Verification Recipe：** 有具体行为主张和 oracle，可以输出这些主张的 pass/fail/inconclusive。
- **Investigation Recipe：** 有时间盒、风险范围、观察方案和停止条件，产出发现、证据和候选回归。完成调查不等于证明产品没问题。

例如“定位偶发卡死”可以是一份合格调查 Recipe，不该为了塞进 schema 就捏造一个“本次不卡死 = pass”的假 oracle。

### 6.4 不用单一 category 枚举承载所有分类

推荐多轴标签：

| 轴 | 示例 |
|---|---|
| domain | frontend、backend、desktop、cli、agent |
| intent | verify-change、regression、reproduce、investigate |
| level | unit、component、integration、system |
| technique | boundary、state-transition、property、metamorphic、differential |
| surface | code、api、dom、screen、filesystem |
| oracle | assertion、approved-reference、rubric、human |
| dependency mode | real、stub、mock、record-replay |

这不是要求所有轴都必填。第一版保留少量易检索字段，其余可作 tags。关键是不写下错误等价关系：**mock 不是与 E2E 并列的测试层级，metamorphic 不是 LLM-judge 的子类。**

### 6.5 动作、证据和正确性不是一回事

```text
命令启动成功
≠ 命令结束
≠ 目标用例实际执行
≠ 目标断言通过
≠ 此次任务所有风险被验证
≠ 产品正确
```

对应到视觉场景：

```text
拿到截图
≠ 截图是正确页面/状态/版本
≠ 执行了有意义的比较
≠ 差异是缺陷
```

每个箭头都需要一个显式契约。CLI 能验证其中的结构、身份和执行事实，但不能替代全部语义审查。

---

## 7. Recipe 编写标准：规定什么必须明确，而非堆一长串字段

### 7.1 生命周期分级

- **Draft：** 允许尚未解决的绑定和 oracle；可搜索、可审查，不可进入无人值守必需门禁。
- **Trial：** 结构完整，可以在声明条件下试运行；尚未完成方法资格验证。
- **Qualified：** 在其声明适用范围内，有已知好/坏样本或相当的资格证据；允许进入默认 Profile。
- **Deprecated：** 保留历史引用，退出默认选择，说明替代方法。

“Qualified”不是普遍正确的认证。它始终带条件、方法 digest 和资格证据；文件中自己写上这个词不能替代资格检查。

### 7.2 所有 Recipe 的 MUST

1. **稳定身份。** ID 在命名空间内唯一；改显示名不更换 ID。格式版本、内容 digest 和上游来源分开记录。
2. **目标与非目标。** 一句话说清具体风险，再列出本方法不证明什么。
3. **适用说明。** 至少说明应选/不应选的情形。自然语言 hints 可以保留，不能伪装成可执行规则。
4. **输入绑定。** 参数、类型、来源、默认值和 unresolved 项明确；关键参数不能靠执行时临场猜测。
5. **前置条件。** 真实测试入口、环境条件、依赖、权限和可观察性。条件不满足给出 blocked 原因。
6. **有界过程。** 步骤具有具体对象、动作、观察位置；明确超时、失败出口和重试上限。
7. **输出契约。** 每项观察带 evidence 引用；验证与调查分别声明结论规则。
8. **副作用声明。** 创建什么、修改什么、使用哪些账号/服务、如何清理、清理失败怎么办。
9. **假通过说明。** 至少回答“哪个常见错误会让这个方法看似成功，却没测到目标？”
10. **失败反馈形状。** 实际结果、预期、case、证据和复现入口必须足以交给另一个会话继续。

### 7.3 Verification Recipe 额外 MUST

1. 每个 claim 有稳定 ID、oracle 类型和预期来源。
2. 每个 claim 明确需要哪份 evidence；缺少证据只能 inconclusive。
3. 未运行目标用例、全部 skip、runner report 无法解析，不得当通过。
4. 不能只以“截图存在”“日志里出现 PASS”“mock 返回了设定值”证明实际行为。
5. 预期和阈值在看候选结果之前决定；临时调整必须形成新修订和新运行。
6. 人工或模型判定必须保留依据、rubric/参考版本，不能伪装成 deterministic assertion。
7. 成为默认 qualified 方法前，必须证明至少一个相关已知坏样本会被它拒绝；无法实施时明确例外与限制，不伪造资格。

### 7.4 SHOULD，而不是不现实的通用硬规则

- 优先复用项目现有测试和测试数据。
- 尽量把开放推理前移到编写/绑定阶段，让运行阶段只处理少量局部选择。
- 优先测试用户可见行为和真实边界，不把实现细节或重复业务逻辑当 oracle。
- 把可稳定脚本化的 guided 步骤逐步脚本化，不要求第一天全部自动化。
- 用可重置的独立测试状态替代“永远只读”。
- 同一前置环境下验证重复运行不会互相污染；记录偶发失败样本。
- 主文件短，长背景放 `references/`；长度目标通过弱模型试用决定。
- 失败诊断提示解释方向，不指示“改断言以变绿”。

### 7.5 建议的 RECIPE.md 正文模板

```markdown
# 名称

## Purpose
本方法验证的行为/风险；预期来源。

## When to use / When not to use
适用边界；什么变化会触发重新考虑。

## Inputs and preconditions
项目绑定；未解决参数；依赖；环境。

## Procedure
带稳定 step ID 的准备、动作、观察、清理步骤。

## Oracles and evidence
claim ID → 预期来源 → 观察/断言 → 证据 → 未决出口。

## Failure handling
预期/实际怎样反馈；哪些失败需要停止，哪些可以有界重试。

## False-green traps and limits
如何看起来通过却没有验证；没有覆盖的风险。

## Qualification
已知好/坏样本、最近资格验证的引用与适用条件。
```

Frontmatter 管身份、检索、绑定、执行入口等机器字段；正文保留解释和可遵循的方法。**同一命令、阈值或参数不在两个地方分别维护：正文引用结构字段或 runner 的对应 assertion ID。**

### 7.6 校验分三层

| 层次 | 可以机械校验的内容 | 不能声称什么 |
|---|---|---|
| Shape | schema、字段、ID、文件引用、重复 claim、未知字段 | 不证明方法有意义 |
| Binding / preflight | 参数已绑定、依赖存在、工具版本、能力要求、入口可用 | 不保证测试一定成功 |
| Qualification | 对已知样本实际运行，保留成功和拒绝证据 | 不证明未知缺陷全覆盖 |

依赖缺失不应把一个通用 template 判为“格式无效”。模板合法与此机可运行是两个问题。

---

## 8. 一个具体 Recipe 示例

以下是**设计示例**，不是本仓库已有文件、已经实现的语法或已经核验的工具命令。示例假设目标应用已存在 `tests/ui/settings-dialog.spec.ts`；实际接入时必须在目标项目中确认。

### 8.1 机器部分

```yaml
---
format: veripaka.recipe/v0
id: project/settings-dialog-keyboard
title: 设置弹窗键盘与焦点回归
kind: verification
intent: regression
domain: [frontend]
level: system
techniques: [state-transition]
surfaces: [dom, screen]

# 从通用模板适配而来；真实版本与 digest 在引入时由 CLI 记录。
derived_from:
  id: builtin/frontend/modal-keyboard

applies:
  hints:
    - 修改设置弹窗、触发按钮、焦点管理、公共 overlay 时使用。
  paths:
    - src/components/settings-dialog/**
    - src/components/overlay/**

execution:
  mode: scripted
  command_ref: ui-settings-dialog
  timeout_seconds: 120
  retry_limit: 0

inputs:
  target:
    binding: project.targets.web-test
  browser:
    value: chromium

claims:
  - id: keyboard-open
    source: docs/interaction-contract.md#settings-dialog
    oracle: runner-assertion
    assertion_id: settings-dialog/keyboard-open
  - id: focus-contained
    source: docs/interaction-contract.md#settings-dialog
    oracle: runner-assertion
    assertion_id: settings-dialog/focus-contained
  - id: focus-restored
    source: docs/interaction-contract.md#settings-dialog
    oracle: runner-assertion
    assertion_id: settings-dialog/focus-restored

side_effects:
  description: 使用独立浏览器会话和测试账号；只读账户设置，不提交修改。
  cleanup: 关闭本次创建的浏览器上下文。
resources:
  - key: browser-context:settings-dialog
    access: exclusive
limits:
  - 不证明其他弹窗、浏览器、触摸交互或完整 WCAG 合规。
---
```

这里的 `command_ref` 指向 `project.yaml` 中已经确认的 argv 绑定；不让弱模型每次重写 runner 命令，也不把 shell 字符串拼接当参数系统。

`applies.paths` 只作为候选提示：路径命中可被程序确定，但“只有这些路径会影响弹窗”不能由 glob 证明。未命中不能直接删除必要验证义务。

### 8.2 正文中的关键内容

**Purpose**

验证目标弹窗的三个键盘交互主张，不把“组件挂载成功”当成交互通过。

**Procedure**

1. 确认测试地址属于已授权环境，且加载的是当前目标构建。
2. 用独立会话进入真实设置入口；等待明确的 UI ready 条件，而非固定 sleep。
3. 从实际触发按钮通过键盘打开弹窗；断言初始焦点。
4. 在该弹窗的可聚焦控件间进行前向/反向 Tab 遍历；断言焦点留在容器内。
5. 按 Esc；断言弹窗关闭，且焦点恢复到原触发按钮。
6. 收集各 assertion 的结果和 runner trace；失败时保留截图作为辅助材料。
7. 关闭本次会话；清理失败单独记录。

**False-green traps**

- 直接把 focus 设置到目标控件，再验证它有焦点。
- 没有覆盖真实页面入口，只测隔离渲染。
- 全部用例 skipped，却只读进程 exit 0。
- 读取上次生成的 report。
- 用截图证明键盘焦点回归已经通过；截图通常只能辅助，不替代该 DOM 断言。

**Qualification**

在受控副本中移除关闭后的 focus restore，应当只让对应行为断言失败；恢复实现后通过。不要为了资格验证修改用户正在工作的树。

### 8.3 两个重要变体

- **没有浏览器 runner，但有可用 CU：** 保留同一目标主张，另建 guided 执行绑定；不能自动宣称它与 DOM 断言具有同等观察能力。若无法可靠观察 focus，相关 claim 留作 inconclusive。
- **视觉差异检查：** 固定窗口、缩放/DPI、字体、主题、加载状态、参考版本和容差政策。像素不同首先是差异信号，是否为缺陷取决于接受的 oracle。没有基线时报告 `baseline_required`，不把第一次截图自动认作正确答案。

---

## 9. 结果契约：把“诚实”做成结构，不靠模型措辞

### 9.1 三个维度

**执行状态：** queued / running / completed / blocked / error / cancelled / interrupted。超时作为明确 reason，也可由实现单列；不要默认为测试失败。

**各 claim 评估：** pass / fail / inconclusive。

**证据属性：** oracle 类型、采集来源、目标身份、时效性和适用范围。

例如：

- runner 结束、断言反例明确：`completed + fail`。
- runner 崩溃：`error + inconclusive`，不是已证明业务缺陷。
- judge 不可用：该 claim `inconclusive`。
- guided 调查执行完、没找到反例：调查 `completed`，不是整个产品 `pass`。

### 9.2 聚合决策

对本次计划已声明的验证义务计算：

1. 存在有效的必需失败 → `fail`，同时保留其他未验证项。
2. 没有有效失败，但有必需 claim 缺证据、过期或前置条件不满足 → `blocked`。
3. 必需 claim 非空且全部有有效通过证据 → `pass`，仍输出明确范围及可选缺口。
4. 此次明确不适用任何验证义务 → `not_applicable`，不伪装成执行后通过。

忽略一个必需项目必须是显式改范围或接受风险，留下原因；不允许通过预算耗尽、缺工具或 quarantine 静默删除它。

可选方法失败作为 warning 保留；若显示“pass with risks”，必须讲清它是政策允许的范围决策，不是改变事实。

### 9.3 最小失败记录

```text
recipe_id / recipe_digest
case_key / claim_id / attempt_id
expected + expectation_source
actual
execution_status + assessment
evidence_refs
sut_identity + environment_identity
reproduce_command_or_steps
diagnostic_hypotheses（可空，明确不是事实）
not_verified
```

这是降低用户重复编写反馈成本的核心，比提前做好历史趋势图更重要。

### 9.4 CLI exit code 是适配层，不是全部领域模型

建议执行/门禁命令采用：0=当前范围通过；1=已验证断言失败；2=调用/配置错误；3=无法完成验证。详细 reason 放 JSON，包括 `missing_dependency`、`host_required`、`stale_evidence`、`no_cases`、`policy_denied`。

具体数字可以调整，稳定约束是不把未验证变成成功。`search`、`show`、`validate` 的 0 只代表对应 CLI 操作成功，不意味着项目测试通过。不要无差别透传 child exit code。

### 9.5 deterministic、模型判断和人工判断

不设计一个含糊的 `determinism_tier: high` 来包办质量。

分别记录：

- 测量是否依赖随机环境、采样和外部状态；
- oracle 是断言、差异阈值、rubric 还是人；
- 预期来源是什么；
- 方法在已知样本上的检出能力；
- 重复运行的观察稳定性。

模型判定要求固定 rubric、参考与输入，保留 model/prompt 版本；输出无法解析、模型不可用或证据不足时不得捏造 verdict。多次投票最多缓解部分随机性，不能消除共享盲点。

所谓“只打分不判对错”也不自动变可靠：若最后以分数阈值决定通过，系统仍在间接依赖模型判断。

---

## 10. Profile：方法选择和验证义务的默认方案

### 10.1 不只是运行所有 Recipe 的列表

推荐 Profile 包含：

1. 目标风险与适用任务。
2. 哪些验证义务默认必须被满足。
3. 可选的具体 Recipe 或模板建议。
4. 按什么顺序从便宜检查扩展到更深检查。
5. 环境/能力缺口怎样输出。
6. 预算、升级判断和停止建议。

它不是新的工作流语言。第一版可以是显式 Recipe 引用、`required`、`blocking/advisory` 和少量参数，风险解释保留文本即可。

**Profile 不应绑定某个工具品牌。** “必须检查关键交互”是需求；“必须安装 cu”通常不是。已有 Playwright 能完成时优先复用。

### 10.2 默认三个 Profile

| Profile | 基础义务 | 条件追加 | 默认不做 |
|---|---|---|---|
| frontend | 现有 build/typecheck；变化关联的关键状态与交互；错误/空/加载状态 | 布局变化→固定环境视觉；焦点变化→键盘路径；跨层变更→真实提交链路 | 每次全站视觉回归；声称扫描等于完整 WCAG 合规 |
| backend | 现有测试；变化边界输入；API/错误契约；有状态变更的读写一致性 | 重试/幂等→重复请求；事务→失败回滚；权限→授权/拒绝矩阵 | 每次 mutation 全库；对真实生产数据试写 |
| debugging | 固定复现；区分环境与行为失败；候选原因；修复前失败/修复后通过；留下回归 | 间歇性→受控重复；版本可用→bisect；邻近风险→小范围回归 | 无界 root-cause 推理；以某一次成功抹去前面的失败 |

“debugging”是工作意图，frontend/backend 是领域。未来可以组合为 `frontend + fix`，不必把它们设计成互斥三选一的项目身份。

### 10.3 Profile 的诚实降级

- frontend 方法库存在，但本项目没有浏览器能力：Profile 报告对应义务未绑定。
- 已有 runner 只能证明组件逻辑，不能自动替代用户入口验证。
- 低价模型认为“看起来没必要”不能撤销必需项。
- 预算不够：输出已验证集合和保留的缺口；必需项未完即 blocked。

一个到处能“运行完成”、但通过跳过核心检查实现的默认 Profile，不算 working default。

### 10.4 组合、权限和升级

- 第一版不做任意深度 `extends`。用 `profile create --from` 展开复制，并保存来源；后续更新显式 diff。
- 若将来加入继承，要定义循环、重复 ID、参数覆盖和版本锁定，不用泛型深度 merge 猜含义。
- `priority` 表示先后顺序，`required` 表示完成义务，`blocking` 表示失败是否阻断；不要把三个含义都塞进 P0/P1/P2。
- Recipe 声明所需能力和副作用，项目/宿主政策声明允许能力，两者必须匹配。Profile 可以加严或指定预算，但不能凭声明授予项目未授权的权限。

V2 认为隔离只能在 Recipe 层、Profile/项目层不该出现相关政策，这个结论也过度了：**需求与许可处于不同层，不能靠删除其中一个解决冲突。**

---

## 11. Agent-native CLI：短主路径、结构化边界

以下是建议命令，不是当前已经存在的接口。名称 `paka` 沿用 V2 的候选；发布前仍需核验冲突。

### 11.1 核心工作路径

```text
paka init
paka recipe search <query> --json
paka recipe show <id> --json
paka recipe new <slug> --from <template-id>
paka recipe validate <id>
paka doctor
paka plan --profile frontend --scope <scope-file> --json
paka run --plan <plan-id> --json
paka report <run-id> --json
```

`paka run --recipe <id>` 可以作为快捷入口，但内部仍建立明确绑定和计划；不是另一条绕过安全与证据规则的路径。

Recipe 的新建/绑定内容由用户或 pi Skill 编写，CLI 负责确定性操作。核心 CLI 不必为了 `search`、`plan` 或时间戳引入 LLM 调用。

### 11.2 管理路径

```text
paka recipe list
paka recipe add <local-package>
paka recipe disable <id>
paka profile list
paka profile show <id>
paka profile create <name> --from <builtin-profile>
paka history
paka baseline accept <candidate> --reason <reason>
```

先提供 disable，再提供删除。删除被 Profile、baseline 或历史引用的方法时必须显式处理引用，不能静默让测试义务消失。

### 11.3 每个动词的副作用必须明确

| 动词 | 是否执行测试代码 | 是否改共享方法 |
|---|---|---|
| search/show/list | 否 | 否 |
| new/add | 否，导入不执行 | 创建显式指定的草稿/副本 |
| validate | 默认静态；执行资格验证另设显式模式 | 否 |
| doctor | 内置受控探测；任意项目命令需明确授权 | 否 |
| plan | 否；可以创建 local plan | 否 |
| run | 是，在固定计划和许可内 | 否 |
| report/history | 否 | 否 |
| baseline accept | 不重跑；接受所指候选参考 | 是，显式行为 |

不要用 `apply` 同时表达“安装 Profile”“生成测试”“开始执行”“批准 baseline”。如果对外保留 `apply`，限定为“把 template 适配为项目 Recipe 的提议”，并说明生成文件范围。

### 11.4 真正的 Agent-native 要求

- `--json` 有版本化 envelope；stdout 只输出协议数据，进度和日志走 stderr。
- 返回稳定 error code、reason、缺少的字段、下一步所需材料；不要让模型从一长段彩色日志猜。
- 不默认弹交互问答；TTY 模式可选 wizard，自动化入口非交互。
- 检索返回短摘要、适用理由、所需能力、绑定状态和引用；需要时再 show 全文。
- CLI 生成 ID、时间、hash、计数和状态，不要求 Agent 手工拼。
- 文件参数支持 JSON/YAML 输入，避免跨 PowerShell/Bash 的复杂内联 quoting。
- 不要求 Agent 读取整个 `local/runs/`；给它本次需要的 evidence refs 和失败片段。

### 11.5 检索与选择

第一版：扫 frontmatter + 简单全文检索 + tags + 显式绑定/路径提示。

推荐排序依据：已绑定当前目标的方法、过去同类问题对应方法、Profile 建议、一般文本匹配。排序要能解释，不先发明综合 `reliability_score`。

对于 glob、技术栈探测等规则，程序可以确定“是否匹配”，但适用性仍可能 unknown。返回候选理由与反证，不把路径无匹配当作无需测试的证明。

无须给“500 条以上才建索引”固定神奇阈值；观察实际耗时再建可重建 cache。检索加速不能改变权威来源。

---

## 12. 基于 pi 的产品骨架

### 12.1 推荐拆分

```text
pi 的 Skill / 轻薄扩展
  ├── 识别验证任务，读取项目入口
  ├── 协助选择/编写/绑定方法
  ├── 消费局部执行包，调用已有工具
  └── 把结构化反馈交回开发过程
                 ↓
Veripaka Core + CLI
  ├── 文档格式、校验、导入、查找
  ├── 项目绑定、计划快照与能力检查
  ├── 有界进程生命周期和证据记录
  └── 结果归一化、报告和方法来源
                 ↓
现有能力
  ├── pytest / Vitest / Playwright / 项目自有脚本
  ├── cu：Windows computer-use
  ├── visual-primitives：图像观察、标注、测量等已确认能力
  └── twcu：其真实接口支持的批量执行与 trace
```

Draft 明确基于 pi，所以 pi 集成应在第一阶段证明，而不是留到生态阶段。但**把 pi 作为第一个宿主，不等于把方法文件写成 pi 私有格式**。

### 12.2 技术栈建议

推荐 TypeScript/Node 作为默认实现，以减小与 pi 生态的接合成本；把 core、CLI、pi integration 保持为同一包内的清楚模块即可，暂不要求 monorepo、多语言 runtime 或插件市场。

这是一项推荐，不是 Draft 推导出的语言强约束。具体 pi extension API、事件能力、安装目录、兼容版本需实施前验证；本材料未包含这些 API，不能假定存在某个 Stop-hook。

### 12.3 为什么不是 registry-only

若完全不管理执行收据，Agent 又要自己记时间、整理结果、区分旧产物，容易回到 Draft 想消除的问题。

但也不需要全能 executor。推荐边界是：

> **Veripaka 管执行合同和收据，不重做底层测试能力。**

它拥有：固定 plan、preflight、spawn/cancel/timeout、收集结果、关联证据和状态。

它不拥有：浏览器语义、GUI driver、数据库 fixture 引擎、任意 DAG 工作流、所有语言的断言实现。

### 12.4 pi / Skill 的最小集合

不按领域创建几十个 Skills。第一阶段可用一个入口 Skill，包含三个工作模式：

- **verify：** 搜索 → 选择/绑定 → 运行 → 报告。
- **author：** 从用户方法或现有流程提炼 Recipe → 校验 → 资格试用。
- **repair-method：** 遇到失效入口/依赖变化，提出方法修订，不擅自降低 oracle。

Frontend/backend/debugging 是数据和方法内容，不需要每个都复制一份庞大 Skill。

### 12.5 对弱模型的关键设计

不是让弱模型读更多规矩，而是减少每轮必须自己发明的东西：

1. 运行前绑定好测试入口、参数与观察点。
2. 每次只给少量相关 Recipe 摘要，选定后再加载正文。
3. 一次提供一个有边界的问题/步骤及其输出形状，而不是“全面自测”。
4. 让程序收集事实和拒绝不完整结果。
5. 遇到 ambiguous oracle、环境不可观察、重复失败时升级或停下，不无限重试。
6. 高成本判断主要发生在方法编写和疑难诊断，成熟运行尽量无需模型判断。

“强模型编一次、弱模型用多次”是值得验证的经济性假设，不是预先保证。

---

## 13. 执行、状态与安全：最小必要边界

### 13.1 进程执行

- 优先使用 executable + argv 数组；shell 模式显式声明 shell，不把参数未经转义拼进 command 字符串。
- 项目既有测试也会执行任意代码。读取一份不可信项目并不等于授权执行其测试。
- preflight 不通过，不启动。
- 记录工作目录、命令实际解析结果、工具版本、开始/结束时间、退出状态和产物位置。
- 结束/取消应管理所创建的进程树；Windows 必须针对进程树和句柄行为测试，不能假定 Unix signal 语义。
- timeout 和 cleanup 是独立状态；cleanup 出错不能从报告中消失。

### 13.2 证据身份与新鲜度

每次 run 至少关联：

- Recipe 完整包 digest，包括 helper、rubric 等有效输入。
- 已解析 Profile/plan 的版本与内容。
- 具体 case/bindings、fixture/baseline digest。
- 被测源码/构建身份，必要时包括部署目标的版本标识。
- runner 与关键环境版本；视觉测试的 viewport、DPI、字体等。
- 模型参与时的模型/提示/采样配置，未知则标未知。

Git HEAD 不够：未提交修改、未跟踪测试文件、构建产物以及实际运行服务都可能不同。非 Git 项目可用明确源文件清单和内容快照，但清单是否完整仍是限制。

运行中目标被修改，不能把结果直接认证为当前工作树通过。第一版采用保守策略：检测到相关目标/方法变动则失效重跑；更强的一致性来自固定副本或已标识构建。

hash 是身份与变化线索，不是签名，更不是对“Agent 没有作假”的证明。若 Agent 与程序共享同等文件写权限，不能宣传结果不可伪造。高保证门禁需要独立受信执行边界，例如 CI。

### 13.3 方法变化与代码变化分别看

`env_delta` 可以列出 code_changed、recipe_changed、fixture_changed、baseline_changed、runner_changed、model_changed。它们是可同时出现的事实，不是四选一的根因分类。

例：代码与 fixture 都变了，不能因为检测顺序先看到 recipe 就归因为 `RECIPE_CHANGED`。需要对照运行或其他证据才能提出因果结论。

### 13.4 不提前做 findings 数据库，但不要做错误 delta

MVP 优先保留 run 与具体 claim/case 身份；复杂 finding 生命周期可延后。

未来比较单位应接近：`recipe_id + case_key + claim_id`，而不是只有 recipe ID。

只有在语义、绑定和观察条件可比较时，才输出通过/失败变化。没有执行、目标未覆盖或定义改变，应写 `not_rechecked` / `incomparable`，不能把“这次没提到”当 RESOLVED。

`NEW / STILL_OPEN / RESOLVED / REGRESSED` 属于问题生命周期，需要稳定 finding 身份和对应复核证据。不是对任意两次 `result.json` 做数组差就能得到。

### 13.5 Flaky 与统计

- 保留每次 attempt，不用最终通过覆盖前面的失败。
- 在基本相同输入、环境和 SUT 下出现判定分歧，是不稳定性线索；区分环境漂移和方法本身问题。
- 三次全通过只说明三次观察通过。即使独立假设成立，真实失败概率 10% 的测试连续三次通过的概率仍有 72.9%。
- quarantined 项可以不阻断某个政策门禁，但必须保留缺口和到期机制；不等于风险已经被覆盖。
- MVP 不需要自动 flaky classifier；但必须不丢重试历史。
- 通过率高可能因为被测对象正确，也可能因为方法什么都不测。方法效用看已知缺陷检出、误报和假通过，运行稳定性单独统计。

### 13.6 并发不是简单移植 flock

先串行。第一版即使只串行，也要处理两个 CLI 实例同时启动的情况。

推荐初期：同一项目的受管执行使用跨平台的互斥机制，拒绝/等待第二次运行；同一桌面会话的 CU 使用用户级共享资源锁，而不只按项目锁。锁协议需有 owner、生命周期、崩溃恢复，不能仅凭超时强抢仍存活的执行者。

后续并发按共享资源协调，而不是只按 Recipe ID：

- 桌面/session、浏览器 profile；
- 服务端口；
- 测试数据库/账号/租户；
- 基线更新目标；
- 同一输出目录。

不同 Recipe 可能争用同一桌面；相同 Recipe 也可能在独立容器中安全并行。把 trigger 放入锁 key 会让手动与 CI 的同资源运行绕过彼此。

Worktree 只隔离工作树文件，不隔离桌面、端口、数据库、网络或凭据；更不是安全 sandbox。

### 13.7 权限与信任

- `requires_isolation` 是硬要求时，不满足即 blocked；若只是建议，命名为 preference，并展示实际保证，不能混成一个字段。
- `allow_network: false` 只有在实际后端可执行限制时才能叫“禁止网络”。没有 enforcement 时必须说只是约定，或拒绝要求强保证的运行。
- localhost 可能连接生产数据库或代理外部服务；不能作为“安全测试环境”的充分证据。
- 包导入只解析允许的文档格式，不自动执行 JS 配置、安装脚本或 probe。
- imported Recipe、日志、网页内容都不应升级成可修改全局政策的指令。
- 包路径必须检查相对路径、越界、symlink/reparse point；共享报告与证据默认脱敏，不自动上传。
- 自动学习只产生草稿；不能顺便改变 required checks、批准 baseline 或扩展权限。

### 13.8 预算

- 优先对墙钟、重试次数、工具调用次数设可执行限制。
- 成本区分 estimate、observed、unknown；没有 provider 计量不能写 0。
- 即使不使用 LLM，也可能产生云服务/CI 费用；“deterministic = $0”不成立。
- 没有可靠成本上界时，不能宣传严格美元硬上限；可以在下一动作前拒绝，并注明在途调用仍有费用。
- 将来做并发预算，需要预留/结算，不能让每个进程独享相同“总预算”。

---

## 14. 与现有三个工具的关系

仅依据 Draft 和调研里的定位，不假设未核验的命令存在。

| 工具 | 建议职责 | Veripaka 不该做的推断 |
|---|---|---|
| visual-primitives | 提供已实现的图像观察、标注、测量等局部能力 | 不因为名字就假设有 `vp compare` 或 similarity score |
| cu | Windows GUI 观察与操作；按实际 CLI/证据协议接入 | 不凭空设计 `cu execute`；不假设同时操作多个窗口就隔离 |
| twcu | 其实际支持的脚本执行、批量编排与 trace | 不把“脚本结束”当成“视觉断言通过”，不把尚未交付能力当依赖 |

接入过程：确认工具和版本 → 明确能力与产物 → 编写一份项目 Recipe → 实际跑一次成功与一次失败 → 再决定是否抽成可复用 adapter。

优先一个现有 runner adapter + 一个真实视觉/CU 垂直切片，不先做支持所有工具的插件框架。

---

## 15. 实施顺序：先证明积累与复用，再扩张管理能力

不以未经验证的“2 周/4 周”作为承诺，用退出条件决定阶段完成。

### 阶段 0：用文件手动验证语义

产出：

- 本文收敛后的 Recipe v0 与目录约定。
- 3～5 份从实际项目提炼的方法，至少包含：一个现有测试命令、一份多步骤交互方法、一份修复复现方法。
- 一个短 pi Skill 草案，实际完成“找到方法、应用、产出反馈”。

退出条件：新会话能不用用户重讲方法就执行/遵循；无法观察的地方能诚实停下。

目的：先看 Recipe 真正需要保存什么，不先用一个大 schema 把经验锁死。

### 阶段 1：产品最小闭环

必须包含：

1. `init` 和文档入口。
2. Recipe package parser、静态校验。
3. `search/show/new/add`，最简单检索即可。
4. builtin → project 的显式复制和来源记录。
5. 一个轻量 Profile 的选择路径；其余默认 Profile 可以标 preview，不能伪装 working。
6. scripted 单方法受管执行、preflight、timeout、结构化 result/report。
7. pi/Skill 消费方法和提交反馈的真实演示；guided 缺能力时有明确出口。
8. 保存和再次消费某次用户教过的方法。

可以推迟：

- 自动 finding delta / root-cause classifier。
- 个人全局库、团队协作、远程 registry。
- 自动 flaky 分类与 quarantine UI。
- 复杂继承、全套可组合策略 DSL。
- 并行调度、MCP、dashboard、自动修复。

**对 V2 的主要顺序调整：把 search、authoring、pi 消费放回第一阶段，把 delta 往后放。**

### 阶段 2：让三个默认 Profile 真正 working

- frontend、backend、debugging 各有真实参考项目和完整失败路径。
- 引入多方法 plan 和必要资源协调。
- 接入一个真实 CU/visual 链路，而非只测试命令包装器。
- baseline 接受、资格验证、方法过期诊断、有限历史比较。
- 缺依赖、无权限、不可观察和预算不足有可读、可机器消费的结果。

### 阶段 3：由已观测需求决定扩张

仅在数据支持后增加：个人库与分享、更多 adapters、并发、历史 finding 管理、CI gate、MCP 或 UI。

如果用户只复用项目内方法，就不急着做市场；如果外部 runner 已提供足够批处理，就不重做 scheduler。

---

## 16. 怎样证明它有效，而不是“绿色测试更多了”

### 16.1 产品评估

建议至少比较：

| 条件 | 目的 |
|---|---|
| 便宜模型 + 原有工作方式 | 基线 |
| 便宜模型 + 普通“完成前请自测”指令 | 区分提醒效应 |
| 便宜模型 + Recipe 文档库 | 检查方法持久化是否贡献价值 |
| 便宜模型 + Recipe + CLI/证据流程 | 检查执行结构是否额外有用 |
| 较强模型 + 原有方式（可选） | 检查成本/质量 trade-off |

使用固定任务与独立隐藏缺陷/验收项；方法作者不能事先针对全部隐藏答案编 Recipe。控制模型版本、工具、任务条件，随机化或平衡运行顺序，保留失败/超时；按任务类型报告，不把不同场景糊成一个百分比。

### 16.2 真正重要的指标

- **假完成率：** 声称通过，但隐藏验收项失败的比例。
- **缺陷检出与误报：** 对独立参考答案，而不是以 Agent 自评为准。
- **用户补充指导量：** 用户再次解释怎么测、怎么复现的次数和时间。
- **跨会话方法复用率：** 第二会话能否找到并正确应用，而非只存在文件。
- **反馈可操作性：** 另一会话能否按产物复现，无须重问。
- **方法维护成本：** 代码变化后需要多少人工修订，多久失效。
- **总成本：** 首次编写/校准 + 每次选择/执行 + 维护 + 人工复核；不只比较模型 token 单价。
- **风险缺口可见性：** 不可验证事项有没有被如实保留。

暂不把 Recipe 总数、平均 pass rate 或“支持多少框架”当主要成功指标。

### 16.3 方法复用的经济性

设一次编写与校准成本为 A，每次不用 Recipe 的成本为 B，使用后的成本为 R，累计维护成本为 M。

```text
N × (B - R) > A + M
```

只有这个不等式开始成立，且质量没有退化，“写一次用多次”才在这个场景经济。某些只出现一次的探索任务，不值得完整资产化。

### 16.4 Veripaka 自身必须有的反例测试

这些比尽早增加十个内置模板更重要：

1. 没有用例、全部 skip、只输出 PASS 字符串，不得通过。
2. 引用旧 report、旧 build、旧 baseline，不得认证当前目标。
3. 运行中源代码或 Recipe 改变，不能沿用原结论。
4. 未知 assertion kind、损坏 JSON、空 artifacts，不能静默跳过。
5. 依赖缺失、权限不足、host 不支持，输出 blocked/inconclusive。
6. 导入含越界路径的 package，被拒绝；导入期间不执行内容。
7. 两个并发 CLI/CU 会话不能相互覆盖产物或争抢同一受管资源。
8. 进程取消/崩溃留下 interrupted 状态，不重新展示昨天的 pass。
9. baseline 候选不能被失败运行自动批准。
10. known-bad fixture 被拒绝；断言自证、mock 自证等假通过路径被资格检查暴露。
11. Windows 含空格路径、shell 引号、非 ASCII 路径和取消行为有真实测试。
12. 一个全新 pi 会话找到已保存方法，产出可复现的结果，而不重新要求用户教一次。

---

## 17. 对 V2 的明确裁决

| V2 设计 | 裁决 | 推荐替代 |
|---|---|---|
| `paka` 代替 `vp` | 保留方向 | 作为候选，发布前查冲突 |
| 意图/事实分离 | 保留 | 进一步物理分为共享知识与 `local/` |
| 不提前建 index | 保留 | 扫元数据、简单检索，观测后再 cache |
| 不保留第二份 history 真相 | 保留 | run 是记录；需要时生成历史视图 |
| 单 YAML Recipe | 修改 | `RECIPE.md` frontmatter + 标准正文 + 可选资源包 |
| 裸 slug 全局唯一 | 修改 | namespace + 稳定 slug，不随 title 改变 |
| `hints` 不做规则引擎 | 大体保留 | 允许简单结构过滤，但不当完整影响分析 |
| `category` 单枚举 | 修改 | 最小多轴标签，别混 level/technique/mock |
| deterministic cost 必填 0 | 拒绝 | unknown/estimate/observed 分开 |
| `determinism_tier` 代表可靠性 | 拒绝 | oracle、波动性、检出能力分开 |
| 隔离不满足只警告 | 拒绝 | 硬要求 blocked；建议明确叫 preference |
| 幂等 = 不改变系统状态 | 修正定义 | 幂等指重复应用效果；测试侧重隔离、重置与清理 |
| llm_judge 必须有 deterministic fallback | 拒绝通用硬规则 | 有等价判据则优先；没有则保留模型/人工与 inconclusive |
| Profile 自动继承内置最新 | 暂缓 | 拷贝展开 + 来源记录 + 显式更新 |
| P0/P1/P2 同时表示排序和 gate | 修改 | order、required、blocking 分开 |
| baseline 引用忽略的历史 run | 修改 | baseline 独立保留与显式接受 |
| recipe ID 级 delta | 暂缓 | case/claim 身份先稳定，再做可比较历史 |
| hash 变化 = attribution | 修改 | 多维变化记录是线索，因果另证 |
| MVP 只单条 run，没有核心搜索/沉淀 | 修改优先级 | 先闭合“找到—应用—反馈—保存—下次复用” |
| pi/Skill 未进入最小交付 | 补回 | 第一阶段验证真实宿主消费路径 |

---

## 18. 我建议现在接受什么，保留什么待验证

### 现在接受的设计方向

1. pi-first 的方法工作台，不是另一个全能开发 harness。
2. Recipe 保存“目的—绑定—过程—oracle—证据—边界”，command 只是一个部分。
3. 项目本地、文本优先、一个 Recipe 一个包、共享知识与运行事实分开。
4. templates 与项目适配有明确关系，导入复制、更新显式，不静默合并全局最新。
5. CLI 做确定性管理、有限执行与收据；Skill 做选择/编写/遵循方法。
6. 不可验证是一等结果；代码、方法和 baseline 都要纳入证据身份。
7. 搜索、方法沉淀和跨会话复用进入 MVP；复杂 delta、并发和平台能力后置。
8. 三个默认 Profile 是有明确验证义务的领域起点，不是工具安装清单。

### 给出默认方案，但仍需真实场景检验

| 问题 | 当前默认 | 什么观察会推翻 |
|---|---|---|
| 第一批用户 | 先服务 Draft 所述的个人开发工作流；文件可共享 | 团队政策/CI 才是实际主要需求 |
| 项目内复用 vs 跨项目 | 先项目内，多会话使用；内置 templates 可迁移 | 大量方法原样跨项目使用且手工 import 成本明显 |
| 执行边界 | 薄执行控制 + runner/host adapter | 真实流程需要更多生命周期控制，或外部执行已完全足够 |
| 文档表示 | RECIPE.md + 小型 frontmatter | 字段复杂度持续增长且正文与机器契约难以保持单一来源 |
| 自动选法 | 明确 Profile/绑定 + 可解释检索辅助 | 真实遗漏/噪声表明需 AST、依赖图或模型 reranker |
| 弱模型是否更经济 | 优先减少运行期自由决策，测全链路成本 | 绑定/维护/漏测成本超过节省 |
| CU/视觉优先程度 | 早做一个真实垂直切片，不先集成全家桶 | 最有价值工作集中在 API/CLI，或 GUI 环境不可稳定重置 |

这些不是留给用户空白选择的“开放问题”。每项已经有可实施默认；真实证据出现时再改变。

---

## 19. 本地依据索引

行号对应本次提供的文件；原始 README 有采集换行与少量编码损坏。以下用于追溯观点，不代表已独立复核上游代码。

- `docs/Draft.txt:4-17`：pi、弱模型、重复反馈、方法管理、多样性、默认 profiles 与现有工具背景。
- `.temp/research-0928/REPORT.md:7-9,209-267`：检索方法、空结果与隐藏同类风险；因此不能推出市场不存在。
- `.temp/research-0928/raw/ArtJack__verdict.md:510-520`：liar fixture 覆盖无条件 PASS、skip、mock 自证与恒真断言。
- `.temp/research-0928/raw/ArtJack__verdict.md:1040-1094`：system measures / model judges。
- `.temp/research-0928/raw/ArtJack__verdict.md:818-861`：旧结果冒充新运行的风险。
- `.temp/research-0928/raw/ArtJack__verdict.md:1436-1450`：Bash guard 是 heuristic，不是 sandbox。
- `.temp/research-0928/raw/ArtJack__verdict.md:1467-1532`：局部小问题式的弱模型使用与明确范围限制。
- `.temp/research-0928/raw/hannsxpeter__mythify.md:331-353,622-626,921-955`：claim 与运行区分、合并后重验、小样本不外推。
- `.temp/research-0928/raw/nano-step__eval-harness.md:288-345,896-935,1133-1185`：结构化失败、重试、预算限制和未交付共享账本。
- `.temp/research-0928/raw/Kaiji-Z__stop-manual-testing.md:141-199,252-268`：template→instance 与提示协议的实际限制。
- `.temp/research-0928/raw/DanielMendesSensei__Agent-Verification-Skills.md:95-134,181-209,241-262`：探索发现未写规则、负例资格、不可验证单列、N=1 限制。
- `.temp/research-0928/raw/zhenthebuilder__agent-charter.md:234-267`：IFEval 的具体对象与测量范围。
- `.temp/research-0928/raw/first-fluke__oh-my-agent.md:156-192,680-697`：已有领域 presets，通用 harness 的控制边界。
- `.temp/research-0928/raw/amElnagdy__guard-skills.md:192-208,216-229,284-342`：避免 mock 自证、文档核验、渐进披露。
- `.temp/research-0928/raw/r-prem__agentest.md:1214-1420,2821-2862`：runner 的 mock/trajectory 语义及模拟测试的调用成本。
- `.temp/research-0928/raw/Moody20alshatri__aftercheck.md:349-385`：文本影响分析限制、测试环境与副作用声明。
- `.temp/research-0928/raw/helal-muneer__qa-pilot.md:143-162,195-209`：有界修复循环与纯方法文档形态，不能把宣传样例当效能证据。
- `.temp/research-0928/raw/AnshKanyadi__culpa.md:171-205,277-285`：记录/回放/模拟分叉；与“当前代码真的通过”是不同问题。
- `.temp/research-0928/raw/NikaLuna365__parallax.md:479-541,813-826,1136-1181`：规格歧义应停止、契约和机械实现不同、门禁存在不等于真实流程会走到。
- `.claudes_proposal/DESIGN_V2.md:23-50,64-129,181-239,295-315`：本次保留和修订的具体设计来源。
