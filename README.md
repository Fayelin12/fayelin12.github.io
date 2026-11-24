# github-pages

个人主页与静态作品集的 GitHub Pages 源码，发布在站点根路径。

## 结构

- `index.html`：首页。
- `portfolio/`：作品集。
- `product-management/` 保留为独立仓工作流的发布目录，不从本仓删除；源码真源见 [product-management](../product-management/README.md)。
- `life-rpg-system/` 保留为独立仓工作流的发布目录，不从本仓删除；真源见 [life-rpg-system](../life-rpg-system/README.md)。
- `loot-drop/` 保留线上兼容副本，正式入口是独立仓发布的 [创业失败数据库](https://fayelin12.github.io/loot-drop/%E5%88%9B%E4%B8%9A%E5%A4%B1%E8%B4%A5%E6%95%B0%E6%8D%AE%E5%BA%93.html)；源码真源见 [loot-drop](../loot-drop/README.md)。
- `.nojekyll`：保留原始静态文件与目录名，跳过 Jekyll 处理。

## 发布约束

这是公开静态站，仓库内每个被跟踪的文件都可能成为可访问路径。不要把备份、旧版 HTML、个人数据或凭据放进本仓；需要留档的历史副本放 `../github-pages-archive/`。

本仓没有统一构建命令，修改后按现有 GitHub Pages 流程发布；线上状态以 Pages 部署结果为准。
