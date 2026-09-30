# S1 验收记录

日期：2026-09-30（UTC+08:00；原始记录使用 UTC）  
结论：**S1 四项晋级验证在下述支持范围内通过，内部 alpha 闭合；允许进入 S2，不表示 S2 已实现。**

本记录依据真实 tarball 安装、两次独立 Pi 进程、真实 HTTP 行为故障、受管证据负例及 Windows 进程状态。不是依据 README 宣称或 Agent 自报通过。无外部独立审计，也不作模型收益或任意项目适用性承诺。

## 1. 版本与环境

- Veripaka：`0.1.0-alpha.1`，private / unpublished。
- Node：`v24.15.0`；npm：`11.12.1`；Windows 11，`10.0.26200`；Pi：`0.86.1`。
- Git 当时为 `feat/s1-evidence` 的 unborn 分支，无 commit，因此使用内容摘要绑定实现，不能引用虚构的提交号。
- 测试 tarball：`.temp/s1-closure/veripaka-0.1.0-alpha.1.tgz`，23,106 bytes。
- tarball SHA-256：`a2b4a0b4c86632444fdab78367cfdec32ff9d67e9206d6c1e4d56073215a9ff7`。
- [实现身份](evidence/s1-2026-09-30/implementation-identity.json) 保存源码、测试、脚本、Skill 和参考项目摘要；[pack 清单](evidence/s1-2026-09-30/pack.json) 保存实际包文件清单。收尾文档状态更新不改变已测 CLI/Skill 字节。
- 消费项目：`D:/Projects/veripaka/.temp/s1-closure/consumer`；通过 npm 从 tarball 安装，非源码目录 symlink。安装后的 `dist/src` 与 `skills` 和本仓库最终对应目录逐文件相同。

当前支持：本地 checkout + 单个显式启用的 Node-test command + verification + executable judge + 顶层唯一命名测试。参考服务由测试直接导入所声明的源码，使用真实 HTTP、动态回环端口及私有临时数据目录。

## 2. 四项结论

| ID | 结论 | 关键实测 |
|---|---|---|
| S1-1 安装与冷复用 | 通过（明确安装后的 Skill 路径） | 两次无历史会话进程，各自读取 Skill、项目入口及方法，find/show → apply → run，产生不同的新 run；独立检查原始事件和摘要，再 finalize 均成功 |
| S1-2 方法检出力 | 通过（这两个代表性故障） | 正常 HTTP 服务通过；去掉真实输入拒绝分支、去掉真实文件写入，分别在预期 claim 失败；没有改测试来制造 exit 1 |
| S1-3 本次有效证据 | 通过（列出的负例） | 缺必需检查、只打印 PASS、全 skip、删原始事件、替换旧 run 报告、导入自称可信 JSON 均不能形成 scoped-pass；正常路径可以通过 |
| S1-4 生命周期所有权 | 通过（Windows 协作取消/超时） | 活跃真实孙进程存在时，第二个同项目 run 返回 PROJECT_BUSY；run cancel 请求由原运行者执行清理，原结果为 inconclusive/CANCELLED，真实 runner/孙进程均死亡，项目锁释放；超时路径同样通过 |

## 3. 安装与两次冷会话

### 安装

执行 `npm pack`，复制参考项目到干净消费目录，然后 `npm install --prefix <consumer> --ignore-scripts --no-audit --no-fund <tarball>`。项目 `.pi/settings.json` 由以下实际管理命令生成：

```text
cd .temp/s1-closure/consumer
pi install ./node_modules/veripaka -l --approve
```

Pi 0.86.1 的 package 管理参数与 session 参数不同：`install` 必须先于其参数，且该管理子命令不接受 `--no-extensions`。两次错误参数调用的日志也保留，没有将它们计为成功安装；最终管理命令 exit 0。它不是模型会话，未换模型或调用 `-e`。

### 会话条件

通过 `scripts/pi-smoke.mjs <consumer> <pi-cli.js> <label>` 启动，每次均使用：

```text
--model Mapleluv-ChatCompletions/deepseek-flash:high
--no-extensions --no-session --no-context-files
--no-skills --skill <consumer>/node_modules/veripaka/skills/veripaka/SKILL.md
--no-prompt-templates --no-themes
--tools read,powershell,bash,grep,find,ls --mode json --print <same-task>
```

