![veripaka](assets/logo/veripaka-title.png)

<div align="center">

**帮你的 coding agent 想清楚怎么测，而不只是运行测试。**

*Help your coding agent figure out how to test—not just what to run.*

<img src="https://img.shields.io/badge/version-0.1.0--alpha.1-6891dc" alt="version: 0.1.0-alpha.1">
<img src="https://img.shields.io/badge/Node.js-24-c9e3f9?logo=nodedotjs&logoColor=6891dc" alt="Node.js 24">
<img src="https://img.shields.io/badge/Pi-Skill-6891dc" alt="Pi Skill">
<img src="https://img.shields.io/badge/status-experimental-c9e3f9" alt="experimental">

<br>
<br>

<a href="#快速开始">快速开始</a> ｜
<a href="#在-pi-中使用">在 Pi 中使用</a> ｜
<a href="docs/README.md">文档</a> ｜
<a href="docs/IMPLEMENTATION_PHASES.md">路线图</a> ｜
<a href="docs/implementation/S1_EVIDENCE_CHECKPOINT.md">实测记录</a>

</div>

---

**veripaka** 是面向 Pi coding agent 的实验性测试工具包：探索真实软件该怎么测，把有用的方法保存为项目自己的 **test recipes**，再在合适的条件下复用。

Agent 写代码很快，但“怎样知道它真的做对了”往往仍由你负责：选择观察方式、构造能暴露问题的反例，再把下一步反馈写得足够准确。换一个会话，同一套测试思路可能又得从头解释。

veripaka 希望让 Agent 承担更多这类判断，并把学到的方法留在项目里。它不替代现有测试框架，也不把“跑出绿色结果”当作工作的终点。

> [!IMPORTANT]
> 当前为 **未发布的内部 alpha**，`package.json` 仍标记为 `private`。已实现的是 Recipe 管理、受限执行和结果复用基础；方法探索指导仍在实验中，尚未证明通用自主测试能力或成本收益。请从本地源码体验，不要使用 `npm install veripaka`。

## ✨ 为什么是 veripaka

### 先决定怎么看，再决定怎么测

测试方式取决于你要回答的问题，而不只是项目属于“前端”还是“后端”。

| 想知道什么 | 容易误判的检查 | 更贴近目标的观察 |
| --- | --- | --- |
| 按钮是否真的看得见？ | DOM 中存在，甚至可以点击 | 检查实际渲染，确认没有遮挡或裁切 |
| 设置是否真的保存了？ | 写入返回成功，随后从缓存读回 | 跨过临时状态边界，重启服务或使用独立读取路径 |
| 数值结果是否可信？ | 程序运行结束，没有异常 | 已知小例子、独立实现或领域性质的交叉验证 |

这些例子说明方法选择的出发点，**不表示当前 CLI 已交付表中所有测试能力**。已有方法足够时就复用；不够时，才通过有边界的探索建立观察方式、判据和反例。

### 留下策略，不只留下一条命令

一个 **Recipe** 是项目拥有的测试方法：它记录测试目的、适用条件、操作入口、预期行为、证据要求，以及清理方式和可能造成假通过的陷阱。

“重启服务”只是一条操作；说明要消除哪一层临时状态、为什么重启后的读取才有意义，才是另一个会话能够理解和调整的策略。

### 结论只覆盖真正检查过的范围

执行基础负责冻结范围、运行检查、收集证据，并保留没有回答的问题。相关性判断仍然重要：**即使完整记录了一次无关测试，也不能证明你的目标已经达成。**

## 🧩 当前功能

1. **项目内方法库**：以 Markdown + YAML frontmatter 保存 Recipe，支持创建、检索、查看和静态检查。
2. **组合与复用**：通过 Profile 组合已有方法，将用户问题映射到明确的检查主张（claims）。
3. **冻结执行计划**：`apply` 固定声明的源码、方法、输入与检查范围；内容变化后需要重新规划。
4. **受管测试证据**：调用现有 `node:test`，将本次原生测试事件关联到声明的测试文件和顶层测试名，而不是从日志里搜索 `PASS`。
5. **保留未覆盖目标**：分别输出范围内结论、逐项检查和未回答的问题，不把局部通过包装成整体正确。
6. **生命周期管理**：同项目执行互斥、超时处理、协作取消，以及结果复用时的完整性检查。
7. **Pi Skill 入口**：提供方法选择与复用指导，使用包内相对 launcher，无需全局安装 veripaka CLI。探索指导本身仍属实验性能力。

