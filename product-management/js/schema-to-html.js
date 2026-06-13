/**
 * JSON Schema → H5 HTML 渲染器
 * 产品管理端跨端编译层 —— H5 预览渲染器（注册表驱动）
 *
 * 职责：将 JSON Schema 对象渲染为 HTML 字符串，用于浏览器预览。
 * 所有组件元数据（标签、类名映射）及特殊组件渲染逻辑已收敛至 component-registry.js，
 * 本文件仅保留 H5 特有的通用渲染逻辑（事件映射、style 转换、默认节点渲染）。
 *
 * @author Qoder Agent
 * @version 3.1.0
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. 配置与常量
  // ============================================================

  const EVENT_TO_ATTR = {
    onTap: 'data-action',
    onToggle: 'data-checkbox-toggle',
    onChange: 'data-onchange',
    onInput: 'data-oninput',
    onFocus: 'data-onfocus',
    onBlur: 'data-onblur',
    onLongTap: 'data-longtap',
  };

  const UTILITY_CLASS_PATTERNS_FOR_SKIP = [
    { pattern: /^am-mt-\d+$/, styleKeys: ['marginTop'] },
    { pattern: /^am-mb-\d+$/, styleKeys: ['marginBottom'] },
    { pattern: /^am-ml-\d+$/, styleKeys: ['marginLeft'] },
    { pattern: /^am-mr-\d+$/, styleKeys: ['marginRight'] },
    { pattern: /^am-p-\d+$/, styleKeys: ['padding'] },
    { pattern: /^am-px-\d+$/, styleKeys: ['paddingLeft', 'paddingRight'] },
    { pattern: /^am-py-\d+$/, styleKeys: ['paddingTop', 'paddingBottom'] },
    { pattern: /^am-pt-\d+$/, styleKeys: ['paddingTop'] },
    { pattern: /^am-pb-\d+$/, styleKeys: ['paddingBottom'] },
    { pattern: /^am-gap-\d+$/, styleKeys: ['gap'] },
    { pattern: /^am-w-full$/, styleKeys: ['width'] },
    { pattern: /^am-h-full$/, styleKeys: ['height'] },
    { pattern: /^am-rounded-sm$/, styleKeys: ['borderRadius'] },
    { pattern: /^am-rounded-md$/, styleKeys: ['borderRadius'] },
    { pattern: /^am-rounded-lg$/, styleKeys: ['borderRadius'] },
    { pattern: /^am-rounded-full$/, styleKeys: ['borderRadius'] },
    { pattern: /^am-flex-1$/, styleKeys: ['flex'] },
    { pattern: /^am-items-center$/, styleKeys: ['alignItems'] },
    { pattern: /^am-opacity-60$/, styleKeys: ['opacity'] },
    { pattern: /^am-opacity-85$/, styleKeys: ['opacity'] },
    { pattern: /^am-text--center$/, styleKeys: ['textAlign'] },
    { pattern: /^am-text--right$/, styleKeys: ['textAlign'] },
    { pattern: /^am-cursor-pointer$/, styleKeys: ['cursor'] },
    { pattern: /^am-leading-none$/, styleKeys: ['lineHeight'] },
  ];

  // ============================================================
  // 2. 工具函数
  // ============================================================

  function camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  function convertRpxToPx(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/(\d+(?:\.\d+)?)rpx/g, (match, num) => {
      const n = parseFloat(num);
      return `${n / 2}px`;
    });
  }

  function styleObjectToString(style, className, skipBgBorder) {
    if (!style || typeof style !== 'object') return '';
    const classes = Array.isArray(className) ? className : [];
    const skipKeys = new Set();
    for (const c of classes) {
      for (const rule of UTILITY_CLASS_PATTERNS_FOR_SKIP) {
        if (rule.pattern.test(c)) {
          for (const key of rule.styleKeys) skipKeys.add(key);
        }
      }
    }
    if (skipBgBorder) {
      if (typeof SharedStyleFilter !== 'undefined') {
        (SharedStyleFilter._antManagedProps || ['background', 'border']).forEach(function (p) { skipKeys.add(p); });
      } else {
        skipKeys.add('background');
        skipKeys.add('border');
      }
    }
    const entries = [];
    for (const [key, val] of Object.entries(style)) {
      if (skipKeys.has(key)) continue;
      const kebabKey = camelToKebab(key);
      const convertedVal = convertRpxToPx(val);
      entries.push(`${kebabKey}:${convertedVal}`);
    }
    return entries.join(';');
  }

  function escapeAttr(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeText(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ============================================================
  // 3. 类名与属性构建（委托给 ComponentRegistry）
  // ============================================================

  function buildClasses(type, props, originalClasses) {
    return ComponentRegistry.buildClasses(type, props, originalClasses);
  }

  function buildAttributes(type, props, events, dataBinding) {
    const attrs = [];

    // 3.1 原生 HTML 属性（由注册表统一维护）
    var nativeProps = ComponentRegistry.buildProps(type, props, 'html');
    if (nativeProps) attrs.push(nativeProps);

    // 3.2 data-* 自定义属性（dataInputName → data-input-name）
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        if (key.startsWith('data') && key.length > 4) {
          const attrBody = key.slice(4).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).toLowerCase();
          const attrName = `data${attrBody}`;
          attrs.push(`${attrName}="${escapeAttr(String(val))}"`);
        }
      }
    }

    // 3.3 事件属性
    if (events) {
      for (const [eventName, handler] of Object.entries(events)) {
        const attrName = EVENT_TO_ATTR[eventName];
        if (attrName) {
          attrs.push(`${attrName}="${escapeAttr(handler)}"`);
        }
      }
    }

    // 3.4 数据绑定属性（H5 预览中使用 data-* 保留）
    if (dataBinding) {
      if (dataBinding.if) attrs.push(`data-if="${escapeAttr(dataBinding.if)}"`);
      if (dataBinding.for) attrs.push(`data-for="${escapeAttr(dataBinding.for)}"`);
    }

    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  }

  // ============================================================
  // 4. 渲染上下文（供注册表自定义回调使用）
  // ============================================================

  var htmlContext = {
    escapeText: escapeText,
    escapeAttr: escapeAttr,
    renderNode: renderNode,
    buildClasses: buildClasses,
    buildAttributes: buildAttributes,
    getTag: function (type) { return ComponentRegistry.getTag(type, 'html'); },
    isSelfClosing: function (type) { return ComponentRegistry.isSelfClosing(type); },
    styleObjectToString: styleObjectToString,
  };

  // ============================================================
  // 5. 核心渲染函数
  // ============================================================

  function renderNode(node) {
    if (typeof node === 'string') return escapeText(node);
    if (!node || typeof node !== 'object') return '';

    const type = node.type;
    const props = node.props || {};
    const style = node.style || {};
    const events = node.events || null;
    const dataBinding = node.dataBinding || null;
    const originalClasses = node.className || [];

    // 查询注册表是否有平台特定的完整渲染回调
    var customRender = ComponentRegistry.getRender(type, 'html', 'full');
    if (customRender) {
      return customRender(node, htmlContext);
    }

    // 从注册表获取标签配置
    const tag = ComponentRegistry.getTag(type, 'html');
    const selfClosing = ComponentRegistry.isSelfClosing(type);

    // class 和 style
    const classes = buildClasses(type, props, originalClasses);
    const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    var isAntComp = ['button', 'input', 'checkbox', 'radio', 'switch', 'list'].indexOf(type) !== -1;
    const styleStrObj = styleObjectToString(style, originalClasses, isAntComp);
    const styleStr = styleStrObj ? ` style="${styleStrObj}"` : '';

    // 属性
    const attrs = buildAttributes(type, props, events, dataBinding);

    // 自闭合
    if (selfClosing) {
      return `<${tag}${classStr}${styleStr}${attrs}>`;
    }

    // 内部结构
    let innerHtml = '';
    var customInner = ComponentRegistry.getRender(type, 'html', 'inner');
    if (customInner) {
      innerHtml = customInner(node, htmlContext);
    } else if (node.children !== undefined) {
      if (typeof node.children === 'string') {
        innerHtml = escapeText(node.children);
      } else if (Array.isArray(node.children)) {
        innerHtml = node.children.map(renderNode).join('');
      }
    }

    return `<${tag}${classStr}${styleStr}${attrs}>${innerHtml}</${tag}>`;
  }

  // ============================================================
  // 6. 公开 API
  // ============================================================

  const SchemaToHtml = {
    render(schema, options) {
      if (!schema || !schema.page) {
        throw new Error('[SchemaToHtml] Schema 必须包含 page 根节点');
      }
      const children = schema.page.children || [];
      return children.map(renderNode).join('\n');
    },

    renderNode(node) {
      return renderNode(node);
    },

    renderNodes(nodes) {
      if (!Array.isArray(nodes)) return '';
      return nodes.map(renderNode).join('\n');
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchemaToHtml;
  }
  global.SchemaToHtml = SchemaToHtml;

})(typeof window !== 'undefined' ? window : global);
