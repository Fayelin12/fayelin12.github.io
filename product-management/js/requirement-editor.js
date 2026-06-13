/**
 * 需求文档编辑器模块
 * 支持Markdown编辑、元素关联高亮、页面跳转
 * 
 * 修复内容：
 * - 修复XSS漏洞：textarea内容转义
 * - 服务器在线检测：编辑前检查Node服务是否运行
 * - 修复定时器内存泄漏
 * - 添加输入长度限制
 * 
 * 关联标记语法：
 * [[highlight:#element-id]] 文本 [[/highlight]] - 高亮预览区元素
 * [[goto:page-id]] 文本 [[/goto]] - 点击跳转到指定页面
 * [[goto:page-id:scenario]] 文本 [[/goto]] - 跳转到指定页面的指定场景
 */

// ============ 配置 ============
const CONFIG = {
    maxContentLength: 500000,  // 500KB
    highlightDuration: 3000
};


// 需求文档数据管理
const RequirementManager = {
    currentPageId: null,
    isEditMode: false,
    dataFilePath: 'data/requirements.json',
    
    // 定时器引用
    timers: new Map(),

    init() {
        this.bindGlobalEvents();
    },

    async checkServer() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('http://localhost:3456/api/versions', {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeout);
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    async saveToFile() {
        try {
            const version = typeof currentVersion !== 'undefined' ? currentVersion : null;
            if (!version) {
                this.showToast('未检测到当前版本，无法保存');
                return false;
            }
            const res = await fetch('http://localhost:3456/api/save-requirements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: version,
                    requirements: versionData[version].requirements || {}
                })
            });
            const result = await res.json();
            if (result.success) {
                this.showToast('已保存到本地文件！');
                return true;
            } else {
                console.error('[saveToFile] 服务器返回错误:', result.error);
                this.showToast('保存失败: ' + result.error);
                return false;
            }
        } catch (err) {
            console.error('[saveToFile] 请求失败:', err);
            this.showToast('无法连接到本地保存服务，请确认已运行 node server.js');
            return false;
        }
    },

    // 显示存储警告
    showStorageWarning() {
        this.showToast('存储空间不足，请清理浏览器数据');
    },

    // 显示提示
    showToast(message) {
        const existingToast = document.getElementById('req-manager-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'req-manager-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
        `;
        document.body.appendChild(toast);

        const timer = setTimeout(() => toast.remove(), 3000);
        this.timers.set('toast', timer);
    },

    // 清理定时器
    cleanup() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
    },

    dataChanged() {
        const version = typeof currentVersion !== 'undefined' ? currentVersion : null;
        const data = version && typeof versionData !== 'undefined' && versionData[version] && versionData[version].requirements
            ? versionData[version].requirements
            : {};
        const event = new CustomEvent('requirementsUpdated', {
            detail: { data: data }
        });
        document.dispatchEvent(event);
    },

    getRequirement(pageId) {
        const version = typeof currentVersion !== 'undefined' ? currentVersion : null;
        if (version && typeof versionData !== 'undefined' && versionData[version] && versionData[version].requirements) {
            return versionData[version].requirements[pageId] || null;
        }
        return null;
    },

    setRequirement(pageId, data) {
        if (data.content && data.content.length > CONFIG.maxContentLength) {
            console.error('[RequirementManager] 内容过长');
            this.showToast('内容过长，请精简');
            return false;
        }
        const version = typeof currentVersion !== 'undefined' ? currentVersion : null;
        if (version && typeof versionData !== 'undefined' && versionData[version]) {
            if (!versionData[version].requirements) {
                versionData[version].requirements = {};
            }
            versionData[version].requirements[pageId] = {
                ...data,
                updatedAt: new Date().toISOString()
            };
            this.dataChanged();
            return true;
        }
        return false;
    },

    getDefaultData() {
        return {};
    },

    exportToJSON() {
        try {
            const version = typeof currentVersion !== 'undefined' ? currentVersion : null;
            const data = version && typeof versionData !== 'undefined' && versionData[version] && versionData[version].requirements
                ? versionData[version].requirements
                : {};
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'requirements.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            return true;
        } catch (e) {
            console.error('[RequirementManager] 导出失败:', e);
            this.showToast('导出失败');
            return false;
        }
    },

    bindGlobalEvents() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.req-link');
            if (link) {
                e.preventDefault();
                const action = link.dataset.action;
                const target = link.dataset.target;
                const extra = link.dataset.extra;

                if (action === 'highlight') {
                    this.highlightElement(target);
                } else if (action === 'goto') {
                    this.gotoPage(target, extra);
                }
            }
        });

        // 高亮链接 hover 联动预览区元素
        let hoverLink = null;
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('.req-highlight-link');
            if (!link) return;
            if (hoverLink === link) return;
            hoverLink = link;
            const selector = link.dataset.target;
            if (selector) {
                this.previewHighlightElement(selector, true);
            }
        });
        document.addEventListener('mouseout', (e) => {
            const link = e.target.closest('.req-highlight-link');
            if (!link) return;
            const related = e.relatedTarget && e.relatedTarget.closest('.req-highlight-link');
            if (related === link) return;
            hoverLink = null;
            const selector = link.dataset.target;
            if (selector) {
                this.previewHighlightElement(selector, false);
            }
        });
    },

    highlightElement(selector) {
        // 防御性解码：处理可能残留的 HTML 实体（如 &gt; -> >）
        if (typeof selector === 'string') {
            selector = selector
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');
        }

        // 清理之前的高亮定时器
        const oldTimer = this.timers.get('highlight');
        if (oldTimer) {
            clearTimeout(oldTimer);
        }

        document.querySelectorAll('.req-highlight').forEach(el => {
            el.classList.remove('req-highlight');
        });

        const phoneScreen = document.getElementById('phoneScreen');
        if (!phoneScreen) return;

        let targetEl = null;

        try {
            if (selector.startsWith('#')) {
                targetEl = phoneScreen.querySelector(selector);
            }
            if (!targetEl) {
                targetEl = phoneScreen.querySelector(`[data-req-id="${selector}"]`);
            }
            if (!targetEl) {
                // 尝试完整 CSS 选择器（如 div:nth-child(3) > div:nth-child(2)）
                targetEl = phoneScreen.querySelector(selector);
            }
            if (!targetEl) {
                // 最后尝试类名选择器（兼容旧数据）
                targetEl = phoneScreen.querySelector(`.${selector}`);
            }
        } catch (e) {
            console.warn('[RequirementManager] 选择器无效:', selector);
            return;
        }

        if (targetEl) {
            targetEl.classList.add('req-highlight');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const timer = setTimeout(() => {
                targetEl.classList.remove('req-highlight');
            }, CONFIG.highlightDuration);

            this.timers.set('highlight', timer);
            console.log('[RequirementManager] 高亮元素:', selector);
        } else {
            console.warn('[RequirementManager] 未找到元素:', selector);
        }
    },

    previewHighlightElement(selector, active) {
        const phoneScreen = document.getElementById('phoneScreen');
        if (!phoneScreen) return;

        // 防御性解码 HTML 实体
        if (typeof selector === 'string') {
            selector = selector
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');
        }

        let targetEl = null;
        try {
            if (selector.startsWith('#')) {
                targetEl = phoneScreen.querySelector(selector);
            }
            if (!targetEl) {
                targetEl = phoneScreen.querySelector(`[data-req-id="${selector}"]`);
            }
            if (!targetEl) {
                // 尝试完整 CSS 选择器
                targetEl = phoneScreen.querySelector(selector);
            }
            if (!targetEl) {
                // 最后尝试类名选择器（兼容旧数据）
                targetEl = phoneScreen.querySelector(`.${selector}`);
            }
        } catch (e) {
            return;
        }

        if (targetEl) {
            targetEl.classList.toggle('req-preview-hover-highlight', active);
        }
    },

    gotoPage(pageId, scenario) {
        console.log('[RequirementManager] 跳转页面:', pageId, scenario || '');
        
        const event = new CustomEvent('requirementGotoPage', {
            detail: { pageId, scenario }
        });
        document.dispatchEvent(event);
    }
};

// 清理历史遗留的 localStorage 数据
function clearLegacyStorage() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('interactionMappings_') || key.startsWith('pageAssociations_') ||
            ['highlightConfigs', 'elementMappings'].includes(key))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('[清理] 已清除所有高亮配置和数据');
}



// 需求文档编辑器组件
const RequirementEditor = {
    pageId: null,
    container: null,
    autoSaveTimer: null,

    init(containerId, pageId) {
        this.container = document.getElementById(containerId);
        this.pageId = pageId;
        
        if (!this.container) {
            console.error('编辑器容器不存在:', containerId);
            return;
        }
        
        this.render();
        this.bindEvents();
    },

    // HTML转义辅助函数
    escapeForTextarea(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    render() {
        const requirement = RequirementManager.getRequirement(this.pageId);
        const content = requirement ? requirement.content : '';

        // 修复XSS：转义内容
        const safeContent = this.escapeForTextarea(content);

        this.container.innerHTML = `
            <div class="req-editor">
                <div class="req-editor-body">
                    <div class="req-editor-input-area" style="flex: 1;">
                        <textarea
                            class="req-editor-textarea"
                            id="reqTextarea"
                            placeholder="使用 Markdown 语法编写需求文档...

示例：
## 标题
**粗体文本**
• 列表项
• 列表项"
                            maxlength="${CONFIG.maxContentLength}"
                        >${safeContent}</textarea>
                    </div>
                </div>
                <div class="req-editor-actions">
                    <button class="req-action-btn" id="reqSaveBtn" title="保存 (Ctrl+S)">
                        <span>💾</span>
                    </button>
                    <button class="req-action-btn" id="reqCloseBtn" title="取消">
                        <span>✕</span>
                    </button>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const textarea = document.getElementById('reqTextarea');
        const saveBtn = document.getElementById('reqSaveBtn');
        const closeBtn = document.getElementById('reqCloseBtn');

        saveBtn?.addEventListener('click', () => this.save());
        closeBtn?.addEventListener('click', () => this.close());

        // 自动保存提示
        textarea?.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => {
                console.log('[RequirementEditor] 内容变更，可手动保存');
            }, 2000);
        });

        // 快捷键支持
        textarea?.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.save();
            }
        });
    },

    save() {
        const textarea = document.getElementById('reqTextarea');
        if (!textarea) return;
        
        const content = textarea.value;
        
        // 长度检查
        if (content.length > CONFIG.maxContentLength) {
            this.showToast('内容过长，请精简');
            return;
        }
        
        const title = this.extractTitle(content) || '需求说明';
        
        const success = RequirementManager.setRequirement(this.pageId, {
            title,
            content,
            sections: this.extractSections(content)
        });
        
        if (success) {
            this.showToast('保存成功！');
            RequirementManager.saveToFile();

            const event = new CustomEvent('requirementSaved', {
                detail: { pageId: this.pageId }
            });
            document.dispatchEvent(event);
            
            // 保存成功后关闭编辑器，切换到查看模式
            this.close();
        }
    },

    preview() {
        const textarea = document.getElementById('reqTextarea');
        if (!textarea) return;
        
        const content = textarea.value;
        const html = MarkdownParser.parse(content);
        
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        if (!previewWindow) {
            this.showToast('弹窗被阻止，请允许弹窗');
            return;
        }
        
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>需求文档预览</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.8; }
                    h2 { color: #1677FF; border-bottom: 2px solid #e8e8e8; padding-bottom: 10px; }
                    h3 { color: #333; margin-top: 30px; }
                    h4 { color: #666; }
                    .req-link { color: #1677FF; cursor: pointer; text-decoration: underline; background: #e6f4ff; padding: 2px 6px; border-radius: 4px; }
                    .req-highlight-link { background: #fff7e6; color: #d46b08; }
                    ul { padding-left: 20px; }
                    li { margin: 8px 0; }
                    strong { color: #333; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `);
    },

    close() {
        // 清理定时器
        clearTimeout(this.autoSaveTimer);
        
        RequirementManager.isEditMode = false;
        
        // 触发关闭事件，让preview.js重新渲染查看模式
        const event = new CustomEvent('requirementEditorClosed', {
            detail: { pageId: this.pageId }
        });
        document.dispatchEvent(event);
        
        // 清空编辑器容器
        if (this.container) {
            this.container.innerHTML = '';
        }
    },

    extractTitle(content) {
        const match = content.match(/^# (.*)$/m);
        return match ? match[1] : null;
    },

    extractSections(content) {
        const sections = [];
        const regex = /^## (.*)$/gm;
        let match;
        let index = 1;
        
        while ((match = regex.exec(content)) !== null) {
            sections.push({
                id: `sec-${index}`,
                title: match[1],
                anchor: `anchor-${index}`
            });
            index++;
        }
        
        return sections;
    },

    showToast(message) {
        const existingToast = document.querySelector('.req-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'req-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
};

// 需求文档查看器组件
const RequirementViewer = {
    render(pageId) {
        const requirement = RequirementManager.getRequirement(pageId);
        
        if (!requirement) {
            return this.renderEmpty(pageId);
        }
        
        const html = MarkdownParser.parse(requirement.content);
        
        return `
            <div class="req-viewer">
                <div class="req-viewer-content">
                    ${html}
                </div>
                <button class="req-edit-btn" id="reqEditBtn" title="编辑需求文档">
                    <span>✏️</span>
                </button>
            </div>
        `;
    },

    renderEmpty(pageId) {
        return `
            <div class="req-viewer req-viewer-empty">
                <div class="req-empty-icon">📝</div>
                <div class="req-empty-title">暂无需求文档</div>
                <div class="req-empty-text">该页面还没有编写需求说明</div>
                <button class="req-btn req-btn-primary" id="reqCreateBtn">创建需求文档</button>
            </div>
        `;
    },

    bindEvents(pageId) {
        const editBtn = document.getElementById('reqEditBtn');
        editBtn?.addEventListener('click', async () => {
            const isRunning = await RequirementManager.checkServer();
            if (!isRunning) {
                RequirementManager.showToast('请先在命令行运行 node server/version-server.js 启动服务');
                return;
            }
            RequirementManager.isEditMode = true;
            const event = new CustomEvent('requirementEditRequested', {
                detail: { pageId }
            });
            document.dispatchEvent(event);
        });
        
        // 关联管理器由 preview.js 统一初始化，避免重复绑定
        
        const createBtn = document.getElementById('reqCreateBtn');
        createBtn?.addEventListener('click', async () => {
            const isRunning = await RequirementManager.checkServer();
            if (!isRunning) {
                RequirementManager.showToast('请先在命令行运行 node server/version-server.js 启动服务');
                return;
            }
            RequirementManager.isEditMode = true;
            const event = new CustomEvent('requirementEditRequested', {
                detail: { pageId }
            });
            document.dispatchEvent(event);
        });
    }
};

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    RequirementManager.cleanup();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RequirementManager, RequirementEditor, RequirementViewer, MarkdownParser };
}
