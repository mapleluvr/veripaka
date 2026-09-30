# Veripaka 目标形态与骨架建议

> **DEPRECATED — 已封存，仅供历史追溯。** 本文不再维护，不作为实现或验收依据；下文状态描述的是封存前的历史提案。当前设计以 [VERIPAKA_DESIGN.md](VERIPAKA_DESIGN.md) 为准，阶段与验收以 [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md) 为准。保留原路径以避免历史引用失效。

状态：brainstorm 提案；区分已有目标、结构推论与推荐默认值。本文不代表产品已实现，也不把示例字段冻结为 v1 API。

材料：`docs/Draft.txt`、`.temp/research-0928/REPORT.md` 及全部 14 份 raw README；另外核对了本地 visual-primitives、cu、twcu README 和已安装 Pi 的 package / skills 文档。

## 1. 核心判断

**建议把 Veripaka 定位为面向 coding agent 的项目测试方法库与应用工具：把一次有效的验证办法，沉淀成下次能找得到、按项目条件执行、知道证据边界的 Test Recipe。**

它的核心资产是“这个项目应该怎样验证，以及为什么这样验证”，核心产品闭环是：

```text
任务 / 改动 / 症状
    → 找到适用方法，列出未覆盖问题
    → 绑定项目入口、数据、判据与执行条件
    → 在真实被测路径上应用方法
    → 生成有依据的结论和可操作反馈
    → 把有复用价值的方法修订留给下一次
```

Draft 中的三个使用场景可以统一到一个目标：**减少开发者反复检查、定位并重新解释同类问题的劳动。** “让便宜模型完成更多任务”是待验证的效果假设；“测试方法不再随聊天结束而丢失”是可以直接交付的能力。

采用 CLI + 少量 Skills + 项目本地文件。CLI 管理可确定的事实、引用、快照和运行记录；Skill 负责适用性判断、方法编写、观察解释和反馈。既有测试框架、浏览器、桌面工具继续执行各自擅长的工作。

### 1.1 三种候选形态

| 形态 | 可以获得什么 | 主要缺口 / 代价 | 建议 |
|---|---|---|---|
| A. 可检索的测试 cookbook | 很快解决方法保存和发现；执行自由 | 方法容易变成“读过了”，无法知道这次究竟应用了什么 | 作为最早可用切片，不作为最终目标 |
| B. 方法库 + 有边界的应用与证据记录 | 方法可以复用，应用过程可追溯，反馈能够回写到方法 | 要承担运行身份、输入绑定、结果语义等小范围基础设施 | **推荐目标** |
| C. 全自动 QA / 开发编排平台 | 能拥有从需求到修复的全部闭环 | 会扩大到模型路由、任务分解、工作树、部署和审批；方法库退居次要位置 | 暂不进入 |

这里的 B 可以先支持顺序执行，不需要从一开始拥有通用 workflow engine。

## 2. 哪些内容实际上有确定性

“可以确定”应指：即使模型、语言、执行器或部署方式变化，这个约束仍成立。不能把常见做法、仓库搜索结果或一个顺手的文件名当成必然结论。

### 2.1 Draft 直接给定的目标

| ID | 已给定 | 依据与边界 |
|---|---|---|
| D1 | 基于 pi-coding-agent 的 dev pack | Draft 明说；不等于必须把所有能力写成 Pi extension |
| D2 | Agent-native CLI，按项目构建、管理、搜索、应用测试方法 | Draft 明说；四个动词都应有对应的产品路径 |
| D3 | 测试方法允许不同形式 | Draft 举 e2e、mock、code-level；不构成互斥分类法 |
| D4 | 提供标准化 Test Recipe 的方法论和写作规范 | Draft 明说；不能只交付文件管理器 |
| D5 | 提供可用的 frontend、backend、debugging & fixing 默认 profile | Draft 明说；“可用”应由实例验证，不能只有名称和空模板 |
| D6 | 服务于便宜快速模型、减少精确人工反馈、保存已有自测方法 | Draft 的使用场景；没有指定效果数字或保证 |
| D7 | visual-primitives、cu、twcu 是相关工具积累 | Draft 明说；不等于它们都必须成为硬依赖，twcu 在 Draft 中仍标注 WIP |

### 2.2 从目标可以较稳定推出的结构约束

| ID | 高确定性的结构 | 为什么必要 | 仍不能据此确定什么 |
|---|---|---|---|
| I1 | **可复用方法与一次运行分离** | 否则保存的是一段历史，无法在新版本上重新应用 | 两者放在哪个具体目录 |
| I2 | **方法意图与项目绑定可区分** | 同一方法换项目时入口、账号、夹具、命令都可能变化 | 必须有单独的 Binding 文件或复杂继承系统 |
| I3 | Recipe 要说明适用条件、不适用条件和证明范围 | “找到名字相近的方法”不等于选中了能验证目标的方法 | 检索一定需要向量数据库 |
| I4 | 操作、观察、判据、结论分开表达 | 点击完成、命令成功、拿到截图都不能自动证明目标行为 | 所有结论都能改成确定性断言 |
| I5 | 无法验证、未运行、明确失败不能并入通过 | 缺能力 / 缺数据是现实的正常状态 | 必须照抄某个工具的退出码 |
| I6 | 可复用结论要绑定当时的方法、判据、对象和环境 | 否则无法判断旧结果是否仍与当前问题有关 | 必须上数据库、哈希链或远程签名 |
| I7 | 通用模板和项目定制要有明确归属 | 升级模板不能静默改变项目已选定的验证语义 | 从首版就必须有全局多层合并 |
| I8 | 失败反馈要有稳定的定位对象 | 需要知道失败的是哪个 claim / case、观察到了什么、如何复现 | 从首版就必须维护完整 bug tracker |
| I9 | 对弱模型应减少临场推导和上下文负担 | 这是服务 Draft 使用场景的合理设计约束 | “短 prompt 必然更好”或固定 token 上限 |
| I10 | 能机械检查的交给程序，剩余判断保留出处 | 时间、路径、哈希、退出码不应由模型编造；语义充分性仍需判断 | 确定性程序检查必然检查了正确的问题 |

### 2.3 本文建议采用、但可替换的默认值

- 方法库放 `docs/verification/`，临时运行放 `.veripaka/`。
- Recipe 用一个 `RECIPE.md`，YAML frontmatter 放结构化字段，正文写执行与解释方法。
- Profile 以数据为主；Skill 是访问和应用这些数据的工作入口。
- 首版以本地项目为权威；全局资源显式导入，不做隐式覆盖。
- 使用 TypeScript / Node，单 npm 包包含 CLI、Skills、默认 Recipes 和 Profiles。
- 先做顺序的 command 与 agent-guided 应用；后续按真实需求引入并发和专用适配。

这些是工程判断，不是“调研证明了唯一正确答案”。

### 2.4 必须通过实验才知道的事

- 方法库是否降低人工检查时间、反馈轮数和总成本。
- 便宜模型在拿到执行包后，能否可靠应用方法并解释失败。
- Profile 的推荐是否比简单关键词检索更有效。
- Agent judging、视觉阈值和故障归因在真实项目中的误报 / 漏报。
- 通用 Recipe 能迁移多少，哪些部分必须重新编写。

## 3. 调研可用的部分，以及不能照单全收的部分

