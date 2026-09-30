# Pi read 图片恢复复验

日期：2026-09-30。用户报告上游排查后可能恢复，以下为新实测，不改写此前失败记录。

## 结论

**当前配置下，`Mapleluv-ChatCompletions/deepseek-flash:max` 已能通过 Pi `read` 读取本地 PNG/JPEG，并正确回答图片内容。** 抓取到的请求仍使用 base64 data URI，没有改成 HTTPS 外链。

本轮请求模型未换；响应 metadata 现在为 `cb/deepseek-v4.1-flash`，此前为 `deepseek-v4.1-flash`。记录该差异，不推断上游具体路由或修复方式。

## 三次独立会话

| 会话 | 输入与执行方式 | 结果 |
|---|---|---|
| 原故障回归 | 原任务、原两张 PNG；临时 fetch observer 只记录、不改请求 | 两段六位字符及 12 组有序形状/颜色全部正确 |
| 新材料验证 | 新随机 PNG＋JPEG；只启用 read；答案未写入任务，事先存于工作目录外 | 两段新字符及 12 组有序形状/颜色全部正确 |
| 普通 CLI 复核 | 不加 observer，使用原 `scripts/pi-smoke.mjs` 执行原任务 | 同样全部正确 |

共 **4 张不同图片**，不是把重复回归算成 6 张独立材料：`WYW5ND`、`LGE2GY`、新生成的 `R3M66Y`、`UCQLJT`；24 组不同材料上的形状/颜色均按顺序匹配。父 Agent 另行查看了新 PNG/JPEG，内容与记录一致。

每次实际工具调用恰为两次 `read`，只读取指定图片，没有 bash、OCR、代码或其他文件读取。三个会话均正常结束，无 provider 错误、超时或外层重试。

## 不依赖自报成功的检查

- 将最终结构化回答逐字段与保存的真值比较，不只检查 `supported: true`。
- 核对实际 `tool_execution_start/end`、图片结果及 `agent_settled`。
- 核对输入文件 SHA-256 未变。
- 两次带 observer 的会话中，图片请求均为 `image_url.url = data:image/png;base64,...` 或 `data:image/jpeg;base64,...`；从请求解出的字节摘要与输入图一致。
- HTTP 响应均为 200；`reasoning_effort` 为 `max`。
- 再用不带 observer 的普通 CLI 复核，排除只在诊断包装中工作的情况。

## 范围与后续

可以解除“本地 read / data URI 图片不可用”这一环境阻塞。此前 [传输诊断](IMAGE_TRANSPORT_DIAGNOSIS_2026-09-30.md) 中的数据 URI 失败是历史现象，不再代表当前状态。

本轮没有修改产品实现、Pi 安装或全局模型配置，没有上传私有图片。不因此宣称所有图像格式、大图、多模态推理或细粒度 OCR 均已合格，也未证明 testing strategy 指导有效或 S2 已完成。

[原始材料](evidence/image-read-restored-2026-09-30/README.md) 包括任务、原始事件、传输记录、原/新图片及真值、逐项核验和普通 CLI 结果。
