# 图像传输诊断材料

解读与限制见 [诊断记录](../../IMAGE_TRANSPORT_DIAGNOSIS_2026-09-30.md)。这里追加证据，不修改 S2 首轮失败档案。

## 核心对照

- `work/direct-xoGvHN/public-base64.request.json` 与 `public-url.request.json`：同一公开 PNG，data URI 与 HTTPS URL 对照。
- `work/direct-KWI8ix/opaque-base64.request.json` 与 `opaque-url.request.json`：同一新随机 seed 地址的 JPEG，不靠文件名透露画面；data URI 与 HTTPS URL 对照。
- 各目录中的 `*.response.txt` 为原始 SSE，`*.summary.json` 为抽取的响应正文/HTTP 状态。
- `work/pair-check.json` 验证两组请求除 `image_url.url` 以外完全一致。
- `work/opaque-control/expected.json` 为模型调用前父 Agent 的画面观察；没有传给模型。
- `work/public-control/`、`work/opaque-control/` 保留下载的公开图、来源和摘要。没有上传项目或私有图片。

## 其他定位材料

- `work/inline-captured-hwxAhU/`：Pi 复现的真实请求、响应、从请求解出的图片和原始 Pi 事件；请求 PNG 可解码，HTTP 200，模型仍报告不可读。
- `work/direct-74DMpH/`：同接口直接文本/PNG/JPEG请求；文本成功，data URI图片失败。
- `work/direct-xoGvHN/png-detail-high.*`：仅添加 detail=high 没有恢复原始图片输入。
- `work/inline-repro-uNts1u/`：第一次真实复现，observer 被 Pi 安装 undici fetch 覆盖，未捕获 HTTP，不冒充抓包结果。
- `work/inline-repro-0WqabO/`：Windows --import 路径错误导致启动失败，没有模型调用。
- `work/tap-contract-*/`：修复 observer 后的本地假 fetch 契约检查，没有联网或调用模型。
- `work/fetch-tap.mjs`、`work/run-observed.mjs`、`work/direct-probe.mjs`：临时诊断程序最终版本，不是新的产品组件；初期 observer 失败见相应记录。

## 保密与范围

请求不记录认证头、endpoint 主机或凭据。直接探测脚本只在内存中解析现有凭据并发送给配置的同一 provider。脚本包含本机配置路径，但不包含密钥值。没有改动用户模型设置或安装的 Pi 源码。

所有实际请求保持 `deepseek-flash` 和 `reasoning_effort: max`。HTTPS结果证明观察到可工作的图像路径，但不证明所有细节正确（随机图的小标牌数字被误读），也没有修复 Pi 默认使用的 data URI 路径。

日志内绝对路径保留采集时原样；`.temp/vision-diagnosis/` 对应本归档 `work/`。不要在原始档案内重跑会改写文件的诊断。`MANIFEST.json` 排除自身，记录归档文件摘要和原始来源；完整性不等于根因已经定位到具体上游代码。
