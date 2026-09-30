# S2 首轮实现与校准材料

结论与限制见 [S2_START_CHECKPOINT.md](../../S2_START_CHECKPOINT.md)。这些材料不是 S2 验收，也不把模型自写的检查器当成已通过资格审查的产品能力。

## 定位原始材料

| 内容 | 路径 |
|---|---|
| PNG 工具图像会话 | `model-calls/png-read/` |
| JPEG 工具图像会话 | `model-calls/jpeg-read/` |
| 初始消息图片会话 | `work/inline-image-YStp1L/` |
| 候选方法 R0 / R1 / R2 | `model-calls/method-r0/`、`method-r1/`、`method-r2/` |
| 新包真实冷复用 | `model-calls/reuse/` |
| 图像输入、答案及政策 | `work/capability-consumer/`、`capability-private/`、`CAPABILITY_PROTOCOL.md` |
| provider 的非敏感声明 | `work/model-capability-declaration.json`（不含端点或密钥） |
| 真实浏览器截图/观察 | `work/browser-capability/` |
| R0 生成方法与父 Agent 检查 | `work/pixel-consumer/`、`pixel-private/`、`pixel-independent-checks.json` |
| R1 生成方法与设置失败 | `work/r1/`、`work/CASE_PREPARATION_ISSUES.md` |
| R2 生成方法、预登记及父 Agent 检查 | `work/r2/`（含 `skill-consumption.json`、`independent-checks.json`） |
| 两版被实际安装的 tarball | `work/veripaka-0.1.0-alpha.1.tgz`、`work/r1/veripaka-0.1.0-alpha.1.tgz` |
| 冷复用 Node 证据与快照 | `work/reuse-consumer/.veripaka/runs/0811c8d0-5ae0-4ac6-8850-5872465cfe36/` |
| 父 Agent 再 finalize | `work/reuse-finalize-check.json` |
| 最终回归与类型检查 | `work/tests-final.log`、`work/typecheck-final.log` |
| 脚本先红后绿记录 | `work/pi-harness-*.log`、`work/pi-current-framing-*.log` |
| S1 及冻结输入完整性复核 | `work/integrity-check.json` |
| 本轮源文件快照 | `source/`（harness、回归测试、Skill 与策略正文） |

`model-calls/*/events.ndjson` 是原始 Pi 流；模型解释、思考和自检报告属于被审查对象，不是结论权威。`metadata.json` 的完成状态只要求复核。模型调用中没有 provider 错误；工具/方法错误和父 Agent 准备错误没有删掉。

## 重要限制

- 共 7 次真实模型会话，均请求 `Mapleluv-ChatCompletions/deepseek-flash:max`，不启用 extensions 或持久会话。初始图片探测使用独立的一次性 CLI 调用，其参数单独保存。
- R1 的控制材料准备失败后仍启动会话；没有完成事前登记，不能算独立留出评估。`palette-identical.png` 保留原错误命名，不代表它真是无损对照。
- R2 通过显式 Skill 命令载入正文，但没有读取策略 reference。不能拿“已安装文件”或较少代码推断策略价值。
- R0 的错误通过、R2 的严格容器完整性缺口，以及 R2 自检的交错标志问题都保留。缺 IEND 但仍可解码像素的情况须区分“文件结构有效”与“解码样本相同”，不要混成同一个判断。
- 父 Agent 知道对象与反例，两个角色没有组织隔离；方法会话没有读取私有材料。不据此主张广域独立评价或统计效益。
- 浏览器程序是事后从执行记录导出的复现源码；它运行过的控制仅作校准，不是隐蔽留出材料。借用的本机 Playwright 路径不等于已交付跨机器依赖支持。
- 没有保留 consumer 的 `node_modules` 或 Python 缓存；保留了安装包、锁文件、输入和生成材料。R2 模型自己删除了控制图片，这项缺口见原始工具记录，未伪造回填。
- 归档只复制原始文件，不改写其中的绝对路径。日志中的 `.temp/s2-start` 对应 `work/`，`.temp/pi-smoke/<label>/<attempt>` 对应上表 `model-calls/`；需要复现时请在隔离目录重建，不在本档案内运行会覆写材料的命令。

[MANIFEST.json](MANIFEST.json) 列出本目录除 manifest 自身以外的文件摘要及原始来源。来源为事后复制定位，不是声称所有输入都事前冻结。原始文件与归档字节一致；目录内的摘要只能发现事后改动，不能替代对实验设计和结论的审查。
