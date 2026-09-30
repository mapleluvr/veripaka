# 渲染像素一致性检查记录

## 结论
`reference.png` 与 `candidate.png` 的**渲染像素不一致**（decoded RGBA8 不同）。
两者文件字节也不同，但字节差异不是判据；判据是解码后的像素栅格。

## 方法（可复用脚本）
- 脚本：`compare_png_pixels.py`（仅用 Python 3 标准库 `struct/zlib/hashlib/json`，无需安装依赖，不调用模型或外部服务）
- 原理：解析 PNG 容器 → CRC 校验 → 解压 IDAT → 反 filter（None/Sub/Up/Average/Paeth）→ 归一化为 RGBA8 → 逐像素/逐通道比较。
  支持 bit depth 1/2/4/8/16、color type 0/2/3/4/6、非隔行与 Adam7、tRNS。压缩级别、chunk 切分、辅助元数据不影响结果。
- 调用：
  - `python compare_png_pixels.py reference.png candidate.png`
  - `python compare_png_pixels.py A.png B.png --json out.json --diff out_diff.png`
- 退出码：`0` 像素相同 / `1` 像素不同 / `2` 无法比较（缺失、损坏或不支持的 PNG）。

## 实际测量结果
| 项 | reference.png | candidate.png |
|---|---|---|
| 尺寸 / 位深 / 颜色类型 / 隔行 | 380×250, 8-bit, truecolor(2), 非隔行 | 同左 |
| 文件字节 | 6323 | 4128 |
| 文件 SHA-256 | 6de6d712…390409 | a8f0e5b6…964f41 |
| 解码 RGBA8 SHA-256 | a5100eb3…c228068 | e3e92b77…64ecc20 |

- 全图 95000 像素，其中 **9491 像素不同（9.9905%）**，**28114 个通道不同**，**最大通道差 233**。
- 差异包围盒 `[x0,y0,x1,y1] = [44,108,243,155]`（图像中下部一条水平带）。
- 通道差直方图集中在 {127: 8859, 195: 8835, 233: 8813} 三个峰值，其余为抗锯齿边缘/子像素差（2…203）。
- 抽样：如 (100,130) reference=(22,128,60) 而 candidate=(255,255,255)；第 132 行 reference 有 37 种颜色，candidate 只有 1 种（空白）。差异是**结构性/内容性**的（形状被抹除），非单纯编码噪声。
- 可视化差异图：`diff.png`；机读结果：`result.json`。

## 交叉验证与对照实验（脚本自身有效性的证据）
1. 独立 oracle：PIL(Pillow) 解码出的 RGBA8 与本脚本解码结果**逐字节相同**（两图均是）。
2. `reference.png` vs 自身重压缩（optimize/compress_level=9，文件 SHA 不同）→ 判为 **EQUAL (exit 0)**：证明压缩差异不被误判。
3. `reference.png` vs 注入 tEXt 元数据版本（文件 SHA 不同）→ 判为 **EQUAL (exit 0)**：证明元数据差异不被误判。
4. `reference.png` vs 单像素 R 通道 ±1 的改动 → 判为 **DIFFERENT**，恰好 1 像素 / 1 通道 / 最大差 1：证明极小真实差异不会被漏判。
5. 自比较 `candidate.png` vs 自身 → **EQUAL (exit 0)**。

对照用文件：`reference_recompressed.png`、`reference_meta.png`、`reference_onepixel_changed.png`（均为派生，原始图片未改动）。

## 材料路径
- 输入：`reference.png`、`candidate.png`（未修改）
- 脚本：`compare_png_pixels.py`
- 结果：`result.json`、`diff.png`、`CHECK_NOTES.md`

## 支持的结论 vs 不支持的结论
**可以支持：**
- 在“渲染 = 解码后 RGBA8 像素栅格”的定义下，两张图**逐像素不同**；并给出差异位置、数量与幅度。
- 方法对压缩方式与元数据差异免疫（有对照实验），且能捕捉单像素级差异。

**不能支持：**
- 不能判断**哪个是正确渲染**，也不能解释浏览器/CSS/DOM 层面的原因（无 DOM/浏览器信息）。
- 不能证明 candidate 在任何具体浏览器或设备上“看起来如何”（未做浏览器渲染，仅比较给定 PNG）。
- 不涉及像素之外的验收（功能、可访问性、布局语义等）；本检查通过 ≠ 产品通过。
- 解码依赖对 PNG 规范的正确实现；对含 `iCCP/gAMA` 等色彩管理块的图像，本工具比较的是**存储的样本值**，不做色彩管理转换，因此不能声称“在某个具体显示色彩空间下观感一致”。
