# Veripaka 组合设计

日期：2026-09-30  
状态：当前设计基线，已按 P001 重规划方法探索主线；**设计已更新不等于实现已交付**。S1 仍是唯一已验收阶段。  
实施顺序：[IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md)。

本轮依据：[P001 · 测试策略探索](proposals/001_TESTING_STRATEGY_DISCOVERY.md)。按用户要求采纳其产品重心、文本先行和实际探索/迁移评价方向；本文件与阶段文件承接现行决定，提案仅保留决策依据。独立 reviewer 已允许开始 S2 单线实现，范围与两项落实要求见 [复审记录](implementation/ROADMAP_REVIEW_2026-09-30.md)；这不构成阶段验收。

本文以 [veripaka-target-shape.md](veripaka-target-shape.md) 为主线，按 [edit_proposal.txt](edit_proposal.txt) 的取舍补入 [TARGET_SHAPE_PROPOSAL.md](TARGET_SHAPE_PROPOSAL.md) 的必要内容。三份输入及早期设计已标记 DEPRECATED 并原地封存（见 [文档入口](README.md)），仅保留为历史依据，不再平行维护两套方案；设计变更更新本文，阶段与晋级条件更新阶段文档。本轮未复跑原案提到的外部工具或独立评估。

## 1. 产品边界

**Veripaka 是 Pi 优先的测试策略探索与方法复用工具。** 核心工作是帮助 Agent 认识真实对象、判断该怎样测试、构造并校准有检出力的方法，再把有用知识沉淀为项目 Recipe。不是预设用户已经设计好全部测试，产品只负责保存和重跑。

主闭环：

```text
任务 / 改动 / 症状
  → 明确目标，查明会影响测试选择的对象与环境事实
  → 找现有方法 / 查策略与领域依据 / 做必要观察
  → 选择观察、干预与判据，根据结果调整方法
  → 准备测试和绑定，冻结 verification 计划并真实执行
  → 挑战方法的相关性与检出力，保留结论及未决问题
  → 沉淀适用条件和修订理由，在新会话/新条件下复用
```

已有方法充分时直接应用；开放问题可走 investigation，产生发现而非产品通过；缺需求、权限或可观察性时可以澄清或停止。以上是按需往返的工作过程，不是要求每个任务必须填完的流水线。

**方法选得对、方法有区分力、运行材料有效，是不同的责任。** Evidence-verification 为探索提供可信底座，不代替前两项。收益按实际测试决策、检出效果、人工劳动和总成本衡量，不按 Recipe 数量、调用次数或绿色结果数量衡量。

### 1.1 由对象和主张推导测试方式

Agent 要共同考虑对象属性、用户主张和可用观察/控制条件，而不是“frontend → 截图”这样的固定映射。模态、状态寿命、时间关系、随机性、判据来源、消费/信任边界与副作用是启发提问的维度，不是正交本体或必填 schema。

例如同一网页：结构/无障碍树能解释语义角色，真实渲染能暴露遮挡，交互与独立状态读取才能回答保存是否有效。对象不清楚时先用低风险探针查明；不从现有实现反推正确答案，也不因为工具只能看 DOM 就把视觉问题降成节点存在性。

探索可以先建立行为/状态认识，再形成问题；不要求所有测试预先具有两个已知假说。“真实”也不等于一律端到端或禁止 mock，局部测试应回答局部主张，不能越过被替代的边界扩大结论。

### 1.2 从观察形成可执行方法

在任务范围和宿主已有授权内，Agent 可以复用测试、制作隔离 fixture、增加观察点、查询规范、改变输入或事件条件。选择的探针应能推动问题认识或下一步决定；没有前提时不无限试探。危险副作用先建立隔离/恢复条件，不能由方法正文自行授予权限。

关键决定只需短记：问题/目标、观察到的事实、选用或放弃的方法及理由、相关材料、下一步或停止原因。记录外显决定，不要求完整思维链或虚构的信息增益评分。没有值得复用的新知识时不强制创建 Recipe。

