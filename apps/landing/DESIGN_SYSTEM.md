# 设计系统使用指南

## 🎨 颜色系统

### Pastel Palette Token（自动适配暗色模式）

```tsx
// ✅ 推荐：使用语义化 token
bg - background // 主背景
bg - background - secondary // 次级背景
bg - fill // 填充色
bg - fill - secondary // 次级填充
bg - material - medium // 材质：中等透明度
bg - accent // 强调色

text - text // 主文本
text - text - secondary // 次级文本
text - text - tertiary // 三级文本（最淡）

border - border // 边框色
```

### 自定义 Accent 混合色

```tsx
// 10% ~ 80% 的 accent 混合色
bg-accent-10   // 极淡强调色背景
bg-accent-20
bg-accent-30
...
bg-accent-80   // 强烈强调色
```

### ❌ 避免硬编码

```tsx
// ❌ 不要这样
className = 'bg-blue-500 text-white shadow-xl'

// ✅ 应该这样
className = 'bg-accent text-background shadow-medium'
```

## 📐 阴影系统

从 `lib/design-tokens.ts` 导入统一阴影：

```tsx
import { shadows } from '~/lib/design-tokens'

// 5 个标准层级
shadows.subtle // 轻微阴影 - 用于悬停效果
shadows.light // 轻度阴影 - 普通卡片
shadows.medium // 中度阴影 - 浮动面板
shadows.strong // 强阴影   - 模态框
shadows.heavy // 重阴影   - 全屏/Hero
```

### 使用示例

```tsx
// 普通卡片
<div className={clsxm('bg-background', shadows.light)}>...</div>

// 浮动面板
<div className={clsxm('bg-background/80 backdrop-blur-xl', shadows.medium)}>
  ...
</div>

// Hero 区块
<div className={shadows.heavy}>...</div>
```

## 🔲 圆角系统

```tsx
import { radius } from '~/lib/design-tokens'

radius.sm // rounded-xl (12px)   - 小元素
radius.md // rounded-2xl (16px)  - 按钮、输入框
radius.lg // rounded-3xl (24px)  - 卡片
radius.xl // rounded-[28px]      - 大卡片
radius['2xl'] // rounded-[32px]     - Section 容器
radius['3xl'] // rounded-[40px]     - Hero 级别
```

## 💨 模糊度系统

```tsx
import { blur } from '~/lib/design-tokens'

blur.sm // backdrop-blur-sm (4px)
blur.md // backdrop-blur-md (12px)
blur.lg // backdrop-blur-lg (16px)
blur.xl // backdrop-blur-xl (24px)
blur['2xl'] // backdrop-blur-2xl (40px)
blur['3xl'] // backdrop-blur-[60px]
```

## 🎴 Glassmorphic 卡片

### 预设变体

```tsx
import { glassCard } from '~/lib/design-tokens'

// 4 种预设风格
glassCard.default // bg-background/60 + border + backdrop-blur-xl
glassCard.elevated // bg-background/80 + backdrop-blur-2xl (更实)
glassCard.floating // bg-background/50 + backdrop-blur-[30px] (更透)
glassCard.gradient // border-white/15 + backdrop-blur-2xl (配合渐变)
```

### 组合使用

```tsx
import { glassCard, radius, shadows } from '~/lib/design-tokens'

;<div className={clsxm(glassCard.floating, radius.lg, shadows.medium, 'p-6')}>
  内容
</div>
```

## 📏 Typography

```tsx
import { typography } from '~/lib/design-tokens'

typography.hero // text-4xl sm:text-5xl lg:text-6xl font-semibold
typography.h1 // text-3xl lg:text-4xl font-semibold
typography.h2 // text-2xl lg:text-3xl font-semibold
typography.h3 // text-xl lg:text-2xl font-semibold
typography.body // text-base
typography.small // text-sm
typography.tiny // text-xs
typography.label // text-xs tracking-[0.3em] uppercase font-semibold
```

### 使用示例

```tsx
<h1 className={clsxm(typography.hero, 'text-white')}>
  标题文字
</h1>

<p className={clsxm(typography.label, 'text-text-secondary')}>
  Section Label
</p>
```

## 📦 间距系统

```tsx
import { spacing } from '~/lib/design-tokens'

spacing.section // space-y-20  - Section 之间
spacing.content // space-y-12  - 内容组之间
spacing.group // space-y-6   - 组内元素
spacing.tight // space-y-3   - 紧密元素
```

## 🎯 图标容器