## 快速开始

### 1. 准备环境

- **Node.js 24.x** 与 npm，版本范围以 [`package.json`](package.json) 为准。
- 已有本仓库的本地源码。
- 仅在使用 Agent 工作流时需要 Pi 和你自己的模型配置；运行 CLI 示例不需要模型服务。

Windows 是目前完成实测的平台；其他平台尚未完成资格验证。

在仓库根目录执行：

```bash
npm ci
npm run build
```

### 2. 查看示例方法

仓库自带一个[设置服务示例](examples/backend)，包含真实 HTTP 请求和文件持久化测试，以及两条 `trial` Recipe：

| Recipe | 验证的问题 |
| --- | --- |
| [`api-contract`](examples/backend/docs/verification/recipes/api-contract/RECIPE.md) | 不支持的主题值是否被拒绝，并且不改变原状态？ |
| [`settings-persistence`](examples/backend/docs/verification/recipes/settings-persistence/RECIPE.md) | 成功写入的设置是否能在服务重启后读回？ |

先读[示例验证入口](examples/backend/docs/verification/README.md)，再从仓库根目录执行：

```bash
node dist/src/cli/main.js --project examples/backend recipe lint --json
node dist/src/cli/main.js --project examples/backend find settings --json
node dist/src/cli/main.js --project examples/backend recipe show settings-persistence --json
```

`recipe lint` 只检查静态结构与引用，不验证产品行为，也不认证方法质量。

### 3. 生成计划并运行

```bash
node dist/src/cli/main.js --project examples/backend apply backend --input verification-input.json --json
```

这一步**只准备计划，不执行测试**。从返回 JSON 的 `data.runId` 取得运行 ID，将下面的 `RUN_ID` 替换为实际值：

```bash
node dist/src/cli/main.js --project examples/backend run RUN_ID --json
```

`--input` 相对于 `--project` 指定的目录解析，因此使用的是示例中已有的 [`verification-input.json`](examples/backend/verification-input.json)，不需要自行创建。

正常运行会启动测试拥有的本地服务，使用动态回环端口和私有临时数据目录，随后自动收集证据并完成判定。运行材料保存在 `examples/backend/.veripaka/runs/<run-id>/`。

### 4. 阅读结果，而不只看退出码

示例的正常结果应包含：

- `data.verdict` 为 `scoped-pass`，`data.verdictBasis` 为 `executable`；
- `data.checks` 中两项声明的检查通过；
- `data.goals` 中仍保留“跨设备同步”未覆盖的原因；
- Recipe 仍为 `trial`，不会因为本次通过就自动晋级为 `reusable`。

CLI 的 stdout 是 JSON，包含 `schema`、`ok`、`command`，以及 `data` 或 `error`。

| 退出码 | 含义 |
| --- | --- |
| `0` | 管理操作完成，或验证在声明范围内通过；**不是所有用户目标都通过** |
| `1` | 必需检查出现有效的断言失败 |
| `2` | 输入、配置或命令使用不合法 |
| `3` | 无法完成判定、能力不支持，或返回了取消请求 / 仅采集等非最终状态 |

## 在 Pi 中使用

完成构建后，可以在目标项目目录显式加载源码中的 Skill。将路径替换为你自己的仓库位置：

```bash
pi --no-extensions --skill /absolute/path/to/veripaka/skills/veripaka/SKILL.md
```

Windows 路径也可以写成 `D:/Projects/veripaka/skills/veripaka/SKILL.md`；路径含空格时请加引号。

进入 Pi 后，使用显式 Skill 命令。例如，在 `examples/backend` 目录启动会话后：

```text
/skill:veripaka 检查设置 API 是否拒绝非法主题，以及设置是否能在服务重启后保留。优先复用项目现有方法，保留未覆盖目标，不修改源码、断言或证据来让结果通过。
```

探索新方法时，也可以描述具体目标：

```text
/skill:veripaka 帮我判断这个项目的设置保存功能该怎么测。先检查真实入口和状态边界；已有方法不够时再做小范围探查，给出可执行候选及其适用条件和局限。
```

> [!NOTE]
> `--skill` 让 Skill 可用，不保证模型主动读取正文；`/skill:veripaka` 会显式展开正文。探索候选可以先是脚本或观察记录，但这不会为 CLI 增加尚未支持的执行模式，也不代表候选已经通过方法质量验证。