保留用户既有 provider 凭据，未复制凭据入项目；设置 `PI_OFFLINE=1` 关闭 Pi 启动联网功能，不关闭模型请求。两次初始任务相同，仅描述验证目标与禁止改写证据，不提供测试实现、Recipe 正文或上次 run ID。第二次在第一个进程退出后启动，不 resume、不 fork、不输入上次对话。

| 项目 | 冷会话 1 | 冷会话 2 |
|---|---|---|
| Pi session ID | `01a0ee2c-edd8-7795-9a09-e65fed04053b` | `01a0ee2e-f264-71b3-8cb2-356c994ee5ef` |
| Run ID | `e86ccc38-5780-4750-9181-7af9af99c590` | `de3ffc35-2f08-4207-a742-b8038ae03634` |
| 耗时 | 44.145 s | 58.507 s |
| 工具调用 | 18 | 16 |
| 进程退出 / 超时 | 0 / 否 | 0 / 否 |
| 结果 | 两项 pass，scoped-pass/executable | 两项 pass，scoped-pass/executable |

实际 assistant 消息中的 provider/model 均为 `Mapleluv-ChatCompletions/deepseek-flash`，provider 返回的 `responseModel` 为 `deepseek-v4.1-flash`。`:high` 是所请求配置，不据此推断服务端内部推理预算。没有模型 fallback。

独立复核：

- 手动检查真实工具调用，确认都读取安装后的 Skill，使用安装后的 launcher 执行 find、recipe show、apply 和本次 run；没有自行写测试、改源码、改 plan/result 或复用旧 run。
- 比较消费项目中运行目录以外 **1,126 个文件** 的完整前后清单与 SHA-256，包含方法、输入、源码、安装包及依赖；两次均无变化。
- 分别核验 sealed plan/execution/result、快照字节、当前源文件、原始产物摘要、run/attempt/invocation 关联、两个实际 Node test:pass 和最终 runner summary。
- 从父进程独立调用安装后的 launcher `run finalize <id>`，均 exit 0 且返回相同结果。
- 两份最终回复均保留跨设备同步未覆盖、checkout 范围与 trial 成熟度，不把两项通过说成所有目标通过。

检索过程不是完美的：会话 1 对尚不存在的 `.veripaka` 执行 ls，产生一个工具错误后自行恢复；会话 2 试探了不存在的可选 config 和错误的 `RECIPE.yaml` 路径后改用 show。完整日志保留，未因这些试探而删除样本。两次均无需用户追加解释。

[独立校验结果](evidence/s1-2026-09-30/cold-verification.json)；原始 session 事件、逐次调用、最终回复、快照与 run 见 `evidence/s1-2026-09-30/cold-1/` 和 `cold-2/`。

## 4. 行为与证据负例

使用安装后的 CLI 重跑 `scripts/evidence-checkpoint.mjs`，6 类场景共 15 次 CLI 调用：

| 场景 | Run ID | 实测 |
|---|---|---|
| 正常服务 | `c25fbb00-ee44-4060-944c-63a82c81eda5` | 两项 pass；exit 0 |
| 绕过非法 theme 拒绝 | `8e58036a-b4e8-4376-a4d5-56a18e401deb` | `api-contract/reject-invalid-theme` fail；exit 1 |
| 删除实际持久化写入 | `2ff6d536-f3da-467f-ba2e-e741a490d0cf` | `settings-persistence/survives-restart` fail；exit 1 |
| 删除本次 events | `2298ad0f-f9f4-4892-b0c9-e3feb36c8f8e` | inconclusive；exit 3 |
| 替换为旧报告 | `2765cf5d-68ad-4f2f-a310-6f6509ec2d45` | EVIDENCE_DIGEST_MISMATCH；exit 3 |
| 导入手填可信声明 | `9d911cb1-50c9-499b-8260-73d8f8feb96b` | acceptedAsExecutableEvidence=false；finalize 为 NOT_STARTED/inconclusive |

整个 runner 失败时，其他原本通过的用例会被保守标记 inconclusive；故障对象的目标 claim 则保留有效 fail。这里没有把同一次失败运行包装成其他行为已被完整验证。

机器结果、原始调用和快照见 [ground-truth-checks.json](evidence/s1-2026-09-30/ground-truth-checks.json) 与 [evidence-tests/calls.json](evidence/s1-2026-09-30/evidence-tests/calls.json)。被故意删除/替换的材料保持负例状态，不能将其当作完整通过证据。

## 5. Windows 生命周期与本轮修复

先加回归、观察三个失败，再修复：