### 3.1 可借鉴的机制

| 材料 | 可借鉴 | 保留的证据限制 |
|---|---|---|
| verdict | 系统采集事实、模型补判断；旧结论新鲜度；未测范围；发现的跨次关联 | 当前读取的是 README，未审计实现或复跑其 benchmark |
| mythify | 实际执行与口头 claim 分离；可读文件；有限循环 | exit 0 只能证明对应检查的结果，不能保证检查语义正确 |
| stop-manual-testing | 通用模板实例化到项目；诊断先于使用；区分机械检查与主观评估 | GATE 自声明不是强制执行；UI-only 不应在 Veripaka 中一律判定无能力，cu 正是合法入口之一 |
| eval-harness | 环境清单；结构化失败；显式 unknown；预算和互斥意识 | 三次输出相同不能证明非 flaky；字节不同也不等于行为不稳定；环境差异不是因果证明 |
| Agent-Verification-Skills | 检查格式、覆盖、检出力、用户旅程是不同问题；不可验证独立表达 | mutation 只能覆盖所选故障类；它的 Python 支持不能推广为所有语言 |
| agent-charter | 同一份声明可生成指令、运行检查和报告 | IFEval 输出约束成绩不能外推到项目测试效果或 profile 效果 |
| parallax | 判据变化须使旧认证失效；独立审查；生产消费路径 | 整套盲写开发流水线超出当前目标 |
| guard-skills | 测试自身也需要审查；避免只测 mock 和复制实现 | 纯 Skill 的遵守程度仍需测量 |
| aftercheck / qa-pilot | 按真实用户流程执行、解释失败、记录常见薄弱点 | “测试全部功能”不是可保证的覆盖承诺 |
| agentest / culpa | 既有执行器与 replay 可作为某些方法的底层 | replay 证明录制场景下的行为，不能代替当前线上能力证据 |

### 3.2 对 REPORT 的三项实质修正

1. **“GitHub 不存在这种形态”降为“该次搜索尚未找到完整同形产品”。** 本地材料不含 REPORT 宣称的原始搜索 JSON；现有目录只有报告和 14 份 README。无法复核搜索全集、时间过滤和查询覆盖，不能从零结果推出不存在。
2. **“不存在 default profiles”过强。** `oh-my-agent` raw README 已明确列出 Frontend / Backend / Fullstack 等 presets。它们不是项目测试方法 profile，但足以否定不加限定的“没有 profile 先例”。差异应落实为：是否能保存、选择、绑定和再次应用项目测试方法。
3. **“机制 solved，直接复制”应改为“借鉴语义，验证本地实现”。** `flock` 是 Unix 工具；按 `(case, trigger)` 锁定还可能允许不同 trigger 同时修改同一资源。Veripaka 需要按实际资源定义互斥，不能照搬字符串或假设 worktree 隔离了数据库、端口和桌面。

确定性检查也可能稳定地检查错误对象。所谓“Layer 1 绝对可靠”不能成为本项目的质量论据。

## 4. 产品使用体验

### 4.1 初次进入已有项目

`init` 发现项目入口、已有测试命令和可用工具，写出可追溯的候选绑定；不自动运行未知安装命令，不把发现的命令直接认定为有效验证。

Agent 用 authoring Skill 把一条已知有效的方法写成 Recipe。已有测试脚本留在原来的 `tests/` 中，Recipe 引用它，补上“什么时候用、能证明什么、怎么解释失败”。用户不需要为了管理方法迁移整个测试目录。

### 4.2 开发中应用方法

用户提出“检查这次设置保存的改动”。Agent 搜索相关 Recipe，说明选择原因、所需条件和覆盖缺口；将选定方法绑定到当前应用，再执行。输出以“本次检查了什么、失败在哪里、证据是什么”为中心。

工具缺失、数据不够或预算不足时，返回具体缺口和可用替代路径。只有替代路径支持同一个 claim，才能替换；缩小证明范围必须明示，不能用 unit test 默默顶替真实浏览器路径。

### 4.3 把一次人工纠错留给下一次

用户指出“页面显示保存成功，但刷新后丢了”。Veripaka 应把它转化为“跨状态边界复查持久化”的项目 Recipe，而不是只在历史报告里加一个 bug。

沉淀至少保留：触发条件、为什么原检查漏掉、新的可观察判据、真实入口、复现步骤，以及证明这条方法能抓到此类问题的记录。下一次 Agent 应能主动找到它。

## 5. CLI 维护的目录结构

### 5.1 推荐布局

```text
<project>/
  AGENTS.md                         # 可选：只加简短入口链接，不灌入整套规范
  docs/
    verification/                   # 受版本管理的方法资产；根目录可配置
      README.md                     # CLI 生成的目录索引，显式标明生成来源
      project.yaml                  # 共享绑定：subject、入口、能力、资源约束
      recipes/
        settings-persistence/
          RECIPE.md                 # 唯一的 Recipe 定义入口
          scripts/                  # 可选：这条方法专用的采集 / 检查脚本
          fixtures/                 # 可选：小型、无敏感信息的输入夹具
          references/               # 可选：方法私有参考与来源说明
      profiles/
        frontend.yaml
        backend.yaml
        debug-fix.yaml
      references/                   # 可选：被多条方法引用的 oracle / baseline
        <reference-id>/
          reference.yaml            # 来源、摘要、适用条件、选定理由
          <reference-files>
      reports/                      # 可选：显式导出的重要运行证据包
        <run-id>/
          report.md
          result.json
          evidence/                 # 只包含报告所需、允许公开的证据
  .veripaka/
    config.json                     # 可选、可提交：非默认 corpusRoot 等指针
    local.json                      # 不提交：本机可执行文件位置、环境绑定
    runs/                           # 不提交：一次应用的全部运行材料
      <run-id>/
        plan.json                   # 解析后冻结的目标、绑定、判据、预算、来源
        guide.md                    # 从计划和 Recipe 生成的 Agent 执行包
        attempts/
          <attempt-id>/
            execution.json          # 工具身份、输入引用、开始结束、退出与中断
            stdout.log
            stderr.log
            evidence/               # 截图 / trace / 测试报告 / 观察记录
            assessment.json         # 按 claim 的判断，保留判断者与证据引用
        result.json                 # CLI 汇总的终态；不由 Agent 手写通过
    cache/                          # 不提交：可删除、可重建的检索索引
    locks/                          # 不提交：项目本地资源锁，不冒充主机级锁
```

不要求 `init` 生成所有目录。最小创建物是方法库入口与项目配置；有第一条 Recipe、第一次运行、第一次导出时再生成对应内容。

### 5.2 为什么推荐这个拆分

- 方法是应当 code review 的项目文档，放 `docs/verification` 便于人和 Agent 查看、搜索、修改。
- 原始日志、截图、运行中断记录通常高频、大体积或含隐私，放 `.veripaka/runs`，默认不进入 Git。
- 使用者已有文档惯例时，可以把 `corpusRoot` 显式指向 `.veripaka/library` 或其它位置。一次解析只能得到一个 corpus root：`.veripaka/config.json` 有显式值时用它，否则用 `docs/verification`。不扫描或隐式合并第二个根；只有选定根中的 `project.yaml` 有权威性。**逻辑归属比目录拼写更重要**。
- `project.yaml` 只存共享的配置事实，`local.json` 只补本机解析信息。不得由本地文件偷偷放宽共享判据。
- 普通测试代码继续由原测试框架管理，Veripaka 仅管理方法入口、特殊辅助文件与证据关系。
- 大型基线可用 Git LFS 或已有制品存储；引用必须有摘要和可访问性状态。本文不推荐首版自建对象存储。

