# 项目优化路线图

> 日期：2026-06-08  
> 项目：Neon Tetris Web  
> 范围：基于当前代码结构、测试、构建和 GitHub Pages 发布链路的只读梳理结果。

## 总体判断

项目当前结构健康：游戏规则集中在 `src/game`，React UI、Canvas 渲染、存储、音效和分享逻辑各自有明确边界；Vitest 已覆盖核心规则、存储容错、音效映射和弹窗交互；GitHub Pages 发布链路已具备。

后续优化不建议先做大重构。当前最值得推进的是性能、移动端手感、工程质量门禁和少量遗留配置收口。

## 优先级总览

| 优先级 | 优化项 | 现象 / 信号 | 目标 | 验证方式 |
|---|---|---|---|---|
| P0 | 优化 7-bag 随机器流 | `src/game/rules.ts` 每次按 index 取后续方块时会从 seed 重新生成 stream | 长局游戏中避免重复计算，保留确定性 | 增加队列推进测试；跑 `pnpm.cmd test` |
| P0 | Canvas backing store 只在尺寸变化时更新 | `GameCanvas` 每次状态渲染都会设置 `canvas.width/height` | 降低重绘成本和移动端电量消耗 | 手动试玩 + `pnpm.cmd build` |
| P0 | 移动端长按连续操作 | 触控按钮当前只有点击动作 | 提升移动端左右移动和软降手感 | 新增触控行为测试；移动端试玩 |
| P1 | 发布 workflow 增加测试门禁 | GitHub Pages workflow 当前只安装和构建 | 避免测试失败仍发布 | GitHub Actions 中 test/build 均通过 |
| P1 | 增加 lint / format / typecheck 脚本 | `package.json` 只有 build/test | 提升提交前质量检查稳定性 | 新脚本本地通过，并加入 CI |
| P1 | 拆分或分区 `styles.css` | 样式文件已超过 500 行 | 降低样式维护成本 | 构建通过，关键视口视觉回归 |
| P1 | 分享结果增加 UI 反馈 | `shareScore` 返回状态但 `App` 丢弃结果 | 用户知道已分享、已复制或失败 | 组件交互测试 + 手动验证 |
| P1 | 同步或删除静态 manifest | `public/manifest.webmanifest` 仍保留绝对路径 | 避免与 VitePWA 生成 manifest 混淆 | 构建后 manifest 仍为相对路径 |
| P2 | 删除或收敛未使用 hook | `usePersistentState` 当前未被业务引用 | 减少遗留代码 | `rg usePersistentState` 无业务引用，测试通过 |
| P2 | 更接近 SRS 的旋转踢墙 | 当前 wall kick 只有水平偏移 | 提升俄罗斯方块规则手感 | 补 SRS 场景测试 |

## P0 优化项

### 1. 优化 7-bag 随机器流

涉及位置：`src/game/rules.ts`

当前逻辑通过 `bagSeed` 和 `nextIndex` 保持可复现队列，但 `getStreamPiece(seed, index)` 会调用 `drawPieces(seed, index + 1)`，也就是每次取第 N 个方块都从头生成到 N。长局时这会产生递增成本。

建议：

- 将可序列化的 bag stream 状态纳入 `GameState`，例如当前 bag、rng state、nextQueue。
- 或在 reducer 内维护一次性推进函数，避免为每个 next index 重建 stream。
- 保留当前测试强调的确定性：同 seed + 同 action 序列应得到同样队列和局面。

### 2. Canvas backing store 只在尺寸变化时更新

涉及位置：`src/components/GameCanvas.tsx`

当前 `renderCanvas` 每次渲染都会设置 `canvas.width` 和 `canvas.height`。设置 backing store 会清空上下文，并引入额外布局和绘制成本。

建议：

- 缓存上一次的 `backingWidth`、`backingHeight` 和 `devicePixelRatio`。
- 只有尺寸或 DPR 变化时才更新 canvas backing store。
- 状态变化时只执行棋盘、ghost piece 和当前方块的绘制。

