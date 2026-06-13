# 架构重构计划：段落即原子（Block as Atom）

## 目标

将卡片内的单个 textarea 改为 Block（段落）列表，每个 Block 是独立的最小交互单元。同时新增叙事流视图（Narrative View），支持将 Block 引用拼接成故事流。

## 约束

- 保持单 HTML 文件，所有 CSS + JS 内联
- localStorage 持久化（不用 IndexedDB/Dexie）
- 原生 JS（不用 React/Zustand）
- textarea 作为编辑器（不用 TipTap）
- 暂不实现拖拽排序（Block 按创建顺序排列）

---

## 一、数据模型重构

### 旧模型
```
novelData.chapters[i] = {
  id, title,
  protagonist: '...',  // 单个字符串
  supporting: '...',
  events: '...',
  moments: '...',
  atmosphere: '...',
  foreshadowing: '...',
  createdAt, updatedAt
}
```

### 新模型
```
novelData = {
  title, activeChapterId, createdAt, updatedAt,
  chapters: [{ id, title, order, createdAt, updatedAt }],  // 不再含6个板块字段
  blocks: [{ id, chapterId, boardId, content, wordCount, order, createdAt, updatedAt }],  // 新增
  streams: [{ id, chapterId, sequence: [{ type:'block'|'freeText', id, blockId?, content?, wordCount? }], createdAt, updatedAt }]  // 新增
}
```

### Block 结构
```
{
  id: UUID,
  chapterId: string,
  boardId: 'protagonist' | 'supporting' | 'events' | 'moments' | 'atmosphere' | 'foreshadowing',
  content: string,          // 纯文本内容
  wordCount: number,
  order: number,            // 同卡片内的排序权重
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Stream 结构（叙事流）
```
{
  id: UUID,
  chapterId: string,
  sequence: [
    { type: 'block', id: UUID, blockId: UUID },                    // 引用 Block
    { type: 'freeText', id: UUID, content: string, wordCount: number }  // 自由书写
  ]
}
```

---

## 二、数据迁移

`migrateAllChapters()` 三级迁移：
1. `paragraphs[]` → 六字段（已有）
2. 六字段 → blocks 数组：每个非空字段生成 1 个 Block，content 为原字符串
3. 自动为每个 chapter 创建空 Stream

---

## 三、平铺视图（Tiling View）改造

### 卡片内部结构变化

旧：`卡片 → textarea`
新：`卡片 → header(标签+字数+pin) → block-list(可滚动) → add-block-btn`

### 每个 Block 的 HTML 结构
```html
<div class="block-item" data-block-id="xxx">
  <textarea class="block-item__editor" placeholder="...">内容</textarea>
  <div class="block-item__footer">
    <span class="block-item__wc">42 字</span>
    <button class="block-item__delete" title="删除段落">×</button>
  </div>
