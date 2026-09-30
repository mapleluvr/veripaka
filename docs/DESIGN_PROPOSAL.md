# Veripaka 项目设计方案

> **DEPRECATED — 已封存，仅供历史追溯。** 本文不再维护，不作为实现或验收依据；其中的接口、路线、时间估计与产品主张可能已被撤销。当前设计以 [VERIPAKA_DESIGN.md](VERIPAKA_DESIGN.md) 为准，阶段与验收以 [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md) 为准。保留原路径以避免历史引用失效。

## 执行摘要

Veripaka 是一个基于 pi-coding-agent 的测试方法管理工具，定位为 **Agent-native Test Recipe Library + CLI**。根据调研结果，其核心差异化能力（可管理、可搜索、可移植的测试方法语料库 + 预设 Profile 系统）在 GitHub 上尚未被占领。

---

## 一、确定性设计（High Certainty）

### 1.1 CLI 文档目录结构

**原理依据**: 
- verdict 的 `.qa/` 双模式（solo `~/.claude/verdict/<repo>/` + team `<repo>/.qa/`）已被验证
- eval-harness 的 `baseline.json` + `runs/<ts>/` + `history.ndjson` 模式已在生产环境运行
- mythify 的 `.mythify/` 单目录设计简洁且可工作

**Veripaka 采用的结构**:

```
<project-root>/.veripaka/           # 项目本地状态（Team 模式，可提交）
├── recipes/                         # 测试方法定义（Recipe = Method）
│   ├── <recipe-id>.yaml            # 单个方法的元数据 + 脚本
│   └── index.json                  # 快速检索索引
├── profiles/                        # Profile 定义
│   ├── frontend.yaml
│   ├── backend.yaml
│   └── debugging.yaml
├── state.json                       # 当前活跃 Recipe 选择 + 应用历史
├── runs/                            # 执行历史（类似 eval-harness）
│   ├── <timestamp>/
│   │   ├── results.json            # 执行结果
│   │   ├── artifacts/              # 测试产物
│   │   └── transcript.log          # 执行日志
│   └── history.ndjson              # 流式历史记录
└── registry.yaml                    # 当前仓库启用的 Recipe + Profile

~/.veripaka/                         # 用户全局库（Solo 模式）
├── recipes/                         # 全局 Recipe 库
│   └── <recipe-id>.yaml
└── profiles/                        # 全局 Profile 库
    └── <profile-name>.yaml
```

**确定性理由**:
1. **双模式已被验证**: verdict 证明 solo/team 双模式可行，用户和团队各取所需
2. **可提交性**: `.veripaka/` 放在项目根，团队共享同一套 Recipe 和 Profile
3. **可移植性**: `~/.veripaka/` 存放个人积累，跨项目复用
4. **历史可审计**: `runs/` + `history.ndjson` 借鉴 eval-harness 的成熟模式
5. **快速检索**: `recipes/index.json` 避免每次搜索都扫描全部 YAML

---

### 1.2 Test Recipe 功能语义

**定义**: Test Recipe 是一个 **可执行、可组合、带元数据的测试方法单元**。

**核心属性（Recipe Schema v1）**:

```yaml
schema_version: 1
id: "frontend-visual-regression-001"
name: "Visual Regression Test with Baseline Comparison"
category: "visual"                    # 类别: visual | unit | integration | e2e | mock | contract | property-based | metamorphic
domains: ["frontend", "ui"]           # 适用领域
applicable_when:                      # 触发条件（声明式）
  - "changes detected in src/components/"
  - "changes detected in *.css"
cost:
  time_estimate_seconds: 30
  token_estimate: 5000                # 如果需要 LLM judge
  dollar_estimate_usd: 0.015
determinism_tier: "high"              # high | medium | low（参考 eval-harness）
evidence_shape: "screenshot_diff"     # shell_exit_code | file_exists | json_schema | screenshot_diff | llm_judge
dependencies:                         # 依赖的工具/环境
  - "visual-primitives"
  - "cu"
execution:
  command: "vp compare --oracle {oracle_path} --candidate {candidate_path} --output {output_path}"
  timeout_seconds: 60
  sandbox: true                       # 是否需要隔离环境
checks:                               # 验证条件（借鉴 eval-harness 的 6-kind checks）
  - kind: "file_exists"
    path: "{output_path}/diff.png"
  - kind: "jq_path_contains"
    file: "{output_path}/metrics.json"
    path: "$.similarity_score"
    expect_min: 0.95
metadata:
  created_at: "2026-09-28T00:00:00Z"
  author: "user"
  tags: ["visual", "regression", "frontend"]
  reliability_score: 0.92             # 基于历史执行计算
  flaky_rate: 0.03                    # 闪烁率
```