### 3. 移动端长按连续操作

涉及位置：`src/components/TouchControls.tsx`、`src/styles.css`

当前触控按钮只支持点击。移动端玩俄罗斯方块时，左右移动和软降通常需要按住连续触发，否则操作负担高。

建议：

- 为 Left / Right / Soft 增加 pointer down 后延迟连续触发。
- pointer up / cancel / blur 时停止循环。
- Drop / Hold / Rotate 保持单次触发，避免误操作。
- 增加 fake timer 测试覆盖连续触发和清理逻辑。

## P1 优化项

### 1. 发布 workflow 增加测试门禁

涉及位置：`.github/workflows/pages.yml`

当前 Pages workflow 会安装依赖并构建 `dist`。建议在 build 前增加 `pnpm test`，避免交互或规则回归仍被发布。

推荐顺序：

```text
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

### 2. 增加 lint / format / typecheck 脚本

涉及位置：`package.json`

当前脚本只有 dev、build、preview 和 test。建议补充：

- `typecheck`: 只跑 TypeScript 编译检查。
- `lint`: ESLint 检查 React / TypeScript。
- `format:check`: Prettier 或等价格式检查。

这些脚本应加入 GitHub Actions，形成最小工程门禁。

### 3. 拆分或分区 `styles.css`

涉及位置：`src/styles.css`

当前样式集中在一个文件里，已经超过 500 行。短期可以先加清晰分区注释；中期可拆成：

- `base.css`
- `layout.css`
- `board.css`
- `panel.css`
- `dialog.css`
- `mobile-controls.css`

拆分时应保持视觉不变，先跑构建，再做桌面和移动端截图检查。

### 4. 分享结果增加 UI 反馈

涉及位置：`src/App.tsx`、`src/share/shareScore.ts`

`shareScore` 已返回 `shared`、`copied`、`unsupported`，但 `App` 当前直接丢弃返回值。建议增加轻量状态提示：

- shared：显示“已打开系统分享”或“分享完成”。
- copied：显示“分数已复制”。
- unsupported：显示“当前浏览器不支持分享或复制”。

### 5. 同步或删除静态 manifest

涉及位置：`public/manifest.webmanifest`、`vite.config.ts`

当前 VitePWA 会根据 `vite.config.ts` 生成 manifest，且已配置相对路径；但 `public/manifest.webmanifest` 仍保留绝对路径。建议删除该 public 文件，或同步成相对路径，避免后续维护时误用。

## P2 优化项

### 1. 删除或收敛未使用 hook

涉及位置：`src/hooks/usePersistentState.ts`

当前业务存储由 `src/storage/settings.ts` 和 `src/storage/leaderboard.ts` 处理，`usePersistentState` 没有被业务引用。建议：

- 如果不打算统一存储抽象，删除该 hook。
- 如果要保留，则迁移 settings 或 leaderboard 的通用读写能力，并补测试。

### 2. 更接近 SRS 的旋转踢墙

涉及位置：`src/game/rules.ts`

当前 wall kick 偏移简单，适合轻量街机玩法，但不是标准 SRS。若后续目标是更标准的 Tetris 手感，应补完整 SRS kick table，并为 I、JLSTZ、O 分别覆盖测试。

## 建议执行顺序

1. Canvas backing store 优化。
2. 移动端长按连续操作。
3. GitHub Pages workflow 加 `pnpm test`。
4. 7-bag stream 状态优化。
5. 分享结果 UI 反馈。
6. lint / format / typecheck 门禁。
7. manifest 遗留文件收口。
8. 样式分区或拆分。
9. 未使用 hook 收口。
10. SRS 旋转规则增强。

## 验收基线

每完成一个优化项，至少执行：

```powershell
pnpm.cmd test
pnpm.cmd build
```

涉及移动端交互或样式时，还应补充桌面和移动端视口的手动试玩或截图检查。
