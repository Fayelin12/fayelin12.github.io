/**
 * 产品预览控制器
 * 负责产品原型的手机预览、需求文档展示、设备缩放等功能
 */

// ==================== 配置常量 ====================
const PREVIEW_CONFIG = {
    DEFAULT_SCALE: 0.9,      // 默认缩放比例
    MIN_SCALE: 0.4,          // 最小缩放比例
    MAX_SCALE: 1,            // 最大缩放比例
    SCALE_STEP: 0.1,         // 缩放步长
    AUTO_SCALE_DELAY: 200,   // 自动缩放延迟（毫秒）
    TOOLBAR_HEIGHT: 60,      // 工具栏高度（像素）
    PADDING: 32,             // 预览区内边距（像素）
    PHONE_PADDING: 12        // 手机壳内边距（像素，6px × 2边）
};


/**
 * HTML 转义工具函数
 * 防止 XSS 攻击，将特殊字符转换为 HTML 实体
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== 依赖检查 ====================
// ⚠️ 数据来源：全局对象（由其他 JS 文件提供）
// - versionData: 来自 data.js，包含所有版本的产品页面数据
// - devices: 来自 devices.js，包含各种设备的尺寸配置
if (typeof versionData === 'undefined') {
    console.error('[preview.js] versionData 未定义，请检查 data.js 是否在之前引入');
}
if (typeof devices === 'undefined') {
    console.error('[preview.js] devices 未定义，请检查 devices.js 是否在之前引入');
    // 提供默认值避免崩溃
    window.devices = {
        iphone14: { width: 390, height: 844 },
        iphoneSE: { width: 375, height: 667 },
        pixel7: { width: 416, height: 912 }
    };
}


// ==================== 版本数据验证与辅助函数 ====================

/**
 * 获取所有可用版本列表
 * 过滤掉无效版本数据（pages 为空或不存在）
 * @returns {Array<string>} 可用版本标识数组
 */
function getAvailableVersions() {
    if (typeof versionData === 'undefined' || !versionData) {
        console.error('[preview.js] versionData 未定义，无法获取版本列表');
        return [];
    }
    return Object.keys(versionData).filter(v => {
        const vd = versionData[v];
        return vd && vd.pages && Array.isArray(vd.pages) && vd.pages.length > 0;
    });
}

/**
 * 获取默认版本
 * 优先选择包含"线上"标签的版本，否则返回第一个可用版本
 * @returns {string|null} 默认版本标识，无可用版本时返回 null
 */
function getDefaultVersion() {
    const available = getAvailableVersions();
    if (available.length === 0) {
        console.error('[preview.js] 没有可用的版本数据');
        return null;
    }
    // 优先查找描述包含"线上"/"online"/"当前"的版本
    const onlineVersion = available.find(v => {
        const desc = (getVersionDisplayInfo(v).description || '').toLowerCase();
        return desc.includes('线上') || desc.includes('online') || desc.includes('当前');
    });
    const defaultVersion = onlineVersion || available[0];
    // console.log('[preview.js] 默认版本:', defaultVersion, onlineVersion ? '(线上版本)' : '(第一个可用版本)');
    return defaultVersion;
}

/**
 * 验证并清理版本数据
 * 移除 versionData 中无效的版本条目（如 extraVersions 中已被删除的版本）
 */