通用策略先写成少量可读正文：何时考虑、要回答什么、建议的观察/干预、为何有用、何时不用、依据与失败经验。S2 首先通过入口 Skill 的参考正文提供这些内容，项目特有经验留在 Recipe 正文及其 references；不新增独立策略 registry 或可编程规划语言。

### 1.3 分工与当前能力

- Pi/宿主 Agent 负责理解目标、读资料、选择并执行获授权的工具动作；Veripaka 不另起模型调度或接管开发循环。
- Skill、策略正文与项目方法帮助形成测试决策；它们的有效性必须在真实任务上检查，不由格式合规保证。
- CLI 负责冻结、受支持的采集/判断与结果边界；`apply` 不调用模型、不暗中生成或执行测试。
- 当前已交付的是 S1 的本地 Node command verification 和冷复用基础。guided、investigation 与完整的方法探索消费路径仍待 S2 实现；现有 unsupported 响应在实现前保持不变。

不默认自动修复、更新基线、提交或发布。便宜模型能否减少人工设计测试的劳动，以及总成本是否降低，均不提前承诺。

## 2. 已收敛的选择

| 事项 | 当前决定 |
|---|---|
| 资产与运行 | `docs/verification/` 保存方法资产，`.veripaka/` 保存本机状态与运行材料 |
| 方法入口 | README 是稳定说明；实时检索或独立 `INDEX.md` 承担索引，索引不具权威性 |
| 方法表示 | Recipe package：`RECIPE.md` 的结构化 frontmatter、解释正文及必要辅助文件；策略知识先用正文，不新设机器对象 |
| 执行模式 | 仅 `command` / `agent-guided`；guided 可以调用脚本，不另设 mixed 模式 |
| 任务性质 | 显式 `kind: verification | investigation`，分别定义结果语义 |
| 应用协议 | 保留 `apply → run → collect → finalize` 的职责；command 的 `run` 自动采集与汇总 |
| 证据来源 | 分开 producer、ingestion、verification、judge，不用一个 provenance 枚举混装 |
| 对象身份 | 明确 checkout / build / deployment / endpoint-observation，不将观察服务等同于验证当前代码 |
| 方法成熟度 | `draft → trial → reusable → deprecated`；reusable 包含有条件的冷上下文复用证据 |
| 分发与实现 | TypeScript / Node、单 npm 包、少量 Skills、包内 launcher；首版无 extension |
| 已有基础 / 下一步 | S1 的一个 Profile、两条 Recipe、Node runner；S2 从真实对象的自主方法形成开始，按需补 guided/调查能力 |

上述选择是当前工程默认，不需要先逐一证明最优。允许调整模块和字段表示；不能通过调整表示撤销结果真实性、显式授权或不静默改判据的约束。

## 3. 对象与权威来源

| 概念 | 语义 | 初期存储归属 |
|---|---|---|
| Recipe | 可复用的方法意图、适用条件、输入、步骤、判据与限制 | 方法包 |
| Binding | 项目对象、入口、命令、夹具及参数的具体映射 | `project.yaml` 的命名绑定和本次输入 |
| Profile | 某类任务的候选方法、必要覆盖、顺序和预算建议 | YAML 数据 |
| Plan | 本次范围、问题映射、绑定、判断方式与执行条件的冻结快照 | run 内 `plan.json` |
| Run / attempt | 一个冻结计划的一次应用及允许的重试 | 独立运行目录 |
| Evidence / assessment | 观察材料与对 claim 的解释 | attempt 内材料与结构化结果 |

这是语义分工，不要求为每个名词建立独立服务、表或 CRUD 系统。策略正文是选择方法的知识来源，不是可以用空 claims 冒充可执行验证的 Recipe；探索记录也不自动成为业务通过结果。若正文成为具体判据来源，应随相应方法/参考冻结，不保留会暗中变化的第二份 expected。

### 3.1 默认布局