### 5.3 文件维护规则

1. 手写源是 Recipe / project / profile；索引和 guide 是派生视图，不再维护另一份相同事实。
2. CLI 可以校验、创建、移动、更新受控元数据；不能无条件重写作者正文或 `AGENTS.md`。
3. Recipe ID 稳定，标题可改。移动目录不改变身份；删除时检查 profile / plan 引用，保留历史 run 的快照。
4. 未识别的 schema 主版本拒绝应用；对规范字段拒绝未知拼写，可预留显式 `extensions` 命名空间。
5. 运行保存实际读取的 Recipe、脚本、引用和配置摘要，并保留所需字节；不能只记一个以后会改变的路径。
6. 源文件修改后旧报告仍是过去的事实，但不能自动成为当前版本的证明。新鲜度在使用旧证据时计算。
7. 导出报告时要携带必要证据或稳定制品引用；不能只提交指向已忽略本机目录的 Markdown 链接。
8. 桌面工具各自拥有的内部状态不能被 Veripaka 直接编辑。只保存其公开结果引用和必要副本。

## 6. Test Recipe 的功能语义

### 6.1 定义

**Test Recipe 是一份可重复应用的验证方法说明：针对一类风险，在已声明条件下，通过某个实际入口施加刺激、采集观察，并按事先明确的判据解释观察。**

一条完整 Recipe 回答七个问题：

1. 要验证哪个行为或风险，为什么值得测？
2. 什么时候适用，什么时候不适用？
3. 需要哪些项目输入、环境能力和参考答案？
4. 实际操作哪个被测对象，通过什么入口？
5. 看什么证据，如何把证据对应到 claim？
6. 什么算通过、失败、无法判断；哪些东西它证明不了？
7. 如何清理、复现，以及在新项目中需要重新绑定什么？

Recipe 可以指导创建测试，也可以引用既有测试，或定义一次探索性验证。它不等于脚本、不等于单个 test case，也不等于一次运行报告。**当本次方法的产出是新测试文件时，生成文件只是中间产物，仍需要执行和检出力验证。**

“生成 / 修改测试”属于方法准备阶段。准备结束后才冻结验证计划；若执行中需要改变测试、脚本或判据，则保留当前尝试并生成新计划。不要一边修改测量工具，一边把前后混合的证据标成同一次固定条件验证。探索产生的新样例可以另存，但不能改写本次已有判据。

### 6.2 最小对象模型

| 概念 | 职责 | 首版物理表示 |
|---|---|---|
| Recipe | 方法意图、适用性、输入、步骤、claim、证据要求 | `RECIPE.md` + 必要辅助文件 |
| Binding | 把方法参数映射到项目 subject / 入口 / 夹具 / 命令 | `project.yaml` 的命名绑定 + 本次输入，不单建对象仓库 |
| Profile | 为一类工作推荐方法、顺序、必需覆盖和预算建议 | YAML 数据 |
| Plan | 本次选了什么、绑定了什么、预期收到哪些检查结果 | 冻结到 run 内的 `plan.json` |
| Run | 一个计划的一次应用，包含尝试、证据和终态 | `runs/<id>/` |
| Assessment / Finding | 对 claim 的判定，以及其中可操作的问题 | run 内结果；跨次 Finding 管理以后再加 |

逻辑上分清六个概念，不意味着需要六个服务或六套 CRUD。首版只有四类主要持久化归属：方法、项目配置、profile、运行。

### 6.3 方法分类应是多维标签

| 维度 | 例子 | 用途 |
|---|---|---|
| 被测入口 `surface` | function、CLI、API、browser、desktop | 防止测错消费路径 |
| 覆盖范围 `scope` | component、integration、journey | 说明结果能覆盖到哪里 |
| 测试技术 `technique` | example、boundary、property、metamorphic、differential、fault-injection、exploratory | 帮助选择方法 |
| 依赖方式 `dependencies` | real、fake、mock、replay、mixed | 说明哪些边界被替代 |
| 判定方式 `judge` | executable、agent、human、mixed | 区分证据解释的性质 |
| 执行方式 `mode` | command、agent-guided | 决定应用路径 |

例如：“通过浏览器执行用户旅程、支付供应商用 stub、以数据库记录和 UI 结果判定”的方法，同时属于 browser / journey / mixed。不能因为用了 mock 就失去旅程身份，也不能因为称为 e2e 就声称验证了供应商真实扣款。

标签用于查找，`requires` 才是执行前提；“frontend”标签不能代替浏览器能力探测。

### 6.4 原子性与组合

一条 Recipe 围绕一个稳定的验证意图组织，允许多个必要 checks。设置保存后的 UI 恢复、数据恢复可以同属一个持久化意图；支付、权限、布局三个不同风险不应塞进一个“全站检查”大 Recipe。

初期组合发生在 Profile / Plan 层，Recipe 不递归调用其它 Recipe，不引入依赖 DAG 语言。发现重复时先共享夹具或引用说明；只有出现真实组合需求，再增加子方法关系。

### 6.5 Recipe 的成熟度

建议使用 `draft → trial → reusable → deprecated`：

- `draft`：方法尚未完整绑定或验证，可被搜索但不能伪装为已可用。
- `trial`：结构有效，可以显式应用；仍缺正常路径或反例记录。
- `reusable`：有代表性的正常对象和故障对象证据，并有冷上下文复用记录；声明的是某个适用域内的经验，不是普遍可靠性。
- `deprecated`：不再默认推荐，保留替代方法和历史来源。

成熟度与运行 pass/fail 独立。一次 pass 不能把 Recipe 自动升级为 reusable；修改判据、执行入口或辅助脚本后，既有资格记录需重新检查，不能只保留一个不会过期的标签。

## 7. Recipe 写作标准

### 7.1 结构化字段与正文的分工

推荐一个文件，而非 YAML 和 Markdown 各自保存一套断言。frontmatter 负责可机器读取的声明：身份、schema、成熟度、检索维度、输入与依赖、执行方式、claim ID、证据要求。正文负责解释：选择理由、步骤、判据来源、失败解释与限制。

机器可以检查字段存在、引用可解析、输入类型匹配、claim 有结果。**可应用 Recipe 的 schema 应要求非空 claims 和对应 evidence；`required` 默认 true，任何选配项须显式标记。空 claims、空 required 集合和只包含 optional checks 的内容只能作为草稿 / 观察记录，不能产生 scoped pass。** 机器不能仅凭这些字段证明步骤有效、期望合理、目标覆盖充分；这些必须由方法审查与实际应用验证。

Profile 不复制 Recipe 正文；guide 由源生成。claim 的预期值只能有一个权威来源，正文解释它而不维护第二份容易漂移的值。

推荐默认每个声明的 claim 及其 evidence 都是必需项；选配项必须显式标记并说明目的。`apply` 冻结非空的 required claim/check 集合，`finalize` 要逐项核对身份、实际执行和证据；不能只遍历“执行器碰巧返回的 checks”。纯探索任务可以完成探索协议，但其结果应写为“探索完成，记录了哪些发现与未测范围”，不把过程检查通过当成产品无缺陷。

