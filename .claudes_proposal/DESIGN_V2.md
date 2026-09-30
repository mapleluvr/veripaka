# Veripaka 设计方案 v2

> **DEPRECATED — 已封存，仅供历史追溯。** 本文不再维护，不作为实现或验收依据；其中的接口、命名与路线可能已被撤销。当前设计以 [VERIPAKA_DESIGN.md](../docs/VERIPAKA_DESIGN.md) 为准，阶段与验收以 [IMPLEMENTATION_PHASES.md](../docs/IMPLEMENTATION_PHASES.md) 为准。保留原路径以避免历史引用失效。

基于 v1 的自审修订。删掉过度工程化，修正结构性问题，保留真正确定的部分。

---

## 一、定位（不变）

**Test Recipe Library + CLI。** 其他工具持久化测试结果，Veripaka 持久化测试方法。  
差异化：可管理、可搜索、跨项目可移植的 Recipe 语料库 + 预设 Profile 系统。

---

## 二、CLI Binary 命名

**`vp` 不可用**——`visual-primitives` 在同一生态已占用。

候选：`paka`（项目名直接派生，短，发音明确）。

本文后续用 `paka`，待最终确认。

---

## 三、目录结构（修订版）

```
<project-root>/.veripaka/
├── registry.yaml          # 用户意图：当前启用的 recipes + 激活的 profile。提交到 Git。
├── recipes/               # 项目本地 recipe 定义。提交到 Git。
│   └── <slug>.yaml
├── profiles/              # 用户自定义 profile（扩展内置）。提交到 Git。
│   └── <name>.yaml
├── state.json             # 运行时状态：上次运行摘要、baseline 引用。gitignore。
└── runs/                  # 执行历史，按时间戳目录。gitignore。
    └── <timestamp>/
        ├── results.json
        └── artifacts/

~/.veripaka/
├── recipes/               # 个人全局 recipe 库（跨项目复用）
└── profiles/              # 个人全局自定义 profile
```

**与 v1 的变化：**

- 删除 `recipes/index.json`。Recipe 数量达到需要索引的规模之前（>500），直接扫 YAML 足够。届时按需加入。
- 删除 `history.ndjson`。`runs/<timestamp>/` 已是完整审计链，双轨冗余。
- `registry.yaml` 和 `state.json` 职责切分明确：
  - `registry.yaml` = 声明式意图，由用户编辑，可提交，描述"应该跑什么"
  - `state.json` = 运行时事实，由 CLI 写入，gitignore，描述"跑了什么结果"
- `runs/` 和 `state.json` 都 gitignore，不污染仓库。团队共享的是 `registry.yaml` + `recipes/` + `profiles/`。

**`registry.yaml` 结构：**

```yaml
schema_version: 1
active_profile: frontend
recipes:
  - visual-regression-baseline
  - accessibility-wcag-aa
```

---

## 四、Recipe Schema v1（修订版）

**删除的字段：**
- `reliability_score`、`flaky_rate`：派生指标，只存在于 `state.json`，不在 recipe 定义里。写 recipe 时无法诚实填写这两个值。
- `applicable_when` 的规则评估引擎：实现成本远超收益，降级为 `hints`（纯显示字段，CLI 不解析）。

**Recipe ID 格式：** slug，从 `name` 派生（`visual-regression-baseline`），不用序号。序号在多人协作时产生全局计数冲突。

```yaml
schema_version: 1
id: visual-regression-baseline        # slug，全局唯一
name: Visual Regression — Baseline Compare
category: visual                       # visual | unit | integration | e2e | mock | contract | property-based
domains: [frontend, ui]
hints:                                 # 显示字段，帮助用户判断适用性。CLI 不做规则评估。
  - "适用于 src/components/ 有改动时"
  - "需要 visual-primitives >= 0.2"
cost:
  time_estimate_seconds: 30
  token_estimate: 0                    # 无 LLM，填 0
  dollar_estimate_usd: 0.00
determinism_tier: high                 # high | medium | low
evidence_shape: screenshot_diff        # shell_exit_code | file_exists | json_schema | screenshot_diff | llm_judge
dependencies:
  - name: visual-primitives
    version: ">=0.2.0"
execution:
  command: "vp compare --oracle {oracle_path} --candidate {candidate_path} --output {output_dir}"
  timeout_seconds: 60
  isolation: none                      # none | worktree | docker
                                       # 声明期望，CLI 当前仅记录和展示，不强制执行。
                                       # 隔离是 recipe 级关注点，不在 profile 层声明。
checks:
  - kind: file_exists
    path: "{output_dir}/diff.png"
  - kind: jq_path_min
    file: "{output_dir}/metrics.json"
    path: "$.similarity_score"
    min: 0.95
metadata:
  created_at: "2026-09-28T00:00:00Z"
  author: user
  tags: [visual, regression]
```