```text
<project>/
  tests/                         # 原测试继续留在原框架和原目录
  docs/verification/
    README.md                    # 稳定入口、约定、最短使用路径
    project.yaml                 # 唯一共享项目绑定
    recipes/<id>/
      RECIPE.md
      scripts/                   # 可选，方法特有 helper
      fixtures/                  # 可选，小型无敏感输入
      references/                # 可选，方法私有参考
    profiles/*.yaml
    references/<id>/             # 已接受的 baseline / oracle 及来源记录
    reports/<run-id>/             # 可选，显式导出的可携带证据包
    INDEX.md                     # 可选的派生索引
  .veripaka/
    config.json                  # 可选，corpusRoot 等非敏感指针
    local.json                   # 本机解析信息，不提交
    drafts/                      # 未接受的方法/参考候选，不提交
    runs/<run-id>/
      plan.json                  # 含冻结定义、输入和对象描述
      snapshot/                  # 复核所需的方法、配置等字节或稳定引用
      guide.md                   # 派生的局部 Agent 执行包
      attempts/<attempt-id>/
        execution.json
        stdout.log
        stderr.log
        evidence/
        assessment.json
      result.json                # CLI 汇总的终态事实
    cache/                       # 可删除重建
    locks/                       # 项目锁；不冒充主机级资源协调
```

`init` 只创建必要入口、配置和忽略规则，其他内容按需出现。不要求项目使用 Git。

一次只解析一个 corpus root：有显式 `config.json.corpusRoot` 时采用它，否则采用 `docs/verification`；不扫描并合并第二个根。`local.json` 可以补本机可执行路径等解析信息，不能暗中更改 shared claims、阈值或 required 项。凭据使用环境或密钥引用，不写进方法与共享报告。

Recipe ID 在当前库内稳定且唯一，移动目录或改标题不改变身份。格式版本与内容 digest 分开。CLI 不无条件重写正文或 `AGENTS.md`；Agent 入口最多显式添加一个短链接块。未知 schema 主版本、未知规范字段或歧义引用应拒绝应用，扩展字段放明确命名空间。

## 4. Recipe 与 Plan 的核心契约

### 4.1 方法必须保存什么

Recipe 至少说明：目的与不覆盖范围、适用/排除条件、真实被测入口、输入与前提、动作和观察步骤、判据来源、证据要求、失败/未知出口、副作用与清理、代表性假通过路径、资格与复用条件。

机器字段保存稳定身份、检索信息、输入、执行入口、claim/check ID 和证据要求；正文解释为什么这样测、如何遵循和解释失败。按方法需要保留策略触发条件、观察层选择、可调整的输入/分支、不适用情形和更便宜的充分路径，而非只复制成功操作。一个阈值或期望只有一个权威来源，正文引用它，不另维护第二份数值。

分类是辅助检索的多维标签，例如 surface、scope、technique、dependencies。标签不能代替执行能力检查，也不能把 mock、e2e、exploratory 当成互斥的同一分类轴。

### 4.2 验证与调查

| `kind` | 冻结内容 | 完成意味着什么 |
|---|---|---|
| `verification` | 非空必需 claim/check 集合、各项判据、证据与判断方式 | 可以报告这些主张的 pass / fail / inconclusive |
| `investigation` | 探索问题、对象/操作范围、时间盒、记录要求与停止条件；不预设所有探针 | 调查协议完成并留下发现/未决项及方法候选；不产生产品通过结论 |

verification 中 `required` 默认 true，可选项必须显式说明。空 claims、全 optional、零用例、全 skip 都不能形成 scoped pass。investigation 不为满足这个约束而捏造业务 claim；其结构校验与完成判断走独立分支。

初期一个 Plan 只含一种 kind。debug-fix 可以先调查、再建立验证 Plan，并关联两次记录；无需先设计一个混合任务工作流引擎。调查未找到缺陷与验证断言通过不能互换。

### 4.3 准备先于冻结

编写或修改测试、检查器、fixture 和项目绑定发生在方法准备阶段。`apply` 只解析已经准备好的内容、检查静态条件并冻结计划，不执行 Recipe 代码，也不暗中生成测试。

冻结至少包括：选定 Recipe/Profile 内容、输入、subject 类型与身份要求、必需 checks 与证据、judge、oracle/baseline、命令绑定、预算、重试政策和声明的资源约束。运行前再检查实际环境与对象。