### 7.2 必写内容

| 内容 | 合格标准 | 常见不合格写法 |
|---|---|---|
| 目的与范围 | 可观察的目标 + 明确不覆盖的对象 | “保证功能正常” |
| 适用 / 不适用 | 有触发条件和排除条件 | “所有项目通用” |
| 被测路径 | 标出真实入口及被替代的边界 | 另写一个测试实现代替生产逻辑 |
| 前提与输入 | 有类型、来源、默认值理由；缺关键值时停在哪一步 | 猜端口、账号或视觉阈值 |
| 步骤 | 操作 → 所需观察 → 下一分支，边界明确 | “全面测试，再检查一下” |
| 判据 | expected、actual、证据定位、判断者可对应 | 只看“success”日志 |
| 证据要求 | 具体格式和必需性；执行成功与结果解释分开 | 截图存在便算视觉通过 |
| 失败与未知 | 区分被测失败、基础设施失败、观察不足 | catch 所有错误后写测试通过 |
| 清理与重试 | 清理边界、幂等性、允许重试的条件 | UI 输入超时后盲目再点 |
| 检出力 | 一个代表性反例及预期哪条 check 会失败 | 只证明正常样例是绿的 |
| 复用条件 | 哪些可照搬、哪些必须重新绑定 | 写死某次会话的绝对路径 |
| 来源和限制 | 判据的需求 / 协议 / oracle 来源；已知盲区 | 将当前实现自动当成正确答案 |

建议正文顺序为：Intent → Applies / Excludes → Subject & Inputs → Procedure → Evaluation → Failure handling → Cleanup → Limits & Qualification。顺序是写作默认值；不为标题拼写建立没有行为价值的强制 gate。

### 7.3 对弱模型友好的要求

- 每一步给下一步所需的具体产物，不让执行者从一大段历史中重建状态。
- 能引用精确命令、测试 ID、fixture 和检查脚本时，不要求临时重写。
- 未知条件给出有界分支；超过分支边界返回缺口，不鼓励随意补出答案。
- 失败包包含 `claim / expected / observed / evidence / reproduce / limits`；原因假说单列，不能冒充实测原因。
- 通用 Skill 只教访问方法库与应用协议；每次只加载选中方法及必要引用。
- 不假设英语一定优于中文。机器 key 稳定，正文按团队语言编写；语言效果属于实验项。

### 7.4 验证一个方法本身

方法验证至少要回答两件事：正常对象是否按预期通过；一个与 claim 有关的已知错误是否按预期被拒绝。

生成 / 修改测试属于方法编写或准备阶段：先完成测试文件和检查器，再冻结用于验证产品的计划。若在已冻结计划中发现必须改测试代码，保留当前记录并创建新计划；不能一面改判断器，一面把旧计划结果当作原判据的验证。探索步骤可以动态选择输入，但不能暗中重写判断程序。

反例可以是：历史坏版本、禁用真实持久化、错位的真实页面、边界值缺陷，或独立构造的错误输入。反例应破坏被验证行为，不能只让检查脚本故意返回 1。

探索性 Recipe 无法证明“没有发现就是没有 bug”。它的合格产物是完整的探索记录、有限范围的观察和发现，不能输出无缺陷保证。主观视觉方法可以用已知差异作校准，但校准本身不让主观判断变成确定性真值。

## 8. 完整 Recipe 示例：设置跨刷新持久化

以下是拟议格式的设计样例，不是声称现有 CLI 已接受的文件。示例站点契约为“在同一浏览器 profile 刷新后保留主题”，不是跨设备持久化。

```markdown
---
schema: veripaka.recipe/v0
id: settings-persistence
title: 验证主题设置在刷新后保持
status: trial
summary: 捕获 UI 已切换但持久化未成功的回归
facets:
  surface: browser
  scope: journey
  technique: example
  dependencies: real
inputs:
  subject: {type: subject-ref, required: true}
  requirement: {type: reference, required: true}
  initialTheme: {type: string, required: true}
  selectedTheme: {type: string, required: true}
requires:
  capabilities: [browser-navigation, browser-observation]
execution:
  mode: agent-guided
  effects: [browser-profile-write]
claims:
  - id: theme-survives-reload
    required: true
    expected: 刷新后选中值和实际显示主题都等于 selectedTheme
    judge: agent
    evidence: [before, after-change, after-reload]
---

## Intent
验证真实设置入口写入的主题能够跨一次完整页面刷新保留。
不验证跨设备同步、服务重启、其它用户或系统主题跟随。

## Applies / Excludes
适用于 requirement 明确要求在当前浏览器 profile 中持久化的设置。
若 initialTheme 等于 selectedTheme，先重新绑定；不能用未发生变化的状态验证保存。
若产品只承诺当前页面临时切换，本方法不适用。

## Subject & Inputs
subject 必须解析为实际运行的应用地址与本次可使用的隔离 profile。
requirement 指向已选定的项目需求；不得从当前实现推断期望。
读取真实设置入口。缺少设置控件或无法观察实际主题时记录缺口。

## Procedure
1. 在本次 profile 打开真实应用，确认观察到的选中值和实际主题都为 initialTheme，且与 selectedTheme 不同，保存 before。
   若实际初态不符，先按声明的 fixture 准备方式建立初态并重新观察；无法建立则 blocked。
2. 通过真实设置控件选择 selectedTheme，执行产品要求的保存动作。
   等待产品定义的完成条件，记录选中值、实际主题及必要网络 / 错误信息。
   保存 after-change。保存提示只是过程观察，不是持久化证明。
3. 完整刷新页面，保持同一 profile，不从测试脚本注入期望值。
   等待同一就绪条件，重新观察选中值和实际主题，保存 after-reload。

## Evaluation
对 theme-survives-reload 比较刷新前后的实际观察。
只有刷新后的选中值与实际主题都符合 expected，才给本 claim 的 agent 判断通过。
值回退或实际主题不一致为 fail；无法读取必要观察为 inconclusive。
只有截图文件路径而没有对图像内容的检查，不能填写通过判断。

## Failure handling
报告刷新前值、刷新后值、实际主题和证据位置。
“后端没有保存”只能在存在后端观察时作为事实，否则保留为假说。

## Cleanup
关闭本次拥有的浏览器/profile；不清理用户已有 profile。
若应用数据写入共享服务，只清理本次显式创建的测试记录。

## Limits & Qualification
所需资格证据：正常版本通过；实际禁止主题保存的版本在刷新后失败。
这份 agent-guided Recipe 仍需判断者；不能标成纯机器验证。
若迁移到 Playwright，继续使用同一真实 UI 路径；以浏览器可观察状态替换 agent 判读。
```

适配到 command 模式时，Recipe 引用项目已有 Playwright 测试或专用脚本；记录用例身份、非空测试集合和逐 claim 结果。不要让 Veripaka 再实现一套浏览器定位器和断言语言。

## 9. CLI 行为建议

以下为命令语义草案；先固定职责，再根据真实 Agent 使用记录压缩命令面。

