# 图像输入后续诊断：HTTPS 图片可用，data URI 路径失败

日期：2026-09-30。对 [S2 首轮记录](S2_START_CHECKPOINT.md) 的补充与结论收窄。

**后续状态更新：**用户排查上游后，[Pi read 恢复复验](IMAGE_READ_REVALIDATION_2026-09-30.md) 的原图、新 PNG/JPEG 和普通 CLI 三次会话均通过；请求仍使用 data URI。本文以下保留的是恢复前的诊断，不代表当前路径仍不可用。

## 结论

**指定模型的多模态能力不能被此前三次失败否定。** 后续同图对照已观察到：同一配置接口、同一 `deepseek-flash` 模型、`thinking: enabled` / `reasoning_effort: max` 下，HTTPS 图片输入能够得到对应画面的描述，而标准 base64 data URI 输入持续得到无法读取图片的回答。

已定位的是当前接口的**输入形式差异**，还没有上游解析/上传日志，不能宣称找到了某个具体函数的 bug。也不能再把它概括成“图像通路整体不可用”，或据此将后续设计长期限制为非模型像素检查。

## 1. 先核对错误来源

此前 `Invalid image format` 出现在模型回答中，不是 Pi `read` 的实际错误；工具返回了图片附件。此前只保存 Pi 事件，没有捕获最终 HTTP 请求，所以当时不足以定位传输故障。

本轮用临时 Node preload 观察 fetch，不改全局模型配置、不启用扩展、不记录认证头。Pi 启动时会安装自己的 undici fetch；最初 observer 被覆盖，未捕获请求，之后修正观察器并做了不联网的替换契约检查。Windows `--import` 初次传普通盘符路径导致启动失败，也保留了记录，不计为模型样本。

捕获到的复现请求：

- `POST /v1/chat/completions`；`model: deepseek-flash`。
- `thinking: {type: enabled}`，`reasoning_effort: max`。
- 图片以 `content[].type: image_url`、`image_url.url: data:image/png;base64,...` 发送。
- 解码请求里的两张图片，均为本地库可验证的 **660×380 PNG**，不是空数据或错误 magic bytes。
- 请求没有 `Invalid image format` 文字。
- HTTP **200** / SSE；无法读取的描述来自响应中的模型文本，而非一个 HTTP 4xx 格式错误。

这排除了“read 没产生附件”这一解释，但不证明上游正确消费了附件。

## 2. 绕过 Pi 消息包装的直接请求

认证只在内存中从同一配置解析，发往原配置 provider；未写入日志、未发往图片源站。没有换模型或降低 thinking。

保留模型/推理/stream 参数，移除 Pi system prompt、文件名包装和多图，直接调用同一接口：

| 条件 | 响应 |
|---|---|
| 纯文本要求返回 `TEXT_CONTROL_OK` | 正确返回 |
| 单张原始 PNG，标准 data URI | 无法读取／invalid image format |
| 同内容 JPEG，标准 data URI | 无法读取 |
| 原 PNG 仅增加 `image_url.detail: high` | 仍无法读取 |

所以并非只有 Pi Skill、文件名包装或未设置 detail 才会触发该现象。

## 3. 同图改变传输形式

### 公开 PNG

下载 Pillow 项目的公开 `hopper.png` 后，将同一图片分别作为 data URI 和 HTTPS URL 发送；其余请求体一致。

- data URI：回答图片未加载。
- HTTPS URL：描述了帽子、眼镜、深色制服、左侧旗帜等，与图片吻合。

这个 URL 文件名可能泄露内容，因此它不是单独充分的视觉证明。

### 不透露内容的随机地址 JPEG

使用新随机 seed 的公开图片地址，不上传任何项目或私有图片。父 Agent 在模型调用前查看并记录图片内容；给模型的提示只有：描述中央、左右及两侧较小物体，没有提供答案。

同一图片的两种输入：

- data URI：回答图片不可读。
- 随机 seed HTTPS URL：描述了中央向远方延伸的铁路、左侧悬崖和信号设施、右侧岩石海滩与浅蓝救生塔，符合图像内容。

小标牌数字被误读，不能声称全部细节/OCR 正确。这是视觉输入能工作的操作性证据，不是综合视觉能力基准。

**上述两组同图对照均只改变 `image_url.url` 的值：内联 data URI ↔ HTTPS 地址。** 两次 HTTPS 描述及对应 data URI 失败都保留原始请求和 SSE。

## 4. 样本与限制

本轮产生 10 次实际模型请求：两次 Pi 复现（第一次 observer 未捕获 HTTP），以及 8 次直接接口请求。直接请求包括一个文本控制、五个 data URI 条件和两个 HTTPS 条件。不是将重复失败重新命名为成功，也没有用另一模型替代。

捕获到的 Pi 请求及 8 次直接请求均 HTTP 200。另有一次启动前的 Windows import 错误和一次不联网的 observer 契约检查，均不计模型请求。

尚未证明：

- 上游 data URI 到实际多模态输入之间具体哪一步失败；可能涉及接口支持范围、解析、下载/上传或其他适配。
- 本地截图通过 Pi `read` 的默认 data URI 路径已恢复——它并未被修复。
- 私有项目截图的受控上传、权限、URL 生命周期或身份绑定已经建立。
- 这组操作性对照足以证明通用视觉准确度。

## 5. 对路线的修正

- 承认已观察到可工作的 HTTPS 多模态路径，不再以“模型不能看图”作为设计前提。
- 优先核查上游对标准 `data:image/...;base64,...` 的处理；临时替代若使用 HTTPS 图片，必须处理权限、材料身份和生命周期。
- **不把上传私有截图到公共图床作为默认补救。** 本轮只下载并引用公开控制图，没有上传项目内容。
- 之前的纯像素比较实验仍可作为局部方法校准，不能反过来证明只能走这条路线。
- S1 和 S2 首轮原始档案不改写；本记录追加新证据。

原始材料：[image-transport-2026-09-30](evidence/image-transport-2026-09-30/README.md)。
