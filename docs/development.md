# veripaka 开发与运行说明

本文承接根 README 中的详细运行、恢复与内部 E2E 约定。面向初次使用的说明见[根 README](../README.md)；实测范围见 [S1 验收记录](implementation/S1_EVIDENCE_CHECKPOINT.md)。

## 本地开发

需要 Node.js 24.x 与 npm。Windows 是初始实测平台，其他平台尚未完成资格验证。

```bash
npm ci
npm run typecheck
npm test
```

`npm test` 会先构建，再运行仓库测试。仅构建时使用 `npm run build`。运行示例 CLI 不需要 Pi 或模型凭据。

## 本地打包与 Pi 安装

当前包为 private / unpublished，不应通过公共 npm 包名安装。先在仓库根目录生成 tarball：

```bash
npm pack
```

在一个独立的消费项目目录中，从生成的文件安装（替换为实际路径和文件名）：

```bash
npm install --ignore-scripts --no-audit --no-fund /absolute/path/to/veripaka-0.1.0-alpha.1.tgz
pi install ./node_modules/veripaka -l --approve
```

第二条命令将包声明写入消费项目的 `.pi/settings.json`；`--approve` 表示信任本次命令读取的项目配置，应在审阅后使用。包管理命令是 `pi install ...`，不是模型会话命令；不要将会话用的 `--no-extensions` 混入安装子命令。

包只声明 Skill 和相对 launcher，没有 extensions，也不依赖全局 veripaka CLI。安装后应检查 `skills/veripaka/SKILL.md` 及其相对 launcher 能否解析到包内 `dist/src`。

真正的安装检查必须使用独立目录中的 tarball 安装，而不是源码 symlink。在冷会话中检查实际 Skill 读取、工具调用、新 run 及未覆盖目标；安装成功不等于模型消费了指导正文。历史实测步骤和限制见 [S1 安装记录](implementation/S1_EVIDENCE_CHECKPOINT.md#3-安装与两次冷会话)。

## 取消与恢复

以下命令参数应加到当前使用的 CLI / Skill launcher 后，并始终指向原项目。

### 协作取消

```text
run cancel <run-id> --json
```

- 请求返回 exit `3` 和 `cancellation-requested`，不是执行完成或清理完成的判定。
- 原运行者仍持有执行锁，负责清理自己的进程树；等待原 `run` 的终态，并检查该运行 `execution.json` 的 `cleanup`。
- 未开始或已终态的运行拒绝取消；并发竞态下，原运行可能已经完成。
- 不要用 Windows `process.kill`、任务管理器或强制删除锁代替协作取消。强杀可能留下必须人工检查的锁。

### 仅采集与手动完成

正常 `run <run-id>` 自动采集并完成判定。以下是用于恢复 / 测试的低层入口，不是常规必需步骤：

```text
run <run-id> --capture-only --json
run finalize <run-id> --json
```

`--capture-only` 返回 exit `3` 和 `captured-not-finalized`，绝不表示通过。`run collect <run-id> --input <file>` 可以接收观察，但不能把调用者手填的 JSON 升级为可执行证据。

### 锁、漂移与完整性

- 同项目执行互斥。恢复疑似过期锁前，检查 `.veripaka/locks/execution/owner.json` 及其拥有的进程；CLI 不会只根据锁龄抢占。
- 清理状态未知时保留锁且不通过。没有跨项目共享资源调度器，也没有 OS 沙箱。
- 源码、测试、Recipe、输入或配置变化后重新 `apply`，不能修改旧计划来绕过漂移检查。
- 再次读取终态结果会检查当前完整性，不会静默接受被更改的证据。
- snapshot roots 是显式声明，不是自动依赖分析。必须另行建立实际源码与被测服务的关系；当前实现不证明任意 endpoint 正在运行当前 checkout。
- 摘要不是防同权限恶意篡改的签名；方法的 `trial` 状态也不会因为一次通过自动变成 `reusable`。

## 仓库 E2E 模型约定

本节是仓库实现验收的运行约定，不是 veripaka 对普通用户模型服务的兼容性列表。

新的实现 E2E 模型会话使用操作者指定的唯一模型：

```text
pi --model Mapleluv-ChatCompletions/deepseek-flash:max --no-extensions --no-session --print <task>
```

- 不添加 `-e`，不回退到其他模型。
- 上游访问 / 传输故障应记录尝试并适当退避重试；保留失败和部分样本，重放副作用前检查清理状态。行为失败不是传输重试。
- 可以将显式安装后的 `--skill <path>` 与 `--no-skills` 组合，以隔离被测 Skill。需要明确展开正文时使用 `/skill:veripaka`。
- 模型凭据留在用户现有 provider 配置中，不写入仓库。
- 历史 S1 使用 `:high` 的记录保持原样，不追溯改写。
- 单独请求的设计 reviewer 使用其 reviewer 配置，不属于实现 E2E 模型会话。

烟测脚本入口：

```text
node scripts/pi-smoke.mjs <consumer> <pi-cli.js> <label> [task-file]
```

脚本使用 `:max`，每次调用生成唯一尝试目录。不传 `task-file` 时执行原冷复用任务；传入时用于有明确许可动作的探索 / 能力任务。

脚本保留原始事件、错误、请求参数以及冻结的提示与 Skill 字节，不自动重放尝试。其完成状态只表示需要复核，**不能认证方法质量**。当前探索结果、失败候选与剩余缺口见 [S2 首轮记录](implementation/S2_START_CHECKPOINT.md)。