| 命令 | 语义 | 明确的完成条件 |
|---|---|---|
| `veripaka init` | 建立方法库，发现已有设施并标记候选绑定 | 文件创建 / 校验完成，不代表项目已验证 |
| `recipe new / list / show / lint` | 编写骨架、枚举、按需读取、检查结构与引用 | lint 只宣称规范与引用检查 |
| `find <query>` | 根据意图 / 标签 / 能力查找方法，展示推荐原因和不适用原因 | 查找成功可返回空集合；应用不可把空集合当成功验证 |
| `apply <recipe-or-profile> --input <file>` | 解析与绑定，冻结选定对象、claim、判据和预算，生成 guide | 产生 prepared plan；不产生业务副作用 |
| `run <run-id>` | 应用冻结计划；command 执行已声明命令，agent-guided 返回执行包和记录入口 | 运行状态明确，不用 exit 0 暗示 agent-guided 已验证 |
| `run collect <run-id> --input <file>` | 收集外部工具收据或 agent/human 观察，保留来源性质 | 收据与原始产物可关联；每项材料带 provenance；外部导入不能直接满足 executable claim，也不是接受手填最终 verdict |
| `run finalize <run-id>` | 检查预期结果、证据和快照，计算汇总 | 缺失、空集合、漂移或错误不归为通过 |
| `report <run-id>` | 读取记录，生成局部结论、缺口、复现与反馈 | 展示历史事实及当前新鲜度，不自行补测 |
| `report export <run-id>` | 导出可携带的证据包 | 引用完整且符合选定的导出范围 |

`apply` 为何与 `run` 分开：前者确定这次要验证什么，后者施加动作。Agent 可以连着调用它们，无需每次人工确认。对于动态探索，冻结的是探索目标、停止条件和证据要求；新发现作为附加记录，不能静默删除原有必需检查。

### 9.1 Agent-native 契约

- 支持结构化输入文件 / stdin，复杂参数不靠拼 shell 字符串。
- 机器模式 stdout 只有版本化 JSON；进度与人类提示去 stderr。
- 返回稳定的 machine code、缺失字段、已有产物、可执行的下一步；不要求 Agent 解析颜色和大段日志。
- 检索返回短卡片，`show` 才给方法全文，`apply` 给本次需要的上下文。
- 不在检索或 lint 中调用模型；语义扩展与推荐解释可由当前宿主 Agent 提供。
- command 使用 executable + argv + cwd，shell 模式必须显式声明 shell；Windows / POSIX 的引用差异不能让 Agent 猜。
- 首版 command 只解析项目已启用的命名绑定，例如 `commandRef: test-settings`。模板导入不自动启用命令；新增脚本或 shell 片段由当前宿主在已有任务授权内审查、绑定后才能执行。CLI 不从 Recipe 正文抽取任意代码块执行。
- 首版不开守护进程，不要求联网，不隐式安装工具或启动模型。

### 9.2 退出码提案

普通管理命令：`0` 操作完成、`2` 输入/配置错误、`3` 运行环境/IO 错误。

对于 `run finalize` 这样的评估命令，建议独立定义：`0` 声明范围内全部必需检查按声明方式通过；`1` 存在有效失败；`2` 请求无效；`3` 无法完成评估；`4` 目标 run 不存在 / 未运行；`5` 请求使用的证据已过期。JSON 必须包含 `verdictBasis`、目标范围、未覆盖项和每项证据来源；exit 0 不是脱离这些字段的能力保证。

具体数值是兼容性选择，不属于已确定目标。不要要求所有执行器使用同一组退出码；适配器保留原退出码，再映射其实际语义。

## 10. 运行、证据和判断边界

### 10.1 三件不同的事

1. **协议有效性**：文件合规、工具确实执行、收据与产物可对应。
2. **断言成立性**：观察符合该 claim 的判据。
3. **目标充分性**：这些 claim 是否足以回答用户本次问题。

CLI 可以机械约束第一项，执行已有检查器完成第二项中的一部分。第三项需要方法选择与审查；不能从“选中的检查都过了”推出“用户所有目标都实现了”。报告须同时列出被覆盖和未覆盖的问题。

### 10.2 数据最小集合

一次运行记录至少包括：

- 身份：run / attempt、目标 subject、Recipe ID 与内容摘要、选定 profile 和输入；Plan 还要冻结目标对象类型：`checkout`、`build`、`deployment` 或 `endpoint-observation`。
- 判据：完整预期 claim/check 集合、判断方式、baseline / oracle 摘要、配置来源。
- 对象：实际源快照 / 构建标识 / 部署身份，无法获得时保留 unknown。
- 执行：工具版本、实际调用、起止、原退出码、中断、预算使用；无法观测的成本为 unknown。
- 证据：产物、摘要、采集方式、关联 check，原始产物与派生摘要的关系；每项材料带 `provenance`，至少区分 `command-captured`、`tool-self-reported`、`agent`、`human`、`imported`。`command-captured` 必须绑定 invocation、原始退出码、输入摘要和 artifact digest；`tool-self-reported` 只能说明工具自述；`imported` 只能形成观察记录或 inconclusive，不能满足 `judge=executable` 的 required evidence。
- 判断：每项 expected / observed / status / judge / evidence refs，以及未执行原因。
- 汇总：局部结论、未覆盖范围、限制、复现入口；由 CLI 从同一数据渲染。

原始工具收据、测试程序报告、Agent 写下的观察分别标注来源。导入一份结构正确的 JSON 不能把它升级为可信执行记录。`provenance` 的采集资格由 CLI 的实际采集通道赋值，不接受调用者自填 `command-captured`；`collect` 收到的自由文件默认是 `imported`，声称存在 invocation ID 不等于能关联到该 run 的实际 invocation。

满足 executable claim 还须由受支持的检查器，将已捕获调用的真实结果映射到冻结 check；仅捕获到一个进程 exit 0 仍不足。尚未建立这条映射的工具保留原始材料并报告 inconclusive。agent/human 的解释可以引用导入材料，但不会改变材料来源；只有计划原先允许这种判断、且满足该 claim 的采集条件时才能贡献局部结论。比如检视图片可评估图中内容，却不能单凭该图片证明它来自当前应用。未接入的宿主采集桥也不能凭身份名称自称已验证。

### 10.3 推荐的正交状态

- 执行：`not-started / running / completed / partial / blocked / interrupted / indeterminate`；`unsupported` 作为 blocked 的明确原因，不能静默跳过。
- 每项评估：`pass / fail / inconclusive / not-evaluated`。
- 判断来源：`executable / agent / human`，混合结果逐项保留。
- 使用旧证据时的新鲜度：`current / stale / unknown`，相对于具体目标计算。

对整个计划：存在本次判定范围内可信且适用的失败先报告 fail；没有失败但必需项因 unsupported / 前提缺失等无法执行则 blocked；必需项已部分执行但不完整、效果为 indeterminate，或证据 / 判断不足则 inconclusive；只有全部必需项按声明方式通过，才报告 scoped pass。其余缺口始终保留，即使已有 fail 也不能吞掉 blocked 项。纯附加诊断的状态单列，不能用于填补必需 claim，也不能被报告包装成已覆盖的目标。