**Recipe 类型分类（借鉴 verdict 的 24-technique catalog）**:

1. **Deterministic Checks**（高可靠性）:
   - `unit`: 单元测试（pytest, jest）
   - `integration`: 集成测试
   - `contract`: 契约测试
   - `property-based`: 基于属性的测试

2. **Visual/UI Checks**（依赖 visual-primitives）:
   - `visual-regression`: 视觉回归
   - `accessibility`: 可访问性检查
   - `layout-consistency`: 布局一致性

3. **Behavioral Checks**（依赖 cu）:
   - `e2e-desktop`: 桌面端到端测试
   - `user-flow`: 用户流程模拟

4. **LLM-Judge Checks**（中等可靠性）:
   - `prose-output-review`: 散文输出评审
   - `metamorphic`: 变形测试（ML/LLM 输出）

**确定性理由**:
1. **Schema 继承成熟实践**: eval-harness 的 `case YAML` + verdict 的 24-technique catalog 提供了完整参考
2. **分层验证**: `execution.command` + `checks[]` 分离执行和验证，保持灵活性
3. **成本透明**: `cost` 字段借鉴 eval-harness 的 pricing 机制，避免失控的 LLM 成本
4. **可靠性分级**: `determinism_tier` + `reliability_score` 从历史数据计算，而非主观标签

---

### 1.3 Recipe 编写标准

**强制要求**:
1. **ID 唯一性**: `id` 必须全局唯一（格式: `<category>-<type>-<number>`）
2. **可执行性**: `execution.command` 必须在声明的 `dependencies` 下可运行
3. **证据约束**: 每个 `check` 必须有明确的 `evidence_shape`，杜绝 "LGTM" 式的空洞验证
4. **成本上限**: `cost.dollar_estimate_usd` 必须填写，防止无意识的高成本 Recipe
5. **Timeout 保护**: `execution.timeout_seconds` 必填，避免挂起

**推荐实践**:
1. **最小化依赖**: 优先使用项目已有的工具，避免引入新依赖
2. **幂等性**: Recipe 执行不应改变被测系统状态（只读原则，借鉴 verdict）
3. **Fixture 管理**: 测试数据应放在 `<project>/.veripaka/fixtures/<recipe-id>/`
4. **版本控制**: Recipe Schema 采用 `schema_version` 字段，保持向后兼容

**反模式（Anti-patterns）**:
- ❌ 在 `execution.command` 中硬编码路径
- ❌ 依赖外部服务而不声明 `applicable_when` 的环境约束
- ❌ 使用 `llm_judge` 而不提供 fallback 的 deterministic check
- ❌ 忽略 `flaky_rate`，将不稳定的 Recipe 标记为 high determinism

---

## 二、建议方案（Medium Certainty）

### 2.1 Profile 系统设计

**Profile 是什么**: 一组 Recipe 的 **预设组合 + 执行策略**。

**Profile Schema v1**:

