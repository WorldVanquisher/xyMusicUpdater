# 前端开发指南

xyMusicUpdater 的前端是一个单页面应用 (SPA)，使用 React 18、Vite 和原生 CSS 构建，旨在实现最高性能和零臃肿的 UI 体验。

## 1. 去中心化轮询与状态管理

前端没有依赖全局状态管理库（如 Redux）也没有不断地轮询所有接口，而是采用了去中心化、基于选项卡上下文的按需加载策略：

*   **按需获取**: 像 `/api/songs/` 和 `/api/playlist-map/` 这样数据量庞大的接口，**严格地仅**在用户导航到需要它们的选项卡（如曲库、打标、剪辑器）时才会被请求。
*   **回调刷新**: 每一个修改数据的 API 调用（如 `triggerRescan`, `mergeCompilation`, `updateSong`）都会触发一个针对性的 `.then(refreshAll)`，以立即让陈旧数据失效并更新视图状态。

## 2. 服务器发送事件 (SSE)

`useSSE` Hook (`frontend/src/hooks/useSSE.js`) 负责管理与后端的持久、实时的连接，该连接同时也作为系统在线状态的主要心跳检测机制。

*   **连接韧性**: 如果连接中断或服务器重启，该 Hook 会执行重试策略（每 5 秒重试一次，最多 10 次），直至判定永久失败并强制退回登录页。
*   **事件日志**: 后端将 `info`, `warning`, 和 `error` 等事件直接广播给前端的 `LiveLog` 组件，让用户能直观地看到后台任务的进展，而无需手动去拉取日志文件。

## 3. UI 美学：玻璃拟态与主题化

用户界面摒弃了诸如 Material-UI 或 Tailwind CSS 等沉重的组件库，完全依赖于原生、高度优化的内联样式和通用 CSS 类。

*   **动态主题**: 用户可以通过设置面板设定 `UI_THEME_COLOR`。`App.jsx` 组件会将该颜色作为 CSS 变量 (`--accent`) 动态注入，瞬间改变所有按钮、边框和激活状态的颜色。
*   **毛玻璃效果 (Glassmorphism)**: 如果开启了 `UI_DASHBOARD_BG`，UI 会为侧边栏、内容面板和底部栏应用 `backdropFilter: blur(12px)` 和半透明的 RGBA 背景。这能让用户自定义的背景图柔和地透过来。
*   **全局动画**: `index.html` 定义了几个全局 CSS 关键帧动画 (`animate-slide`, `animate-slide-up`, `animate-fade`, `animate-bounce`)。它们被全局应用，确保提供现代、平滑且有触感的用户体验。
*   **无限走马灯**: `ScrollingText` 组件会基于 DOM 的 `offsetWidth` 自动检测文字是否溢出。如果溢出，它会克隆文本内容并自动计算 `animation-duration`，确保全站所有的超长标题都能以 40 像素/秒 的恒定速度丝滑地循环滚动。
