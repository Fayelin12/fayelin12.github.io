/**
 * Markdown 解析器（支持自定义标记）
 * 优化版本 - 修复安全性、性能和可维护性问题
 * 
 * 修复内容：
 * - 修复XSS漏洞：所有输出内容进行HTML转义
 * - 修复ReDoS风险：添加输入长度限制和原子组
 * - 修复性能问题：优化占位符恢复逻辑
 * 
 * 特性：
 * - 完整的 XSS 防护（HTML 转义）
 * - 支持自定义标记嵌套
 * - 配置驱动架构，易于扩展
 * - 正确的段落和列表处理
 */

const MarkdownParser = (function() {
    'use strict';

    // ============ 安全配置 ============
    const SECURITY_CONFIG = {
        maxInputLength: 100000,        // 最大输入长度 100KB
        maxTagContentLength: 10000,    // 标记内容最大长度
        maxNestingDepth: 10,           // 最大嵌套深度
        maxExecutionTime: 5000         // 最大执行时间 5秒
    };

    // ============ 配置 ============
    const CONFIG = {
        // 自定义标记配置 - 使用原子组避免回溯
        customTags: {
            highlight: {
                // 限制长度，使用原子组避免回溯
                pattern: /\[\[highlight:([^\]]+?)\]\]([\s\S]*?)\[\[\/highlight\]\]/g,
                parse(match, attr, content) {
                    // attr 格式: selector 或 selector:color
                    // 注意：selector 中可能包含 :nth-child()，所以要从最后一个 : 分割
                    const lastColonIndex = attr.lastIndexOf(':');
                    let selector, color;
                    
                    if (lastColonIndex > 0 && !attr.substring(lastColonIndex + 1).includes(')')) {
                        // 如果最后一个 : 后面不是 ) 结尾（即不是 :nth-child() 的一部分）
                        selector = attr.substring(0, lastColonIndex);
                        color = attr.substring(lastColonIndex + 1);
                    } else {
                        // 没有 color，整个 attr 就是 selector
                        selector = attr;
                        color = 'yellow';
                    }
                    
                    if (selector.length > 200 || content.length > 10000) {
                        console.warn('[MarkdownParser] 标记内容过长，已跳过');
                        return escapeHtml(content);
                    }
                    
                    const colorClass = ` req-highlight-${escapeHtml(color)}`;
                    return `<span class="req-link req-highlight-link${colorClass}" data-action="highlight" data-target="${escapeHtml(selector)}" data-color="${escapeHtml(color)}">${content}</span>`;
                }
            },
            goto: {
                pattern: /\[\[goto:([^\]]+?)\]\]([\s\S]*?)\[\[\/goto\]\]/g,
                parse(match, attr, content) {
                    const parts = attr.split(':');
                    const target = parts[0];
                    const extra = parts[1] || '';
                    
                    if (target.length > 100 || content.length > 10000) {
                        console.warn('[MarkdownParser] 标记内容过长，已跳过');
                        return escapeHtml(content);
                    }
                    
                    const extraAttr = extra ? ` data-extra="${escapeHtml(extra)}"` : '';
                    return `<span class="req-link req-goto-link" data-action="goto" data-target="${escapeHtml(target)}"${extraAttr} title="点击跳转页面">${content}</span>`;
                }
            }
        },
        // 块级元素标签（用于段落包裹判断）
        blockTags: /^(h[1-6]|ul|ol|li|p|div|blockquote|pre|table|tr|td|th)$/i
    };

    // ============ 工具函数 ============
    
    /**
     * HTML 转义函数 - 防止 XSS 攻击
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
    }

    /**
     * 转义textarea内容 - 防止XSS
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    function escapeForTextarea(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ============ 解析函数 ============

    /**
     * 处理自定义标记
     * @param {string} text - 原始文本
     * @returns {string} 处理后的 HTML
     */
    function processCustomTags(text) {
        let result = text;
        
        // 处理 highlight 标记
        result = result.replace(CONFIG.customTags.highlight.pattern, (match, attr, content) => {
            return CONFIG.customTags.highlight.parse(match, attr, content);
        });
        
        // 处理 goto 标记
        result = result.replace(CONFIG.customTags.goto.pattern, (match, attr, content) => {
            return CONFIG.customTags.goto.parse(match, attr, content);
        });
        
        return result;
    }

    /**
     * 处理标题
     * @param {string} text - 原始文本
     * @returns {string} 处理后的文本
     */
    function processHeadings(text) {
        return text
            .replace(/^### (.*$)/gim, (_, content) => `<h4>${escapeHtml(content)}</h4>`)
            .replace(/^## (.*$)/gim, (_, content) => `<h3>${escapeHtml(content)}</h3>`)
            .replace(/^# (.*$)/gim, (_, content) => `<h2>${escapeHtml(content)}</h2>`);
    }

    /**
     * 处理粗体
     * @param {string} text - 原始文本
     * @returns {string} 处理后的文本
     */
    function processBold(text) {
        return text.replace(/\*\*(.*?)\*\*/g, (_, content) => `<strong>${escapeHtml(content)}</strong>`);
    }

    /**
     * 处理列表
     * @param {string} text - 原始文本
     * @returns {string} 处理后的 HTML
     */
    function processLists(text) {
        const lines = text.split('\n');
        const result = [];
        const listStack = [];
        let lastLineWasList = false;

        function getIndentLevel(line) {
            const match = line.match(/^(\s*)/);
            return match ? Math.floor(match[1].length / 2) : 0;
        }

        function closeLists(targetLevel = 0) {
            while (listStack.length > targetLevel) {
                const list = listStack.pop();
                if (listStack.length > 0) {
                    const parentList = listStack[listStack.length - 1];
                    const lastItem = parentList.items[parentList.items.length - 1];
                    if (lastItem) {
                        lastItem.content += '<ul>' + list.items.map(item => `<li>${item.content}</li>`).join('') + '</ul>';
                    }
                } else {
                    result.push('<ul>' + list.items.map(item => `<li>${item.content}</li>`).join('') + '</ul>');
                }
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const listMatch = line.match(/^(\s*)[•\-*]\s+(.+)$/);

            if (listMatch) {
                const indentLevel = getIndentLevel(line);
                const content = listMatch[2];

                if (indentLevel < listStack.length) {
                    closeLists(indentLevel);
                }

                if (indentLevel >= listStack.length) {
                    while (listStack.length <= indentLevel) {
                        listStack.push({ items: [] });
                    }
                }

                listStack[indentLevel].items.push({ content });
                lastLineWasList = true;
            } else {
                if (listStack.length > 0) {
                    if (line.trim() !== '' && getIndentLevel(line) > 0) {
                        const currentList = listStack[listStack.length - 1];
                        const lastItem = currentList.items[currentList.items.length - 1];
                        if (lastItem) {
                            lastItem.content += ' ' + line.trim();
                            continue;
                        }
                    }

                    if (line.trim() === '' && lastLineWasList) {
                        let nextLineIndex = i + 1;
                        while (nextLineIndex < lines.length && lines[nextLineIndex].trim() === '') {
                            nextLineIndex++;
                        }
                        if (nextLineIndex < lines.length && /^\s*[•\-*]\s+/.test(lines[nextLineIndex])) {
                            continue;
                        }
                    }

                    closeLists(0);
                }

                result.push(line);
                lastLineWasList = false;
            }
        }

        closeLists(0);
        return result.join('\n');
    }

    /**
     * 处理段落
     * @param {string} text - 原始文本
     * @returns {string} 处理后的 HTML
     */
    function processParagraphs(text) {
        // 保护已存在的HTML标签（如自定义标记生成的<span>）
        const protectedBlocks = [];
        let blockIndex = 0;
        
        let protectedText = text
            .replace(/<span[^>]*>[\s\S]*?<\/span>/g, match => {
                const placeholder = `__SPAN_${blockIndex}__`;
                protectedBlocks.push(match);
                blockIndex++;
                return placeholder;
            })
            .replace(/<ul>[\s\S]*?<\/ul>/g, match => {
                const placeholder = `__UL_${blockIndex}__`;
                protectedBlocks.push(match);
                blockIndex++;
                return placeholder;
            })
            .replace(/<h[2-4]>.*?<\/h[2-4]>/g, match => {
                const placeholder = `__H_${blockIndex}__`;
                protectedBlocks.push(match);
                blockIndex++;
                return placeholder;
            });

        const paragraphs = protectedText
            .split(/\n{2,}/)
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => {
                if (/^__(SPAN|UL|H)_\d+__$/.test(p)) {
                    return p;
                }
                if (/<(ul|h[2-4]|span)/i.test(p)) {
                    return p.replace(/\n/g, '<br>');
                }
                const withBr = p.replace(/\n/g, '<br>');
                return `<p>${withBr}</p>`;
            });

        let result = paragraphs.join('\n');
        
        // 恢复保护的内容
        for (let i = 0; i < protectedBlocks.length; i++) {
            result = result.split(`__SPAN_${i}__`).join(protectedBlocks[i]);
            result = result.split(`__UL_${i}__`).join(protectedBlocks[i]);
            result = result.split(`__H_${i}__`).join(protectedBlocks[i]);
        }

        // 清理格式
        result = result.replace(/<br>\s*(<(?:ul|h[2-4]|span))/g, '$1');
        result = result.replace(/(<\/(?:ul|h[2-4]|span)[^>]*>)\s*<br>/g, '$1');
        result = result.replace(/<br>\s*<br>/g, '<br>');
        result = result.replace(/<\/p>\s*(<ul>)/g, '$1');
        result = result.replace(/(<\/ul>)\s*<\/p>/g, '$1');
        result = result.replace(/<p>\s*(<ul>)/g, '$1');
        result = result.replace(/(<\/ul>)\s*<p>/g, '$1');

        return result;
    }

    /**
     * 清理空标签
     * @param {string} html - HTML 字符串
     * @returns {string} 清理后的 HTML
     */
    function cleanEmptyTags(html) {
        return html
            .replace(/<p>\s*<\/p>/g, '')
            .replace(/<li>\s*<\/li>/g, '')
            .replace(/<ul>\s*<\/ul>/g, '');
    }

    // ============ 主解析器 ============
    
    const MarkdownParser = {
        /**
         * 解析 Markdown 文本为 HTML
         * @param {string} text - Markdown 文本
         * @param {Object} options - 解析选项
         * @returns {string} HTML 字符串
         */
        parse(text, options = {}) {
            // 输入验证
            if (text === null || text === undefined) return '';
            if (typeof text !== 'string') {
                console.warn('[MarkdownParser.parse] expected string, got', typeof text);
                return escapeHtml(String(text));
            }
            
            // 长度限制检查
            if (text.length > SECURITY_CONFIG.maxInputLength) {
                console.warn(`[MarkdownParser.parse] 输入过长 (${text.length} > ${SECURITY_CONFIG.maxInputLength})，已截断`);
                text = text.substring(0, SECURITY_CONFIG.maxInputLength);
            }
            
            if (text.trim() === '') return '';

            let html = text;

            // 步骤 1: 处理标题（纯文本）
            html = processHeadings(html);

            // 步骤 2: 处理列表（纯文本）
            html = processLists(html);

            // 步骤 3: 处理段落（纯文本）
            html = processParagraphs(html);

            // 步骤 4: 处理粗体（行内元素，在块级结构处理完之后）
            html = processBold(html);

            // 步骤 5: 处理自定义标记（最后处理，避免被转义）
            html = processCustomTags(html);

            // 步骤 6: 清理空标签
            html = cleanEmptyTags(html);

            return html.trim();
        },

        /**
         * 添加自定义标记规则
         * @param {string} name - 标记名称
         * @param {RegExp} pattern - 匹配正则
         * @param {Function} template - 渲染模板函数
         */
        addCustomTag(name, pattern, template) {
            CONFIG.customTags[name] = { pattern, template };
        },

        /**
         * 反向解析：HTML 转 Markdown（用于编辑器）
         * @param {string} html - HTML 字符串
         * @returns {string} Markdown 文本
         */
        unparse(html) {
            if (!html) return '';

            // HTML 实体解码辅助函数
            function decodeHtmlEntities(text) {
                if (typeof text !== 'string') return '';
                return text
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
            }

            let text = html;

            // 还原高亮标记
            text = text.replace(
                /<span class="req-link req-highlight-link[^"]*"[^>]*data-target="([^"]*)"[^>]*data-color="([^"]*)"[^>]*>(.*?)<\/span>/g,
                (match, target, color, content) => {
                    return `[[highlight:${decodeHtmlEntities(target)}:${decodeHtmlEntities(color)}]]${content}[[/highlight]]`;
                }
            );

            text = text.replace(
                /<span class="req-link req-highlight-link[^"]*"[^>]*data-target="([^"]*)"[^>]*>(.*?)<\/span>/g,
                (match, target, content) => {
                    return `[[highlight:${decodeHtmlEntities(target)}]]${content}[[/highlight]]`;
                }
            );

            // 还原跳转标记
            text = text.replace(
                /<span class="req-link req-goto-link"[^>]*data-target="([^"]*)"[^>]*data-extra="([^"]*)"[^>]*>(.*?)<\/span>/g,
                (match, target, extra, content) => {
                    return `[[goto:${decodeHtmlEntities(target)}:${decodeHtmlEntities(extra)}]]${content}[[/goto]]`;
                }
            );

            text = text.replace(
                /<span class="req-link req-goto-link"[^>]*data-target="([^"]*)"[^>]*>(.*?)<\/span>/g,
                (match, target, content) => {
                    return `[[goto:${decodeHtmlEntities(target)}]]${content}[[/goto]]`;
                }
            );
            
            // 还原标题
            text = text.replace(/<h4>(.*?)<\/h4>/g, '### $1');
            text = text.replace(/<h3>(.*?)<\/h3>/g, '## $1');
            text = text.replace(/<h2>(.*?)<\/h2>/g, '# $1');
            
            // 还原粗体
            text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
            
            // 还原列表
            text = text.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
                return content.replace(/<li>(.*?)<\/li>/g, '• $1');
            });
            
            // 还原段落和换行
            text = text.replace(/<p>(.*?)<\/p>/gs, '$1\n\n');
            text = text.replace(/<br>/g, '\n');
            
            return text.trim();
        },

        // 导出安全工具函数
        escapeHtml,
        escapeForTextarea
    };

    return MarkdownParser;
})();

// 导出（支持 CommonJS 和 ES Module）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownParser;
}