```yaml
schema_version: 1
name: "frontend"
description: "Frontend visual and interaction testing profile"
recipes:                              # 包含的 Recipe（按优先级排序）
  - id: "visual-regression-001"
    priority: "P0"                    # P0 = 阻塞发布，P1 = 警告，P2 = 信息
    trigger: "on_commit"              # on_commit | on_pr | on_demand | nightly
  - id: "accessibility-check-001"
    priority: "P1"
    trigger: "on_pr"
  - id: "layout-consistency-001"
    priority: "P1"
    trigger: "on_commit"
execution_strategy:
  mode: "sequential"                  # sequential | parallel | 2tier（借鉴 eval-harness）
  max_parallel: 4
  fail_fast: true                     # P0 失败立即停止
  cost_ceiling_usd: 5.00              # 单次运行成本上限
isolation:                            # 隔离规则（借鉴 verdict）
  allow_network: false
  allow_filesystem_write: false
  sandbox_tool: "worktree"            # worktree | docker | none
```

**预设 Profile 集合**:

1. **`frontend.yaml`**:
   - Visual regression（visual-primitives）
   - Accessibility checks（WCAG AA）
   - Layout consistency
   - User flow simulation（cu）

2. **`backend.yaml`**:
   - Unit tests（pytest/jest）
   - Integration tests（API contract）
   - Property-based tests
   - Mutation testing（参考 Agent-Verification-Skills）

3. **`debugging.yaml`**:
   - Root cause analysis（verdict 的 4-link chain）
   - Flaky test triage（3-sample stability check）
   - Log analysis
   - Memory leak detection

**Profile 应用机制**:

```bash
# 应用 Profile
vp profile apply frontend

# 查看当前 Profile
vp profile show

# 自定义 Profile（合并已有 Profile）
vp profile create my-profile --base frontend --add-recipe visual-regression-002
```

---

### 2.2 CLI 命令设计

**核心命令集**:

```bash
# Recipe 管理
vp recipe search <query>              # 搜索 Recipe（local + global）
vp recipe show <recipe-id>            # 查看 Recipe 详情
vp recipe add <recipe-file>           # 添加 Recipe 到项目
vp recipe remove <recipe-id>          # 从项目移除 Recipe
vp recipe run <recipe-id>             # 单独运行某个 Recipe
vp recipe validate <recipe-file>      # 验证 Recipe 格式

# Profile 管理
vp profile list                       # 列出可用 Profile
vp profile show <profile-name>        # 查看 Profile 详情
vp profile apply <profile-name>       # 应用 Profile
vp profile create <name> [--base <profile>] [--add-recipe <id>]

# 执行与报告
vp run [--profile <name>]             # 运行当前 Profile 的所有 Recipe
vp run --recipe <id>                  # 运行单个 Recipe
vp run --dry-run                      # 预览执行计划（不实际运行）
vp status                             # 查看最近一次运行状态
vp history                            # 查看运行历史
vp report <run-id>                    # 查看详细报告

# 初始化与配置
vp init                               # 初始化项目（创建 .veripaka/）
vp init --mode solo                   # 仅创建全局库
vp config set <key> <value>           # 配置项设置
vp config get <key>                   # 查看配置
```

**示例工作流**:

```bash
# 1. 初始化项目
vp init

# 2. 搜索并添加 Recipe
vp recipe search "visual regression"
vp recipe add visual-regression-001

# 3. 应用预设 Profile
vp profile apply frontend

# 4. 运行测试
vp run

# 5. 查看报告
vp status
```

---

### 2.3 Recipe 搜索与索引

**搜索维度**:
1. **文本搜索**: `name`, `description`, `tags`
2. **分类筛选**: `category`, `domains`
3. **适用性匹配**: `applicable_when` 规则匹配当前项目状态
4. **成本筛选**: `cost.dollar_estimate_usd` 范围
5. **可靠性筛选**: `reliability_score` 阈值

**索引结构（`recipes/index.json`）**:

```json
{
  "version": 1,
  "last_updated": "2026-09-28T00:00:00Z",
  "recipes": [
    {
      "id": "visual-regression-001",
      "name": "Visual Regression Test",
      "category": "visual",
      "domains": ["frontend", "ui"],
      "tags": ["visual", "regression"],
      "cost_usd": 0.015,
      "determinism_tier": "high",
      "reliability_score": 0.92
    }
  ]
}
```