机器判断和 agent 判断均可产生局部 pass，但报告必须显示性质，并强制写出 `verdictBasis: executable | agent | human | mixed`。要求机器证据的 profile 不接受 agent 自述顶替；要求独立观察的检查不能由实施者随意自签。`judge` 在 apply 时冻结；不能因为机器检查失败，就改成 agent 判断来完成同一个计划。`run finalize` 的 exit 0 只表示声明范围内的 scoped pass，调用者还必须读取 `verdictBasis` 和未覆盖范围；它不能把 agent-judged pass 包装成机器验证。

冻结计划须展开非空的必需 claim/check 集合，并固定每项必需证据及其生产者类型。Recipe 的 claims 与列出的 evidence 默认必需；可选项必须显式标注并说明不影响哪些结论。只有 optional 检查、零用例、全 skip、只有 validate 或只有工具退出码，都不能产生 scoped pass。某执行器只能证明操作完成时，必须追加能观察目标行为的检查，否则只报告该操作完成。

### 10.4 快照与新鲜度

只记 Git HEAD 不够：工作区可能有未提交文件，服务可能跑的是旧构建。计划应记录相关源码、脚本、配置与夹具的内容状态；运行实际连接的构建 / 部署标识也需要关联。

首版建议保守地绑定项目源快照；不要自动猜“相关文件”的无限闭包。Recipe / 项目绑定必须显式声明源码范围、脚本、配置、fixture 和绑定命令等输入，首版只摘要这些声明项；未声明但实际依赖的内容记为 unknown，不能声称完整复现。有 Git 也要包括这些声明项的 dirty / untracked 状态，没有 Git 则使用文件清单与摘要。运行实际连接的构建 / 部署标识也需要关联。若要证明 checkout 范围，输入清单必须覆盖所声明的代码域，例如整个服务包的源码；仅摘要一条测试脚本不能建立该身份。

运行产物、缓存和显式声明的日志目录排除在源快照外，避免执行自身使计划过期；排除规则属于快照定义，不能在结果出来后临时扩大。历史结果保留原判据，规则变更产生新计划，不重写旧结论。

运行前后重新检查相关输入。发现中途发生实质变化时保留事实，但不得将混合版本结果标成当前对象通过。快照和摘要只能辅助发现漂移，不能保证同一 OS 用户无法篡改证据，也不能证明外部服务状态没变化。

对于目标类型为 `checkout`、`build` 或 `deployment` 的计划，源快照 / 构建 / 部署关联缺失、unknown 或不匹配时，结果必须是 `blocked` 或 `inconclusive`，不得产生 `scoped pass`。只有显式声明为 `endpoint-observation` 的方法，才可以在对象身份未知时报告“该 endpoint 的观察通过”；汇总必须保留这个范围标签，不能说当前 checkout 已验证。

### 10.5 失败单位与重试

首版失败单位是 `recipe + subject + case/check` 下的一次评估。只有有明确现象与证据的问题，才形成 Finding。工具不存在、端口未启动、权限不足属于运行缺口，不直接归为产品 bug。

后续需要跨次追踪时再加入稳定 finding ID 和 `new / open / resolved / regressed`；某次没选中该方法不等于旧 finding 已解决。

重试创建新 attempt，保留先前失败。声明 flaky 需要与断言结果相关的多次观察，不以文字输出相同与否判定。重试预算和采用哪个结果必须在计划中确定；不能“跑到第一次绿就忘掉前面的红”。清理未完成、效果未知的桌面输入等状态先重新观察或恢复，不自动重放。

## 11. Profile、检索、迁移与反馈

### 11.1 Profile 应主要是数据

Profile 表达：适用任务、候选方法、必要覆盖、推荐次序、能力要求和预算建议。它不复制 Recipe，也不内含第二套判定程序。

`frontend / backend` 是领域，`debug-fix` 是任务过程，三者不应互斥。建议内部支持领域与任务两个维度，外部仍提供 Draft 所需三个入口。例如 frontend + debug-fix = 前端领域方法 + 先复现、后修复、再回归的次序。

首版组合只做显式清单合并、ID 去重和冲突报错，不做多重继承。预算不足不能自动删除 required coverage；必须返回尚缺哪些检查。

### 11.2 建议首批方法

| 默认入口 | 建议核心方法 | 关键证据 |
| --- | --- | --- |
| frontend | 真实用户路径、状态持久化、错误/空态、布局/视觉比较 | 路径操作记录、状态观察、viewport/字体/参考图条件、实际渲染 |
| backend | 接口契约与边界、数据副作用、权限负例、重试/幂等 | 真实服务入口、请求与响应、持久化结果、独立预期 |
| debug-fix | 稳定复现、最小因果区分、修复后同路径复测、相邻回归 | 同一触发条件的前后对照，原因假说与实验证据分开 |

建议首个完整默认集控制在 **6–8 条经过实例验证的方法**，跨 profile 复用；M1 的技术切片只需其中两条。这个数量是控制维护面的建议，不是质量门槛。property / metamorphic / differential 等方法应进入路线图，但不要用几十个未运行的模板充当方法多样性。

### 11.3 搜索与选择

先做透明的本地检索：身份/名称精确匹配、标签与正文关键词、能力/适用性过滤，再给稳定排序和命中原因。能力不足的候选可以显示为 unavailable，不能静默消失到让 Agent 误以为没有方法。

历史数据只能提供“在哪些条件下应用过、抓到过什么、花费多少”的建议。不能用最高 pass 率做默认排序，那会奖励检出力弱的检查；也不能用报告最多的 bug 作为质量真值。

自然语言意图映射暂由宿主 Agent 做。只有在真实查询集上发现词法检索无法找到合适方法，才增加语义检索；索引一直是可重建缓存。

### 11.4 跨项目与升级

首版发布包自带只读模板，项目显式导入后成为项目所有的副本，并记录 origin：来源、版本、原始 ID 和摘要。同名冲突报错，不用“本地优先”静默改变含义。

跨项目迁移至少包括：参数化环境值、列出外部文件引用、复制可携带的必要资源、保留许可证和来源、重新绑定真实入口、在新环境重做资格验证。方法可移植不等于运行证据可移植。

升级默认只给差异与迁移建议，不能自动覆盖项目正文、baseline 或阈值。无需在首版引入用户全局库与项目库的层层 merge。

### 11.5 方法演化

先记录结果，再由 refinement Skill 提议最小修订。把一次方法失效分为：入口漂移、环境漂移、判据失效、方法漏检、执行者误用、未知。记录证据支持程度，不能把环境变更列表当成因果结论。

加入反例、明确前提、补充观察，是方法增强；仅为了让现有失败消失而放宽阈值，不是方法增强。判据变更需要对应的新需求或选定参考依据，并留下新版本资格记录。

## 12. 与 Pi 和已有工具的分工

| 组件 | 应拥有的职责 | Veripaka 的结合点 |
|---|---|---|
| Pi | Agent 会话、模型和工具执行环境 | 分发 Skills；使用当前会话做选择与解释 |
| 现有 pytest / Vitest / Playwright 等 | 测试发现、运行、断言、已有报告 | 引用真实命令和结果，不搬走测试 |
| visual-primitives | 对显式坐标做裁剪、标注、颜色采样；相关 workflow helper 做 masked diff | 保存产物和解释；不能把 crop/color 成功当作视觉通过 |
| cu | Windows 区域观察、有限动作、checkpoint 与效果不确定状态 | Agent 根据新观察继续；cu 的 completed 不等于应用业务成功 |
| twcu | 有版本的顺序浏览器脚本、trace、视觉 signals | 映射 execution 与 signals；不负责认可 baseline |
| Veripaka | 方法发现、项目绑定、应用计划、证据关联、反馈和复用 | 跨工具保持方法语义与结果边界 |