function validateVersionData() {
    if (typeof versionData === 'undefined' || !versionData) {
        console.error('[preview.js] versionData 未定义，无法验证');
        return;
    }
    const versions = Object.keys(versionData);
    let cleanedCount = 0;
    for (const v of versions) {
        const vd = versionData[v];
        if (!vd || !vd.pages || !Array.isArray(vd.pages) || vd.pages.length === 0) {
            console.warn('[preview.js] 清理无效版本数据:', v);
            delete versionData[v];
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        // console.log('[preview.js] 已清理', cleanedCount, '个无效版本，剩余版本:', getAvailableVersions());
    }
}

// ==================== 全局状态 ====================
// 需求文档编辑器开关
let requirementEditorEnabled = true;

// 防抖定时器引用（便于清理）
let resizeTimer = null;

// 事件处理器引用（便于清理）
const eventHandlers = {};

// ==================== 版本管理 ====================
/**
 * 切换产品版本
 * @param {string} version - 版本标识（如 'v1.0.4'）
 * @returns {void}
 * @throws {Error} 当版本不存在时记录错误日志
 * 
 * 💡 数据来源说明：
 * - versionData: 来自 data.js，存储所有版本的产品页面配置
 * - pages: 从 versionData[version].pages 获取，包含页面树结构
 * 
 * @example
 * switchVersion('v1.0.4'); // 切换到 V1.0.4 版本
 */
function switchVersion(version) {
    try {
        // 先验证版本数据有效性
        validateVersionData();
        
        if (!versionData || Object.keys(versionData).length === 0) {
            console.error('[preview.js] versionData 为空，无法切换版本');
            return;
        }
        
        // 如果版本不存在，回退到默认版本（动态获取，而非硬编码）
        if (!versionData[version]) {
            const defaultVersion = getDefaultVersion();
            if (!defaultVersion) {
                console.error('[preview.js] 没有可用的默认版本，无法切换');
                return;
            }
            console.warn('[preview.js] 版本不存在:', version, '回退到默认版本:', defaultVersion);
            version = defaultVersion;
        }
        
        // 检查目标版本是否有有效页面数据
        if (!versionData[version].pages || !Array.isArray(versionData[version].pages) || versionData[version].pages.length === 0) {
            console.error('[preview.js] 版本', version, '没有有效的页面数据');
            return;
        }

        currentVersion = version;
        // ⚠️ 从外部 data.js 的 versionData 对象中获取页面数据
        pages = versionData[version].pages;
        // 重置到第一个页面
        currentPageId = pages[0].children ? pages[0].children[0].id : pages[0].id;
        activeTab = 'requirements';
        
        // 重新渲染版本选择器，确保下拉框反映最新状态
        const versionContainer = document.getElementById('versionSelectorContainer');
        if (versionContainer) {
            versionContainer.innerHTML = renderVersionSelector();
            // 重新绑定版本切换事件
            const versionSelect = document.getElementById('versionSelect');
            if (versionSelect) {
                versionSelect.value = currentVersion;
                versionSelect.addEventListener('change', (e) => {
                    switchVersion(e.target.value);
                });
            }
        }
        
        renderPageList();
        updatePreview();
        console.log('[preview.js] 已切换到版本:', version);
    } catch (error) {
        console.error('[preview.js] switchVersion 失败:', error);
    }
}

/**
 * 渲染版本选择器下拉框
 * @returns {string} HTML 字符串
 * 
 * 💡 数据来源：versionData（来自 data.js）
 */
function renderVersionSelector() {
    const versions = Object.keys(versionData);
    return `
        <div class="version-selector-wrapper" style="padding: 12px 16px; border-bottom: 1px solid var(--color-border-light); background: var(--color-bg-secondary);">
            <select id="versionSelect" class="version-selector">
                ${versions.map(v => {
                    const info = getVersionDisplayInfo(v);
                    return `
                    <option value="${v}" ${v === currentVersion ? 'selected' : ''}>
                        ${info.label} - ${info.description}
                    </option>
                    `;
                }).join('')}
            </select>
        </div>
    `;
}

// ==================== 需求文档数据 ====================
/**
 * 获取页面的需求文档
 * @param {string} pageId - 页面 ID（如 'step1-info-normal'）
 * @returns {Object|null} 需求文档对象，包含 title 和 sections 属性
 * @returns {string} return.title - 需求文档标题
 * @returns {Array} return.sections - 需求章节数组
 * 
 * 💡 数据来源说明：
 * - 统一由 RequirementManager 管理（来自 requirement-editor.js）
 * - RequirementManager 从 versionData 内存对象读取需求文档
 * - 数据保存在 js/versions/vX.X.X.js 文件中，通过 Node 服务器 API 持久化
 * 
 * 📦 数据流转：
 * versionData[version].requirements → RequirementManager.getRequirement() → 此函数 → renderRequirementsContent()
 * 
 * @example
 * const req = getPageRequirements('step1-info-normal');
 * if (req) {
 *     console.log(req.title); // "车牌页需求说明"
 *     console.log(req.sections.length); // 7
 * }
 */
function getPageRequirements(pageId) {
    // ⚠️ 从外部 requirement-editor.js 的 RequirementManager 获取数据
    if (requirementEditorEnabled && typeof RequirementManager !== 'undefined') {
        const req = RequirementManager.getRequirement(pageId);
        if (req) {
            return {
                title: req.title,
                sections: req.sections || []
            };
        }
    }
    return null;
}

/**
 * 检查页面是否有需求文档
 * @param {string} pageId - 页面 ID（如 'step1-info-normal'）
 * @returns {boolean} 是否存在需求文档，true 表示有，false 表示无
 * 
 * 💡 数据来源：RequirementManager（来自 requirement-editor.js），从 versionData 读取
 * 
 * @example
 * if (hasRequirements('step1-info-normal')) {
 *     // 显示需求文档标签
 * }
 */
function hasRequirements(pageId) {
    // ⚠️ 从外部 requirement-editor.js 的 RequirementManager 获取数据
    if (requirementEditorEnabled && typeof RequirementManager !== 'undefined') {
        return !!RequirementManager.getRequirement(pageId);
    }
    return false;
}


// ==================== 当前状态 ====================
let currentDevice = 'iphone14';
let currentScale = PREVIEW_CONFIG.DEFAULT_SCALE;
let activeTab = 'requirements';

// DOM 元素引用（延迟获取）
let pageListEl, phoneScreenEl, phoneMockupEl, deviceSelectEl;
let scenarioTabsEl, explanationContentEl, zoomInBtn, zoomOutBtn, scaleValueEl;

// ==================== DOM 操作 ====================
/**
 * 获取所有需要的 DOM 元素引用
 * 
 * 💡 数据来源：HTML 文件（preview.html）中的元素 ID
 */
function getElements() {
    pageListEl = document.getElementById('pageList');
    phoneScreenEl = document.getElementById('phoneScreen');
    phoneMockupEl = document.getElementById('phoneMockup');
    deviceSelectEl = document.getElementById('deviceSelect');
    scenarioTabsEl = document.getElementById('scenarioTabs');
    explanationContentEl = document.getElementById('explanationContent');
    zoomInBtn = document.getElementById('zoomIn');
    zoomOutBtn = document.getElementById('zoomOut');
    scaleValueEl = document.getElementById('scaleValue');
}

/**
 * 初始化应用
 * 
 * 💡 数据来源：
 * - pages: 来自 data.js 的 versionData[currentVersion].pages
 */
function init() {
    try {
        // 验证并清理版本数据（处理 extraVersions 中可能已删除的无效版本）
        validateVersionData();

        // Schema 版本数据已由 v1.0.4.schema.js 直接填充到 versionData，无需合并
        if (typeof versionDataSchema !== 'undefined' && versionDataSchema) {
            console.log('[preview.js] Schema 版本数据已就绪');
        }
        
        // 获取默认版本，用于后续回退
        const defaultVersion = getDefaultVersion();
        if (!defaultVersion) {
            console.error('[preview.js] 没有可用的版本数据，无法初始化');
            return;
        }

        // 检查当前 pages 是否有效，如果无效则使用默认版本
        if (!pages || pages.length === 0) {
            console.warn('[preview.js] pages 数组为空，尝试使用默认版本:', defaultVersion);
            currentVersion = defaultVersion;
            pages = versionData[defaultVersion].pages;
        }

        // 检查当前版本是否仍有效（可能已被删除）
        if (!currentVersion || !versionData[currentVersion]) {
            console.warn('[preview.js] 当前版本无效或已被删除，回退到默认版本:', defaultVersion);
            currentVersion = defaultVersion;
            pages = versionData[defaultVersion].pages;
        }

        // 从 URL 参数读取目标版本
        const urlParams = new URLSearchParams(window.location.search);
        const targetVersion = urlParams.get('version');
        if (targetVersion) {
            if (versionData[targetVersion]) {
                currentVersion = targetVersion;
                pages = versionData[targetVersion].pages;
                console.log('[preview.js] 已从 URL 参数切换版本:', targetVersion);
            } else {
                // URL 版本不存在，回退到默认版本
                console.warn('[preview.js] URL 参数中的版本不存在:', targetVersion, '回退到:', defaultVersion);
                currentVersion = defaultVersion;
                pages = versionData[defaultVersion].pages;
            }
        }

        // 最终检查 pages 是否有效
        if (!pages || pages.length === 0) {
            console.error('[preview.js] pages 数组为空，初始化失败');
            return;
        }

        getElements();
        // 初始化 currentPageId（确保 pages 已加载）
        currentPageId = pages[0].children ? pages[0].children[0].id : pages[0].id;
        
        // 渲染版本选择器
        const versionContainer = document.getElementById('versionSelectorContainer');
        if (versionContainer) {
            versionContainer.innerHTML = renderVersionSelector();
            // 绑定版本切换事件
            const versionSelect = document.getElementById('versionSelect');
            if (versionSelect) {
                versionSelect.addEventListener('change', (e) => {
                    switchVersion(e.target.value);
                });
            }
        }
        
        renderPageList();
        bindEvents();
        updatePreview();
        // 延迟执行自动缩放，确保 DOM 已渲染
        setTimeout(autoScale, PREVIEW_CONFIG.AUTO_SCALE_DELAY);
        // console.log('[preview.js] 初始化完成，当前版本:', currentVersion);
    } catch (error) {
        console.error('[preview.js] init 失败:', error);
    }
}

// ==================== 缩放控制 ====================
/**
 * 自动缩放 - 根据容器大小自动调整手机预览尺寸
 * @returns {void}
 * 
 * 💡 数据来源：
 * - devices: 来自 devices.js，包含设备尺寸配置
 * - PREVIEW_CONFIG: 配置常量，包含缩放参数
 * 
 * 📐 计算逻辑：
 * 1. 获取预览区可用空间
 * 2. 计算合适的缩放比例
 * 3. 应用缩放变换
 * 
 * @example
 * // 窗口大小变化时自动调用
 * window.addEventListener('resize', autoScale);
 */
function autoScale() {
    try {
        const previewArea = document.querySelector('.preview-area');
        const phoneMockup = document.getElementById('phoneMockup');
        if (!previewArea || !phoneMockup) {
            console.log('[preview.js] autoScale: 找不到元素', { previewArea, phoneMockup });
            return;
        }

    // 获取预览区可用空间（减去工具栏和 padding）
    const availableHeight = previewArea.clientHeight - PREVIEW_CONFIG.TOOLBAR_HEIGHT - PREVIEW_CONFIG.PADDING;
    const availableWidth = previewArea.clientWidth - PREVIEW_CONFIG.PADDING;

    // ⚠️ 从外部 devices.js 的设备配置中获取实际尺寸
    const device = devices[currentDevice] || devices.iphone14;
    const phoneFrameWidth = device.width + PREVIEW_CONFIG.PHONE_PADDING;
    const phoneFrameHeight = device.height + PREVIEW_CONFIG.PHONE_PADDING;

    // console.log('[preview.js] autoScale 计算:', {
    //     availableHeight,
    //     availableWidth,
    //     phoneFrameWidth,
    //     phoneFrameHeight
    // });

    // 计算合适的缩放比例
    const scaleH = availableHeight / phoneFrameHeight;
    const scaleW = availableWidth / phoneFrameWidth;
    let scale = Math.min(scaleH, scaleW);

    // 限制缩放范围：最小 40%，最大 100%
    currentScale = Math.max(PREVIEW_CONFIG.MIN_SCALE, Math.min(PREVIEW_CONFIG.MAX_SCALE, Math.round(scale * 10) / 10));

    // console.log('[preview.js] autoScale 结果:', { scaleH, scaleW, currentScale });

        applyScale();
    } catch (error) {
        console.error('[preview.js] autoScale 失败:', error);
    }
}

/**
 * 应用缩放效果
 * 
 * 💡 数据来源：devices（来自 devices.js）
 */
function applyScale() {
    const phoneMockup = document.getElementById('phoneMockup');
    const scaleValue = document.getElementById('scaleValue');

    if (phoneMockup) {
        // ⚠️ 从外部 devices.js 的设备配置中获取实际尺寸
        const device = devices[currentDevice] || devices.iphone14;
        const originalWidth = device.width + PREVIEW_CONFIG.PHONE_PADDING;
        const originalHeight = device.height + PREVIEW_CONFIG.PHONE_PADDING;
        
        // 应用缩放变换
        phoneMockup.style.transform = `scale(${currentScale})`;
        
        // 使用负 margin 抵消缩放后多余的空间
        // 这样预览区高度会跟随手机壳等比例缩小
        const heightReduction = originalHeight * (1 - currentScale);
        phoneMockup.style.marginBottom = `-${heightReduction}px`;
        
        // console.log('[preview.js] applyScale: 已应用缩放', currentScale, {
        //     originalHeight,
        //     heightReduction,
        //     effectiveHeight: originalHeight * currentScale
        // });
    } else {
        // console.log('[preview.js] applyScale: 找不到 phoneMockup');
    }

    if (scaleValue) {
        scaleValue.textContent = `${Math.round(currentScale * 100)}%`;
    }
}

/**
 * 放大一级 - 增加手机预览的缩放比例
 * @returns {void}
 * @see PREVIEW_CONFIG.MAX_SCALE - 最大缩放限制
 * 
 * @example
 * // 点击放大按钮时调用
 * zoomIn(); // 从 90% 放大到 100%
 */
function zoomIn() {
    if (currentScale < PREVIEW_CONFIG.MAX_SCALE) {
        currentScale = Math.min(PREVIEW_CONFIG.MAX_SCALE, currentScale + PREVIEW_CONFIG.SCALE_STEP);
        applyScale();
    }
}

/**
 * 缩小一级 - 减小手机预览的缩放比例
 * @returns {void}
 * @see PREVIEW_CONFIG.MIN_SCALE - 最小缩放限制
 * 
 * @example
 * // 点击缩小按钮时调用
 * zoomOut(); // 从 100% 缩小到 90%
 */
function zoomOut() {
    if (currentScale > PREVIEW_CONFIG.MIN_SCALE) {
        currentScale = Math.max(PREVIEW_CONFIG.MIN_SCALE, currentScale - PREVIEW_CONFIG.SCALE_STEP);
        applyScale();
    }
}

// ==================== 渲染函数 ====================
/**
 * 渲染页面列表 - 在左侧边栏显示页面树结构
 * @returns {void}
 * 
 * 💡 数据来源：pages（来自 data.js 的 versionData[currentVersion].pages）
 * 
 * 🌲 支持层级结构：
 * - 一级：文件夹（isFolder: true）
 * - 二级：页面（isFolder: false）
 * 
 * @example
 * // 初始化或切换版本后调用
 * renderPageList();
 */
function renderPageList() {
    try {
        function renderItem(item, level = 0) {
        const indent = level * 20;

        if (item.isFolder) {
            // 文件夹/一级菜单
            return `
                <li class="page-folder" style="padding-left: ${indent}px;">
                    <div class="page-item-icon">${item.icon}</div>
                    <span class="page-name">${item.name}</span>
                </li>
                ${item.children ? item.children.map(child => renderItem(child, level + 1)).join('') : ''}
            `;
        } else {
            // 普通页面/二级菜单 - 字号稍小
            const fontSize = level > 0 ? '0.875rem' : '0.9375rem';
            return `
                <li class="page-item ${item.id === currentPageId ? 'active' : ''}"
                    data-page-id="${item.id}"
                    style="padding-left: ${indent}px;">
                    <div class="page-icon">${item.icon}</div>
                    <span class="page-name" style="font-size: ${fontSize};">${item.name}</span>
                </li>
            `;
        }
    }

    // ⚠️ 从外部 data.js 的 pages 数组中获取页面数据
    pageListEl.innerHTML = pages.map(page => renderItem(page)).join('');
    } catch (error) {
        console.error('[preview.js] renderPageList 失败:', error);
    }
}

/**
 * 获取当前页面（支持层级结构）
 * @returns {Object|null} 页面对象
 * 
 * 💡 数据来源：pages（来自 data.js）
 */
function getCurrentPage() {
    function findPage(items) {
        for (const item of items) {
            if (item.id === currentPageId) {
                return item;
            }
            if (item.children) {
                const found = findPage(item.children);
                if (found) return found;
            }
        }
        return null;
    }
    return findPage(pages);
}

// 场景名称映射
const scenarioNames = {
    normal: '正常',
    loading: '加载中',
    uploading: '上传中',
    uploaded: '已上传',
    success: '成功',
    error: '异常',
    empty: '空状态'
};

/**
 * 更新场景切换按钮
 * @param {Object} page - 页面对象
 * @param {boolean} [pageHasRequirements] - 是否已有需求文档（可选，传入可避免重复计算）
 *
 * 💡 数据来源：
 * - page.scenarios: 来自 data.js 的页面数据结构
 */
function updateScenarioTabs(page, pageHasRequirements) {
    if (!page || !page.scenarios) return;

    // 只保留需求文档，删除场景切换功能
    if (typeof pageHasRequirements !== 'boolean') {
        pageHasRequirements = hasRequirements(currentPageId);
    }

    // 生成 tabs：只显示需求文档
    let tabsHtml = '';

    if (pageHasRequirements) {
        tabsHtml += `
            <button class="tab-btn active" data-tab="requirements">
                需求文档
            </button>
        `;
    }

    scenarioTabsEl.innerHTML = tabsHtml;
}

/**
 * 渲染手机状态栏 HTML
 * @returns {string} HTML 字符串
 * 
 * 💡 数据来源：系统时间（new Date()）
 */
function renderStatusBar() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    return `
        <div class="phone-status-bar">
            <div class="status-time">${time}</div>
            <div class="status-icons">
                <div class="status-signal">
                    <div class="signal-bar"></div>
                    <div class="signal-bar"></div>
                    <div class="signal-bar"></div>
                    <div class="signal-bar"></div>
                </div>
                <div class="status-wifi"></div>
                <div class="status-battery">
                    <div class="battery-body">
                        <div class="battery-level"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染手机导航栏 HTML
 * @param {string} title - 页面标题
 * @returns {string} HTML 字符串
 */
function renderNavBar(title) {
    const pageTitle = title || '官方 ETC';
    return `
        <div class="am-nav-bar">
            <div class="am-nav-bar__back">&lt;</div>
            <div class="am-nav-bar__title">${escapeHtml(pageTitle)}</div>
            <div class="am-nav-bar__capsule">
                <div class="am-nav-bar__capsule-left"></div>
                <div class="am-nav-bar__capsule-divider"></div>
                <div class="am-nav-bar__capsule-right"></div>
            </div>
        </div>
    `;
}

/**
 * 渲染需求文档内容
 * @returns {string} HTML 字符串
 * 
 * 💡 数据来源说明：
 * - RequirementViewer.render(): 来自 requirement-editor-fixed.js，从 localStorage 读取数据
 * - 如果没有需求文档，显示默认提示文本
 */
function renderRequirementsContent() {
    // ⚠️ 从外部 requirement-editor-fixed.js 的 RequirementViewer 获取渲染方法
    if (requirementEditorEnabled && typeof RequirementViewer !== 'undefined') {
        return RequirementViewer.render(currentPageId);
    }
    
    // 没有需求文档时的默认显示
    return `
        <div class="explanation-title">
            <span>📋</span>
            需求文档
        </div>
        <div class="explanation-text">
            <p>该页面暂无需求文档。</p>
        </div>
    `;
}

/**
 * 渲染场景讲解内容
 * @param {Object} scenario - 场景对象
 * @returns {string} HTML 字符串
 * 
 * 💡 数据来源：page.scenarios（来自 data.js 的页面数据结构）
 */
function renderScenarioContent(scenario) {
    return `
        <div class="explanation-title">
            <span>📱</span>
            ${scenario.title}
        </div>
        <div class="explanation-text">
            <p>${scenario.description || '该场景展示了页面在' + (scenario.title.includes('异常') ? '异常情况' : '正常情况') + '下的表现。'}</p>
        </div>
        <div class="tips-list">
            <h4>交互要点</h4>
            <ul>
                ${scenario.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>
    `;
}

// ==================== 预览更新 ====================
/**
 * 更新预览内容 - 根据当前页面重新渲染手机预览和需求文档
 * @returns {void}
 * 
 * 💡 数据来源：
 * - page.scenarios: 来自 data.js 的页面数据结构
 * - scenario.schema: JSON Schema 对象（通过 SchemaToHtml 渲染为 HTML）
 * - RequirementViewer: 来自 requirement-editor-fixed.js，用于渲染需求文档
 * 
 * 🔄 更新内容：
 * 1. 场景切换按钮
 * 2. 手机预览内容
 * 3. 需求文档内容
 * 4. 页面列表高亮状态
 * 
 * @example
 * // 切换页面后调用
 * currentPageId = 'step1-info-normal';
 * updatePreview();
 */
function updatePreview() {
    try {
        const page = getCurrentPage();
        if (!page) return;

        const hasReq = hasRequirements(currentPageId);

        // 更新场景切换按钮（现在只显示需求文档）
        updateScenarioTabs(page, hasReq);

    // ⚠️ 从外部 data.js 的页面场景中获取第一个场景用于预览
    const scenarios = Object.keys(page.scenarios || {});
    const scenario = scenarios.length > 0 ? page.scenarios[scenarios[0]] : null;
    if (!scenario) {
        console.warn('[preview.js] 页面没有定义场景:', currentPageId);
        phoneScreenEl.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                该页面暂无预览内容
            </div>
        `;
        return;
    }

    // 获取页面标题
    const pageTitle = page.stepName || page.name;

    // ⚠️ 手机壳内的页面 CSS 和 HTML 内容来源：
    // scenario.schema（JSON Schema 对象）→ 通过 SchemaToHtml.render() 渲染为 HTML
    let pageContent = '';

    if (scenario.schema && typeof SchemaToHtml !== 'undefined') {
        try {
            pageContent = SchemaToHtml.render(scenario.schema);
            console.log('[preview.js] 使用 Schema 格式渲染:', currentPageId, scenario.title || '');
        } catch (e) {
            console.error('[preview.js] Schema 渲染失败:', e);
            pageContent = '<div style="padding:20px;color:#999;">页面渲染失败</div>';
        }
    } else {
        console.warn('[preview.js] 页面无 Schema 数据:', currentPageId);
        pageContent = '<div style="padding:20px;color:#999;">该页面暂无预览内容</div>';
    }

    // 组装完整的小程序风格页面（状态栏 + 导航栏 + 页面内容）
    // 注意：v1.0.4 数据已重构为纯 am-* 类名，无需 upgradeToAlipayStyle
    const alipayPageHtml = typeof AlipayUIRenderer !== 'undefined'
      ? AlipayUIRenderer.renderPage(pageContent, {
          title: '官方 ETC',
          showBack: true,
          backgroundColor: '#f5f5f5'
        })
      : `${renderStatusBar()}${renderNavBar(pageTitle)}<div class="prototype-content">${pageContent}</div>`;

    phoneScreenEl.innerHTML = alipayPageHtml + '<div class="phone-home-indicator"></div>';

    // 只显示需求文档
    if (hasReq) {
        // ⚠️ 需求文档内容来自 RequirementViewer（requirement-editor.js），数据来自 versionData 文件
        explanationContentEl.innerHTML = renderRequirementsContent();
        if (requirementEditorEnabled && typeof RequirementViewer !== 'undefined') {
            RequirementViewer.bindEvents(currentPageId);
        }
    } else {
        explanationContentEl.innerHTML = '<div class="req-viewer-empty"><div class="req-empty-text">暂无需求文档</div></div>';
    }

    // 初始化关联管理器（页面切换时自动清理旧状态）
    if (typeof AssociationManager !== 'undefined') {
        AssociationManager.init(currentPageId);
    }

    // 更新页面列表高亮
        document.querySelectorAll('.page-item').forEach(item => {
            item.classList.toggle('active', item.dataset.pageId === currentPageId);
        });
    } catch (error) {
        console.error('[preview.js] updatePreview 失败:', error);
    }
}

