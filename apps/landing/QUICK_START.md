# 快速开始：Landing Page 开发指南

## 🚀 5 分钟上手

### 1. 添加新 Section

```tsx
// 1️⃣ 创建组件文件：components/landing/MySection.tsx
import { spacing, typography } from '~/lib/design-tokens'
import { clsxm } from '~/lib/helper'
import { Card } from './Card'

export const MySection = () => (
  <section className={spacing.content}>
    <header className={spacing.tight}>
      <p className={clsxm(typography.label, 'text-text-secondary')}>标签</p>
      <h2 className={clsxm(typography.h1, 'text-white')}>区块标题</h2>
    </header>

    <Card variant="floating" size="lg">
      内容区域
    </Card>
  </section>
)

// 2️⃣ 在 index.ts 导出
export { MySection } from './MySection'

// 3️⃣ 在 page.tsx 使用
import { MySection } from '~/components/landing'

export default function Home() {
  return (
    <div className="...">
      <BackgroundDecor />
      <div className="...">
        {/* ...其他 sections */}
        <MySection />
      </div>
    </div>
  )
}
```

### 2. 创建自定义卡片

```tsx
import { Card } from '~/components/landing'
import { iconBox, shadows } from '~/lib/design-tokens'
import { clsxm } from '~/lib/helper'

const ProductCard = ({ icon, title, price }) => (
  <Card variant="elevated" size="md" hoverable>
    <div className="flex items-center gap-3">
      <span className={clsxm(iconBox.lg, 'bg-accent/15 text-accent')}>
        <i className={icon} />
      </span>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-text-secondary">{price}</p>
      </div>
    </div>
  </Card>
)
```

### 3. 自定义颜色和阴影

```tsx
import { shadows, radius, blur, glassCard } from '~/lib/design-tokens'

// 组合使用
<div className={clsxm(
  glassCard.floating,  // 玻璃态背景
  radius.lg,           // 圆角
  shadows.medium,      // 阴影
  'p-6'                // 内边距
)}>
  内容
</div>

// 自定义透明度
<div className={clsxm(
  'bg-background/70',  // 70% 不透明度
  blur.xl,             // 模糊度
  'border border-white/10'
)}>
  半透明容器
</div>
```

## 🎨 常用模式

### Pattern 1: 带图标的功能列表

```tsx
const features = [
  { icon: 'i-lucide-zap', title: '快速', desc: '毫秒级响应' },
  { icon: 'i-lucide-shield', title: '安全', desc: '企业级加密' },
]

<div className="space-y-4">
  {features.map(item => (
    <IconCard
      key={item.title}
      icon={item.icon}
      title={item.title}
      description={item.desc}
    />
  ))}
</div>
```

### Pattern 2: 网格布局的卡片

```tsx
import { FeatureCard } from '~/components/landing'

;<div className="grid gap-6 lg:grid-cols-2">
  {featureGroups.map((group) => (
    <FeatureCard
      key={group.title}
      icon={group.icon}
      title={group.title}
      description={group.description}
      bullets={group.bullets}
    />
  ))}
</div>
```

### Pattern 3: Hero 渐变背景

```tsx
<div
  className={clsxm(
    'relative overflow-hidden',
    radius['3xl'],
    shadows.heavy,
    'bg-linear-to-br from-accent/40 via-purple-600/40 to-slate-900/70',
    'p-10 text-white',
  )}
>
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)] opacity-80" />
  <div className="relative space-y-6">内容</div>
</div>
```

### Pattern 4: 统计指标条

```tsx
import { MetricCard } from '~/components/landing'

;<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <MetricCard label="用户" value="10k+" detail="活跃用户" />
  <MetricCard label="性能" value="99.9%" detail="可用性" />
  {/* 更多指标 */}
</div>
```

## 🎯 设计 Token 速查

### 快速导入

```tsx
import {
  shadows, // 阴影
  radius, // 圆角
  blur, // 模糊
  glassCard, // 玻璃态卡片
  typography, // 文字层级
  spacing, // 间距
  iconBox, // 图标容器
  transition, // 过渡动画
} from '~/lib/design-tokens'
```

### 常用组合

```tsx
// 玻璃态浮动卡片
className={clsxm(glassCard.floating, radius.lg, shadows.medium)}

// 标题
className={clsxm(typography.h1, 'text-white')}

// Section 间距
className={spacing.content}

// 图标容器
className={clsxm(iconBox.lg, 'bg-accent/15 text-accent')}
```

## 📝 开发检查清单

在提交代码前，确保：

- [ ] 使用了设计 token（避免硬编码）
- [ ] 单个组件文件 < 500 行
- [ ] 导出的组件已添加到 `index.ts`
- [ ] 使用了语义化的颜色类（`bg-background` 而非 `bg-white`）
- [ ] 阴影使用 `shadows.*` token
- [ ] 圆角使用 `radius.*` token
- [ ] 运行 `pnpm lint` 无错误

## 🐛 常见问题

### Q: Linter 提示 `bg-background` 不是有效的 Tailwind 类？

**A**: 这是正常的。`bg-background` 等类来自 Pastel Palette，在运行时有效。可以忽略这个警告。

### Q: 如何修改全局阴影样式？

**A**: 编辑 `lib/design-tokens.ts` 中的 `shadows` 对象：

```tsx
export const shadows = {
  medium: 'shadow-[0_8px_32px_rgba(0,0,0,0.12)]', // 修改这里
}
```

### Q: 如何添加新的卡片变体？

**A**: 在 `components/landing/Card.tsx` 中扩展：

```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'floating' | 'gradient' | 'custom'
  //                                                           ^^^^^^ 新增
}

// 添加到 glassCard 定义
export const glassCard = {
  // ...existing
  custom: 'bg-custom-color border-custom backdrop-blur-lg',
}
```

### Q: 如何实现暗色模式？

**A**: Pastel Palette 已自动支持。在根元素添加 `data-color-mode` 属性：

```tsx
<html data-color-mode="dark">{/* 所有颜色 token 自动切换 */}</html>
```

## 🔗 相关文档

- [重构详情](./REFACTOR.md) - 查看重构历史和对比
- [设计系统](./DESIGN_SYSTEM.md) - 完整的 token 参考
- [AGENTS.md](./AGENTS.md) - AI 开发指南
- [主项目 README](../../README.md) - 项目整体架构

## 💡 提示

1. **优先复用组件**：先查看 `components/landing/` 是否有类似组件
2. **保持一致性**：新组件应遵循现有的设计模式
3. **命名规范**：组件以 `Section` 或 `Card` 结尾
4. **Props 类型**：始终定义 TypeScript 接口

---

Happy Coding! 🚀