本地 README 还有明确平台约束：cu 当前是 Windows preview，完整桌面观察尚未通过其 release acceptance；twcu 当前 owned-browser 主机边界是 Windows/Linux，README 不承诺 macOS。Profile 不能把这些约束包装成通用可用能力。

### 12.1 包与代码骨架建议

```text
veripaka/
  package.json                  # bin + 显式 pi.skills；统一版本
  src/
    cli/                        # 输入输出与命令
    catalog/                    # 读取、校验、检索、导入
    planning/                   # 绑定、profile 解析、冻结执行包
    execution/                  # 有界 command、外部记录接入
    evidence/                   # 产物引用、assessment、汇总与报告
  schemas/                      # 源格式与运行格式的公开契约
  skills/
    veripaka/SKILL.md            # 找方法、应用、读结果
    author-test-recipe/SKILL.md
    refine-test-recipe/SKILL.md
    _shared/run-veripaka.mjs     # 不依赖全局 PATH 的包内入口
  recipes/                      # 内置模板与受验证例子
  profiles/                     # 默认 profile 数据
  tests/                        # 程序语义与实际 CLI 路径测试
  evals/                        # 独立的真实 Agent 使用效果评估
  docs/
```

这是一个包的模块划分，不是 monorepo 微服务架构。Schema 是程序契约；需要发布时再拆成规范文档，不应在 brainstorm 阶段先制造大量同步维护的说明文件。

Pi 文档确认包可以分发 Skills，Skill 按需加载；不应把每条 Recipe 注册为 Skill，让整个项目方法库进入系统提示。参考 visual-primitives 的包内 launcher，使 `pi install` 后不依赖 npm 全局 binary 是否在 PATH。

首版不需要 Pi extension。若后续要在结束回合前强制检查，需要验证当前 Pi 的真实生命周期能力和授权边界；不能照搬 Claude Code 的 Stop hook 名称并宣称在 Pi 已实现。CLI 的 gate 可供 CI/宿主主动调用；Skill 自觉调用属于不同保证级别。

### 12.2 并发与预算

首版默认顺序。需要并行时按实际资源划分：独立浏览器 profile、独立数据库/schema、独立端口、独立产物目录、独占桌面会话。Git worktree 只解决文件树隔离。

锁的身份由资源决定，不由 trigger 决定。跨项目使用同一桌面或数据库时，项目内 `.veripaka/locks` 不够；自动化共享资源前必须有主机级协调或经验证的执行器互斥。cu 原有动作/观察约束必须保留。

不以并发数作为产品第一目标。先测并行是否减少用户等待、是否引入串扰和误报，再增加批量执行。

预算先支持可强制的次数、时间、产物上限；金额只有在计费可观察时才精确记录。未知消费不能记为 0。若 provider 无法给出可执行的硬费用上界，应明确为估算，不能宣称强制美元封顶。

### 12.3 信任边界

Recipe 可能带脚本，本质上可执行项目代码；结构校验不是沙箱。首版沿用用户已有的项目与宿主执行权限，记录所需能力和副作用，不发明“读取了文档就是授权”的规则。

具体默认：查找、读取、lint、import 和 apply 不执行 Recipe 代码；command 模式只解析项目已启用的命名入口，保存 executable / argv / cwd / timeout，调用后捕获原始输出。内置或外来 Recipe 的导入不自动启用其脚本。启用由现有用户授权或项目流程覆盖，无需每次应用重复确认。Veripaka 不自行安装依赖、提权、提供 shell 沙箱、接管会话循环或绕过宿主的工具授权。agent-guided 的动作由宿主执行，收集时保留其来源性质；外部导入的手写收据不能冒充 Veripaka 直接采集的执行记录。

桌面输入、网络访问、数据写入等实际能力与副作用都须在方法 / 绑定中列明；声明只能帮助选择和审查，不能被宣传为操作系统层强制隔离。是否允许某个操作仍由既有授权与具体目标环境决定。

执行边界的默认选择是：`find/show/lint/import/apply` 不执行导入内容；command 只运行项目已启用的绑定，并施加声明的超时与产物边界；agent-guided 动作由宿主和工具原有权限控制。网络、数据库或桌面写入是否允许，取决于项目/任务的已有授权，不能从 profile 名称推导。绑定是降低误执行的机制，不宣称能阻止有同等权限的恶意脚本。

命令、引用路径和输出范围可以机械约束，但同一权限主体可编辑 Recipe、执行器和证据时，不能声称防恶意伪造。摘要提供完整性线索；更强的不可篡改保证需要外部信任根，暂不作为产品主张。

日志、截图和 trace 可能包含敏感内容。默认本地、默认不提交原始运行；导出时显式选择材料。凭据只绑定环境引用，不写入可提交方法或报告。

## 13. 三条端到端应用路径

### A. 前端视觉

用户要求检查导航布局。选中视觉 Recipe，绑定参考图、viewport、字体与允许忽略区域；用真实浏览器渲染，用 vp/helper 或 twcu 收集比较信号，按已选定判据解释，再做需要的直接观察。

不能为了变绿临时扩大 mask，也不能用静态截图代替真实页面渲染。没有参考图时可以做可用性 / 布局观察，但报告范围必须相应改变。视觉 score、工具执行完成、直接观察结论分别保留。

### B. 后端幂等

用户修改创建订单接口。选中幂等 Recipe，通过生产路由对测试服务重复发送同一个 idempotency key，检查响应与实际持久化副作用，再用不同 key 做区分。

支付供应商可用 fake，但必须记录；此 run 证明本地幂等处理与测试数据库状态，不证明供应商真实支付。若只能看响应却不能观察关键副作用，相关 claim 仍缺证据。

### C. Debug / fix

用户给出“刷新后设置消失”。先通过真实设置入口复现并保留坏结果，固定触发条件和判据；实现者修复后在新源快照上重跑同一方法，再运行相邻状态场景。

旧 run 与新 run 用同一 claim 和受控输入比较，但分别保留源身份。错误消失不自动证明猜测的根因；需要原因验证时再使用反事实或干预。有效方法沉淀进库，下次不必重新解释“保存提示不够，要刷新”。

## 14. 落地顺序与验收建议

目标形态完整，首版实现保持小。下面的数目与门槛是实验建议，需要在正式评估前固定，不是现有证据得出的行业常数。

### M0：验证方法格式是否有用

先在三个真实项目场景手工编写并应用代表性 Recipe：一个 frontend、一个 backend、一个 debug/fix。可复用已有工具，不先实现自动调度。

验收：冷上下文 Agent 能定位并绑定方法；正常版本通过；相关错误会导致预期 check 失败；不需要重新教授方法主体。逐项记录人工补充、含糊字段和无法执行的步骤，再收紧 schema。

### M1：最小方法资产闭环

先只验证一条纵向路径：`recipe lint/find → apply → run`（或 agent-guided 应用）`→ collect → finalize`。实现一个 profile、两条 Recipe 和一种项目 command binding；首版默认顺序。`init` 自动发现、复杂 profile 组合、独立的 report/export 命令和更多执行器适配属于后续切片，完整命令面仍按第 9 节作为目标形态。