</div>
```

### 交互行为
- **新建 Block**：点击卡片底部 "+" 按钮，在末尾新增空 Block 并聚焦
- **编辑 Block**：直接在 textarea 中输入，防抖更新 wordCount + autoSave
- **删除 Block**：hover 显示 × 按钮，点击删除（confirm）
- **聚焦淡化**：保留现有卡片聚焦淡化机制（Block focus → 卡片 is-focused → 其他卡片淡化）
- **卡片 Pin**：保留，Esc 退出
- **卡片字数**：显示该板块所有 Block 字数之和

---

## 四、叙事流视图（Narrative View）— 新增

### 布局
```
┌─────────────────────────────────────────────────────┐
│  [视图切换: 平铺 | 叙事流]     章节标题    字数     │
├──────────────┬──────────────────────────────────────┤
│  素材面板     │  故事画布                            │
│  (Material)  │  (Story Canvas)                      │
│              │                                      │
│  ▸ 主角视角   │  [引用块] 主角视角 · 42字             │
│    Block 1 + │  "他推开那扇门..."                    │
│    Block 2 + │              [↑] [↓] [×]             │
│              │                                      │
│  ▸ 事件发展   │  [自由文本]                           │
│    Block 3 + │  "门后是一片漆黑..."                   │
│              │              [↑] [↓] [×]             │
│              │                                      │
│              │  [引用块] 氛围烘托 · 28字              │
│              │  "寒风从门缝中涌入..."                 │
│              │              [↑] [↓] [×]             │
│              │                                      │
│              │  [ + 添加自由文本 ]                    │
└──────────────┴──────────────────────────────────────┘
```

### 素材面板（Material Panel）
- 按六大板块分组，可折叠
- 每个 Block 显示前两行预览 + 字数
- 点击 "+" 按钮将 Block 引用添加到故事画布末尾

### 故事画布（Story Canvas）
- **引用块**：显示 Board 标签 + Block 内容（只读）+ 上移/下移/删除按钮
- **自由文本区**：可编辑 textarea + 上移/下移/删除按钮
- **添加自由文本**：底部按钮，新增空自由文本区

### 导出适配
- 叙事流导出：按 sequence 顺序输出，引用块取 Block.plainText，自由文本取 content

---

## 五、视图切换机制

### settings 新增字段
```javascript
settings.viewMode = 'tiling';  // 'tiling' | 'narrative'
```

### 工具栏新增切换按钮
在章节标题栏右侧添加视图切换按钮组：`[平铺] [叙事流]`

### 切换逻辑
- 切换视图时调用对应的 render 函数：`renderTilingView()` 或 `renderNarrativeView()`
- 记住每个章节的视图偏好（可选，先全局统一）

---

## 六、需要修改的文件

仅修改：`C:\Users\林晓燕\WorkBuddy\2026-05-18-task-4\novel-writer.html`

### CSS 新增/修改
1. `.block-item` 样式（Block 卡片）
2. `.block-item__footer`、`.block-item__wc`、`.block-item__delete`
3. `.block-list`（可滚动 Block 容器）
4. `.add-block-btn`（卡片底部新增按钮）
5. `.narrative-view` 布局（左右分栏）
6. `.material-panel`、`.material-group`、`.material-block`
7. `.story-canvas`、`.stream-item`、`.stream-item--block`、`.stream-item--free`
8. `.view-switcher`（视图切换按钮组）
9. 修改 `.writing-card__content` 改为 `.block-list`

### JS 重写/新增
1. **数据模型**：重写 `novelData` 结构、`createNewChapterData()`、`migrateAllChapters()`
2. **Block CRUD**：`createBlock()`, `updateBlock()`, `deleteBlock()`, `getBlocksForChapter()`, `getBlocksForBoard()`
3. **Stream CRUD**：`getOrCreateStream()`, `addBlockRefToStream()`, `addFreeTextToStream()`, `removeStreamItem()`, `moveStreamItem()`, `updateFreeTextContent()`
4. **渲染**：重写 `renderEditor()` → `renderTilingView()`，新增 `renderNarrativeView()`
5. **字数统计**：重写 `getChapterWordCount()` 基于 blocks 汇总
6. **搜索**：重写 `doSearch()` 遍历 blocks
7. **导出**：重写 `exportMarkdown()`/`exportText()` 基于 blocks 或 stream
8. **视图切换**：`switchView()`, `saveSettings()` 更新 viewMode

---

## 七、实现步骤

### Step 1: 数据模型 + 迁移
- 重写数据结构定义
- 实现三级迁移函数
- 验证旧数据能正确迁移

### Step 2: Block CRUD 函数
- createBlock / updateBlock / deleteBlock / getBlocksForBoard
- 测试数据操作正确性

### Step 3: 平铺视图重构
- CSS：block-item、block-list、add-block-btn 样式
- JS：renderTilingView() 替代原 renderEditor()
- 保留聚焦淡化、Pin 机制
- 保留标题编辑、字数统计

### Step 4: 叙事流视图
- CSS：narrative-view、material-panel、story-canvas 布局
- JS：renderNarrativeView()、素材面板渲染、故事画布渲染
- Stream CRUD 函数
- 引用块添加/删除/排序

### Step 5: 视图切换 + 工具栏
- view-switcher 按钮组
- switchView() 逻辑
- settings 持久化 viewMode

### Step 6: 搜索 + 导出适配
- 搜索遍历 blocks
- 导出支持两种模式（按板块 / 按叙事流）

### Step 7: 快捷键 + 细节打磨
- 快捷键适配新架构
- 自由文本区的 Tab 处理
- 空状态提示
