/**
 * Alipay Mini Program UI Renderer
 * 支付宝小程序 UI 渲染器
 *
 * 功能说明：
 * 1. 将产品管理端预览区的页面内容自动包裹为支付宝小程序风格结构
 * 2. 统一渲染导航栏、状态栏、页面容器
 * 3. 提供从小程序标签到 HTML 的自动映射辅助
 *
 * 【已精简】v2026-05-29：移除已被 schema-to-html.js 覆盖的组件级渲染函数
 * （renderSteps/renderButton/renderCard/renderList/renderFormRow/renderInputGroup/
 *  renderTag/renderCheckbox/renderResult/renderEmpty/renderLoading/upgradeToAlipayStyle）
 * 这些逻辑现统一由 JSON Schema → H5 渲染器处理，避免双路径同步维护。
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

function escapeRegExp(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const AlipayUIRenderer = {
  config: Object.freeze({
    defaultNavTitle: '官方 ETC',
    showBackButton: true,
    statusBarHeight: 24,
    navBarHeight: 44,
    autoWrapPage: true,
    primaryColor: '#1677FF'
  }),

  init() {
    // console.log('[AlipayUIRenderer] 支付宝小程序UI渲染器已初始化');
  },

  renderPage(content, options = {}) {
    const title = options.title || this.config.defaultNavTitle;
    const showBack = options.showBack !== undefined ? options.showBack : this.config.showBackButton;
    const bgColor = options.backgroundColor || 'var(--app-bg-page)';

    return `
      <!-- 状态栏 -->
      ${this.renderStatusBar()}

      <!-- 导航栏 -->
      ${this.renderNavBar(title, showBack)}

      <!-- 页面内容容器 - 对应小程序 <page> 或 <view class="page-container"> -->
      <!-- 注意：不再添加 am-page 类，因为 schema 渲染的内容已包含 .am-page 包装层 -->
      <!-- 避免双重 .am-page 导致 padding-top 翻倍（80px×2=160px），造成步骤条与导航栏间距过大 -->
      <div class="prototype-content" style="background-color: ${bgColor};">
        ${content}
      </div>
    `;
  },

  renderStatusBar() {
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
  },

  renderNavBar(title, showBack = true) {
    const backBtn = showBack
      ? '<div class="am-nav-bar__back">&lt;</div>'
      : '<div class="am-nav-bar__back" style="visibility: hidden;">&lt;</div>';

    return `
      <div class="am-nav-bar">
        ${backBtn}
        <div class="am-nav-bar__title">${escapeHtml(title)}</div>
        <div class="am-nav-bar__capsule">
          <div class="am-nav-bar__capsule-left"></div>
          <div class="am-nav-bar__capsule-divider"></div>
          <div class="am-nav-bar__capsule-right"></div>
        </div>
      </div>
    `;
  },

  /**
   * AXML 标签到 HTML 的自动转换
   * 用于辅助将小程序代码片段转换为 Web 预览可用的 HTML
   */
  axmlToHtml(axml) {
    if (!axml) return '';

    return axml
      .replace(/<view\s+([^>]*)\/>/g, (_, attrs) => `<div class="am-view" ${escapeHtml(attrs)}></div>`)
      .replace(/<text\s+([^>]*)\/>/g, (_, attrs) => `<span class="am-text" ${escapeHtml(attrs)}></span>`)
      .replace(/<image\s+([^>]*)\/>/g, (_, attrs) => `<img class="am-image" ${escapeHtml(attrs)}>`)
      .replace(/<view(?![a-z])/g, '<div class="am-view"')
      .replace(/<\/view>/g, '</div>')
      .replace(/<text(?![a-z])/g, '<span class="am-text"')
      .replace(/<\/text>/g, '</span>')
      .replace(/<image(?![a-z])/g, '<img class="am-image"')
      .replace(/<\/image>/g, '')
      .replace(/<button(?![a-z])/g, '<button class="am-button"')
      .replace(/<input(?![a-z])/g, '<input class="am-input"')
      .replace(/<textarea(?![a-z])/g, '<textarea class="am-textarea"')
      .replace(/<navigator(?![a-z])/g, '<a class="am-navigator"')
      .replace(/<\/navigator>/g, '</a>')
      .replace(/<scroll-view(?![a-z])/g, '<div class="am-scroll-view"')
      .replace(/<\/scroll-view>/g, '</div>')
      .replace(/\bonTap=/g, 'data-action=')
      .replace(/\bonChange=/g, 'oninput=')
      .replace(/\bplaceholder-style=/g, 'style=')
      .replace(/\bsrc="\{\{([^}]+)\}\}"/g, (_, expr) => `src="${escapeHtml(expr)}"`)
      .replace(/\bwx:if="\{\{([^}]+)\}\}"/g, (_, expr) => `data-wx-if="${escapeHtml(expr)}"`)
      .replace(/\bwx:for="\{\{([^}]+)\}\}"/g, (_, expr) => `data-for="${escapeHtml(expr)}"`)
      .replace(/<img class="am-image"([^>]*)mode="aspectFit"([^>]*)>/g, (_, before, after) => `<img class="am-image am-image--aspectFit"${escapeHtml(before)}${escapeHtml(after)}>`)
      .replace(/<img class="am-image"([^>]*)mode="aspectFill"([^>]*)>/g, (_, before, after) => `<img class="am-image am-image--aspectFill"${escapeHtml(before)}${escapeHtml(after)}>`);
  },

  getMiniProgramEquivalent(component) {
    const equivalents = {
      button: '<ant-button type="primary">按钮</ant-button>',
      input: '<ant-input placeholder="请输入" />',
      card: '<ant-card title="标题">内容</ant-card>',
      list: '<ant-list><ant-list-item title="标题" /></ant-list>',
      steps: '<ant-steps items="{{steps}}" current="{{1}}" />',
      navbar: '<ant-nav-bar title="标题" showBack />',
      tag: '<ant-tag type="primary">标签</ant-tag>',
      result: '<ant-result status="success" title="成功" />',
      empty: '<ant-empty description="暂无数据" />',
      loading: '<ant-loading />'
    };
    return equivalents[component] || '';
  }
};

