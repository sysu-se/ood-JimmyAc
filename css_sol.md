# CSS 构建问题说明

## 现象

使用 `npm run build` 后再用 `npm run start` 打开生产版页面时，页面只显示蓝色背景波浪、少量原生控件和未正确排版的内容。

直接检查 `dist` 目录可以看到两个异常：

- `dist/index.html` 中残留了原始的 `@tailwind` 和 `@apply` 指令
- 生成出的外链 CSS 文件是 0 字节

这说明页面不是没有打开，而是生产构建后的 CSS 没有被正确编译。

## 根因

项目原本在 `src/main.js` 中直接引入全局样式：

```js
import './styles/global.css';
```

但当前 Rollup 配置里，PostCSS / Tailwind 处理链主要挂在 `sveltePreprocess` 上：

```js
const preprocess = sveltePreprocess({
	postcss: {
		plugins: [
			require('postcss-import'),
			require('tailwindcss'),
			require('autoprefixer'),
		],
	},
});
```

这意味着：

- Svelte 组件里的 `<style>` 会被 PostCSS / Tailwind 处理
- 但从 JS 入口直接 import 的 `global.css` 没有进入这条处理链

所以 `global.css` 里的：

```css
@tailwind base;
@tailwind components;
@apply ...;
@tailwind utilities;
```

在生产构建时没有被展开成真实 CSS。

随后 `scripts/postbuild.js` 又会把 `dist/critical.css` 内联到 `dist/index.html`，并删除原始 `dist/bundle.css`。由于输入 CSS 本身已经是未处理状态，最终生产页面就带着原始 `@tailwind` / `@apply` 指令运行，浏览器无法理解这些指令，于是页面样式损坏。

## 为什么 HW2 修改会暴露这个问题

HW2 增加了 Hint 和 Explore Mode 的 UI：

- 新增 Explore 按钮
- 新增连续 Hint 按钮
- 新增 Explore 状态面板
- 新增失败原因、候选状态等可视化样式

这些 UI 更依赖 Tailwind 工具类和 `@apply` 生成的基础样式。

同时，我们在生产构建中也遇到了 Tailwind 1.9 的兼容限制，例如：

- `@apply space-y-3`
- `@apply space-x-3`
- `@apply bg-opacity-90`
- `@apply bg-red-50`

这些类在当前 Tailwind 版本或当前 PostCSS 处理上下文下不能直接通过 `@apply` 使用。因此 HW2 的 UI 修改让原本就脆弱的 CSS 构建链更容易暴露问题。

需要注意：这不是 Hint / Explore 的领域逻辑问题，而是生产 CSS 构建管线问题。

## 解决方式

### 1. 让全局 CSS 进入 Svelte preprocess 管线

移除 `src/main.js` 里的直接 CSS import：

```diff
- import './styles/global.css';
  import App from './App.svelte';
```

改为在 `src/App.svelte` 中通过全局样式导入：

```svelte
<style global>
	@import './styles/global.css';
</style>
```

这样 `global.css` 会经过 `sveltePreprocess`，其中的 `@tailwind` 和 `@apply` 会被 PostCSS / Tailwind 正确展开。

### 2. 避免在组件 CSS 中使用当前 Tailwind 版本不支持的 `@apply` 写法

将不稳定的 `@apply` 写法改成普通 CSS 或更基础的 Tailwind 类。

例如：

```css
.actions-panel {
	@apply flex flex-col w-full;
}

.actions-panel > :not(:first-child) {
	@apply mt-3;
}
```

代替：

```css
.actions-panel {
	@apply flex flex-col w-full space-y-3;
}
```

又例如用普通 CSS 代替不稳定的透明背景工具类：

```css
.explore-panel {
	background-color: rgba(255, 255, 255, 0.92);
	@apply rounded-xl border-2 border-primary p-4 text-sm text-gray-800 shadow-sm;
}
```

## 修复后验证

修复后重新运行：

```cmd
npm run build
```

验证结果：

- `dist/index.html` 中不再残留 `@tailwind` / `@apply`
- `dist/bundle.*.css` 不再是 0 字节
- `npm run build` 通过
- `npm test` 通过，22 个测试全部通过

当前仍会看到两个第三方警告：

- `@mattflow/sudoku-solver` 的 `'use-strict' was ignored`
- PostCSS 插件弃用提示

这两个警告来自旧依赖，不影响页面样式和运行。

## 之后如何打开

生产版：

```cmd
npm run start
```

然后访问：

```text
http://localhost:5000
```

开发版：

```cmd
npm run dev
```

同样访问：

```text
http://localhost:5000
```
