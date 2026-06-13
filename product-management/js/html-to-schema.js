/**
 * HTML → JSON Schema 解析器
 * 产品管理端跨端编译层 —— 第一阶段解析器
 *
 * 功能：将产品经理编写的 HTML 字符串（使用 am-* 类名）解析为结构化的 JSON Schema。
 * 运行环境：浏览器（依赖 DOMParser），兼容 Node.js（需额外提供 DOM 环境如 jsdom）。
 *
 * @author Qoder Agent
 * @version 1.0.0
 */

(function (global) {
  'use strict';

  // ============================================================
  // 0. 环境检测：浏览器 vs Node.js
  // ============================================================

  let DOMParserImpl;
  let NodeImpl;

  if (typeof DOMParser !== 'undefined') {
    // 浏览器环境
    DOMParserImpl = DOMParser;
    NodeImpl = Node;
  } else if (typeof require !== 'undefined') {
    // Node.js 环境：加载 mock-dom.js
    try {
      const mockDom = require('./mock-dom');
      DOMParserImpl = mockDom.DOMParser || mockDom.MockDOMParser;
      NodeImpl = mockDom.Node;
    } catch (e) {
      throw new Error('[HtmlToSchema] 当前环境不支持 DOMParser，且无法加载 mock-dom.js。请确保 mock-dom.js 存在于同目录下。');
    }
  } else {
    throw new Error('[HtmlToSchema] 当前环境不支持 DOMParser，请在浏览器环境中运行，或为 Node.js 提供 mock-dom.js。');
  }

  // ============================================================
  // 1. 常量与配置
  // ============================================================

  /**
   * am-* 类名到组件类型的映射表
   * 优先级：排在前面的类名优先匹配
   */
  const CLASS_TYPE_MAP = {
    // 页面与容器
    'am-page': 'page',
    'am-scroll-view': 'scrollView',
    'am-swiper': 'swiper',

    // 卡片
    'am-card': 'card',
    'am-card__header': 'cardHeader',
    'am-card__title': 'cardTitle',
    'am-card__extra': 'cardExtra',
    'am-card__body': 'cardBody',
    'am-card__footer': 'cardFooter',

    // 列表
    'am-list': 'list',
    'am-list__header': 'listHeader',
    'am-list__footer': 'listFooter',
    'am-list-item': 'listItem',
    'am-list-item__content': 'listItemContent',
    'am-list-item__title': 'listItemTitle',
    'am-list-item__brief': 'listItemBrief',
    'am-list-item__extra': 'listItemExtra',
    'am-list-item__arrow': 'listItemArrow',

    // 表单与按钮
    'am-button': 'button',
    'am-input': 'input',
    'am-textarea': 'textarea',
    'am-checkbox': 'checkbox',
    'am-radio': 'radio',
    'am-switch': 'switch',

    // 反馈
    'am-loading': 'loading',
    'am-result': 'result',
    'am-empty': 'empty',
    'am-tag': 'tag',

    // 导航
    'am-steps': 'steps',
    'am-step__connector': 'view',
    'am-step': 'step',
    'am-step__badge': 'view',
    'am-step__label': 'text',
    'am-nav-bar': 'navBar',
    'am-navbar': 'navBar',
    'am-nav-bar__back': 'navBarBack',
    'am-nav-bar__title': 'navBarTitle',

    // 基础
    'am-text': 'text',
    'am-image': 'image',
    'am-icon': 'icon',
    'am-avatar': 'avatar',

    // 布局（带 variant）
    'am-flex': 'view',
    'am-flex-column': 'view',
    'am-flex-center': 'view',
    'am-flex-between': 'view',
    'am-block': 'view',

    // 分割线
    'am-divider': 'divider',
    'am-line': 'divider',

    // 产品管理端专用
    'am-license-prefix': 'licensePrefix',
    'am-license-newenergy': 'licenseNewEnergy',
    'am-display-field': 'displayField',
    'am-checkbox-row': 'checkboxRow',
    'am-help-icon': 'helpIcon',
    'am-checkbox__check': 'text',
    'am-button__subtitle': 'text',
  };

  /**
   * 从 ComponentRegistry 自动注入 baseClass → type 映射
   * 当渲染层新增组件时，反向解析器会自动识别，无需手动维护。
   * 手动定义的 CLASS_TYPE_MAP 优先级更高（不会被覆盖）。
   */
  function injectRegistryMappings() {
    if (typeof ComponentRegistry === 'undefined') return;
    var types = ComponentRegistry.getAllTypes();
    for (var i = 0; i < types.length; i++) {
      var type = types[i];
      var def = ComponentRegistry.get(type);
      if (def && def.baseClasses) {
        for (var j = 0; j < def.baseClasses.length; j++) {
          var bc = def.baseClasses[j];
          if (!CLASS_TYPE_MAP[bc]) {
            CLASS_TYPE_MAP[bc] = type;
          }
        }
      }
    }
  }
  injectRegistryMappings();

  /**
   * 工具类样式映射表
   * 键：类名正则模式（字符串，将被转换为 RegExp）
   * 值：转换函数，接收匹配数组，返回 { styleKey, styleValue }
   */
  const UTILITY_CLASS_PATTERNS = [
    // margin
    { pattern: /^am-mt-(\d+)$/, fn: m => ({ key: 'marginTop', val: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-mb-(\d+)$/, fn: m => ({ key: 'marginBottom', val: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-ml-(\d+)$/, fn: m => ({ key: 'marginLeft', val: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-mr-(\d+)$/, fn: m => ({ key: 'marginRight', val: `${parseInt(m[1], 10) * 4}rpx` }) },

    // padding
    { pattern: /^am-p-(\d+)$/, fn: m => ({ key: 'padding', val: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-px-(\d+)$/, fn: m => ({ key: 'paddingLeft', val: `${parseInt(m[1], 10) * 4}rpx`, key2: 'paddingRight', val2: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-py-(\d+)$/, fn: m => ({ key: 'paddingTop', val: `${parseInt(m[1], 10) * 4}rpx`, key2: 'paddingBottom', val2: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-pt-(\d+)$/, fn: m => ({ key: 'paddingTop', val: `${parseInt(m[1], 10) * 4}rpx` }) },
    { pattern: /^am-pb-(\d+)$/, fn: m => ({ key: 'paddingBottom', val: `${parseInt(m[1], 10) * 4}rpx` }) },

    // gap
    { pattern: /^am-gap-(\d+)$/, fn: m => ({ key: 'gap', val: `${parseInt(m[1], 10) * 4}rpx` }) },

    // size
    { pattern: /^am-w-full$/, fn: () => ({ key: 'width', val: '100%' }) },
    { pattern: /^am-h-full$/, fn: () => ({ key: 'height', val: '100%' }) },

    // border radius
    { pattern: /^am-rounded-sm$/, fn: () => ({ key: 'borderRadius', val: '8rpx' }) },
    { pattern: /^am-rounded-md$/, fn: () => ({ key: 'borderRadius', val: '16rpx' }) },
    { pattern: /^am-rounded-lg$/, fn: () => ({ key: 'borderRadius', val: '24rpx' }) },
    { pattern: /^am-rounded-full$/, fn: () => ({ key: 'borderRadius', val: '999rpx' }) },

    // flex
    { pattern: /^am-flex-1$/, fn: () => ({ key: 'flex', val: '1' }) },
    { pattern: /^am-items-center$/, fn: () => ({ key: 'alignItems', val: 'center' }) },

    // opacity
    { pattern: /^am-opacity-60$/, fn: () => ({ key: 'opacity', val: '0.6' }) },
    { pattern: /^am-opacity-85$/, fn: () => ({ key: 'opacity', val: '0.85' }) },

    // text align (when not covered by text props)
    { pattern: /^am-text--center$/, fn: () => ({ key: 'textAlign', val: 'center' }) },
    { pattern: /^am-text--right$/, fn: () => ({ key: 'textAlign', val: 'right' }) },

    // cursor
    { pattern: /^am-cursor-pointer$/, fn: () => ({ key: 'cursor', val: 'pointer' }) },

    // line height
    { pattern: /^am-leading-none$/, fn: () => ({ key: 'lineHeight', val: '1' }) },
  ];

  /**
   * Props 提取规则：按组件类型分组
   */
  const PROPS_EXTRACTORS = {
    button: (classes, el) => {
      const props = {};
      const typeMap = { primary: 1, default: 1, ghost: 1, text: 1, danger: 1, success: 1, warning: 1, info: 1 };
      const sizeMap = { small: 1, medium: 1, large: 1 };
      for (const c of classes) {
        if (c.startsWith('am-button--')) {
          const suffix = c.slice(11);
          if (typeMap[suffix]) props.type = suffix;
          if (sizeMap[suffix]) props.size = suffix;
          if (suffix === 'block') props.block = true;
          if (suffix === 'round') props.round = true;
          if (suffix === 'disabled') props.disabled = true;
        }
      }
      // 从元素属性补充
      if (el.disabled) props.disabled = true;
      return props;
    },

    text: (classes, el) => {
      const props = {};
      const sizeMap = { xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 1 };
      const colorMap = { primary: 1, secondary: 1, tertiary: 1, placeholder: 1, success: 1, warning: 1, danger: 1, white: 1 };
      for (const c of classes) {
        if (c.startsWith('am-text--')) {
          const suffix = c.slice(9);
          if (sizeMap[suffix]) props.size = suffix;
          if (colorMap[suffix]) props.color = suffix;
          if (suffix === 'bold') props.bold = true;
          if (suffix === 'medium') props.medium = true;
          if (suffix === 'relaxed') props.relaxed = true;
          if (suffix === 'center') props.align = 'center';
          if (suffix === 'right') props.align = 'right';
        }
      }
      // 变体推断
      if (classes.includes('am-card__title')) props.variant = 'title';
      else if (classes.includes('am-card__extra')) props.variant = 'extra';
      else if (classes.includes('am-list-item__title')) props.variant = 'body';
      else if (classes.includes('am-list-item__brief')) props.variant = 'brief';
      else if (classes.includes('am-list__header')) props.variant = 'listHeader';
      else if (classes.includes('am-list__footer')) props.variant = 'listFooter';
      else if (classes.includes('am-nav-bar__title')) props.variant = 'navTitle';
      else if (classes.includes('am-button__subtitle')) props.variant = 'subtitle';
      return props;
    },

    input: (classes, el) => {
      const props = {};
      for (const c of classes) {
        if (c === 'am-input--disabled') props.disabled = true;
        if (c === 'am-input--inline') props.inline = true;
        if (c === 'am-input--danger') props.danger = true;
      }
      const placeholder = el.getAttribute('placeholder');
      if (placeholder) props.placeholder = placeholder;
      if (el.readOnly) props.readonly = true;
      if (el.disabled) props.disabled = true;
      const value = el.getAttribute('value');
      if (value !== null) props.value = value;
      return props;
    },

    textarea: (classes, el) => {
      const props = {};
      const placeholder = el.getAttribute('placeholder');
      if (placeholder) props.placeholder = placeholder;
      if (el.readOnly) props.readonly = true;
      if (el.disabled) props.disabled = true;
      return props;
    },

    image: (classes, el) => {
      const props = {};
      const src = el.getAttribute('src');
      if (src) props.src = src;
      const alt = el.getAttribute('alt');
      if (alt) props.alt = alt;
      for (const c of classes) {
        if (c === 'am-image--aspectFit') props.mode = 'aspectFit';
        if (c === 'am-image--aspectFill') props.mode = 'aspectFill';
      }
      return props;
    },

    checkbox: (classes, el) => {
      const props = {};
      if (classes.includes('am-checkbox--checked')) props.checked = true;
      return props;
    },

    radio: (classes, el) => {
      const props = {};
      if (classes.includes('am-radio--checked')) props.checked = true;
      return props;
    },

    tag: (classes, el) => {
      const props = {};
      const typeMap = { primary: 1, success: 1, warning: 1, danger: 1, default: 1 };
      for (const c of classes) {
        if (c.startsWith('am-tag--')) {
          const suffix = c.slice(8);
          if (typeMap[suffix]) props.type = suffix;
          if (suffix === 'solid') props.solid = true;
        }
      }
      return props;
    },

    loading: (classes, el) => {
      const props = {};
      if (classes.includes('am-loading__spinner--lg')) props.size = 'large';
      return props;
    },

    result: (classes, el) => {
      const props = {};
      const statusMap = { success: 1, error: 1, warning: 1, info: 1 };
      for (const c of classes) {
        if (c.startsWith('am-result__icon--')) {
          const suffix = c.slice(17);
          if (statusMap[suffix]) props.status = suffix;
        }
      }
      return props;
    },

    empty: (classes, el) => {
      return {};
    },

    steps: (classes, el) => {
      return { current: 0, items: [] };
    },

    step: (classes, el) => {
      const props = {};
      if (classes.includes('am-step--active')) props.active = true;
      if (classes.includes('am-step--completed')) props.completed = true;
      return props;
    },

    card: (classes, el) => {
      const props = {};
      if (classes.includes('am-card--no-shadow')) props.noShadow = true;
      if (classes.includes('am-card--danger')) props.danger = true;
      return props;
    },

    cardBody: (classes, el) => {
      const props = {};
      if (classes.includes('am-card__body--flush')) props.flushBody = true;
      return props;
    },

    list: (classes, el) => {
      const props = {};
      if (classes.includes('am-list--flush')) props.flush = true;
      return props;
    },

    view: (classes, el) => {
      const props = {};
      const variantMap = {
        'am-flex': 'flex',
        'am-flex-column': 'flexColumn',
        'am-flex-center': 'flexCenter',
        'am-flex-between': 'flexBetween',
        'am-block': 'block',
      };
      for (const c of classes) {
        if (variantMap[c]) props.variant = variantMap[c];
      }
      return props;
    },

    navBar: (classes, el) => {
      const props = {};
      return props;
    },

    avatar: (classes, el) => {
      const props = {};
      const sizeMap = { sm: 'small', md: 'medium', lg: 'large' };
      for (const c of classes) {
        if (c.startsWith('am-avatar--')) {
          const suffix = c.slice(11);
          if (sizeMap[suffix]) props.size = sizeMap[suffix];
        }
      }
      return props;
    },

    divider: (classes, el) => {
      const props = {};
      if (classes.includes('am-line')) props.variant = 'line';
      return props;
    },
  };

  /**
   * 事件属性映射：HTML data-* 属性 → Schema 事件名
   */
  const EVENT_ATTR_MAP = {
    'data-action': 'onTap',
    'data-checkbox-toggle': 'onToggle',
    'data-checkbox': 'onChange',
    'data-onchange': 'onChange',
    'data-oninput': 'onInput',
    'data-onfocus': 'onFocus',
    'data-onblur': 'onBlur',
    'data-longtap': 'onLongTap',
  };

  // ============================================================
  // 2. 核心解析函数
  // ============================================================

  /**
   * 将 kebab-case CSS 属性名转换为 camelCase
   * @param {string} str - 如 "margin-top"
   * @returns {string} - 如 "marginTop"
   */
  function kebabToCamel(str) {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 解析内联 style 字符串，并将 px 转换为 rpx
   * @param {string} styleStr - 如 "margin: 16px; color: red;"
   * @returns {object} - 如 { margin: "32rpx", color: "red" }
   */
  function parseInlineStyle(styleStr) {
    const style = {};
    if (!styleStr || typeof styleStr !== 'string') return style;

    const declarations = styleStr.split(';');
    for (const decl of declarations) {
      const trimmed = decl.trim();
      if (!trimmed) continue;
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const prop = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      const camelProp = kebabToCamel(prop);

      // px → rpx 转换（1px = 2rpx），保留小于 1px 的值
      const convertedValue = value.replace(/(\d+(?:\.\d+)?)px/g, (match, num) => {
        const n = parseFloat(num);
        if (n < 1) return match; // 保留 0.5px 等
        return `${Math.round(n * 2)}rpx`;
      });

      style[camelProp] = convertedValue;
    }

    return style;
  }

  /**
   * 从类名数组中提取工具类样式
   * @param {string[]} classes
   * @returns {object}
   */
  function extractUtilityStyles(classes) {
    const style = {};
    for (const c of classes) {
      for (const rule of UTILITY_CLASS_PATTERNS) {
        const m = c.match(rule.pattern);
        if (m) {
          const res = rule.fn(m);
          if (res.key) style[res.key] = res.val;
          if (res.key2) style[res.key2] = res.val2;
          break;
        }
      }
    }
    return style;
  }

  /**
   * 根据标签名和类名确定组件类型
   * @param {string} tag - 小写标签名
   * @param {string[]} classes - 类名数组
   * @returns {string}
   */
  function resolveType(tag, classes) {
    // 1. 优先匹配 CLASS_TYPE_MAP 中的类名
    for (const cls of classes) {
      if (CLASS_TYPE_MAP[cls]) {
        return CLASS_TYPE_MAP[cls];
      }
    }

    // 2. 根据标签名回退
    const tagMap = {
      button: 'button',
      input: 'input',
      textarea: 'textarea',
      img: 'image',
      select: 'picker',
    };
    if (tagMap[tag]) return tagMap[tag];

    // 3. 默认：块级元素 → view，行内元素 → text
    const inlineTags = { span: 1, a: 1, label: 1, i: 1, em: 1, strong: 1, b: 1 };
    return inlineTags[tag] ? 'text' : 'view';
  }

  /**
   * 提取组件 props
   * @param {string} type - 组件类型
   * @param {string[]} classes - 类名数组
   * @param {Element} el - DOM 元素
   * @returns {object}
   */
  function extractProps(type, classes, el) {
    const extractor = PROPS_EXTRACTORS[type];
    let props = extractor ? extractor(classes, el) : {};
    if (!props || typeof props !== 'object') props = {};

    // 通用属性提取（所有元素都可能有的 data-* 属性等）
    // 注意：这里只提取明确属于 props 的 HTML 属性，事件在 extractEvents 中处理

    return props;
  }

  /**
   * 提取事件绑定
   * @param {Element} el - DOM 元素
   * @returns {object|null}
   */
  function extractEvents(el) {
    const events = {};
    for (const [attr, eventName] of Object.entries(EVENT_ATTR_MAP)) {
      const value = el.getAttribute(attr);
      if (value !== null) {
        events[eventName] = value;
      }
    }

    // 原生 onclick 也映射为 onTap（如果在 H5 中用到）
    const onclick = el.getAttribute('onclick');
    if (onclick) {
      events.onTap = onclick;
    }

    return Object.keys(events).length > 0 ? events : null;
  }

  /**
   * 递归解析 DOM 节点为 Schema 节点
   * @param {Node} node - DOM 节点
   * @returns {object|string|null}
   */
  function parseNode(node) {
    // 文本节点
    if (node.nodeType === NodeImpl.TEXT_NODE) {
      const text = node.textContent;
      // 保留有意义的空白（如文本节点中的换行和空格在 HTML 中通常可忽略）
      // 但为了防止丢失格式，仅 trim 两端空白，如果结果为空则返回 null
      const trimmed = text.trim();
      return trimmed ? trimmed : null;
    }

    // 注释节点：直接忽略
    if (node.nodeType === NodeImpl.COMMENT_NODE) {
      return null;
    }

    // 只处理元素节点
    if (node.nodeType !== NodeImpl.ELEMENT_NODE) {
      return null;
    }

    const el = node;
    const tag = el.tagName.toLowerCase();
    const classAttr = el.getAttribute('class') || '';
    const classes = classAttr.split(/\s+/).filter(Boolean);
    const styleStr = el.getAttribute('style') || '';

    // 确定类型
    const type = resolveType(tag, classes);

    // 提取 props、style、events
    const props = extractProps(type, classes, el);
    const style = parseInlineStyle(styleStr);
    const utilityStyles = extractUtilityStyles(classes);
    Object.assign(style, utilityStyles);
    const events = extractEvents(el);

    // 递归解析子节点
    const children = [];
    for (const child of el.childNodes) {
      const childNode = parseNode(child);
      if (childNode !== null) {
        children.push(childNode);
      }
    }

    // 简化 children：如果只有一个文本子节点，直接使用字符串
    let simplifiedChildren;
    if (children.length === 1 && typeof children[0] === 'string') {
      simplifiedChildren = children[0];
    } else if (children.length > 0) {
      simplifiedChildren = children;
    } else {
      simplifiedChildren = undefined;
    }

    // 组装节点
    const schemaNode = { type };

    if (Object.keys(props).length > 0) {
      schemaNode.props = props;
    }
    if (Object.keys(style).length > 0) {
      schemaNode.style = style;
    }
    if (classes.length > 0) {
      schemaNode.className = classes;
    }
    if (events) {
      schemaNode.events = events;
    }
    if (simplifiedChildren !== undefined) {
      schemaNode.children = simplifiedChildren;
    }

    return schemaNode;
  }

  /**
   * 后处理：修复父级与子级之间的依赖关系
   * - steps: 根据 step 子节点生成 items 和 current
   * - listItem: 尝试提取 title/brief/extra 到 props（用于 AXML 优化）
   * @param {object} node - Schema 节点
   */
  function postProcess(node) {
    if (!node || typeof node !== 'object') return;

    // 处理 steps 组件
    if (node.type === 'steps' && Array.isArray(node.children)) {
      const items = [];
      let current = -1;
      const remainingChildren = [];

      for (const child of node.children) {
        if (child && typeof child === 'object' && child.type === 'step') {
          const title = child.children && typeof child.children === 'string'
            ? child.children
            : (Array.isArray(child.children)
                ? child.children.find(c => c && c.type === 'text' && c.children)
                : null);
          const titleText = title && typeof title === 'object' ? title.children : title;
          items.push({
            title: titleText || '',
            ...(child.props && child.props.active ? { active: true } : {}),
            ...(child.props && child.props.completed ? { completed: true } : {}),
          });
          if (child.props && child.props.active) {
            current = items.length - 1;
          }
          // 保留步骤条中的非 step 元素（如 am-step__connector）
        } else if (child && typeof child === 'object' && child.type !== 'step') {
          remainingChildren.push(child);
        } else {
          remainingChildren.push(child);
        }
      }

      node.props = node.props || {};
      node.props.items = items;
      if (current >= 0) node.props.current = current;

      // 如果所有子节点都被提取为 items，且没有其他内容，可清空 children
      if (remainingChildren.length === 0) {
        delete node.children;
      } else {
        node.children = remainingChildren;
      }
    }

    // 处理 listItem：尝试扁平化提取 title/brief/extra
    if (node.type === 'listItem' && Array.isArray(node.children)) {
      const contentChild = node.children.find(c => c && c.type === 'listItemContent');
      const extraChild = node.children.find(c => c && c.type === 'listItemExtra');
      const arrowChild = node.children.find(c => c && c.type === 'listItemArrow');

      if (contentChild) {
        const titleChild = contentChild.children && Array.isArray(contentChild.children)
          ? contentChild.children.find(c => c && c.type === 'listItemTitle')
          : null;
        const briefChild = contentChild.children && Array.isArray(contentChild.children)
          ? contentChild.children.find(c => c && c.type === 'listItemBrief')
          : null;

        if (titleChild && typeof titleChild.children === 'string') {
          node.props = node.props || {};
          node.props.title = titleChild.children;
        }
        if (briefChild && typeof briefChild.children === 'string') {
          node.props = node.props || {};
          node.props.brief = briefChild.children;
        }
      }

      if (extraChild && typeof extraChild.children === 'string') {
        node.props = node.props || {};
        node.props.extra = extraChild.children;
      }
      if (arrowChild) {
        node.props = node.props || {};
        node.props.arrow = true;
      }
    }

    // 递归处理子节点
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        postProcess(child);
      }
    }
  }

  // ============================================================
  // 3. 公开 API
  // ============================================================

  const HtmlToSchema = {
    /**
     * 解析 HTML 字符串为 JSON Schema
     * @param {string} html - HTML 字符串（如 v1.0.4.js 中的 scenario.content）
     * @param {object} options - 解析选项
     * @param {string} options.id - 页面 ID（如 "step1-info-normal"）
     * @param {string} options.title - 页面标题
     * @param {string} [options.backgroundColor="#f5f5f5"] - 页面背景色
     * @param {object} [options.navigationBar] - 导航栏配置
     * @param {string} [options.navigationBar.title="官方 ETC"] - 导航栏标题
     * @param {boolean} [options.navigationBar.showBack=true] - 是否显示返回按钮
     * @returns {object} JSON Schema 对象
     */
    parse(html, options = {}) {
      if (!html || typeof html !== 'string') {
        throw new Error('[HtmlToSchema] 输入必须是有效的 HTML 字符串');
      }

      const parser = new DOMParserImpl();
      const doc = parser.parseFromString(html, 'text/html');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error(`[HtmlToSchema] HTML 解析失败: ${parserError.textContent ? parserError.textContent.slice(0, 200) : ''}`);
      }
      const rootElements = Array.from(doc.body.childNodes);

      // 解析所有顶层节点
      const children = [];
      for (const node of rootElements) {
        const parsed = parseNode(node);
        if (parsed !== null) {
          children.push(parsed);
        }
      }

      // 递归后处理
      for (const child of children) {
        postProcess(child);
      }

      const schema = {
        version: '1.0',
        page: {
          id: options.id || 'unknown',
          title: options.title || '未命名页面',
          backgroundColor: options.backgroundColor || '#f5f5f5',
          navigationBar: {
            title: options.navigationBar?.title || '官方 ETC',
            showBack: options.navigationBar?.showBack !== false,
          },
          children: children,
        },
      };

      return schema;
    },

    /**
     * 解析 HTML 字符串为纯节点数组（不包含 page 包装层）
     * 适用于需要进一步手动组装的场景
     * @param {string} html - HTML 字符串
     * @returns {Array} Schema 节点数组
     */
    parseNodes(html) {
      if (!html || typeof html !== 'string') {
        throw new Error('[HtmlToSchema] 输入必须是有效的 HTML 字符串');
      }

      const parser = new DOMParserImpl();
      const doc = parser.parseFromString(html, 'text/html');
      const rootElements = Array.from(doc.body.childNodes);

      const children = [];
      for (const node of rootElements) {
        const parsed = parseNode(node);
        if (parsed !== null) {
          postProcess(parsed);
          children.push(parsed);
        }
      }
      return children;
    },
  };

  // ============================================================
  // 4. 测试用例（浏览器环境自动运行）
  // ============================================================

  function runTests() {
    console.group('[HtmlToSchema] 单元测试');
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
      if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
      } else {
        failed++;
        console.error(`  ✗ ${message}`);
      }
    }

    function deepEqual(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    // 测试 1：基本按钮解析
    try {
      const html = '<button class="am-button am-button--primary am-button--block">提交</button>';
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.type === 'button', '按钮类型解析正确');
      assert(schema.props.type === 'primary', '按钮 type props 提取正确');
      assert(schema.props.block === true, '按钮 block props 提取正确');
      assert(schema.children === '提交', '按钮文本解析正确');
    } catch (e) {
      assert(false, `基本按钮解析失败: ${e.message}`);
    }

    // 测试 2：文本样式解析
    try {
      const html = '<span class="am-text am-text--lg am-text--bold am-text--primary">标题</span>';
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.type === 'text', '文本类型解析正确');
      assert(schema.props.size === 'lg', '文本 size props 提取正确');
      assert(schema.props.bold === true, '文本 bold props 提取正确');
      assert(schema.props.color === 'primary', '文本 color props 提取正确');
    } catch (e) {
      assert(false, `文本样式解析失败: ${e.message}`);
    }

    // 测试 3：工具类样式转换
    try {
      const html = '<div class="am-flex am-gap-2 am-mt-4 am-items-center"></div>';
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.style.gap === '8rpx', 'gap 工具类转换正确');
      assert(schema.style.marginTop === '16rpx', 'mt 工具类转换正确');
      assert(schema.style.alignItems === 'center', 'items-center 工具类转换正确');
    } catch (e) {
      assert(false, `工具类样式转换失败: ${e.message}`);
    }

    // 测试 4：事件提取
    try {
      const html = '<div class="am-button" data-action="handleTap">点击</div>';
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.events && schema.events.onTap === 'handleTap', 'data-action 映射为 onTap 正确');
    } catch (e) {
      assert(false, `事件提取失败: ${e.message}`);
    }

    // 测试 5：内联样式 px → rpx
    try {
      const html = '<div style="width: 48px; margin-top: 16px;"></div>';
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.style.width === '96rpx', 'px → rpx 宽度转换正确');
      assert(schema.style.marginTop === '32rpx', 'px → rpx margin 转换正确');
    } catch (e) {
      assert(false, `px→rpx 转换失败: ${e.message}`);
    }

    // 测试 6：步骤条解析
    try {
      const html = `
        <div class="am-steps">
          <div class="am-step am-step--active">
            <div class="am-step__badge">1</div>
            <div class="am-step__label">资格核验</div>
          </div>
          <div class="am-step__connector am-step__connector--active"></div>
          <div class="am-step">
            <div class="am-step__badge">2</div>
            <div class="am-step__label">上传证照</div>
          </div>
        </div>
      `;
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.type === 'steps', '步骤条类型解析正确');
      assert(schema.props.items && schema.props.items.length === 2, '步骤条 items 提取正确');
      assert(schema.props.items[0].title === '资格核验', '步骤条第一项标题正确');
      assert(schema.props.current === 0, '步骤条 current 推断正确');
    } catch (e) {
      assert(false, `步骤条解析失败: ${e.message}`);
    }

    // 测试 7：完整 page 包装
    try {
      const html = '<div class="am-page"><div class="am-card">内容</div></div>';
      const schema = HtmlToSchema.parse(html, { id: 'test-page', title: '测试页' });
      assert(schema.version === '1.0', 'Schema 版本正确');
      assert(schema.page.id === 'test-page', 'page.id 正确');
      assert(schema.page.children[0].type === 'page', '最外层 am-page 类型解析正确');
      assert(schema.page.children[0].children[0].type === 'card', 'page 内部子节点正确展开');
    } catch (e) {
      assert(false, `完整 page 包装失败: ${e.message}`);
    }

    // 测试 8：input 属性解析
    try {
      const html = '<input class="am-input am-input--inline" placeholder="请输入" readonly value="test" />';
      const schema = HtmlToSchema.parseNodes(html)[0];
      assert(schema.type === 'input', 'input 类型解析正确');
      assert(schema.props.placeholder === '请输入', 'input placeholder 提取正确');
      assert(schema.props.readonly === true, 'input readonly 提取正确');
      assert(schema.props.value === 'test', 'input value 提取正确');
      assert(schema.props.inline === true, 'input inline 提取正确');
    } catch (e) {
      assert(false, `input 属性解析失败: ${e.message}`);
    }

    console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);
    console.groupEnd();
    return { passed, failed };
  }

  // 浏览器环境下自动运行测试
  if (typeof window !== 'undefined') {
    // if (document.readyState === 'loading') {
    //   document.addEventListener('DOMContentLoaded', () => {
    //     console.log('[HtmlToSchema] 已加载，版本 1.0.0');
    //   });
    // } else {
    //   console.log('[HtmlToSchema] 已加载，版本 1.0.0');
    // }
  }

  // 将测试函数挂载到 API 上，方便手动调用
  HtmlToSchema.runTests = runTests;

  // 导出
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HtmlToSchema;
  }
  global.HtmlToSchema = HtmlToSchema;

})(typeof window !== 'undefined' ? window : global);