执行时可以按预先声明的规则生成 property 样本或选择探索输入，不能修改判断标准。改测试、换判据、换目标版本或缩小必需范围，都产生新计划；原记录保留。

探索循环跨越准备、调查和验证，不塞进一个不断改写的 verification run。调查可在冻结范围内根据观察选择下一步；若发现需要改动已冻结的源码、测试或判据，先结束/记录原轮，再在准备阶段修订并建新计划。尚未获支持的宿主探索材料保留其真实来源，不能通过改个标签升级为受管证据。

### 4.4 用户问题到方法的映射

Plan 必须保留一个轻量的目标映射，而非只记选中了哪些测试：

| 本次问题 | 计划采用的方法 / claim | 范围处理 |
|---|---|---|
| 设置动作是否生效 | `settings-save / visible-change` | 计划验证 |
| 刷新后是否保持 | `settings-persistence / survives-reload` | 计划验证 |
| 是否跨设备同步 | 无 | 未覆盖；若用户原本要求，不能擅自标为不需要 |

由 Agent/人负责选择合理性并保存理由；CLI 只检查引用和缺口是否显式，不能证明这种映射在业务上充分。执行后在原映射上附实际结果，不删除未回答的问题。只运行 build/typecheck，最多得到相应范围的结果，不能报告“设置保存已验证”。

**选中检查都通过、所选方法有检出力、用户问题已被充分回答，是三件不同的事。** 报告必须让这三层边界可见。

## 5. CLI 与宿主协议

以下确定命令职责；尚未交付的入口必须明确 unsupported，不能返回成功占位。

| 入口 | 职责 |
|---|---|
| `init`、`recipe new/list/show/lint` | 建立最简库与草稿、按需阅读、静态校验；不执行内容 |
| `find <query>` | 本地元数据/全文检索，返回短卡片、命中理由、能力与绑定缺口 |
| `apply <recipe-or-profile> --input <file>` | 冻结范围与输入，创建 prepared run 和 guide；无被测业务副作用 |
| `run <run-id>` | command：执行、受管采集并自动 finalize；guided：返回执行包、采集入口和下一步，不宣称已完成 |
| `run cancel <run-id>` | 请求当前 invocation 协作取消；不抢项目锁，不表示清理已完成；原 run 负责写终态。返回 exit 3 与 cancellation-requested，拒绝未启动或已终态运行 |
| `run collect <run-id> --input <file>` | 接纳观察和工具材料，按真实接入路径记录来源与已验证关联 |
| `run finalize <run-id>` | 对冻结集合逐项评估并产生终态；不接受调用者手填最终 verdict |
| `report <run-id>` / `report export <run-id>` | 从结果生成报告；按显式范围导出自包含材料或稳定制品引用 |
| `recipe import <package>` | 显式复制方法及来源；不启用其中命令、不执行安装脚本 |
| `baseline accept <candidate> --reason <reason>` | 显式选择参考，保存来源、条件、理由和 digest；不表示产品已通过 |

日常 command 路径是 `find/show → apply → run`，不要求 Agent 手工补 collect/finalize。低层协议供 guided、恢复和外部集成使用。guided 响应必须给当前状态、missing 项和具体 next action；依靠 Skill 引导，不预设必须增加 Pi extension。

共同约定：机器模式 stdout 只含版本化 JSON，日志走 stderr；复杂参数使用文件/stdin；错误带稳定 machine code、已有产物和下一步。检索/lint 不调用模型。command 只解析项目已启用的命名绑定，采用 executable + argv + cwd；shell 必须显式指定，不从正文提取代码块执行。

管理命令 exit 0 只代表管理操作完成。评估命令约定：0 为 scoped pass，或 `kind=investigation` 的调查完成；1 为有效必需断言失败；2 为请求/配置错误；3 为无法完成评估。详细原因放 JSON。调用者必须读取 kind、执行状态、verdict、verdictBasis 和未覆盖范围，不能只读退出码；guided 尚需宿主执行时不返回完成态的 0。保留 child 原退出码，不无差别透传。

