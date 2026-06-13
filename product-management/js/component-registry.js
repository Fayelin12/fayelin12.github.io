/**
 * 统一组件注册表 (Unified Component Registry)
 * 产品管理端跨端编译层 —— 方案 B 核心基础设施
 *
 * 职责：集中定义所有组件的元数据（标签、类名、属性构建）及
 *       平台特定的自定义渲染回调（renderHtml / renderAxml /
 *       renderInnerHtml / renderInnerAxml），供 schema-to-html.js
 *       和 schema-to-axml.js 共同消费，消除两套渲染器中的重复定义。
 *
 * 设计原则：
 *   - 简单组件：通过 htmlTag/axmlTag + classMap + buildProps* 声明式配置。
 *   - 复杂组件：通过 renderHtml/renderAxml 完全自定义渲染，
 *     或通过 renderInnerHtml/renderInnerAxml 仅自定义内部结构。
 *   - 新增复杂组件时"注册一次，双端生效"。
 *
 * 运行环境：浏览器 / Node.js（原生 JavaScript，无模块依赖）
 *
 * @author Qoder Agent
 * @version 3.1.0
 */

(function (global) {
  'use strict';

  // ============================================================
  // 0. 工具函数（内部使用，不污染全局）
  // ============================================================

  function escapeAttr(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ============================================================
  // 1. 注册表存储
  // ============================================================

  var _entries = {};

  /**
   * 注册组件定义
   * @param {string} type - Schema 类型名
   * @param {object} def  - 组件定义
   *
   * def 字段说明：
   *   htmlTag        {string}   H5 端使用的 HTML 标签
   *   axmlTag        {string}   小程序端使用的标签（ant-* 或原生 view/text/image）
   *   baseClasses    {string[]} 基础 CSS 类名
   *   selfClosing    {boolean}  是否自闭合（如 img、input）
   *   isAntComponent {boolean}  是否为 antd-mini 组件（影响 AXML 组件路径收集）
   *   componentPath  {string|null} antd-mini 组件路径，如 '/components/Button/index'
   *   classMap       {object}   props -> 类名的统一映射（见下方说明）
   *   buildClasses   {function} (props) => string[]  复杂类名构建回调（可选）
   *   buildPropsHtml {function} (props) => string     H5 属性字符串（可选）
   *   buildPropsAxml {function} (props) => string     AXML 属性字符串（可选）
   *   renderHtml     {function} (node, context) => string  H5 完整自定义渲染（可选）
   *   renderAxml     {function} (node, context) => string  AXML 完整自定义渲染（可选）
   *   renderInnerHtml {function} (node, context) => string  H5 仅自定义 innerHTML（可选）
   *   renderInnerAxml {function} (node, context) => string  AXML 仅自定义 innerAXML（可选）
   *
   * classMap 格式：
   *   {
   *     type: { primary: 'am-button--primary', default: 'am-button--default' },
   *     block: 'am-button--block',   // boolean prop，为 true 时添加
   *   }
   */
  function register(type, def) {
    _entries[type] = {
      type: type,
      htmlTag: def.htmlTag || 'div',
      axmlTag: def.axmlTag || 'view',
      baseClasses: def.baseClasses || [],
      selfClosing: def.selfClosing || false,
      isAntComponent: def.isAntComponent || false,
      componentPath: def.componentPath || null,
      classMap: def.classMap || null,
      buildClasses: def.buildClasses || null,
      buildPropsHtml: def.buildPropsHtml || null,
      buildPropsAxml: def.buildPropsAxml || null,
      renderHtml: def.renderHtml || null,
      renderAxml: def.renderAxml || null,
      renderInnerHtml: def.renderInnerHtml || null,
      renderInnerAxml: def.renderInnerAxml || null,
    };
  }

  // ============================================================
  // 2. 批量注册所有组件
  // ============================================================

  // ---- antd-mini 组件（AXML 端使用 ant-* 标签） ----

  register('button', {
    htmlTag: 'button',
    axmlTag: 'ant-button',
    baseClasses: ['am-button'],
    isAntComponent: true,
    componentPath: '/components/Button/index',
    classMap: {
      type: { primary: 'am-button--primary', default: 'am-button--default', ghost: 'am-button--ghost', text: 'am-button--text', danger: 'am-button--danger', success: 'am-button--success', warning: 'am-button--warning', info: 'am-button--info' },
      size: { small: 'am-button--small', medium: 'am-button--medium', large: 'am-button--large' },
      block: 'am-button--block',
      round: 'am-button--round',
      disabled: 'am-button--disabled',
    },
    buildPropsAxml: function (p) {
      var a = [];
      if (p.type) a.push('type="' + escapeAttr(p.type) + '"');
      if (p.size) a.push('size="' + escapeAttr(p.size) + '"');
      if (p.disabled) a.push('disabled');
      return a.join(' ');
    },
  });

  register('input', {
    htmlTag: 'input',
    axmlTag: 'input',
    baseClasses: ['am-input'],
    selfClosing: true,
    isAntComponent: false,
    componentPath: null,
    classMap: {
      disabled: 'am-input--disabled',
      inline: 'am-input--inline',
      danger: 'am-input--danger',
    },
    buildPropsHtml: function (p) {
      var a = [];
      if (p.placeholder) a.push('placeholder="' + escapeAttr(p.placeholder) + '"');
      if (p.readonly) a.push('readonly');
      if (p.disabled) a.push('disabled');
      if (p.value !== undefined) a.push('value="' + escapeAttr(String(p.value)) + '"');
      return a.join(' ');
    },
    buildPropsAxml: function (p) {
      var a = [];
      if (p.placeholder) a.push('placeholder="' + escapeAttr(p.placeholder) + '"');
      if (p.value !== undefined) a.push('value="' + escapeAttr(String(p.value)) + '"');
      if (p.readonly) a.push('readonly');
      if (p.disabled) a.push('disabled');
      return a.join(' ');
    },
  });

  register('checkbox', {
    htmlTag: 'div',
    axmlTag: 'ant-checkbox',
    baseClasses: ['am-checkbox'],
    isAntComponent: true,
    componentPath: '/components/Checkbox/index',
    classMap: {
      checked: 'am-checkbox--checked',
    },
    buildPropsAxml: function (p) {
      return p.checked ? 'checked' : '';
    },
    renderInnerHtml: function (node, ctx) {
      var checked = node.props && node.props.checked;
      var label = node.props && node.props.label;
      var checkMark = checked ? '<span class="am-checkbox__check">✓</span>' : '';
      var html = '<div class="am-checkbox' + (checked ? ' am-checkbox--checked' : '') + '">' + checkMark + '</div>';
      if (label) html += '<span class="am-text am-text--md">' + ctx.escapeText(label) + '</span>';
      return html;
    },
  });

  register('radio', {
    htmlTag: 'div',
    axmlTag: 'ant-radio',
    baseClasses: ['am-radio'],
    isAntComponent: true,
    componentPath: '/components/Radio/index',
    classMap: {
      checked: 'am-radio--checked',
    },
    buildPropsAxml: function (p) {
      return p.checked ? 'checked' : '';
    },
    renderInnerHtml: function (node, ctx) {
      var checked = node.props && node.props.checked;
      var label = node.props && node.props.label;
      var inner = checked ? '<div class="am-radio__inner"></div>' : '';
      var html = '<div class="am-radio' + (checked ? ' am-radio--checked' : '') + '">' + inner + '</div>';
      if (label) html += '<span class="am-text am-text--md">' + ctx.escapeText(label) + '</span>';
      return html;
    },
  });

  register('switch', {
    htmlTag: 'div',
    axmlTag: 'ant-switch',
    baseClasses: ['am-switch'],
    isAntComponent: true,
    componentPath: '/components/Switch/index',
    buildPropsAxml: function (p) {
      var a = [];
      if (p.checked) a.push('checked');
      if (p.disabled) a.push('disabled');
      return a.join(' ');
    },
  });

  register('tag', {
    htmlTag: 'span',
    axmlTag: 'ant-tag',
    baseClasses: ['am-tag'],
    isAntComponent: true,
    componentPath: '/components/Tag/index',
    classMap: {
      type: { primary: 'am-tag--primary', success: 'am-tag--success', warning: 'am-tag--warning', danger: 'am-tag--danger', default: 'am-tag--default' },
      solid: 'am-tag--solid',
    },
    buildPropsAxml: function (p) {
      return p.type ? 'type="' + escapeAttr(p.type) + '"' : '';
    },
  });

  register('loading', {
    htmlTag: 'div',
    axmlTag: 'ant-loading',
    baseClasses: ['am-loading'],
    isAntComponent: true,
    componentPath: '/components/Loading/index',
    classMap: {
      size: { large: 'am-loading__spinner--lg' },
    },
    buildPropsAxml: function (p) {
      return p.size === 'large' ? 'size="large"' : '';
    },
    renderInnerHtml: function (node, ctx) {
      var text = (node.props && node.props.text) || '加载中...';
      var size = node.props && node.props.size;
      var spinnerClass = size === 'large' ? 'am-loading__spinner am-loading__spinner--lg' : 'am-loading__spinner';
      return '<div class="' + spinnerClass + '"></div><div class="am-loading__text">' + ctx.escapeText(text) + '</div>';
    },
  });

  register('result', {
    htmlTag: 'div',
    axmlTag: 'ant-result',
    baseClasses: ['am-result'],
    isAntComponent: true,
    componentPath: '/components/Result/index',
    buildPropsAxml: function (p) {
      var a = [];
      if (p.status) a.push('status="' + escapeAttr(p.status) + '"');
      if (p.title) a.push('title="' + escapeAttr(p.title) + '"');
      if (p.description) a.push('description="' + escapeAttr(p.description) + '"');
      return a.join(' ');
    },
    renderInnerHtml: function (node, ctx) {
      var status = (node.props && node.props.status) || 'success';
      var iconMap = { success: '✓', error: '✗', warning: '!', info: 'ℹ' };
      var icon = iconMap[status] || iconMap.success;
      var title = (node.props && node.props.title) || '';
      var description = (node.props && node.props.description) || '';
      return '<div class="am-result__icon am-result__icon--' + status + '">' + icon + '</div><div class="am-result__title">' + ctx.escapeText(title) + '</div><div class="am-result__description">' + ctx.escapeText(description) + '</div>';
    },
  });

  register('empty', {
    htmlTag: 'div',
    axmlTag: 'ant-empty',
    baseClasses: ['am-empty'],
    isAntComponent: true,
    componentPath: '/components/Empty/index',
    buildPropsAxml: function (p) {
      return p.description ? 'description="' + escapeAttr(p.description) + '"' : '';
    },
    renderInnerHtml: function (node, ctx) {
      var description = (node.props && node.props.description) || '暂无数据';
      return '<div class="am-empty__description">' + ctx.escapeText(description) + '</div>';
    },
  });

  // antd-mini List（AXML 端使用，H5 端用原生 div 模拟）
  register('list', {
    htmlTag: 'div',
    axmlTag: 'ant-list',
    baseClasses: ['am-list'],
    isAntComponent: true,
    componentPath: '/components/List/index',
    classMap: {
      flush: 'am-list--flush',
    },
    renderAxml: function (node, ctx) {
      var children = Array.isArray(node.children) ? node.children : [];
      var header, footer;
      var items = [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (!child || typeof child !== 'object') continue;
        if (child.type === 'listHeader' && typeof child.children === 'string') {
          header = child.children;
        } else if (child.type === 'listFooter' && typeof child.children === 'string') {
          footer = child.children;
        } else {
          items.push(child);
        }
      }
      var headerAttr = header ? ' header="' + ctx.escapeAttr(header) + '"' : '';
      var footerAttr = footer ? ' footer="' + ctx.escapeAttr(footer) + '"' : '';
      var result = ctx.indent() + '<ant-list' + headerAttr + footerAttr + '>\n';
      ctx.incIndent();
      for (var j = 0; j < items.length; j++) {
        result += ctx.renderAxmlNode(items[j]);
      }
      ctx.decIndent();
      result += ctx.indent() + '</ant-list>\n';
      return result;
    },
  });

  register('listItem', {
    htmlTag: 'div',
    axmlTag: 'ant-list-item',
    baseClasses: ['am-list-item'],
    isAntComponent: true,
    componentPath: '/components/List/ListItem/index',
    renderHtml: function (node, ctx) {
      var children = Array.isArray(node.children) ? node.children : [];
      var title = '', brief = '', extra = '', arrow = false;
      var remaining = [];
      for (var ci = 0; ci < children.length; ci++) {
        var child = children[ci];
        if (!child || typeof child !== 'object') continue;
        if (child.type === 'listItemContent' && Array.isArray(child.children)) {
          for (var cj = 0; cj < child.children.length; cj++) {
            var cc = child.children[cj];
            if (cc && cc.type === 'listItemTitle' && typeof cc.children === 'string') title = cc.children;
            else if (cc && cc.type === 'listItemBrief' && typeof cc.children === 'string') brief = cc.children;
            else remaining.push(cc);
          }
        } else if (child.type === 'listItemExtra' && typeof child.children === 'string') {
          extra = child.children;
        } else if (child.type === 'listItemArrow') {
          arrow = true;
        } else {
          remaining.push(child);
        }
      }
      var html = '<div class="am-list-item"><div class="am-list-item__line">';
      html += '<div class="am-list-item__content-container">';
      if (title) html += '<div class="am-list-item__content-title">' + ctx.escapeText(title) + '</div>';
      html += '<div class="am-list-item__content-main"></div>';
      if (brief) html += '<div class="am-list-item__content-brief">' + ctx.escapeText(brief) + '</div>';
      html += '</div>';
      html += '<div class="am-list-item__extra-container"><div class="am-list-item__extra">';
      html += (extra ? ctx.escapeText(extra) : '');
      for (var ri = 0; ri < remaining.length; ri++) {
        html += ctx.renderNode(remaining[ri]);
      }
      html += '</div></div>';
      if (arrow) html += '<div class="am-list-item__arrow">&rsaquo;</div>';
      html += '</div></div>';
      return html;
    },
    renderAxml: function (node, ctx) {
      var children = Array.isArray(node.children) ? node.children : [];
      var title, brief, extra, arrow = false;
      var remaining = [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (!child || typeof child !== 'object') {
          remaining.push(child);
          continue;
        }
        if (child.type === 'listItemContent' && Array.isArray(child.children)) {
          for (var j = 0; j < child.children.length; j++) {
            var c = child.children[j];
            if (c && c.type === 'listItemTitle' && typeof c.children === 'string') title = c.children;
            else if (c && c.type === 'listItemBrief' && typeof c.children === 'string') brief = c.children;
            else remaining.push(c);
          }
        } else if (child.type === 'listItemExtra' && typeof child.children === 'string') {
          extra = child.children;
        } else if (child.type === 'listItemArrow') {
          arrow = true;
        } else {
          remaining.push(child);
        }
      }
      var titleAttr = title ? ' title="' + ctx.escapeAttr(title) + '"' : '';
      var briefAttr = brief ? ' brief="' + ctx.escapeAttr(brief) + '"' : '';
      var extraAttr = extra ? ' extra="' + ctx.escapeAttr(extra) + '"' : '';
      var arrowAttr = arrow ? ' arrow' : '';
      if (remaining.length === 0) {
        return ctx.indent() + '<ant-list-item' + titleAttr + briefAttr + extraAttr + arrowAttr + ' />\n';
      }
      var result = ctx.indent() + '<ant-list-item' + titleAttr + briefAttr + extraAttr + arrowAttr + '>\n';
      ctx.incIndent();
      result += ctx.indent() + '<view slot="extra">\n';
      ctx.incIndent();
      for (var r = 0; r < remaining.length; r++) {
        result += ctx.renderAxmlNode(remaining[r]);
      }
      ctx.decIndent();
      result += ctx.indent() + '</view>\n';
      ctx.decIndent();
      result += ctx.indent() + '</ant-list-item>\n';
      return result;
    },
  });

  // ---- 原生标签（H5 用 HTML 标签，AXML 用 view/text/image 等） ----

  register('page', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-page'] });
  register('view', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-view'] });
  register('scrollView', { htmlTag: 'div', axmlTag: 'scroll-view', baseClasses: ['am-scroll-view'] });
  register('swiper', { htmlTag: 'div', axmlTag: 'swiper', baseClasses: ['am-swiper'] });

  // 卡片（antd-mini 无 Card，两端都用原生标签模拟）
  register('card', {
    htmlTag: 'div',
    axmlTag: 'view',
    baseClasses: ['am-card'],
    classMap: {
      noShadow: 'am-card--no-shadow',
      danger: 'am-card--danger',
    },
    renderAxml: function (node, ctx) {
      var children = Array.isArray(node.children) ? node.children : [];
      var cardTitle, cardExtra;
      var bodyChildren = [];
      var footerChildren = [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (!child || typeof child !== 'object') {
          bodyChildren.push(child);
          continue;
        }
        if (child.type === 'cardHeader') {
          if (Array.isArray(child.children)) {
            for (var j = 0; j < child.children.length; j++) {
              var c = child.children[j];
              if (c && c.type === 'cardTitle' && typeof c.children === 'string') cardTitle = c.children;
              if (c && c.type === 'cardExtra' && typeof c.children === 'string') cardExtra = c.children;
            }
          }
        } else if (child.type === 'cardBody') {
          bodyChildren.push.apply(bodyChildren, Array.isArray(child.children) ? child.children : [child.children]);
        } else if (child.type === 'cardFooter') {
          footerChildren.push.apply(footerChildren, Array.isArray(child.children) ? child.children : [child.children]);
        } else {
          bodyChildren.push(child);
        }
      }
      var hasHeader = cardTitle || cardExtra;
      var result = ctx.indent() + '<view class="am-card">\n';
      ctx.incIndent();
      if (hasHeader) {
        result += ctx.indent() + '<view class="am-card__header">\n';
        ctx.incIndent();
        if (cardTitle) result += ctx.indent() + '<text class="am-card__title">' + ctx.escapeText(cardTitle) + '</text>\n';
        if (cardExtra) result += ctx.indent() + '<text class="am-card__extra">' + ctx.escapeText(cardExtra) + '</text>\n';
        ctx.decIndent();
        result += ctx.indent() + '</view>\n';
      }
      if (bodyChildren.length > 0) {
        result += ctx.indent() + '<view class="am-card__body">\n';
        ctx.incIndent();
        for (var b = 0; b < bodyChildren.length; b++) {
          result += ctx.renderAxmlNode(bodyChildren[b]);
        }
        ctx.decIndent();
        result += ctx.indent() + '</view>\n';
      }
      if (footerChildren.length > 0) {
        result += ctx.indent() + '<view class="am-card__footer">\n';
        ctx.incIndent();
        for (var f = 0; f < footerChildren.length; f++) {
          result += ctx.renderAxmlNode(footerChildren[f]);
        }
        ctx.decIndent();
        result += ctx.indent() + '</view>\n';
      }
      ctx.decIndent();
      result += ctx.indent() + '</view>\n';
      return result;
    },
  });
  register('cardHeader', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-card__header'] });
  register('cardTitle', { htmlTag: 'div', axmlTag: 'text', baseClasses: ['am-card__title'] });
  register('cardExtra', { htmlTag: 'div', axmlTag: 'text', baseClasses: ['am-card__extra'] });
  register('cardBody', {
    htmlTag: 'div',
    axmlTag: 'view',
    baseClasses: ['am-card__body'],
    classMap: {
      flushBody: 'am-card__body--flush',
    },
  });
  register('cardFooter', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-card__footer'] });

  // 列表子元素
  register('listHeader', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-list__header'] });
  register('listFooter', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-list__footer'] });
  register('listItemContent', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-list-item__content'] });
  register('listItemTitle', { htmlTag: 'div', axmlTag: 'text', baseClasses: ['am-list-item__title'] });
  register('listItemBrief', { htmlTag: 'div', axmlTag: 'text', baseClasses: ['am-list-item__brief'] });
  register('listItemExtra', { htmlTag: 'div', axmlTag: 'text', baseClasses: ['am-list-item__extra'] });
  register('listItemArrow', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-list-item__arrow'] });

  // 文本（最复杂，两端共享同一套 classMap）
  register('text', {
    htmlTag: 'span',
    axmlTag: 'text',
    baseClasses: ['am-text'],
    classMap: {
      size: { xs: 'am-text--xs', sm: 'am-text--sm', md: 'am-text--md', lg: 'am-text--lg', xl: 'am-text--xl', xxl: 'am-text--xxl' },
      color: { primary: 'am-text--primary', secondary: 'am-text--secondary', tertiary: 'am-text--tertiary', placeholder: 'am-text--placeholder', success: 'am-text--success', warning: 'am-text--warning', danger: 'am-text--danger', white: 'am-text--white' },
      bold: 'am-text--bold',
      medium: 'am-text--medium',
      relaxed: 'am-text--relaxed',
      align: { center: 'am-text--center', right: 'am-text--right' },
      variant: { title: 'am-card__title', extra: 'am-card__extra', body: 'am-list-item__title', brief: 'am-list-item__brief', listHeader: 'am-list__header', listFooter: 'am-list__footer', navTitle: 'am-nav-bar__title', subtitle: 'am-button__subtitle' },
    },
  });

  // 图片/媒体
  register('image', {
    htmlTag: 'img',
    axmlTag: 'image',
    baseClasses: ['am-image'],
    selfClosing: true,
    classMap: {
      mode: { aspectFit: 'am-image--aspectFit', aspectFill: 'am-image--aspectFill' },
    },
    buildPropsHtml: function (p) {
      var a = [];
      if (p.src) a.push('src="' + escapeAttr(p.src) + '"');
      if (p.alt) a.push('alt="' + escapeAttr(p.alt) + '"');
      if (p.mode) a.push('mode="' + escapeAttr(p.mode) + '"');
      return a.join(' ');
    },
    buildPropsAxml: function (p) {
      var a = [];
      if (p.src) a.push('src="' + escapeAttr(p.src) + '"');
      if (p.mode) a.push('mode="' + escapeAttr(p.mode) + '"');
      return a.join(' ');
    },
  });

  register('textarea', {
    htmlTag: 'textarea',
    axmlTag: 'textarea',
    baseClasses: ['am-textarea'],
    buildPropsHtml: function (p) {
      var a = [];
      if (p.placeholder) a.push('placeholder="' + escapeAttr(p.placeholder) + '"');
      if (p.readonly) a.push('readonly');
      if (p.disabled) a.push('disabled');
      return a.join(' ');
    },
    buildPropsAxml: function (p) {
      var a = [];
      if (p.placeholder) a.push('placeholder="' + escapeAttr(p.placeholder) + '"');
      if (p.readonly) a.push('readonly');
      if (p.disabled) a.push('disabled');
      return a.join(' ');
    },
  });

  register('icon', { htmlTag: 'span', axmlTag: 'icon', baseClasses: ['am-icon'] });

  // 导航
  register('steps', {
    htmlTag: 'div',
    axmlTag: 'view',
    baseClasses: ['am-steps'],
    renderHtml: function (node, ctx) {
      var items = (node.props && node.props.items) || [];
      var current = (node.props && node.props.current) || 0;
      var stepsHtml = items.map(function (item, index) {
        var isActive = index === current;
        var isCompleted = index < current;
        var activeClass = isActive ? 'am-step--active' : '';
        var completedClass = isCompleted ? 'am-step--completed' : '';
        var badgeText = isCompleted ? '✓' : String(index + 1);
        var title = item.title || '';
        var connector = index < items.length - 1
          ? '<div class="am-step__connector' + (isCompleted ? ' am-step__connector--completed' : '') + (isActive ? ' am-step__connector--active' : '') + '"></div>'
          : '';
        return '<div class="am-step ' + activeClass + ' ' + completedClass + '"><div class="am-step__badge">' + badgeText + '</div><div class="am-step__label">' + ctx.escapeText(title) + '</div></div>' + connector;
      }).join('');
      return '<div class="am-steps">' + stepsHtml + '</div>';
    },
    renderAxml: function (node, ctx) {
      var items = (node.props && node.props.items) || [];
      var current = (node.props && node.props.current) || 0;
      var result = ctx.indent() + '<view class="am-steps">\n';
      ctx.incIndent();
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var isActive = i === current;
        var isCompleted = i < current;
        var activeClass = isActive ? ' am-step--active' : '';
        var completedClass = isCompleted ? ' am-step--completed' : '';
        var badgeText = isCompleted ? '✓' : String(i + 1);
        result += ctx.indent() + '<view class="am-step' + activeClass + completedClass + '">\n';
        ctx.incIndent();
        result += ctx.indent() + '<view class="am-step__badge"><text>' + badgeText + '</text></view>\n';
        result += ctx.indent() + '<view class="am-step__label">' + ctx.escapeText(item.title || '') + '</view>\n';
        ctx.decIndent();
        result += ctx.indent() + '</view>\n';
        if (i < items.length - 1) {
          var connectorClass = isCompleted ? ' am-step__connector--completed' : (isActive ? ' am-step__connector--active' : '');
          result += ctx.indent() + '<view class="am-step__connector' + connectorClass + '"></view>\n';
        }
      }
      ctx.decIndent();
      result += ctx.indent() + '</view>\n';
      return result;
    },
  });
  register('step', {
    htmlTag: 'div',
    axmlTag: 'view',
    baseClasses: ['am-step'],
    classMap: {
      active: 'am-step--active',
      completed: 'am-step--completed',
    },
  });
  register('navBar', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-nav-bar'] });
  register('navBarBack', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-nav-bar__back'] });
  register('navBarTitle', { htmlTag: 'div', axmlTag: 'text', baseClasses: ['am-nav-bar__title'] });
  register('divider', {
    htmlTag: 'div',
    axmlTag: 'view',
    baseClasses: ['am-divider'],
    classMap: {
      variant: { line: 'am-line' },
    },
  });

  // 业务专用
  register('avatar', {
    htmlTag: 'div',
    axmlTag: 'view',
    baseClasses: ['am-avatar'],
    classMap: {
      size: { small: 'am-avatar--sm', medium: 'am-avatar--md', large: 'am-avatar--lg' },
    },
  });
  register('licensePrefix', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-license-prefix'] });
  register('licenseNewEnergy', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-license-newenergy'] });
  register('displayField', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-display-field'] });
  register('checkboxRow', { htmlTag: 'div', axmlTag: 'view', baseClasses: ['am-checkbox-row'] });
  register('helpIcon', { htmlTag: 'span', axmlTag: 'text', baseClasses: ['am-help-icon'] });

  // ============================================================
  // 3. 公开 API
  // ============================================================

  var ComponentRegistry = {
    /** 注册组件 */
    register: function (type, def) {
      register(type, def);
    },

    /** 获取组件定义 */
    get: function (type) {
      return _entries[type] || null;
    },

    /** 获取所有已注册的类型名 */
    getAllTypes: function () {
      var types = [];
      for (var type in _entries) {
        if (Object.prototype.hasOwnProperty.call(_entries, type)) {
          types.push(type);
        }
      }
      return types;
    },

    /** 获取指定平台的标签名 */
    getTag: function (type, platform) {
      var entry = _entries[type];
      if (!entry) return 'div';
      return platform === 'axml' ? entry.axmlTag : entry.htmlTag;
    },

    /** 是否为 antd-mini 组件 */
    isAntComponent: function (type) {
      var entry = _entries[type];
      return !!(entry && entry.isAntComponent);
    },

    /** 获取 antd-mini 组件路径映射（供 page.json usingComponents 使用） */
    getComponentPaths: function (adapter) {
      var paths = {};
      for (var type in _entries) {
        if (!Object.prototype.hasOwnProperty.call(_entries, type)) continue;
        var e = _entries[type];
        if (e.componentPath) {
          if (adapter && adapter.mode === 'npm' && adapter.getComponentPath) {
            var relPath = e.componentPath
              .replace(/^\/components\//, '')
              .replace(/\/index$/, '');
            paths[e.axmlTag] = adapter.getComponentPath(relPath);
          } else {
            paths[e.axmlTag] = e.componentPath;
          }
        }
      }
      return paths;
    },

    /**
     * 根据 props 构建 className 数组（双端共享）
     * @param {string} type - 组件类型
     * @param {object} props - 组件 props
     * @param {string[]} originalClasses - 原始 className 数组
     * @returns {string[]}
     */
    buildClasses: function (type, props, originalClasses) {
      var classes = Array.isArray(originalClasses) ? originalClasses.slice() : [];
      var entry = _entries[type];
      if (!entry) return classes;

      // 1. 确保 baseClasses 存在
      if (entry.baseClasses) {
        for (var i = 0; i < entry.baseClasses.length; i++) {
          var bc = entry.baseClasses[i];
          if (classes.indexOf(bc) === -1) {
            classes.unshift(bc);
          }
        }
      }

      // 2. 通过 classMap 自动映射 props -> 类名
      if (entry.classMap && props) {
        for (var propName in entry.classMap) {
          if (!Object.prototype.hasOwnProperty.call(entry.classMap, propName)) continue;
          var mapping = entry.classMap[propName];
          var propValue = props[propName];
          if (mapping === undefined || mapping === null) continue;

          if (typeof mapping === 'object' && mapping !== null) {
            // 值映射：{ primary: 'am-button--primary' }
            var mappedClass = mapping[propValue];
            if (mappedClass && classes.indexOf(mappedClass) === -1) {
              classes.push(mappedClass);
            }
          } else if (typeof mapping === 'string') {
            // 布尔映射：'am-button--block'（prop 为 true 时添加）
            if (propValue === true && classes.indexOf(mapping) === -1) {
              classes.push(mapping);
            }
          }
        }
      }

      // 3. 通过 buildClasses 回调处理复杂逻辑
      if (typeof entry.buildClasses === 'function') {
        var extra = entry.buildClasses(props);
        if (Array.isArray(extra)) {
          for (var j = 0; j < extra.length; j++) {
            if (classes.indexOf(extra[j]) === -1) {
              classes.push(extra[j]);
            }
          }
        }
      }

      // 4. 去重并保持顺序
      var seen = {};
      var deduped = [];
      for (var k = 0; k < classes.length; k++) {
        if (!seen[classes[k]]) {
          seen[classes[k]] = true;
          deduped.push(classes[k]);
        }
      }
      return deduped;
    },

    /**
     * 构建属性字符串
     * @param {string} type - 组件类型
     * @param {object} props - 组件 props
     * @param {string} platform - 'html' | 'axml'
     * @returns {string}
     */
    buildProps: function (type, props, platform) {
      var entry = _entries[type];
      if (!entry) return '';
      var builder = platform === 'axml' ? entry.buildPropsAxml : entry.buildPropsHtml;
      if (typeof builder === 'function' && props) {
        return builder(props);
      }
      return '';
    },

    /** 获取自闭合标记 */
    isSelfClosing: function (type) {
      var entry = _entries[type];
      return !!(entry && entry.selfClosing);
    },

    /**
     * 获取自定义渲染函数
     * @param {string} type - 组件类型
     * @param {string} platform - 'html' | 'axml'
     * @param {string} mode - 'full' | 'inner'（可选，默认 'full'）
     * @returns {function|null}
     */
    getRender: function (type, platform, mode) {
      var entry = _entries[type];
      if (!entry) return null;
      if (mode === 'inner') {
        return platform === 'axml'
          ? (entry.renderInnerAxml || null)
          : (entry.renderInnerHtml || null);
      }
      return platform === 'axml'
        ? (entry.renderAxml || null)
        : (entry.renderHtml || null);
    },
  };

  // 导出
  global.ComponentRegistry = ComponentRegistry;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentRegistry;
  }

})(typeof window !== 'undefined' ? window : global);
