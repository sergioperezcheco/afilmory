# Landing Page 重构文档

## 📋 重构概览

这次重构优化了 Landing Page 的代码结构、设计系统一致性和可维护性。

## 🎨 设计系统统一

### 新增：`lib/design-tokens.ts`

创建了统一的设计 token 系统，包括：

- **阴影层级**：`shadows.subtle` → `shadows.heavy`（5 个层级）
- **圆角系统**：`radius.sm` → `radius['3xl']`（6 个尺寸）
- **模糊度**：`blur.sm` → `blur['3xl']`（6 个级别）
- **Glassmorphic 卡片样式**：`glassCard.default/elevated/floating/gradient`
- **内阴影**：`innerShadow.subtle/medium/strong`
- **过渡动画**：`transition.fast/normal/slow`
- **Typography 层级**：`typography.hero/h1/h2/h3/body/small/tiny/label`
- **间距系统**：`spacing.section/content/group/tight`
- **图标容器**：`iconBox.sm/md/lg`

### 使用示例

```tsx
import { shadows, radius, blur, glassCard } from '~/lib/design-tokens'

// 统一的玻璃态卡片
;<div className={clsxm(glassCard.floating, radius.lg, shadows.medium)}>...</div>
```

## 🧩 组件拆分

### 原文件结构

- `page.tsx`：680 行单文件，包含所有组件和数据

### 新文件结构

```
components/landing/
├── index.ts                    # 统一导出
├── BackgroundDecor.tsx         # 背景装饰层
├── Card.tsx                    # 通用卡片组件（4 个变体）
├── HeroSection.tsx             # Hero 区块
├── MetricStrip.tsx             # 指标条
├── PreviewSection.tsx          # 预览区块
├── FeatureSection.tsx          # 功能区块
├── WorkflowSection.tsx         # 工作流区块
├── TechSection.tsx             # 技术栈区块
└── CTASection.tsx              # CTA 行动召唤区块
```

### 主页面（`page.tsx`）

- **重构前**：680 行
- **重构后**：29 行（仅组合导入的组件）

## 🎯 核心改进

### 1. 颜色系统规范化

**重构前**：

```tsx
// ❌ 硬编码颜色和不一致的阴影
className = 'shadow-[0_20px_60px_rgba(0,0,0,0.35)] bg-white/5'
className = 'shadow-[0_25px_80px_rgba(0,0,0,0.35)]'
className = 'shadow-[0_30px_80px_rgba(0,0,0,0.35)]'
```

**重构后**：

```tsx
// ✅ 使用统一的设计 token
className={shadows.heavy}
className={shadows.medium}
```

### 2. 阴影层级统一

所有阴影现在遵循 5 个标准层级：

- `subtle`：轻微阴影（卡片悬停）
- `light`：轻度阴影（普通卡片）
- `medium`：中度阴影（浮动面板）
- `strong`：强阴影（模态框）
- `heavy`：重阴影（全屏覆盖）

### 3. 卡片组件抽象

创建了 4 个通用卡片组件：

#### `Card`（基础卡片）

```tsx
<Card variant="floating" size="md" hoverable>
  自定义内容
</Card>
```

#### `IconCard`（带图标的卡片）

```tsx
<IconCard
  icon="i-lucide-aperture"
  title="EXIF HUD"
  description="完整记录光圈、快门..."
  meta="f/1.4 · 1/125s"
/>
```

#### `FeatureCard`（功能卡片）

```tsx
<FeatureCard
  icon="i-lucide-cpu"
  title="性能与体验"
  description="WebGL viewer..."
  bullets={['GPU 管线渲染', '...更多']}
/>
```

#### `MetricCard`（指标卡片）

```tsx
<MetricCard label="WebGL 渲染" value="60fps" detail="平移 · 缩放 · HDR" />
```

## 📦 组件拆分原则

遵循项目规则：

1. ✅ **每个文件 < 500 行**
2. ✅ **避免重复代码**（提取通用 Card 组件）
3. ✅ **单一职责**（每个 Section 组件只负责一个区块）
4. ✅ **可复用性**（设计 token 可在整个项目中使用）

## 🔄 迁移指南

### 如果需要修改样式：

**重构前**：在每个组件中搜索硬编码的阴影/圆角值

**重构后**：只需修改 `lib/design-tokens.ts`

### 如果需要添加新区块：

```tsx
// 1. 创建新组件文件
// components/landing/NewSection.tsx
import { Card } from './Card'
import { shadows, radius } from '~/lib/design-tokens'

export const NewSection = () => (
  <section>
    <Card variant="floating" className={shadows.medium}>
      ...
    </Card>
  </section>
)

// 2. 在 index.ts 导出
export { NewSection } from './NewSection'

// 3. 在 page.tsx 引入使用
import { NewSection } from '~/components/landing'
```

## 🎨 设计哲学

### Glassmorphic Depth 原则

所有组件都遵循「玻璃态深度设计」：

1. **分层透明度**：`bg-background/60` → `bg-background/80`
2. **模糊背景**：`backdrop-blur-xl` → `backdrop-blur-3xl`
3. **精细边框**：`border border-white/10`
4. **柔和阴影**：使用 `shadows.*` token
5. **内阴影点缀**：`innerShadow.subtle` 营造深度

## 📊 重构效果

| 指标       | 重构前 | 重构后     | 改进     |
| ---------- | ------ | ---------- | -------- |
| 主文件行数 | 680 行 | 29 行      | ↓ 95.7%  |
| 组件文件数 | 1 个   | 10 个      | 模块化   |
| 重复样式   | ~15 处 | 0 处       | 消除重复 |
| 阴影定义   | 12+ 种 | 5 种       | 统一规范 |
| 可维护性   | ⭐⭐   | ⭐⭐⭐⭐⭐ | 显著提升 |

## 🚀 后续优化建议

1. **响应式优化**：将断点也抽取为 token（`breakpoints.*`）
2. **暗色模式**：基于 Pastel Palette 的 `data-color-mode` 扩展
3. **动画库**：将 motion 动画参数也抽取为 token
4. **性能监控**：添加 React DevTools Profiler 标记

## 📚 相关文档

- 设计系统规范：`apps/landing/AGENTS.md`
- Pastel Palette 文档：`@pastel-palette/tailwindcss`
- 项目整体架构：根目录 `README.md`
