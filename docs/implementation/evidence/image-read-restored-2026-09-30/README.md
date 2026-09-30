# 本地 read 图像恢复复验材料

结论见 [IMAGE_READ_REVALIDATION_2026-09-30.md](../../IMAGE_READ_REVALIDATION_2026-09-30.md)。

- `original-read/`：原故障任务与两张 PNG 的新会话；含 Pi 事件、请求/响应、独立逐项核验。`original-inputs/` 保存对应图片与原真值。
- `fresh-read/`：新随机 PNG/JPEG 会话，同样保留原始事件、实际 data URI 请求/响应及独立核验。
- `work/consumer/`、`work/private/truth.json`：新图片与未提供给模型的真值；`work/protocol.json` 为启动前的验证要求。
- `work/verification.json`：前两次会话的图像字段、文件摘要、调用范围、HTTP 状态与模型参数核验。
- `plain-read/`：不带抓包 observer 的普通 Pi CLI 会话；`work/plain-verification.json` 是逐项复核结果。
- `observer-source/`：仅对前两次会话使用的临时观察器及启动程序，不修改请求内容、凭据或全局设置。

三次会话均通过，但输入有重复：总计 4 张不同图片，4 段六位字符及 24 组有序形状/颜色；不要统计为 6 张独立测试图片。前两次抓到的图片均仍采用 base64 data URI，没有替换为 HTTPS 外链。实际调用只有指定图片的 read，没有 OCR/代码/其他文件读取。

请求模型保持 `Mapleluv-ChatCompletions/deepseek-flash:max`，响应标识为 `cb/deepseek-v4.1-flash`。这证明当前端到端读取行为恢复，不定位上游内部改动，也不构成一般视觉准确度或策略价值验收。

目录隔离和工具限制不是 OS 沙箱；真值未放入提示，实际日志未见越界读取。原始日志路径保留采集时形式；此前失败档案没有改写。认证头及密钥不在抓包材料中。

`MANIFEST.json` 记录本目录除自身外的文件摘要，用于完整性检查。