**搜索实现**:
- 快速路径: 先查 `index.json`（O(1) 分类筛选 + 文本前缀匹配）
- 精确路径: 需要时加载完整 YAML 进行 `applicable_when` 规则评估

---

### 2.4 持久化与状态管理

**借鉴 verdict + eval-harness 的最佳实践**:

1. **`state.json` 结构**:

```json
{
  "schema_version": 1,
  "project_key": "myapp",
  "active_profile": "frontend",
  "active_recipes": ["visual-regression-001", "accessibility-check-001"],
  "last_run": {
    "run_id": "2026-09-28T12-34-56",
    "run_number": 42,
    "timestamp": "2026-09-28T12:34:56Z",
    "verdict": "pass_with_risks",
    "total_cost_usd": 0.23
  },
  "baselines": {
    "visual-regression-001": {
      "baseline_sha": "abc123",
      "baseline_path": "runs/2026-09-20T10-00-00/artifacts/baseline.png"
    }
  }
}
```

2. **Delta 运行机制**（借鉴 verdict）:
   - 每次运行计算 `NEW / STILL_OPEN / RESOLVED / REGRESSED`
   - REGRESSED 自动排在最前
   - Baseline 存储在 `runs/<timestamp>/artifacts/`

3. **Flaky 处理**（借鉴 eval-harness）:
   - 3-sample byte-identical stability check
   - Quarantine with **mandatory expiry**
   - Flaky tests excluded from verdict

---

### 2.5 集成点设计

**与现有工具的集成**:

1. **visual-primitives**:
   - Recipe 类型: `visual-regression`, `screenshot-compare`
   - 命令封装: `vp compare` → Recipe YAML

2. **cu (Computer Use CLI)**:
   - Recipe 类型: `e2e-desktop`, `user-flow`
   - 命令封装: `cu observe` + `cu execute` → Recipe YAML

3. **twcu (Batched Visual Tests, WIP)**:
   - Veripaka 提供 Recipe 库
   - twcu 提供批量执行引擎
   - 通过 `execution.command` 调用 twcu

**集成策略**:
- Veripaka 是 **编排层**，不重新实现工具
- 依赖声明在 Recipe 的 `dependencies` 字段
- 工具不可用时，Recipe 自动标记为 `blocked`（借鉴 verdict）

---

## 三、待决策事项（Low Certainty）

### 3.1 执行模式选择

**选项 A: Veripaka 自己执行**
- ✅ 可控性强，能实现 concurrency + cost gating + isolation
- ❌ 需要维护执行引擎，复杂度高

**选项 B: 仅作为 Registry，调用外部工具**
- ✅ 轻量，专注于 Recipe 管理
- ❌ 无法保证跨工具的一致性体验

**建议**: **Hybrid 模式**
- Veripaka 提供轻量执行器（支持 shell command + flock 并发控制）
- 复杂执行委托给专门工具（twcu, cu）
- 通过 `execution.sandbox` 字段声明隔离需求

---

### 3.2 与 Agent Skills 的关系

**问题**: Veripaka 应该暴露为 Agent Skill 吗？

**方案 A: CLI-first，Skill 作为包装**
- CLI: `vp run`
- Skill: `skills/veripaka/SKILL.md` 包装 CLI 调用
- Agent 通过 Skill 触发 Veripaka

**方案 B: Skill-native，CLI 作为辅助**
- Skill: `skills/veripaka-frontend/SKILL.md`
- CLI: 管理 Recipe 库，不执行测试
- Agent 直接读取 Recipe 并执行

**建议**: **方案 A（CLI-first）**
- 借鉴 verdict 和 eval-harness 的成功模式
- Skill 作为 "doctrine for agents that cannot run the agent"
- CLI 保持独立性，可在 CI/nightly 等非 Agent 场景使用

---

### 3.3 Recipe 共享与分发

**问题**: Recipe 如何在项目间/用户间共享？

**候选方案**:
1. **Git-based Registry**: GitHub repo 作为 Recipe 仓库
2. **npm-style Package**: `npx veripaka add <recipe-package>`
3. **Built-in Catalog**: Veripaka 内置精选 Recipe 集合

