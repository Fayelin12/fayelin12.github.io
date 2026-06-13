/**
 * Element Picker - 轻量级DOM元素选择器
 * 基于 https://github.com/jamesbechet/element-picker 简化改造
 */

const ElementPicker = (function() {
    'use strict';

    let config = {
        backgroundColor: 'rgba(255, 193, 7, 0.3)',  // 默认黄色半透明
        borderColor: '#FFC107',
        borderWidth: '2px',
        borderStyle: 'solid',
        zIndex: 10000,
        onHover: null,      // 悬停回调
        onClick: null,      // 点击回调
        onCancel: null      // 取消回调
    };

    let isActive = false;
    let hoveredElement = null;
    let highlightBox = null;
    let originalOutline = null;

    // 创建高亮框
    function createHighlightBox() {
        const box = document.createElement('div');
        box.id = 'element-picker-highlight';
        box.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: ${config.zIndex};
            background: ${config.backgroundColor};
            border: ${config.borderWidth} ${config.borderStyle} ${config.borderColor};
            border-radius: 4px;
            transition: all 0.1s ease;
            display: none;
        `;
        document.body.appendChild(box);
        return box;
    }

    // 更新高亮框位置
    function updateHighlightBox(element) {
        if (!element || !highlightBox) return;
        
        const rect = element.getBoundingClientRect();
        highlightBox.style.display = 'block';
        highlightBox.style.top = rect.top + 'px';
        highlightBox.style.left = rect.left + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
    }

    // 隐藏高亮框
    function hideHighlightBox() {
        if (highlightBox) {
            highlightBox.style.display = 'none';
        }
    }

    // 获取元素选择器
    function getElementSelector(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
        
        // 优先使用 id
        if (element.id) {
            return '#' + CSS.escape(element.id);
        }
        
        // 使用 class（过滤掉空字符串和无效class）
        if (element.className && typeof element.className === 'string') {
            const classes = element.className
                .split(/\s+/)
                .filter(c => c && c.trim() && /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(c));
            if (classes.length > 0) {
                return '.' + CSS.escape(classes[0]);
            }
        }
        
        // 使用 tag + nth-child
        const tag = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(element) + 1;
                return `${tag}:nth-child(${index})`;
            }
        }
        
        return tag;
    }

    // 获取完整路径选择器
    function getFullSelector(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

        const path = [];
        let current = element;

        while (current && current !== document.body && current !== document.documentElement) {
            let selector = getElementSelector(current);
            if (selector) {  // 只添加有效的选择器
                path.unshift(selector);
            }
            current = current.parentElement;
        }

        return path.join(' > ');
    }

    // 获取更精确的选择器（包含父级上下文）
    function getPreciseSelector(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

        // 优先使用 id
        if (element.id) {
            return '#' + CSS.escape(element.id);
        }

        // 构建包含父级上下文的选择器路径
        const path = [];
        let current = element;
        let hasUniqueSelector = false;

        while (current && current !== document.body && current !== document.documentElement) {
            let selector = getElementSelector(current);

            // 如果当前元素有 id，用这个就够了
            if (current.id) {
                path.unshift('#' + CSS.escape(current.id));
                hasUniqueSelector = true;
                break;
            }

            // 尝试添加 nth-child 来精确定位
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    // 使用 :nth-child，但只用在 tag 上，不要加在 class 上
                    if (!selector.includes(':nth-')) {
                        // 提取 tag name
                        const tagName = current.tagName.toLowerCase();
                        selector = `${tagName}:nth-child(${index})`;
                    }
                }
            }

            if (selector) {
                path.unshift(selector);
            }

            current = current.parentElement;

            // 限制路径长度，避免过于复杂的选择器
            if (path.length >= 4) break;
        }

        return path.join(' > ');
    }

    // 鼠标移动事件
    function onMouseMove(e) {
        if (!isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // 获取手机壳容器
        const phoneScreen = document.getElementById('phoneScreen');
        if (!phoneScreen) {
            console.warn('[ElementPicker] 未找到 phoneScreen 容器');
            return;
        }
        
        // 检查鼠标是否在手机壳内
        const phoneRect = phoneScreen.getBoundingClientRect();
        if (e.clientX < phoneRect.left || e.clientX > phoneRect.right ||
            e.clientY < phoneRect.top || e.clientY > phoneRect.bottom) {
            // 鼠标在手机壳外，隐藏高亮框
            hideHighlightBox();
            hoveredElement = null;
            return;
        }
        
        // 获取手机壳内的元素
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // 检查元素是否在手机壳内
        if (!element || !phoneScreen.contains(element)) {
            hideHighlightBox();
            hoveredElement = null;
            return;
        }
        
        // 排除高亮框本身
        if (element.closest('#element-picker-highlight')) {
            return;
        }
        
        if (element !== hoveredElement) {
            hoveredElement = element;
            updateHighlightBox(element);
            
            if (config.onHover) {
                config.onHover({
                    element: element,
                    selector: getElementSelector(element),
                    fullSelector: getFullSelector(element)
                });
            }
        }
    }

    // 鼠标点击事件
    function onClick(e) {
        if (!isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (hoveredElement) {
            if (config.onClick) {
                config.onClick({
                    element: hoveredElement,
                    selector: getElementSelector(hoveredElement),
                    fullSelector: getFullSelector(hoveredElement)
                });
            }
            stop();
        }
    }

    // 键盘事件（ESC取消）
    function onKeyDown(e) {
        if (!isActive) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            if (config.onCancel) {
                config.onCancel();
            }
            stop();
        }
    }

    // 启动选择器
    function start(options = {}) {
        if (isActive) return;
        
        // 合并配置
        config = { ...config, ...options };
        
        isActive = true;
        
        // 创建高亮框
        if (!highlightBox) {
            highlightBox = createHighlightBox();
        }
        
        // 添加事件监听
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown, true);
        
        // 添加全局样式
        document.body.style.cursor = 'crosshair';
    }

    // 停止选择器
    function stop() {
        if (!isActive) return;
        
        isActive = false;
        hoveredElement = null;
        
        hideHighlightBox();
        
        // 移除事件监听
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        
        // 恢复样式
        document.body.style.cursor = '';
    }

    // 更新高亮样式
    function setHighlightStyle(style) {
        config = { ...config, ...style };
        if (highlightBox) {
            highlightBox.style.background = config.backgroundColor;
            highlightBox.style.borderColor = config.borderColor;
            highlightBox.style.borderWidth = config.borderWidth;
        }
    }

    // 清理
    function destroy() {
        stop();
        if (highlightBox && highlightBox.parentNode) {
            highlightBox.parentNode.removeChild(highlightBox);
            highlightBox = null;
        }
    }

    return {
        start,
        stop,
        setHighlightStyle,
        destroy,
        getElementSelector,
        getFullSelector,
        getPreciseSelector
    };
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElementPicker;
}