终态 finalize 幂等，报告由同一结果数据派生。终结后不追加材料或原地改判；重新运行建立新 run。未终结运行中的允许重试建立新 attempt，默认重试次数为 0；启用重试必须先冻结采用结果的政策，不得跑到第一次绿就丢掉红。

## 6. 证据来源与对象身份

### 6.1 provenance 分四个维度

| 维度 | 回答的问题 | 示例与限制 |
|---|---|---|
| `producer` | 材料由谁产生 | runner、外部工具、agent、human；名称不自动带来信任 |
| `ingestion` | 怎样进入本次记录 | managed-command、host-bridge、file-import |
| `verification` | CLI/适配器实际验证了哪些关联 | run、invocation、输入、artifact digest、subject；逐项保留 verified / unknown / mismatch |
| `judge` | 谁按什么规则解释观察 | executable / agent / human，以及检查器、rubric 或模型配置引用 |

以上是语义形状，不要求首版建立通用信任框架。首版受支持的高确定性路径是：受管命令捕获实际调用与原始产物，再由一种已支持的 runner 检查器映射到冻结 checks。

材料能否支持某个 claim，取决于计划的采集/判断要求，以及已经验证的来源链。采集通道与验证结果由 CLI/受支持适配器赋值，不接受外部 JSON 自称 managed capture 或可信 invocation。自由导入默认未验证；首版不能靠它满足 executable claim。未来若支持可核验的 CI 制品导入，可以验证其来源链后使用，不把“导入”永久等同于“不可信”。

**真实捕获到 exit 0 还不够。** 必须把真实 runner 结果、非空已执行用例及对应断言映射到冻结的 claim/check。未识别的报告、缺失 check、只打印 PASS、全 skip 都保留材料并拒绝通过；验证不能只遍历执行器碰巧返回的那几项。

Agent/human 可以解释材料，但不能升级材料的采集资格。计划允许该 judge 且相应证据与对象关联充分时，可形成带来源标签的局部判断；看一张图片可以判断图片内容，却不能仅凭图片证明它来自当前应用。来源不明时保留 inconclusive，不将宿主或工具品牌当成采集链证明。

### 6.2 明确被测对象

| subject 类型 | 可以声明的范围 | 不足时的处理 |
|---|---|---|
| `checkout` | 声明代码域的当前源状态，经关联的实际执行路径 | 源清单或实际执行关联不足，不得声称当前代码通过 |
| `build` | 有内容身份的构建 | 无法证明所测构建身份，不得通过该范围 |
| `deployment` | 指定部署及其构建/版本关联 | 仅有 URL 不足以建立部署身份 |
| `endpoint-observation` | 声明时间/条件下对某 endpoint 的观察 | 仍需关联到该 endpoint，但不要求由此证明某个 checkout |

身份要求在 apply 时选定，不能因运行失败而原地降级为 endpoint-observation。若要缩小范围，建立新计划并保留原缺口。

快照覆盖声明的源码域、方法、脚本、配置、命令、fixture 和参考。Git 项目包括声明项的 dirty/untracked 内容；非 Git 项目使用文件清单与摘要。只记录 Git HEAD 或一条测试脚本的 hash 不足以证明整个服务身份。运行前后检查变化；排除运行产物/缓存的规则预先确定，不能结果出来后扩大排除范围。

关联 unknown/mismatch 或运行中漂移时，保留观察，但对 checkout/build/deployment 不输出 scoped pass。旧结果只证明当时的对象；使用旧证据时另算 current / stale / unknown，不重写历史结论。摘要不是签名，不能证明外部状态没变或同权限写入者无法篡改。

## 7. 判断、反馈与调查完成

分开记录：执行状态、逐 claim assessment、判断来源和证据新鲜度。工具缺失、权限不足、进程崩溃、无法观察不能直接变成产品 bug。

verification 的聚合顺序：

1. 有属于本次范围、身份与证据有效的必需失败：`fail`，同时保留其他缺口。
2. 没有有效失败，但必需项因前提/能力不足无法执行：`blocked`。
3. 必需执行不完整、中断、效果未知或证据/判断不足：`inconclusive`。
4. 必需集合非空且全部按原计划通过：`scoped-pass`，仍显示未覆盖问题和限制。

