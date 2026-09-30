# S1 选定验收证据

对应 [S1 验收记录](../../S1_EVIDENCE_CHECKPOINT.md)。这是从本机真实实验中显式复制的材料，不是模型编写的模拟结果，也不是产品 report export 功能。

| 路径 | 内容 |
|---|---|
| `implementation-identity.json`、`pack.json` | 被测源码/Skill 身份和真实 tarball 清单；无 Git commit 可供引用 |
| `installation/`、`install.log`、`pi-install*.log` | 消费项目 npm/Pi 安装记录；保留了前两次错误参数调用 |
| `cold-1/`、`cold-2/` | 原始 Pi JSON 事件、metadata、完整 run/快照、人工复核输入和独立 finalize 输出 |
| `consumer-*.json` | 1,126 个非运行文件的会话前后摘要，三份完全相同 |
| `cold-verification.json` | 对实际身份、摘要、runner 事件与不同会话/run 的独立检查结果 |
| `evidence-tests/` | 真实正常/故障对象和缺失/替换/伪造证据实验，含 CLI 调用及各 run |
| `lifecycle/` | 安装包的协作取消、launcher 信号处理和超时回归；实际 PID、调用、快照与终态 |
| `ground-truth-checks.json` | 目标 claim、退出码、进程存活与锁状态的复核 |
| `regression-red.log`、`tests-final.log`、`typecheck.log` | 修复前失败和修复后全套验证记录 |
| `MANIFEST.json` | 此归档的文件大小和 SHA-256，排除清单自身 |

注意：

- 原记录不改写，其中的绝对路径、时间戳和 UUID 均指向原始执行。阅读副本不等于在新目录重新执行或认证。
- `evidence-tests/missing-evidence`、旧报告替换 run 及 `lifecycle/cancel` 中有故意缺失/不匹配的产物：这是负例的最终状态，不要修补为假通过。归档 MANIFEST 描述现存字节，不声称这些被故意破坏的 run 具备完整证据。
- launcher 信号回归注入 Node SIGINT 事件；真实 Windows 主动取消验收使用 `run cancel`，不代表测过任意控制台的物理 Ctrl+C。
- Pi metadata 的 candidate-success 仍需结合原始调用、独立检查和人工结论，不独立充当验收。
- 日志保留本机路径与测试错误栈，但没有复制 provider 凭据；没有自动上传。
- 高频完整工作目录仍在 `.temp/s1-closure`、`.temp/pi-smoke` 与 `.temp/evidence-2026-09-29T17-26-22-712Z`。此处保留的是选定原始材料，不承诺移动后的 CLI replay。