const AlipayUIValidator = {
  validate(html, pageId = 'unknown') {
    const issues = [];
    if (!html) return issues;

    const styleMatches = html.match(/<style[\s>][\s\S]*?<\/style>/gi) || [];
    if (styleMatches.length > 0) {
      issues.push({
        severity: 'warning',
        message: `页面 ${pageId} 包含 ${styleMatches.length} 个内联 <style> 标签（${styleMatches.reduce((sum, s) => sum + s.length, 0)} 字符）`,
        suggestion: '建议将样式迁移到 css/alipay-mini-program.css，使用 am- 类名替代'
      });
    }

    const hardcodedColors = [];
    const styleAttrs = html.match(/style="([^"]*)"/g) || [];
    styleAttrs.forEach(styleAttr => {
      const colors = styleAttr.match(/#[0-9a-fA-F]{3,6}/g) || [];
      hardcodedColors.push(...colors);
    });
    const commonColors = ['#1677ff', '#1677FF', '#00b578', '#ff3141', '#ffffff', '#000000', '#fff', '#000'];
    const unusualColors = hardcodedColors.filter(c => !commonColors.includes(c.toLowerCase()));
    if (unusualColors.length > 0) {
      issues.push({
        severity: 'info',
        message: `页面 ${pageId} 发现 ${unusualColors.length} 个非常规硬编码颜色值`,
        detail: unusualColors.slice(0, 5).join(', ')
      });
    }

    const inlineStyles = (html.match(/style="/g) || []).length;
    if (inlineStyles > 10) {
      issues.push({
        severity: 'info',
        message: `页面 ${pageId} 内联 style 属性较多（${inlineStyles} 个）`,
        suggestion: '建议使用 am- 工具类（如 .am-mt-3、.am-flex 等）替代'
      });
    }

    if (inlineStyles > 0 && !html.includes('class="')) {
      issues.push({
        severity: 'error',
        message: `页面 ${pageId} 完全依赖内联 style，无 CSS 类名`,
        suggestion: '该场景不受 alipay-mini-program.css 控制，视觉风格可能与其他场景不一致'
      });
    }

    return issues;
  },

  log(issues) {
    if (!issues || issues.length === 0) return;

    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      console.group(`[AlipayUIValidator] 发现 ${errors.length} 个错误`);
      errors.forEach(e => console.error('  ', e.message, e.suggestion || ''));
      console.groupEnd();
    }
    if (warnings.length > 0) {
      console.group(`[AlipayUIValidator] 发现 ${warnings.length} 个警告`);
      warnings.forEach(w => console.warn('  ', w.message, w.suggestion || ''));
      console.groupEnd();
    }
    if (infos.length > 0) {
      console.group(`[AlipayUIValidator] 发现 ${infos.length} 个建议`);
      infos.forEach(i => console.info('  ', i.message, i.detail || ''));
      console.groupEnd();
    }
  }
};

AlipayUIRenderer.init();