**关于 `isolation` 的诚实说明：** v1 把 `sandbox_tool` 放在 Profile 层是错的——同一 Profile 里某些 recipe 需要网络访问，逻辑立刻断裂。挪到 recipe 层声明，语义正确。当前阶段这是 hint，不是强制执行：CLI 启动时检查 isolation 要求，如果环境不满足就警告，但不阻止运行。未来可以据此做实际隔离。

---

## 五、Recipe 编写标准（精简版）

**强制：**
1. `id` 必须是 slug，在本地+全局库中唯一
2. `execution.command` 在声明的 `dependencies` 下必须可运行
3. `timeout_seconds` 必填
4. `cost.dollar_estimate_usd` 必填（LLM judge recipe 必须有数字，deterministic 填 0）
5. 每个 `check` 必须有可机器验证的断言，不接受 "LGTM" 式空验证

**推荐：**
- Idempotent：Recipe 执行不改变被测系统状态
- 依赖最小化：优先用项目已有工具

**反模式：**
- 硬编码绝对路径
- `llm_judge` 没有 deterministic fallback
- `determinism_tier: high` 但实际行为不稳定

---

## 六、Profile 系统（修订版）

### 内置 vs 用户定义的分层

**内置 Profile** 打包在 CLI binary 中，只读，随版本升级。用户无法直接修改，但可以 `extend`：

```bash
paka profile extend frontend my-frontend  # 创建用户 profile，继承 frontend 所有 recipe
```

**用户 Profile** 存在 `.veripaka/profiles/`（项目）或 `~/.veripaka/profiles/`（全局）。可提交、可分享。

这解决了 v1 的问题：升级 CLI 不会覆盖用户修改，内置 Profile 也不会因为 gitignore 策略而失去更新。

### Profile Schema v1

```yaml
schema_version: 1
name: my-frontend
extends: frontend                      # 可选：继承内置或其他用户 profile
description: "Frontend with stricter similarity threshold"
recipes:
  - id: visual-regression-baseline
    priority: P0                       # P0 = 阻塞，P1 = 警告，P2 = 信息
    trigger: on_commit                 # on_commit | on_pr | on_demand | nightly
  - id: accessibility-wcag-aa
    priority: P1
    trigger: on_pr
  - id: layout-consistency
    priority: P1
    trigger: on_commit
execution_strategy:
  mode: sequential                     # sequential | parallel
  max_parallel: 4                      # mode=parallel 时生效
  fail_fast: true                      # P0 失败立即停止
  cost_ceiling_usd: 5.00
```

**删除的字段：** `isolation.allow_network`、`isolation.sandbox_tool`。隔离在 recipe 层声明，不在 profile 层重复声明一个作用域更宽的规则。

### 内置 Profile 集合（3 个，内置在 binary）

**`frontend`**: visual-regression, accessibility-wcag-aa, layout-consistency, user-flow-smoke  
**`backend`**: unit-tests, integration-api, contract-tests  
**`debugging`**: flaky-triage, regression-bisect, log-analysis

---

## 七、持久化与状态管理（修订版）

### `state.json`（运行时，gitignore）

```json
{
  "schema_version": 1,
  "project_key": "myapp",
  "last_run": {
    "run_id": "20260928T123456",
    "run_number": 42,
    "timestamp": "2026-09-28T12:34:56Z",
    "verdict": "pass_with_risks",
    "total_cost_usd": 0.23,
    "delta": {
      "new": ["visual-regression-baseline"],
      "resolved": [],
      "regressed": [],
      "unchanged": ["accessibility-wcag-aa"]
    }
  },
  "baselines": {
    "visual-regression-baseline": {
      "captured_at": "2026-09-20T10:00:00Z",
      "artifact_path": "runs/20260920T100000/artifacts/baseline.png",
      "source_commit": "abc123"
    }
  },
  "recipe_stats": {
    "visual-regression-baseline": {
      "run_count": 42,
      "pass_count": 39,
      "flaky_count": 2,
      "last_flaky_at": "2026-09-25T08:00:00Z"
    }
  }
}
```

`recipe_stats` 里才是派生的可靠性数据，由 CLI 从 `runs/` 自动计算更新，不要求用户填写。