从首个可以输出 scoped pass 的版本开始，就必须有非空必需 check 集合、run/对象身份、证据来源和缺失/中断拒绝规则；这些不延期到 M2。没有实现的证据适配只能输出采集记录或 inconclusive。

验收：通过实际打包安装的 CLI/Skill 路径完成“创建 → 搜索 → 绑定 → 应用 → 结果 → 下次复用”；关掉会话再打开仍能重复。不能只 import 内部函数通过就宣称安装产品可用。

### M2：在更多真实集成中验证边界

把 M1 的拒绝规则扩展到不同执行器：检查输入漂移、原始与派生结果的映射、参考摘要与导出完整性。针对真实使用过的测试报告格式做小适配；接入一个真实视觉工具路径。

必须拒绝的反例：零用例 exit 0、只打印 PASS、全 skip、过期截图、换判据后复用旧通过、缺 final result、只测 mock 自身、用旧服务验证新 checkout。不是所有情形都能自动识别：结构可判的由 CLI 拒绝；语义可疑的由 Recipe 资格测试和独立审查发现，并如实写出保证边界。

### M3：检验是否值得继续扩展

用固定任务、固定模型/工具条件做 paired evaluation：裸 Agent、只有通用自测 Skill、Veripaka 方法库。使用相同项目版本的隔离副本，控制顺序与缓存污染；判定答案由独立外部检查或盲审提供。

优先指标：用户纠错/补充次数、人工检查时间、真实缺陷检出、false pass、总耗时与实际模型成本。协议合规率单独报告，不能替代任务成功率。

建议先用 3 类场景 × 3 次配对作为探索性 pilot；这只能发现明显问题，不能据此做统计显著性或普遍效果宣称。要做效果主张时，再按 pilot 方差设计足够样本的独立任务集，包含正常任务、故障任务和缺失环境任务。

如果“方法库比通用 Skill”没有减少重新解释，优先修正检索与绑定；如果主要成本在首次编写，优先改 authoring；不要先加 dashboard、并发或更多 profile。

### M4：有证据后再扩展

按实际需要依次考虑：模板导入/升级体验、方法资格回归、更多技术类型、真实资源隔离下的批量执行、跨次 finding 追踪、用户全局库、Pi 生命周期集成、语义检索。公共 marketplace、云端账号体系、自动模型路由、通用开发 orchestration 不列入默认路线。

## 15. 现在可以收敛的建议，以及仍应保留的选择

| 决策 | 推荐默认值 | 何时应改变 |
|---|---|---|
| 核心产品边界 | 方法库 + 有界应用 + 证据反馈 | 真实用户只需要只读 cookbook，或证实端到端编排才是主要价值 |
| 方法格式 | frontmatter + Markdown + 可选脚本 | 真实 Recipe 出现大量复杂机械分支；再评估抽出 manifest，而非先设计 DSL |
| 资产路径 | `docs/verification` + `.veripaka` runtime | 团队已有约定；只改根目录映射 |
| 执行所有权 | command 小执行面；agent-guided 由宿主执行 | 需要无人值守、跨工具恢复时，再定义专门 controller |
| 存储 | 可读文件；缓存可重建 | 真实数据量或并发写入使文件操作成为瓶颈 |
| Profile | 数据为主，领域和任务可组合 | 用例证明需要更复杂选择逻辑 |
| 全局库 | 暂缓；先显式导入 | 跨项目维护重复成本被测量出来 |
| 自动反馈/修复 | 结构化失败包交给当前 coding agent | 有固定成功判据与预算后，可接已有有限循环 |
| 默认模型 | 沿用宿主，记录身份 | 实测显示某角色需要独立模型；再给配置建议 |
| 默认阈值 | 来自项目需求或经选定的参考，不发明通用值 | 有可迁移校准证据后才随模板发布 |

不需要先问一长串问题才能推进 M0；它是低成本、可逆的验证。这些推荐足以起步。真正不能由实现者擅自补齐的是某个具体项目的行为契约、视觉 oracle、允许的副作用与业务阈值。

## 16. 材料索引与使用说明

- [Draft](../Draft.txt)：产品方向的一手输入。
- [research-0928 REPORT](../../.temp/research-0928/REPORT.md)：竞争形态与问题清单；绝对化结论按 §3 修正。
- raw：`ArtJack__verdict.md`、`hannsxpeter__mythify.md`、`Kaiji-Z__stop-manual-testing.md`、`nano-step__eval-harness.md`、`NikaLuna365__parallax.md`：应用/证据/持续化机制线索。
- raw：`DanielMendesSensei__Agent-Verification-Skills.md`、`amElnagdy__guard-skills.md`、`zhenthebuilder__agent-charter.md`：方法资格、写作与机械检查边界。
- raw：`first-fluke__oh-my-agent.md`、`r-prem__agentest.md`、`AnshKanyadi__culpa.md`：profile 邻近先例、执行器与回放边界。
- raw：`Moody20alshatri__aftercheck.md`、`helal-muneer__qa-pilot.md`：用户旅程与反馈体验。
- raw：`jettbrains__-L-.md` 实为 2019 W3C highlights，与当前形态无关，不纳入产品依据。
- 本地 `D:/Pi/CLI/visual-primitives/README.md`、`D:/Pi/CLI/cu/README.md`、`D:/Pi/CLI/twcu/README.md`：核对工具职责、输入输出与平台限制；没有在本轮重新运行工具能力测试。
- 已安装 Pi 的 `docs/packages.md`、`docs/skills.md`：核对包分发与按需加载方式。

raw README 存在抓取换行与部分编码损坏，能支持语义阅读，不能作为可直接复制的命令来源。正式实现适配时应回到相应版本的原始契约和真实 CLI 验证。

## 17. 独立审查与处置

本轮由一位 fresh-context reviewer 先审材料与候选方向，再在同一审查会话完整复核具体方案。第二轮结论为 **OK with notes（就 brainstorm 文档交付而言）**，未发现 P0，指出 2 个 P1、2 个 P2；不代表产品能力已验证。

- P1：外部 receipt 冒充 executable evidence。已在 §10.2 明确采集资格由实际通道赋值、自由导入不能升级、调用绑定与检查器映射缺一不可。
- P1：对象身份 unknown 时仍可能被当作当前 checkout 通过。已在 §10.2 / §10.4 固定目标类型及身份 gate，未知只能在事先声明的 endpoint-observation 范围内解释。
- P2：项目内双 corpus root。已在 §5.2 固定单一解析根，禁止隐式合并。
- P2：agent-only exit 0 被误读为机器验证。已在 §9.2 / §10.3 要求 verdictBasis 与目标范围，宿主必须按预先要求的判断性质消费结果。
- 复杂度：接受“完整目标与首个实现切片分开”。M1 先一个 profile、两条 Recipe、一种 command binding；延后自动发现、导出与多执行器。
- 未采纳“所有最终判断只能由机器完成”：视觉与探索观察允许 agent/human 局部判断，前提是不能取代预先要求的机器证据。

这些条款由主会话修订并做一致性检查，未启动第三轮独立审查。实现前仍须验证真实采集路径、对象身份关联与冷上下文方法复用；本轮没有以文档结构检查替代这些实验。