可选诊断单列；其失败不能被抹掉，但不能拿其通过填补必需项。输出 `verdictBasis: executable | agent | human | mixed`；mixed 是汇总性质，不是第三种执行模式。机器证据要求不能由 Agent 自述顶替，judge 不能在失败后悄悄改变。

investigation 完成时输出独立的 completion 状态、调查记录、发现、停止原因与未决项，产品 `verdict` 为空。时间盒到期只有在满足预先声明的记录与停止协议时才算调查完成；崩溃或缺记录仍是不完整。

失败反馈至少包含：recipe/claim/case 身份、expected 及来源、observed、evidence refs、subject、复现入口与未测范围。诊断假说独立于实测事实；环境差异不自动构成根因。下一个会话应能据此复现，而非让用户重新解释。

## 8. 方法生命周期、参考与迁移

| 成熟度 | 含义 |
|---|---|
| `draft` | 可搜索/编辑；关键条件未收敛，不作为已验证方法 |
| `trial` | 可以显式应用；资格尚不完整 |
| `reusable` | 在声明条件下通过方法资格并有冷上下文复用记录 |
| `deprecated` | 不再默认推荐，保留历史和替代入口 |

verification 的资格包括代表性正常对象通过、相关真实故障在预期 check 被拒绝、另一冷会话能发现并应用。故障应破坏被测行为，不能只是让测试脚本强行 exit 1。investigation 的资格改为：在已知线索/无可支持结论的场景中产生预期调查记录并正确保留未知，再证明冷会话可复用；不捏造“无缺陷通过”样本。

探索中见过的正常/故障样例是校准材料，不等于独立验收。方法形成后，还要用未向作者透露的变体和不适用近邻检查过拟合/误用；具体代表性组合由阶段任务事先登记，不要求穷尽所有故障。跨项目的资格必须包含当地实际应用，而不只是成功拷贝文件。

资格记录绑定方法 digest、适用项目/环境、宿主、工具和可获得的模型配置；未知配置标 unknown。reusable 不是永久通用认证，一次业务 pass 不自动晋级。判据、入口或 helper 变化后重新检查资格；CLI 能核验引用和匹配，不能仅凭一个状态字段确认检出力。

自动 refinement 只生成草稿，说明漏检、入口漂移或误用的证据与修订理由。接受是显式操作，可由授权的人或宿主 Agent 执行；不能因失败自动放宽阈值、删除 required 项或升级成熟度。

baseline 分候选与已接受参考。候选可来自运行，但接受后必须把所需字节复制到方法资产，或建立独立、稳定且可访问的制品引用；清理 run 不得删除正在使用的参考。接受记录含来源、环境条件、digest、选择理由与选择者。接受不证明参考正确，方法仍需资格校准；替换参考产生新修订和新计划。

内置模板是只读来源，显式复制到项目后成为项目所有的版本，保存 origin/version/原 ID/digest。冲突报错，更新给差异，不覆盖正文或自动启用命令。跨项目需参数化环境值、保留资源与许可、重新绑定并重做适用域资格；运行证据不随方法迁移成为新项目的证明。

## 9. 策略检索、Profile 与已有工具

需要区分三种“找”：本地已有 Recipe、帮助形成/调整方法的策略与领域依据、当前对象及工具的事实。前两者不能代替最后一种实查。搜索缺口可以是“读取可能被共享缓存伪装”，不必先知道目标 Recipe 名称。

S1 的 `find` 仍只检索本地方法元数据与正文；S2 先由 Skill 帮助提问、按需读少量策略参考，再使用宿主已有读/搜/观察能力。外部资料查询按任务需要和权限启用，核对来源/适用版本，不默认要求联网；也不把检索结果当执行授权。只有实际查询失败记录显示必要时才扩展检索实现。