**建议**: **三层架构**
- **Layer 1**: 内置 Catalog（10-20 个高质量 Recipe）
- **Layer 2**: 用户全局库（`~/.veripaka/recipes/`）
- **Layer 3**: 项目本地库（`<project>/.veripaka/recipes/`）
- 未来扩展: Git-based Registry（类似 skills.sh）

---

### 3.4 LLM Judge 的使用边界

**争议点**: Recipe 中的 `llm_judge` 可靠性中等，何时使用？

**借鉴 eval-harness 的经验**:
- `llm_judge` 返回 `verdict: null` 当 API key 缺失
- 3-sample majority voting
- 必须有 deterministic check 作为 fallback

**Veripaka 的策略**:
1. **优先级**: Deterministic checks > LLM judge
2. **透明性**: `llm_judge` 结果必须显示 confidence + 3 samples
3. **成本控制**: LLM judge 的 Recipe 必须声明 `cost.token_estimate`
4. **可选性**: 用户可通过 `--no-llm-judge` 跳过 LLM-based checks

---

## 四、技术债务与风险

### 4.1 已知风险

1. **Recipe 可靠性漂移**: 
   - Recipe 的 `reliability_score` 需要从历史运行动态计算
   - 风险: 新 Recipe 没有历史数据，评分不准
   - 缓解: 新 Recipe 默认标记为 "unproven"，需要 N 次运行后才计算评分

2. **依赖工具版本**: 
   - Recipe 依赖 `visual-primitives`, `cu`, `twcu`，版本不兼容时会失败
   - 缓解: Recipe Schema 添加 `dependencies[].version` 字段

3. **成本失控**:
   - LLM-based Recipe 可能导致成本超支
   - 缓解: `cost_ceiling_usd` + 运行前成本预估 + 确认机制

### 4.2 避免的陷阱（从调研中学到的）

1. **不要重新发明 self-test**:
   - 自我验证已被 `oh-my-agent` (1327★) + `verdict` (2★) 占领
   - Veripaka 应 **消费** 这些机制，而非重新实现

2. **不要忽略 Flaky 处理**:
   - eval-harness 和 verdict 都有强制 expiry 的 quarantine 机制
   - Veripaka 必须从 Day 1 支持 Flaky 隔离

3. **不要让 Profile 变成空文档**:
   - 典型 `qa-expert.md` 的失败在于只有散文，没有可执行内容
   - Veripaka 的 Profile 必须是 **可执行的 Recipe 集合**，而非指导原则

---

## 五、实施路线图

### Phase 1: MVP（4 周）

**目标**: 证明核心概念可行

1. **Week 1**: CLI 框架 + Recipe Schema v1
   - `vp init`, `vp recipe add`, `vp recipe show`
   - Recipe YAML parser + validator
   - 实现 1-2 个 deterministic Recipe（基于 shell command）

2. **Week 2**: 执行引擎 + State 管理
   - `vp run --recipe <id>`
   - `state.json` 持久化
   - Baseline 机制

3. **Week 3**: Profile 系统
   - `frontend.yaml`, `backend.yaml` 预设 Profile
   - `vp profile apply`
   - Sequential execution mode

4. **Week 4**: 集成 visual-primitives
   - Visual regression Recipe
   - Screenshot comparison
   - 端到端演示

**交付物**:
- 可工作的 CLI（10 个命令）
- 5 个内置 Recipe
- 2 个预设 Profile
- 演示视频

---

### Phase 2: Production-Ready（8 周）

1. **Concurrency & Isolation**（2 周）:
   - Parallel execution mode
   - Worktree isolation（借鉴 parallax）
   - flock 并发控制（借鉴 eval-harness）

2. **Delta & Attribution**（2 周）:
   - Delta run（NEW/RESOLVED/REGRESSED）
   - 4-class attribution（SKILL_CHANGED, FIXTURE_STALE, MODEL_CHANGED, UNKNOWN_DRIFT）
   - Flaky detection + quarantine

