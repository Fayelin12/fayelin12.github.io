/**
 * AssociationManager - 统一关联管理器
 * 将交互映射、高亮配置、文本选择工具栏合并为单一模块
 *
 * 核心设计：
 * - 关联数据从需求文档 [[highlight:...]] 标记解析
 * - 事件委托：不在每个元素上绑定监听，而是在容器上委托
 * - 无 WeakMap、无全局变量污染
 * - 内置工具栏、弹窗、撤销提示
 */

const AssociationManager = (function() {
    'use strict';

    // ==================== 配置 ====================
    const COLORS = {
        yellow: { id: 'yellow', name: '黄色', color: '#FFC107', bgColor: 'rgba(255,193,7,0.15)', borderColor: '#FFC107', textColor: '#d46b08' },
        green:  { id: 'green',  name: '绿色', color: '#52c41a', bgColor: 'rgba(82,196,26,0.1)',  borderColor: '#52c41a', textColor: '#389e0d' },
        blue:   { id: 'blue',   name: '蓝色', color: '#1677FF', bgColor: 'rgba(22,119,255,0.08)', borderColor: '#1677FF', textColor: '#0958d9' },
        red:    { id: 'red',    name: '红色', color: '#ff4d4f', bgColor: 'rgba(255,77,79,0.08)',  borderColor: '#ff4d4f', textColor: '#cf1322' }
    };

    const CONFIG = {
        maxStorageSize: 100000,      // 100KB
        undoDuration: 5000,          // 撤销倒计时 5秒
        highlightDuration: 3000,     // 高亮持续时间（非交互）
        toastDuration: 3000
    };

    // ==================== 状态 ====================
    let currentPageId = null;
    let associations = [];
    let isInitialized = false;
    let isPickerActive = false;
    let pendingText = null;         // 替代 window.__pendingHighlight
    let toolbarEl = null;
    let dialogEl = null;
    let undoTimer = null;
        let toastTimer = null;
    let docContainer = null;
    let previewContainer = null;
    let mouseUpHandler = null;
    let mouseDownHandler = null;
    let keyDownHandler = null;
    let selectionChangeHandler = null;
    let docMouseHandler = null;
    let previewMouseHandler = null;

    // ==================== 工具函数 ====================
    function generateId() {
        return 'assoc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function parseAssociationsFromContent() {
        associations = [];
        if (!currentPageId || typeof RequirementManager === 'undefined') return;
        const req = RequirementManager.getRequirement(currentPageId);
        if (!req || !req.content) return;

        const regex = /\[\[highlight:([^\]]+?)\]\]([\s\S]*?)\[\[\/highlight\]\]/g;
        let match;
        while ((match = regex.exec(req.content)) !== null) {
            const attr = match[1];
            const text = match[2];

            const lastColonIndex = attr.lastIndexOf(':');
            let selector, color;
            if (lastColonIndex > 0 && !attr.substring(lastColonIndex + 1).includes(')')) {
                selector = attr.substring(0, lastColonIndex);
                color = attr.substring(lastColonIndex + 1);
            } else {
                selector = attr;
                color = 'yellow';
            }

            associations.push({
                id: generateId(),
                text: text.trim(),
                selector,
                color,
                createdAt: new Date().toISOString()
            });
        }
    }

    // ==================== Toast ====================
    function showToast(message) {
        const existing = document.getElementById('am-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'am-toast';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;z-index:10001;font-size:14px;';
        document.body.appendChild(toast);

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.remove(), CONFIG.toastDuration);
    }

    function showUndoToast(message, onUndo, onConfirm) {
        clearUndoToast();

        const toast = document.createElement('div');
        toast.id = 'am-undo-toast';
        toast.innerHTML = `<span>${escapeHtml(message)}</span><button id="amUndoBtn">撤销</button><div class="am-progress"><div class="am-progress-bar"></div></div>`;

        const duration = CONFIG.undoDuration;
        toast.style.cssText = 'position:fixed;background:#333;color:#fff;padding:12px 20px;border-radius:8px;display:flex;align-items:center;gap:16px;z-index:10001;font-size:14px;min-width:280px;left:50%;bottom:100px;transform:translateX(-50%);';

        const style = document.createElement('style');
        style.id = 'am-undo-style';
        style.textContent = `
            #am-undo-toast button { background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:13px;white-space:nowrap; }
            #am-undo-toast button:hover { background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.5); }
            #am-undo-toast .am-progress { position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.2);border-radius:0 0 8px 8px;overflow:hidden; }
            #am-undo-toast .am-progress-bar { height:100%;background:#1677FF;width:100%;animation:am-progress ${duration}ms linear forwards; }
            @keyframes am-progress { from{width:100%} to{width:0%} }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);

        let undone = false;
        undoTimer = setTimeout(() => {
            if (!undone) { toast.remove(); style.remove(); if (onConfirm) onConfirm(); }
        }, duration);

        toast.querySelector('#amUndoBtn').addEventListener('click', () => {
            undone = true; clearTimeout(undoTimer); toast.remove(); style.remove(); if (onUndo) onUndo();
        });
    }

    function clearUndoToast() {
        clearTimeout(undoTimer);
        const t = document.getElementById('am-undo-toast');
        const s = document.getElementById('am-undo-style');
        if (t) t.remove(); if (s) s.remove();
    }

    // ==================== 关联 CRUD ====================
    function addAssociation(text, selector, colorId) {
        const assoc = {
            id: generateId(),
            text: text.trim(),
            selector,
            color: colorId || 'yellow',
            createdAt: new Date().toISOString()
        };
        associations.push(assoc);
        applyAll();
        showToast('关联已创建');
        return assoc.id;
    }

    function removeAssociation(id) {
        const idx = associations.findIndex(a => a.id === id);
        if (idx === -1) return null;
        const removed = associations.splice(idx, 1)[0];
        applyAll();
        return removed;
    }

    function getAssociation(id) {
        return associations.find(a => a.id === id) || null;
    }

    // ==================== 高亮渲染 ====================
    function applyAll() {
        applyDocHighlights();
        applyPreviewHighlights();
    }

    function applyDocHighlights() {
        if (!docContainer) return;
        // 清除旧标记和残留的高亮类
        docContainer.querySelectorAll('[data-assoc-id]').forEach(link => {
            delete link.dataset.assocId;
            delete link.dataset.mappingDirection;
        });
        docContainer.querySelectorAll('.doc-mapping-highlight, .mapping-active').forEach(el => {
            el.classList.remove('doc-mapping-highlight', 'mapping-active');
        });
        // 找到所有已渲染的 req-highlight-link，为其补充 data-assoc-id
        const links = docContainer.querySelectorAll('.req-highlight-link');
        links.forEach(link => {
            const selector = link.dataset.target;
            const color = link.dataset.color || 'yellow';
            const text = link.textContent.trim();
            // 查找匹配的 associations
            const matched = associations.filter(a => a.text === text && a.selector === selector && a.color === color);
            if (matched.length > 0) {
                link.dataset.assocId = JSON.stringify(matched.map(a => a.id));
                link.dataset.mappingDirection = 'doc-to-preview';
            }
        });
    }

    function applyPreviewHighlights() {
        if (!previewContainer) return;
        // 清除旧的 data 属性和残留的高亮类
        previewContainer.querySelectorAll('[data-assoc-id]').forEach(el => {
            delete el.dataset.assocId;
            delete el.dataset.mappingDirection;
        });
        previewContainer.querySelectorAll('.preview-mapping-highlight, .mapping-active').forEach(el => {
            el.classList.remove('preview-mapping-highlight', 'mapping-active');
        });
        // 按 selector 分组
        const map = new Map();
        associations.forEach(a => {
            const list = map.get(a.selector) || [];
            list.push(a.id);
            map.set(a.selector, list);
        });
        map.forEach((ids, selector) => {
            // 防御性解码 HTML 实体
            if (typeof selector === 'string') {
                selector = selector
                    .replace(/&gt;/g, '>')
                    .replace(/&lt;/g, '<')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"');
            }
            try {
                previewContainer.querySelectorAll(selector).forEach(el => {
                    el.dataset.assocId = JSON.stringify(ids);
                    el.dataset.mappingDirection = 'preview-to-doc';
                });
            } catch (e) {
                console.warn('[AssociationManager] 无效选择器:', selector);
            }
        });
    }

    // ==================== 双向高亮 ====================
    function highlightPreview(selector, active) {
        if (!previewContainer) return;
        // 防御性解码 HTML 实体
        if (typeof selector === 'string') {
            selector = selector
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');
        }
        try {
            previewContainer.querySelectorAll(selector).forEach(el => {
                el.classList.toggle('preview-mapping-highlight', active);
                el.classList.toggle('mapping-active', active);
            });
        } catch (e) {}
    }

    function highlightDoc(ids, active) {
        if (!docContainer) return;
        ids.forEach(id => {
            const assoc = getAssociation(id);
            if (!assoc) return;
            docContainer.querySelectorAll('.req-highlight-link').forEach(link => {
                if (link.textContent.trim() === assoc.text && link.dataset.target === assoc.selector) {
                    link.classList.toggle('doc-mapping-highlight', active);
                    link.classList.toggle('mapping-active', active);
                }
            });
        });
    }

    function scrollIntoView(element, container) {
        if (!element || !container) return;
        const eR = element.getBoundingClientRect();
        const cR = container.getBoundingClientRect();
        const top = eR.top - cR.top + container.scrollTop;
        const bottom = top + eR.height;
        const ch = container.clientHeight;
        if (top < container.scrollTop) container.scrollTo({ top: top - 20, behavior: 'smooth' });
        else if (bottom > container.scrollTop + ch) container.scrollTo({ top: bottom - ch + 20, behavior: 'smooth' });
    }

    // ==================== 事件委托 ====================
    function bindDelegatedEvents() {
        // 使用 mouseover/mouseout 实现委托（mouseenter/mouseleave 不冒泡）
        // 通过 relatedTarget 判断是否在同一个 [data-assoc-id] 元素内部移动
        docMouseHandler = (e) => {
            const link = e.target.closest && e.target.closest('[data-assoc-id]');
            if (e.type === 'mouseover') {
                if (!link) return;
                // 如果还在同一个 link 内移动，不重复触发
                const from = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-assoc-id]');
                if (from === link) return;
                try {
                    const ids = JSON.parse(link.dataset.assocId);
                    ids.forEach(id => { const a = getAssociation(id); if (a) highlightPreview(a.selector, true); });
                    link.classList.add('mapping-active');
                } catch (err) {}
            } else if (e.type === 'mouseout') {
                if (!link) return;
                const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-assoc-id]');
                if (to === link) return;
                try {
                    const ids = JSON.parse(link.dataset.assocId);
                    ids.forEach(id => { const a = getAssociation(id); if (a) highlightPreview(a.selector, false); });
                    link.classList.remove('mapping-active');
                } catch (err) {}
            }
        };

        previewMouseHandler = (e) => {
            const el = e.target.closest && e.target.closest('[data-assoc-id]');
            if (e.type === 'mouseover') {
                if (!el) return;
                const from = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-assoc-id]');
                if (from === el) return;
                try {
                    const ids = JSON.parse(el.dataset.assocId);
                    highlightDoc(ids, true);
                    el.classList.add('mapping-active');
                } catch (err) {}
            } else if (e.type === 'mouseout') {
                if (!el) return;
                const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-assoc-id]');
                if (to === el) return;
                try {
                    const ids = JSON.parse(el.dataset.assocId);
                    highlightDoc(ids, false);
                    el.classList.remove('mapping-active');
                } catch (err) {}
            } else if (e.type === 'click') {
                if (!el) return;
                try {
                    const ids = JSON.parse(el.dataset.assocId);
                    handlePreviewClick(e, el, ids);
                } catch (err) {}
            }
        };

        if (docContainer) {
            docContainer.addEventListener('mouseover', docMouseHandler, true);
            docContainer.addEventListener('mouseout', docMouseHandler, true);
        }
        if (previewContainer) {
            previewContainer.addEventListener('mouseover', previewMouseHandler, true);
            previewContainer.addEventListener('mouseout', previewMouseHandler, true);
            previewContainer.addEventListener('click', previewMouseHandler, true);
        }
    }

    function unbindDelegatedEvents() {
        if (docContainer && docMouseHandler) {
            docContainer.removeEventListener('mouseover', docMouseHandler, true);
            docContainer.removeEventListener('mouseout', docMouseHandler, true);
        }
        if (previewContainer && previewMouseHandler) {
            previewContainer.removeEventListener('mouseover', previewMouseHandler, true);
            previewContainer.removeEventListener('mouseout', previewMouseHandler, true);
            previewContainer.removeEventListener('click', previewMouseHandler, true);
        }
        docMouseHandler = null;
        previewMouseHandler = null;
    }

    // ==================== 预览区点击断开 ====================
    function handlePreviewClick(e, el, ids) {
        const rect = el.getBoundingClientRect();
        const inUnlinkZone = e.clientX > rect.right - 28 && e.clientX < rect.right + 8 &&
                             e.clientY > rect.top - 8 && e.clientY < rect.top + 28;
        if (!inUnlinkZone) return;
        e.preventDefault(); e.stopPropagation();

        // 只处理第一个关联（通常一个元素只关联一个文本）
        const assocId = ids[0];
        const assoc = getAssociation(assocId);
        if (!assoc) return;

        const removed = removeAssociation(assocId);
        if (!removed) return;

        showUndoToast('正在取消高亮关联...', () => {
            associations.push(removed);
            applyAll();
            showToast('已恢复关联');
        }, () => {
            removeHighlightFromMarkdown(removed.text, removed.selector, removed.color);
        });
    }

    function removeHighlightFromMarkdown(text, selector, color) {
        if (typeof RequirementManager === 'undefined') return;
        const req = RequirementManager.getRequirement(currentPageId);
        if (!req || !req.content) return;
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let changed = false;
        // 匹配 [[highlight:任意内容]]目标文本[[/highlight]]
        try {
            const regex = new RegExp('\\[\\[highlight:[^\\]]+?\\]\\]' + escapedText + '\\[\\[/highlight\\]\\]', 'g');
            if (regex.test(req.content)) {
                req.content = req.content.replace(regex, text);
                changed = true;
            }
        } catch (e) {}
        if (changed) {
            RequirementManager.setRequirement(currentPageId, req);
            RequirementManager.saveToFile();
            refreshRequirementView();
        }
    }

    function refreshRequirementView() {
        if (typeof RequirementViewer === 'undefined') return;
        const explanationContentEl = document.getElementById('explanationContent');
        if (!explanationContentEl) return;
        explanationContentEl.innerHTML = RequirementViewer.render(currentPageId);
        RequirementViewer.bindEvents(currentPageId);
        // 重新应用高亮（因为重新渲染了）
        setTimeout(() => applyAll(), 0);
    }

    // ==================== 文本选择工具栏 ====================
    function createToolbar() {
        if (toolbarEl) return toolbarEl;
        toolbarEl = document.createElement('div');
        toolbarEl.id = 'am-toolbar';
        toolbarEl.innerHTML = `<div class="tst-arrow"></div><div class="tst-content"><button class="tst-btn tst-btn-highlight" title="高亮关联"><span>🎨</span></button></div>`;
        toolbarEl.className = 'text-selection-toolbar';
        toolbarEl.style.display = 'none';
        document.body.appendChild(toolbarEl);

        toolbarEl.querySelector('.tst-btn-highlight').addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            handleToolbarHighlight();
        });
        return toolbarEl;
    }

    function getSelectionRange() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        if (range.collapsed) return null;
        const container = range.commonAncestorContainer;
        const area = container.nodeType === Node.TEXT_NODE ? container.parentElement && container.parentElement.closest('.req-viewer-content') : container.closest && container.closest('.req-viewer-content');
        if (!area) return null;
        return range;
    }

    function showToolbar() {
        const range = getSelectionRange();
        if (!range) return;
        const text = range.toString().trim();
        if (text.length < 1) return;

        pendingText = text;
        const tb = createToolbar();
        tb.style.display = 'block';
        tb.classList.remove('tst-show');

        const rect = range.getBoundingClientRect();
        const tbRect = tb.getBoundingClientRect();
        let top = rect.bottom + 10 + window.scrollY;
        let left = rect.left + (rect.width - tbRect.width) / 2 + window.scrollX;

        if (top + tbRect.height > window.innerHeight + window.scrollY - 10) {
            top = rect.top - tbRect.height - 10 + window.scrollY;
            tb.classList.add('tst-above');
        } else {
            tb.classList.remove('tst-above');
        }
        left = Math.max(10, Math.min(left, window.innerWidth + window.scrollX - tbRect.width - 10));

        tb.style.top = top + 'px';
        tb.style.left = left + 'px';
        tb.classList.add('tst-show');
    }

    function hideToolbar() {
        if (!toolbarEl) return;
        toolbarEl.classList.remove('tst-show');
        setTimeout(() => { if (!toolbarEl.classList.contains('tst-show')) toolbarEl.style.display = 'none'; }, 200);
    }

    function handleToolbarHighlight() {
        if (!pendingText) return;
        hideToolbar();
        openColorPicker(pendingText);
    }

    // ==================== 颜色选择弹窗 ====================
    function createDialog() {
        if (dialogEl) return dialogEl;
        dialogEl = document.createElement('div');
        dialogEl.id = 'am-dialog';
        dialogEl.className = 'highlight-config-dialog';
        dialogEl.innerHTML = `
            <div class="hcd-overlay"></div>
            <div class="hcd-container">
                <div class="hcd-header"><h3>配置高亮关联</h3><button class="hcd-close">&times;</button></div>
                <div class="hcd-body">
                    <div class="hcd-section"><label>选择颜色</label><div class="hcd-color-list" id="amColorList"></div></div>
                    <div class="hcd-section"><label>关联页面元素</label><div class="hcd-element-mapping"><div id="amMappingInfo" class="hcd-mapping-info"><span class="hcd-no-mapping">未关联元素</span></div><button id="amPickBtn" class="hcd-btn hcd-btn-primary">选择元素</button></div></div>
                    <div class="hcd-section"><label>预览效果</label><div class="hcd-preview"><span id="amPreviewText" class="req-highlight-yellow">${escapeHtml(pendingText || '文本预览')}</span></div></div>
                </div>
                <div class="hcd-footer"><button class="hcd-btn hcd-btn-secondary" id="amCancelBtn">取消</button><button class="hcd-btn hcd-btn-primary" id="amSaveBtn">保存</button></div>
            </div>
        `;
        document.body.appendChild(dialogEl);

        dialogEl.querySelector('.hcd-close').addEventListener('click', closeDialog);
        dialogEl.querySelector('.hcd-overlay').addEventListener('click', closeDialog);
        dialogEl.querySelector('#amCancelBtn').addEventListener('click', closeDialog);
        dialogEl.querySelector('#amSaveBtn').addEventListener('click', saveDialog);
        dialogEl.querySelector('#amColorList').addEventListener('click', (e) => {
            const item = e.target.closest('.hcd-color-item');
            if (item) selectColor(item.dataset.id);
        });
        dialogEl.querySelector('#amPickBtn').addEventListener('click', startPickerFromDialog);
        return dialogEl;
    }

    let dialogColor = 'yellow';
    let dialogSelector = null;

    function openColorPicker(text) {
        pendingText = text;
        createDialog();
        dialogEl.style.display = 'block';
        dialogEl.style.visibility = 'visible';
        dialogColor = 'yellow';
        dialogSelector = null;
        renderColorList();
        selectColor('yellow');
        updateMappingInfo(null);
    }

    function closeDialog() {
        if (!dialogEl) return;
        dialogEl.style.display = 'none';
        dialogSelector = null;
    }

    function renderColorList() {
        const container = document.getElementById('amColorList');
        if (!container) return;
        container.innerHTML = Object.values(COLORS).map(c => `
            <div class="hcd-color-item ${c.id === dialogColor ? 'active' : ''}" data-id="${c.id}" style="--color:${c.color};--bg-color:${c.bgColor}">
                <div class="hcd-color-preview"></div><span>${escapeHtml(c.name)}</span>
            </div>
        `).join('');
    }

    function selectColor(id) {
        dialogColor = id;
        document.querySelectorAll('#amColorList .hcd-color-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === id);
        });
        const config = COLORS[id];
        const preview = document.getElementById('amPreviewText');
        if (preview && config) {
            preview.className = `req-highlight-${id}`;
            preview.textContent = pendingText || '文本预览';
        }
    }

    function updateMappingInfo(selector) {
        const container = document.getElementById('amMappingInfo');
        if (!container) return;
        if (selector) {
            container.innerHTML = `<span class="hcd-has-mapping"><code>${escapeHtml(selector)}</code><button class="hcd-remove-mapping" title="移除关联">&times;</button></span>`;
            container.querySelector('.hcd-remove-mapping').addEventListener('click', () => { dialogSelector = null; updateMappingInfo(null); });
        } else {
            container.innerHTML = '<span class="hcd-no-mapping">未关联元素</span>';
        }
    }

    function startPickerFromDialog() {
        dialogEl.style.visibility = 'hidden';
        ElementPicker.start({
            backgroundColor: 'rgba(22,119,255,0.2)', borderColor: '#1677FF',
            onClick: (data) => {
                dialogSelector = ElementPicker.getPreciseSelector(data.element);
                dialogEl.style.visibility = 'visible';
                updateMappingInfo(dialogSelector);
            },
            onCancel: () => { dialogEl.style.visibility = 'visible'; }
        });
    }

    async function saveDialog() {
        if (typeof RequirementManager !== 'undefined') {
            const isOnline = await RequirementManager.checkServer();
            if (!isOnline) {
                showToast('请先在命令行运行 node server/version-server.js 启动服务');
                return;
            }
        }

        if (!pendingText || !dialogSelector) {
            showToast('请选择要关联的元素');
            return;
        }
        const id = addAssociation(pendingText, dialogSelector, dialogColor);

        // 更新 Markdown 内容 - 使用精确替换避免正则模糊匹配
        if (typeof RequirementManager !== 'undefined') {
            const req = RequirementManager.getRequirement(currentPageId);
            if (req && req.content) {
                const idx = req.content.indexOf(pendingText);
                if (idx !== -1) {
                    const replacement = `[[highlight:${dialogSelector}:${dialogColor}]]${pendingText}[[/highlight]]`;
                    req.content = req.content.substring(0, idx) + replacement + req.content.substring(idx + pendingText.length);
                    RequirementManager.setRequirement(currentPageId, req);
                    await RequirementManager.saveToFile();
                }
            }
        }

        closeDialog();
        refreshRequirementView();
    }

    // ==================== 全局事件绑定 ====================
    function bindGlobalEvents() {
        let isSelecting = false;

        mouseDownHandler = (e) => {
            if (toolbarEl && toolbarEl.contains(e.target)) return;
            isSelecting = true;
            hideToolbar();
        };

        mouseUpHandler = () => {
            if (!isSelecting) return;
            isSelecting = false;
            setTimeout(() => {
                if (getSelectionRange()) showToolbar();
            }, 50);
        };

        keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                hideToolbar();
                if (dialogEl) closeDialog();
            }
        };

        selectionChangeHandler = () => {
            const sel = window.getSelection();
            if (sel.isCollapsed && toolbarEl && toolbarEl.classList.contains('tst-show')) {
                hideToolbar();
            }
        };

        document.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('selectionchange', selectionChangeHandler);
    }

    function unbindGlobalEvents() {
        if (mouseDownHandler) document.removeEventListener('mousedown', mouseDownHandler);
        if (mouseUpHandler) document.removeEventListener('mouseup', mouseUpHandler);
        if (keyDownHandler) document.removeEventListener('keydown', keyDownHandler);
        if (selectionChangeHandler) document.removeEventListener('selectionchange', selectionChangeHandler);
        mouseDownHandler = null; mouseUpHandler = null; keyDownHandler = null; selectionChangeHandler = null;
    }

    // ==================== 公共 API ====================
    function init(pageId) {
        if (isInitialized) destroy();
        currentPageId = pageId;
        docContainer = document.querySelector('.req-viewer-content');
        previewContainer = document.getElementById('phoneScreen');
        parseAssociationsFromContent();
        bindGlobalEvents();
        bindDelegatedEvents();
        applyAll();
        isInitialized = true;
    }

    function destroy() {
        unbindGlobalEvents();
        unbindDelegatedEvents();
        hideToolbar();
        clearUndoToast();
        if (toolbarEl) { toolbarEl.remove(); toolbarEl = null; }
        if (dialogEl) { dialogEl.remove(); dialogEl = null; }
        clearTimeout(toastTimer);
        // 清理高亮样式
        if (docContainer) {
            docContainer.querySelectorAll('.mapping-active, .doc-mapping-highlight').forEach(el => {
                el.classList.remove('mapping-active', 'doc-mapping-highlight');
            });
            docContainer.querySelectorAll('[data-mapping-direction]').forEach(el => delete el.dataset.mappingDirection);
        }
        if (previewContainer) {
            previewContainer.querySelectorAll('.mapping-active, .preview-mapping-highlight').forEach(el => {
                el.classList.remove('mapping-active', 'preview-mapping-highlight');
            });
            previewContainer.querySelectorAll('[data-assoc-id]').forEach(el => {
                delete el.dataset.assocId;
                delete el.dataset.mappingDirection;
            });
        }
        currentPageId = null;
        associations = [];
        pendingText = null;
        isInitialized = false;
        docContainer = null;
        previewContainer = null;
    }

    return {
        init,
        destroy,
        addAssociation,
        removeAssociation,
        getAssociations: () => [...associations],
        getAssociation
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssociationManager;
}