/**
 * 应用设备尺寸
 * 
 * 💡 数据来源：devices（来自 devices.js）
 */
function applyDevice() {
    // ⚠️ 从外部 devices.js 的设备配置中获取尺寸
    const device = devices[currentDevice];
    if (device && phoneScreenEl) {
        phoneScreenEl.style.width = `${device.width}px`;
        phoneScreenEl.style.height = `${device.height}px`;
    }
}

// ==================== 事件绑定 ====================
/**
 * 绑定所有交互事件
 */
function bindEvents() {
    // 页面列表点击
    eventHandlers.pageListClick = (e) => {
        const pageItem = e.target.closest('.page-item');
        if (pageItem) {
            currentPageId = pageItem.dataset.pageId;
            // 切换页面时，如果有需求文档则默认选中需求文档 tab
            if (hasRequirements(currentPageId)) {
                activeTab = 'requirements';
            } else {
                activeTab = 'scenario';
            }
            updatePreview();
        }
    };
    pageListEl.addEventListener('click', eventHandlers.pageListClick);

    // 需求文档编辑器事件监听
    if (requirementEditorEnabled) {
        // 监听编辑请求
        eventHandlers.requirementEditRequested = (e) => {
            const { pageId } = e.detail;
            openRequirementEditor(pageId);
        };
        document.addEventListener('requirementEditRequested', eventHandlers.requirementEditRequested);

        // 监听保存事件
        eventHandlers.requirementSaved = (e) => {
            const { pageId } = e.detail;
            if (pageId === currentPageId) {
                updatePreview();
            }
        };
        document.addEventListener('requirementSaved', eventHandlers.requirementSaved);

        // 监听跳转事件
        eventHandlers.requirementGotoPage = (e) => {
            const { pageId } = e.detail;
            currentPageId = pageId;
            activeTab = 'requirements';
            renderPageList();
            updatePreview();
        };
        document.addEventListener('requirementGotoPage', eventHandlers.requirementGotoPage);

        // 监听编辑器关闭
        eventHandlers.requirementEditorClosed = (e) => {
            // 切换到需求文档标签
            activeTab = 'requirements';
            // 更新标签按钮状态
            updateScenarioTabs(getCurrentPage());
            updatePreview();
        };
        document.addEventListener('requirementEditorClosed', eventHandlers.requirementEditorClosed);
    }

    // Tab 点击（现在只有需求文档，无需切换逻辑）
    eventHandlers.scenarioTabsClick = (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        // 现在只有需求文档，不需要切换逻辑
    };
    scenarioTabsEl.addEventListener('click', eventHandlers.scenarioTabsClick);

    // 设备切换
    eventHandlers.deviceSelectChange = (e) => {
        currentDevice = e.target.value;
        applyDevice();
    };
    deviceSelectEl.addEventListener('change', eventHandlers.deviceSelectChange);

    // 车牌页手机号提示事件委托监听
    eventHandlers.phoneScreenInput = (e) => {
        if (!e.target.matches('[data-input-name], [data-input-phone]')) return;
        const nameInput = phoneScreenEl.querySelector('[data-input-name]');
        const phoneInput = phoneScreenEl.querySelector('[data-input-phone]');
        const tipEl = phoneScreenEl.querySelector('[data-phone-tip]');
        if (!nameInput || !phoneInput || !tipEl) return;
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        if (name && phone) {
            tipEl.textContent = `请确认手机号是${name}本人身份证办理，系统会自动核验是否一致`;
            tipEl.style.display = '';
        } else {
            tipEl.style.display = 'none';
        }
    };
    if (phoneScreenEl) phoneScreenEl.addEventListener('input', eventHandlers.phoneScreenInput);

    // 缩放控制
    eventHandlers.zoomInClick = zoomIn;
    eventHandlers.zoomOutClick = zoomOut;
    if (zoomInBtn) zoomInBtn.addEventListener('click', eventHandlers.zoomInClick);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', eventHandlers.zoomOutClick);

    // 窗口大小变化时自动缩放（带防抖）
    eventHandlers.windowResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resizeTimer = null;
            autoScale();
        }, 200);
    };
    window.addEventListener('resize', eventHandlers.windowResize);
}