```tsx
import { iconBox } from '~/lib/design-tokens'

// 3 种尺寸，自带圆角、背景、居中
iconBox.sm  // size-8 + rounded-xl
iconBox.md  // size-10 + rounded-2xl
iconBox.lg  // size-12 + rounded-2xl

// 使用示例
<span className={iconBox.lg}>
  <i className="i-lucide-sparkles size-5" />
</span>
```

## ⚡ 过渡动画

```tsx
import { transition } from '~/lib/design-tokens'

transition.fast    // duration-200
transition.normal  // duration-300
transition.slow    // duration-500

// 使用示例
<button className={clsxm('hover:bg-accent/90', transition.normal)}>
  按钮
</button>
```

## 🎭 Hover 效果

```tsx
import { hover } from '~/lib/design-tokens'

hover.card // border 和 bg 变化
hover.lift // 轻微放大 + 阴影加强
hover.glow // 发光效果
```

## 🧩 组件使用模式

### 标准卡片模式

```tsx
import { Card } from '~/components/landing'
import { shadows } from '~/lib/design-tokens'

;<Card variant="floating" size="lg" hoverable>
  <div className="flex items-center gap-3">{/* 内容 */}</div>
</Card>
```

### Section 标准布局

```tsx
import { spacing, typography } from '~/lib/design-tokens'

;<section className={spacing.content}>
  <header className={spacing.tight}>
    <p className={clsxm(typography.label, 'text-text-secondary')}>
      Section Label
    </p>
    <h2 className={clsxm(typography.h1, 'text-white')}>主标题</h2>
    <p className="text-base text-text-secondary">描述文字</p>
  </header>

  {/* Section 内容 */}
</section>
```

## 🌈 渐变组合

```tsx
// Hero 渐变背景
<div className="bg-linear-to-br from-accent/40 via-purple-600/40 to-slate-900/70">
  ...
</div>

// 文字渐变
<span className="bg-linear-to-r from-sky-300 via-accent to-purple-400 bg-clip-text text-transparent">
  渐变文字
</span>
```

## 📋 完整示例

### 功能卡片

```tsx
import { Card } from '~/components/landing'
import {
  shadows,
  radius,
  spacing,
  typography,
  iconBox,
} from '~/lib/design-tokens'
import { clsxm } from '~/lib/helper'

const FeatureCard = () => (
  <Card variant="floating" size="lg" className={spacing.group}>
    <div className="flex items-center gap-3">
      <span className={clsxm(iconBox.lg, 'bg-accent/15 text-accent')}>
        <i className="i-lucide-cpu size-5" />
      </span>
      <div>
        <p className={clsxm(typography.h3, 'text-white')}>性能与体验</p>
        <p className={clsxm(typography.small, 'text-text-secondary')}>
          描述文字
        </p>
      </div>
    </div>
    <ul
      className={clsxm(spacing.tight, typography.small, 'text-text-secondary')}
    >
      <li className="flex items-start gap-2">
        <i className="i-lucide-check size-4 text-accent" />
        <span>功能点 1</span>
      </li>
    </ul>
  </Card>
)
```

## 🎨 颜色使用场景指南

| 场景     | 推荐颜色                                | 示例                              |
| -------- | --------------------------------------- | --------------------------------- |
| 页面背景 | `bg-background`                         | `<div className="bg-background">` |
| 卡片背景 | `bg-background/60` ~ `bg-background/80` | 玻璃态透明度                      |
| 按钮主色 | `bg-accent text-background`             | CTA 按钮                          |
| 按钮次级 | `bg-fill text-text`                     | 次要操作                          |
| 强调文字 | `text-accent`                           | 重要信息                          |
| 边框     | `border-border` 或 `border-white/10`    | 分隔线                            |
| 悬浮蒙层 | `bg-background/50 backdrop-blur-xl`     | Modal 背景                        |

## 🚫 反模式（避免）

```tsx
// ❌ 硬编码阴影
className="shadow-[0_20px_60px_rgba(0,0,0,0.35)]"

// ✅ 使用 token
className={shadows.heavy}

// ❌ 重复的圆角定义
className="rounded-[32px]"
className="rounded-[32px]"

// ✅ 统一使用
className={radius['2xl']}

// ❌ 分散的透明度值
className="bg-white/5"
className="bg-white/8"
className="bg-white/12"

// ✅ 语义化背景
className={glassCard.floating}
```

## 📚 参考资源

- **Pastel Palette**: 颜色系统基础
- **Tailwind CSS v4**: 工具类参考
- **Glassmorphic Design**: UI 设计理念
- **Motion/Framer Motion**: 动画系统

---

**最后更新**: 2025-11-11  
**维护者**: Design System Team