1. 新增 `run cancel <id>`：原来没有显式取消入口。请求绑定当前 run/invocation/plan，不获取或抢走执行锁；未启动/已终态运行拒绝请求。请求返回 exit 3 / cancellation-requested，不宣称已经终止。
2. launcher 改为同进程加载 CLI：原来的 Windows launcher 信号处理会 taskkill 整个 CLI 树，丢失 terminal JSON 并留下锁。现在由 CLI owner 完成清理和写入。
3. finalize 区分合法 interrupted 原因与完整性失败：原来完整的 TIMEOUT 结果也不能幂等读取。现在取消/超时终态可重复读取，但缺失或改动的产物仍拒绝复用。

[先红记录](evidence/s1-2026-09-30/regression-red.log)；[安装包生命周期回归](evidence/s1-2026-09-30/lifecycle/tests.log)。

| 路径 | Run ID | runner / 孙进程 PID | 实测终态 |
|---|---|---|---|
| 显式协作取消 | `eb709d6c-276d-4bcf-88f2-9e32d5f2de72` | 26084 / 36924 | CANCELLED，cleanup=terminated，均不存活，锁已释放 |
| launcher 信号处理 | `2b9bc007-03f3-4430-97dd-c05c69e22f08` | 34144 / 12876 | CANCELLED，cleanup=terminated，均不存活，锁已释放 |
| 超时 | `ebf9f992-0e7e-41df-96cc-38d4df839870` | 35960 / 28916 | TIMEOUT，cleanup=terminated，均不存活，锁已释放 |

显式取消与超时使用真实 Windows 进程树和真实 CLI 调用。launcher 信号测试通过隔离 wrapper 注入 Node `SIGINT` 事件，验证处理器路径；**未声称已测试物理 Ctrl+C、所有 Windows 控制台宿主或 Task Manager 强杀语义**。Windows 主动取消的合格入口是 `run cancel`。强杀 CLI 仍可能留下需人工检查的锁，产品不自动按锁龄抢占。

取消测试还确认：第二个 prepared run 返回 PROJECT_BUSY 且没有 execution；取消这个未启动的 run 不会误杀活跃 run；完整取消终态可重读；随后故意删除 stdout，重读应报错。归档中这个取消 run 的 stdout 因负例而缺失，相关调用与结果均保留。

## 6. 回归与复跑

最终 `npm run typecheck` 通过；`npm test` **13/13 通过**。另对安装包执行取消/超时回归 **3/3 通过**。见 [完整测试日志](evidence/s1-2026-09-30/tests-final.log)。

```text
npm run typecheck
npm test
npm pack --pack-destination <artifact-directory>
# 在新 consumer 中从生成的 tarball 安装，而不是链接源码目录
node scripts/evidence-checkpoint.mjs <consumer>/node_modules/veripaka/dist/src/cli/main.js
node scripts/pi-smoke.mjs <consumer> <pi-cli.js> <unique-label-1>
node scripts/pi-smoke.mjs <consumer> <pi-cli.js> <unique-label-2>
```

安装包生命周期复跑可给测试进程设置 `VERIPAKA_TEST_CLI`、`VERIPAKA_TEST_LAUNCHER` 和已创建的 `VERIPAKA_TEST_ARTIFACTS` 目录，再执行：

```text
node --test --test-concurrency=1 dist/tests/cancellation.test.js dist/tests/lifecycle.test.js
```

`pi-smoke` 的 candidate-success 只是候选状态，仍须复核真实工具调用、文件完整性、本次 run 及结果范围，不把其状态直接当验收。

## 7. 保留边界与下一阶段

- S1 通过只针对这里的参考对象、平台和输入；两次会话不是普适成功率或成本收益实验。
- 明确加载安装后的 Skill 是本次合格路径；未证明任意用户全局配置下的自动发现都正常。
- 两条 Recipe 保持 `trial`。这里记录条件化复用与故障检出证据，不自动晋级、不宣称永久资格。
- 声明源码域不等于自动依赖分析；不认证任意已有服务或远程部署。摘要也不是防同权限恶意篡改的签名。
- 本目录是显式选取的内部验收归档，不是已实现 report export。原记录包含原机绝对路径；移动后可查阅快照/事件，但不能在异地直接拿原 run 调用 CLI finalize。
- guided、视觉、investigation、baseline 接受、三个完整默认入口、方法迁移和效果对照实验仍按 S2—S4 推进，本轮未提前实现或宣称通过。

下一步：按 S2 选择一条真实 guided/视觉采集链路，并实现独立 investigation 完成语义；不再重开历史 brainstorm。