3. **LLM Judge Integration**（2 周）:
   - Anthropic API 集成
   - 3-sample majority voting
   - Cost tracking

4. **CI/CD Integration**（2 周）:
   - `vp gate` 命令（类似 verdict-gate）
   - GitHub Action
   - 报告生成（Markdown + SARIF）

---

### Phase 3: Ecosystem（12 周+）

1. **twcu Integration**: 批量视觉测试
2. **cu Integration**: Computer Use E2E
3. **Recipe Marketplace**: Git-based Registry
4. **Agent Skill**: `skills/veripaka/SKILL.md`
5. **MCP Server**: `veripaka-mcp`（只读访问 Recipe 库）

---

## 六、成功指标

### 技术指标

1. **Recipe 库规模**: 
   - MVP: 5 个内置 Recipe
   - 6 个月: 50 个 Recipe（内置 + 社区）

2. **可靠性**: 
   - Deterministic Recipe: >95% pass rate
   - LLM Judge Recipe: >85% agreement with human review

3. **性能**:
   - Recipe 搜索: <100ms（10000 Recipe 规模）
   - Sequential run: <2min（10 个 Recipe）
   - Parallel run: <30s（10 个 Recipe, 4 并发）

### 用户指标

1. **采用率**: 10 个项目在使用 Veripaka（6 个月内）
2. **Profile 覆盖**: 80% 的项目使用预设 Profile
3. **Recipe 复用**: 平均每个项目使用 5+ 个跨项目 Recipe

---

## 七、与竞品的差异化

| 维度 | Veripaka | verdict | eval-harness | mythify |
|------|----------|---------|--------------|---------|
| **核心定位** | Test Recipe Library | QA Agent | Behavior Regression Harness | Verify-gated Loop |
| **Recipe 管理** | ✅ 可搜索、可移植 | ❌ 24-technique catalog（静态文档） | ❌ Check kinds（硬编码） | ❌ Verify command（内联） |
| **Profile 系统** | ✅ Frontend/Backend/Debugging | ❌ 无 | ❌ 无 | ❌ 无 |
| **跨项目复用** | ✅ Global + Project 双层库 | ⚠️ Solo/Team 双模式（仅状态） | ❌ Per-skill | ❌ Per-project |
| **可扩展性** | ✅ Recipe YAML + Plugin 机制 | ⚠️ Skill + MCP | ⚠️ Bash + jq | ⚠️ MCP fanout |
| **独立性** | ✅ CLI-first, Agent-optional | ⚠️ Claude Code plugin 为主 | ✅ Bash script | ✅ Python CLI |

**Veripaka 的独特价值**:
1. **可管理的方法库**: 其他工具持久化结果，Veripaka 持久化方法
2. **预设 Profile**: 开箱即用的领域最佳实践
3. **跨项目积累**: 个人/团队的测试方法资产可移植
4. **工具编排**: 不重新发明轮子，而是整合 visual-primitives + cu + twcu

---

## 八、开放问题

1. **Recipe 版本管理**: Recipe Schema 升级时，旧 Recipe 如何迁移？
2. **Recipe 冲突**: 两个 Recipe 依赖同一工具的不同版本，如何处理？
3. **Recipe 安全**: 用户添加的 Recipe 执行任意代码，如何沙箱化？
4. **Recipe 质量门禁**: 如何防止低质量 Recipe 进入全局库？
5. **Recipe 授权**: Recipe 是否需要许可证声明？MIT vs Custom？

---

## 结论

Veripaka 的核心差异化（Test Recipe Library + Profile System）在市场上是真空地带。通过借鉴 verdict, eval-harness, mythify 的成熟机制，并专注于 **方法的管理、搜索、移植**，Veripaka 有机会成为 Agent 测试领域的 "Awesome List"——不仅仅是一个清单，而是可执行、可验证、可复用的方法库。

**下一步**: 确认 Phase 1 MVP 的优先级，启动 CLI 框架开发。