Profile 是数据，不是另一个 workflow DSL。frontend、backend、debug-fix 保留为候选导航入口；前两者是领域，后者是任务过程。先有实测方法再整理入口，不再把凑齐三个 Profile 作为阶段晋级目标。只需显式列表、去重与冲突报错，不做继承、递归 Recipe 或通用 DAG。

| Profile | 主要方法方向 |
|---|---|
| frontend | 真实交互、状态持久化、错误/空态、受控视觉比较 |
| backend | API 契约与边界、持久化副作用、权限负例、幂等 |
| debug-fix | 复现、区分原因假说、修复后同路径复测、相邻回归 |

已有 backend 入口；后续只发布在明确条件下真正 working 的入口，未完成的不能成为成功占位。默认方法数量按实际复用需要决定，不把模板数量当质量指标。预算、能力不足不能静默删除必要覆盖；替代执行路径只有支持同一 claim 才能替代。

搜索从本地 ID、标签和正文开始，提供稳定排序、命中理由与 unavailable 原因；Skill 做意图解释。README 不维护全量索引，cache/INDEX 可重建。不按最高通过率给方法质量排名，不先建设向量库。

Pi 提供会话、模型与工具权限；Veripaka 不另起模型调度系统。一个入口 Skill 包含探索/准备、应用和修订指导，按需加载策略与项目方法；这不是新增 CLI execution mode，不将每条 Recipe 注册为 Skill。包内 launcher 避免依赖全局 CLI PATH。Skill 提醒与宿主强制门禁不是同等保证，首版不宣称结束回合强制验证。

既有 runner 继续拥有测试发现、执行和断言；visual-primitives 提供已确认的图像操作，cu 提供其实际支持的桌面能力，twcu 提供其实际支持的浏览器执行/trace。接入时复核具体版本、平台与公开接口；不把原案中的工具核验当作当前可用证明，也不要求三种工具都是硬依赖。

## 10. 有界执行与实现骨架

### 10.1 从第一条 command 路径就拥有的边界

- 每个 run/attempt 独立分配产物目录，报告只能从本次已关联产物读取；同一 run 的写入需互斥和原子提交。第一版同项目受管执行整体互斥，第二个调用明确 busy，不必实现等待队列。
- 锁保留 owner 和生命周期信息，不能仅凭超时抢活跃锁。异常退出后，先判断拥有的进程与资源状态；无法确认恢复安全时 blocked，不恢复旧 pass。
- command 有超时、次数与产物上限，取消管理本次创建的进程树。Windows 必须实际覆盖子进程、路径和取消行为；不能假定杀掉父进程即清理完成。清理失败单列，效果未知时不自动重放。
- 自动操作共享桌面前，须有经验证的工具互斥或最小主机级资源协调；项目锁不够。未实现协调的跨项目共享数据库/端口等资源不在自动支持范围，绑定必须使用独立资源或明确 blocked。

这些不是提前做并发调度，而是避免串行产品被两个会话同时调用时相互污染。

读取、搜索、lint、import、apply 不执行 Recipe 代码。运行沿用任务与宿主已有授权，项目启用的命令绑定降低误执行，但不构成 OS 沙箱；不能由文档或 Profile 授予提权、网络或数据写入许可。声明的硬隔离要求无法执行时停止，不把约定宣传为强制限制。

导入/收集/导出检查路径越界及 symlink/reparse point，不自动上传日志、截图和 trace。成本区分 observed / estimated / unknown；缺计量不记为 0，无法强制费用上限时不宣称美元硬封顶。

### 10.2 允许直接采用的结构先验

单包内按 `cli / catalog / planning / execution / evidence` 划分轻模块；schemas、skills、recipes、profiles、tests、evals 按需增加。先用可读文件和简单扫描，后续发现瓶颈再改变。可合并/拆分内部模块，不为目录名或抽象层数单设验收。

首版只承诺一种 runner 适配和受支持的对象关联方式；尚未实现的 mode、kind、subject 或来源组合显式返回 unsupported。**缩小支持范围，不降低已支持范围的真实性。** 方法探索、条件化迁移与效果评估的推进顺序，以阶段文档为准；工具/格式建设按这些任务的真实阻塞安排，不成为独立的架构自证阶段。