/**
 * 打开需求文档编辑器
 * @param {string} pageId - 页面 ID
 * 
 * 💡 数据来源：RequirementEditor（来自 requirement-editor-fixed.js）
 */
function openRequirementEditor(pageId) {
    if (typeof RequirementEditor === 'undefined') {
        console.error('[preview.js] RequirementEditor 未加载');
        return;
    }
    
    // 在讲解区显示编辑器
    explanationContentEl.innerHTML = '<div id="requirementEditorContainer" style="height: 100%;"></div>';
    RequirementEditor.init('requirementEditorContainer', pageId);
}

/**
 * 初始化需求文档编辑器
 * 
 * 💡 数据来源：RequirementManager（来自 requirement-editor-fixed.js）
 */
function initRequirementEditor() {
    if (typeof RequirementManager !== 'undefined') {
        RequirementManager.init();
        // console.log('[preview.js] 需求文档编辑器已初始化');
    }
}

/**
 * 清理资源 - 页面卸载时调用
 * 用于清理定时器、事件监听等资源
 */
function cleanup() {
    if (resizeTimer) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
    }

    if (eventHandlers.pageListClick && pageListEl) {
        pageListEl.removeEventListener('click', eventHandlers.pageListClick);
    }
    if (eventHandlers.requirementEditRequested) {
        document.removeEventListener('requirementEditRequested', eventHandlers.requirementEditRequested);
    }
    if (eventHandlers.requirementSaved) {
        document.removeEventListener('requirementSaved', eventHandlers.requirementSaved);
    }
    if (eventHandlers.requirementGotoPage) {
        document.removeEventListener('requirementGotoPage', eventHandlers.requirementGotoPage);
    }
    if (eventHandlers.requirementEditorClosed) {
        document.removeEventListener('requirementEditorClosed', eventHandlers.requirementEditorClosed);
    }
    if (eventHandlers.scenarioTabsClick && scenarioTabsEl) {
        scenarioTabsEl.removeEventListener('click', eventHandlers.scenarioTabsClick);
    }
    if (eventHandlers.deviceSelectChange && deviceSelectEl) {
        deviceSelectEl.removeEventListener('change', eventHandlers.deviceSelectChange);
    }
    if (eventHandlers.zoomInClick && zoomInBtn) {
        zoomInBtn.removeEventListener('click', eventHandlers.zoomInClick);
    }
    if (eventHandlers.zoomOutClick && zoomOutBtn) {
        zoomOutBtn.removeEventListener('click', eventHandlers.zoomOutClick);
    }
    if (eventHandlers.windowResize) {
        window.removeEventListener('resize', eventHandlers.windowResize);
    }

    if (eventHandlers.phoneScreenInput && phoneScreenEl) {
        phoneScreenEl.removeEventListener('input', eventHandlers.phoneScreenInput);
    }

    // console.log('[preview.js] 资源已清理');
}

// 页面卸载时自动清理资源
window.addEventListener('beforeunload', cleanup);

// ==================== 启动 ====================
init();
applyDevice();
initRequirementEditor();
updatePreview();

// console.log('[preview.js] 优化版已加载完成');