本包声明的是 Skill 与相对 launcher，**没有 Pi extension**。本地 tarball 安装、冷会话复测及仓库专用 E2E 模型约定见[开发与运行说明](docs/development.md)。

## 编写自己的 Recipe

先读目标项目的 `docs/verification/README.md`。如果尚未初始化，可从 veripaka 仓库目录运行：

```bash
node dist/src/cli/main.js --project /absolute/path/to/your-project init --json
node dist/src/cli/main.js --project /absolute/path/to/your-project recipe new settings-check --json
```

这会生成不覆盖已有文件的脚手架，**不是一份已经可运行的测试**。还需要：

1. 在 `project.yaml` 声明本地对象、源码范围和显式启用的 Node-test command。
2. 在 Recipe 中写明适用条件、必需主张、预期行为、依据和稳定的测试文件 / 顶层测试名。
3. 补充操作、清理、假通过陷阱及不覆盖的范围。
4. 建立问题到主张的输入映射，完成静态检查，再对正常对象和相关故障对象分别验证。

默认目录布局：

```text
your-project/
├── docs/verification/
│   ├── README.md                 # 方法入口
│   ├── project.yaml              # 对象与命令绑定
│   ├── profiles/                 # 可选的方法组合
│   └── recipes/
│       └── settings-check/
│           └── RECIPE.md         # 元数据 + 方法正文
├── verification-input.json       # 用户问题 → 检查主张
└── .veripaka/
    └── runs/                     # 本地运行材料，不提交到版本库
```

方法留在可审阅、可版本管理的项目文件里；高频运行材料留在被忽略的 `.veripaka` 目录。需要更换方法库位置时，可使用 `.veripaka/config.json` 的 `corpusRoot`。

## 支持范围

| 项目 | 当前状态 |
| --- | --- |
| 本地 checkout + 显式启用的单个 Node-test command | 支持 |
| 唯一命名的顶层 `node:test` 检查 | 支持 |
| 两条后端试验方法与 `backend` Profile | 随示例提供 |
| 嵌套测试 / suite、任意 shell binding | 不支持 |
| 远程部署对象、guided 视觉执行、investigation 完成协议 | 尚未交付 |
| 通用自主方法发现、跨项目迁移、降低人工成本 | 开发与评估目标，不是已验证结论 |

> [!WARNING]
> veripaka 不是 OS 沙箱，也不能防御拥有相同系统权限的恶意写入者。源码范围是显式声明，不是自动依赖分析；日志、截图、文件存在或 Agent 的解释本身不能升级为可执行验证证据。

源码、Recipe、输入或配置改变后，应重新 `apply`，不要手改冻结计划或结果。取消运行请使用 `run cancel <run-id>`，并等待原运行者的终态；取消请求被接收不等于清理完成。强杀进程、抢占锁或恢复异常运行前，请阅读[取消与恢复说明](docs/development.md#取消与恢复)。

## 🗺️ 路线图

- **S1 · 执行与复用基础**：已在声明环境内完成验收，保留[实测记录及边界](docs/implementation/S1_EVIDENCE_CHECKPOINT.md)。
- **S2 · 真实对象上的方法探索**：已开始首轮能力与方法校准，见[推进记录](docs/implementation/S2_START_CHECKPOINT.md)；尚未验收。
- **S3 · 条件化迁移与方法改进**：规划中。
- **S4 · 探索和复用的价值评估**：规划中；是否节省人工和总成本需要对照实验回答。

完整规格见[当前设计](docs/VERIPAKA_DESIGN.md)与[实现阶段](docs/IMPLEMENTATION_PHASES.md)。设计目标、实验候选与已交付能力始终分开表述。

## 🤝 参与开发

欢迎带来真实项目、难例、会假通过的方法，以及能够独立复跑的失败记录。相比一份“全部通过”的摘要，我们更需要知道：对象是什么、目标是什么、实际观察到了什么，以及现有方法为什么没能回答问题。

```bash
npm ci
npm run typecheck
npm test
```

修改执行或判定行为时，请同时提供回归测试。安装是否可用，需要在独立消费项目中验证真实 tarball，不能只凭源码目录运行成功。更多流程见[开发与运行说明](docs/development.md)。

文档总入口：[docs/README.md](docs/README.md)。

---

<div align="center">

**理解系统，找到有用的方法，把学到的留下来。**

*Understand the system. Develop a useful method. Keep what you learn.*

</div>