### Delta 运行

每次运行计算 `NEW / STILL_OPEN / RESOLVED / REGRESSED`，`REGRESSED` 排最前。这是从 verdict 借鉴的成熟模式，保留。

### Attribution 模型（重新设计）

v1 直接搬运 eval-harness 的 4-class attribution（`SKILL_CHANGED / FIXTURE_STALE / MODEL_CHANGED / UNKNOWN_DRIFT`），这是为 LLM 行为漂移设计的，对 Veripaka 的场景不适用。

Veripaka 的实际故障来源：

| Class | 触发条件 |
|---|---|
| `RECIPE_CHANGED` | recipe YAML 自上次运行后有 diff |
| `FIXTURE_CHANGED` | baseline 或 fixture 文件 hash 变化 |
| `ENV_CHANGED` | 依赖工具版本变化（检查 `dependencies[].version`） |
| `UNKNOWN` | 以上都不匹配 |

实现：`paka run` 在写入 `runs/<timestamp>/results.json` 时同时记录当时的 recipe hash、fixture hash、工具版本，下次运行时对比。

---

## 八、CLI 命令设计（修订版）

```bash
# 初始化
paka init                              # 创建 .veripaka/，交互选择初始 profile
paka init --profile backend           # 非交互，直接指定

# Recipe 管理
paka recipe search <query>            # 搜索（local + global + builtin）
paka recipe show <id>                 # 查看详情 + 历史统计
paka recipe add <file|id>             # 添加到当前项目
paka recipe remove <id>
paka recipe validate <file>           # schema 验证 + dependency 检查

# Profile 管理
paka profile list                     # 含内置 + 用户自定义
paka profile show <name>              # 展开所有 recipe
paka profile apply <name>             # 写入 registry.yaml
paka profile extend <base> <new>      # 从内置 profile 创建用户 profile

# 运行
paka run                              # 运行 registry.yaml 指定的当前 profile
paka run --recipe <id>                # 单跑
paka run --dry-run                    # 展示执行计划 + 成本估算，不运行
paka run --budget 2.00                # 覆盖 cost_ceiling_usd

# 报告
paka status                           # 最近一次运行的 delta 摘要
paka status --run <run-id>            # 指定历史运行
paka history                          # 运行历史列表
```

---

## 九、仍待真实场景决定的三个问题

这三个问题不从一次实际项目使用中观察，设计会走弯路，暂不给确定答案。

**1. 跨项目复用的实际颗粒度**

Visual baseline 是项目特定的，E2E flow 是项目特定的。跨项目真正可复用的可能只有：recipe schema 模板（不含具体路径和阈值）+ 工具调用模式。如果是这样，`~/.veripaka/recipes/` 全局库的优先级要重新评估——它可能只是个人的模板草稿库，而不是真正可直接 apply 的成品。

**2. Veripaka 作为 executor 的边界**

"轻量 executor + 委托工具"是暂定方向。实际使用中，agent 可能直接读取 recipe YAML 然后自己调工具，Veripaka 退化为纯 registry。这两条路的实现成本差距很大，在有人实际用 `paka run` 之前无法判断哪条更合理。

**3. Solo 还是 Team 是主要场景**

这决定哪条路先打磨：solo 优先则 `~/.veripaka/` + 快速 init 是核心；team 优先则 `registry.yaml` 可提交 + CI 集成是核心。目前两者设计上平行，但开发资源有限，应该在第一个真实用户出现时就做出取舍。

---

## 十、Phase 1 MVP 范围（收窄版）

比 v1 更保守，砍掉第一版不需要的东西：

**在 MVP 内（4 周）：**
- CLI 框架，binary 名 `paka`
- Recipe Schema v1 parser + validator
- `paka init`, `paka recipe add/show/validate`, `paka profile apply/show/list`
- `paka run --recipe` 单 recipe 执行（sequential only）
- `state.json` 写入（last_run + delta）
- 2 个 deterministic 内置 Recipe（基于 shell command，不依赖 visual-primitives）
- `frontend` + `backend` 两个内置 Profile

**不在 MVP 内：**
- `~/.veripaka/` 全局库（第一版只有项目本地）
- 并发执行
- Flaky detection（需要足够的运行历史）
- visual-primitives / cu 集成（Phase 2）
- `paka run`（整 profile 运行）——先验证单 recipe，再扩展到 profile 级别

这个范围可以在 2 周内交付一个可演示的核心流程，而不是 4 周后交付一个半成品的大系统。
