/**
 * 共享样式过滤 — AXML / H5 编译器通用
 *
 * 两个编译器的 styleObjectToString 原本各自独立，容易不同步。
 * 此模块提取公共逻辑：哪些属性对 antd-mini 组件应跳过、通用去重等。
 *
 * 使用: SharedStyleFilter.filterStyle(style, classes, { isAntComponent: true })
 * 返回: { css: 'key1:val1;key2:val2', skipped: ['background','border'] }
 *
 * @author Qoder Agent
 * @version 1.0.0
 */

(function (global) {
  'use strict';

  // antd-mini 组件自行渲染的属性，inline style 不应覆盖
  var ANT_MANAGED_PROPS = ['background', 'border'];

  // utility class → CSS property 去重映射（两份编译器共用）
  var UTILITY_OVERLAP = {
    // 间距
    'am-mt-1': 'margin-top', 'am-mt-2': 'margin-top', 'am-mt-3': 'margin-top',
    'am-mt-4': 'margin-top', 'am-mt-5': 'margin-top', 'am-mt-6': 'margin-top',
    'am-mb-1': 'margin-bottom', 'am-mb-2': 'margin-bottom', 'am-mb-3': 'margin-bottom',
    'am-mb-4': 'margin-bottom', 'am-mb-5': 'margin-bottom', 'am-mb-6': 'margin-bottom',
    'am-ml-1': 'margin-left', 'am-ml-2': 'margin-left', 'am-ml-3': 'margin-left',
    'am-ml-4': 'margin-left', 'am-mr-1': 'margin-right', 'am-mr-2': 'margin-right',
    'am-mr-3': 'margin-right', 'am-mr-4': 'margin-right',
    'am-p-1': 'padding', 'am-p-2': 'padding', 'am-p-3': 'padding',
    'am-p-4': 'padding', 'am-p-5': 'padding', 'am-p-6': 'padding',
    'am-px-1': 'padding-left', 'am-px-2': 'padding-left', 'am-px-3': 'padding-left',
    'am-px-4': 'padding-left', 'am-py-1': 'padding-top', 'am-py-2': 'padding-top',
    'am-pt-1': 'padding-top', 'am-pt-2': 'padding-top', 'am-pt-3': 'padding-top',
    'am-pb-1': 'padding-bottom', 'am-pb-2': 'padding-bottom', 'am-pb-3': 'padding-bottom',
    // 布局
    'am-gap-1': 'gap', 'am-gap-2': 'gap', 'am-gap-3': 'gap', 'am-gap-4': 'gap',
    'am-w-full': 'width', 'am-h-full': 'height',
    'am-flex-1': 'flex', 'am-items-center': 'align-items',
    'am-rounded-sm': 'border-radius', 'am-rounded-md': 'border-radius',
    'am-rounded-lg': 'border-radius', 'am-rounded-full': 'border-radius',
    'am-opacity-60': 'opacity', 'am-opacity-85': 'opacity',
    'am-text--center': 'text-align', 'am-text--right': 'text-align',
    'am-cursor-pointer': 'cursor', 'am-leading-none': 'line-height',
  };

  function camelToKebab(str) {
    return str.replace(/[A-Z]/g, function (l) { return '-' + l.toLowerCase(); });
  }

  /**
   * 收集 className 中 utility class 已覆盖的 CSS 属性
   * @param {string[]} classes
   * @returns {Set<string>} CSS 属性名集合
   */
  function collectCoveredProps(classes) {
    var covered = {};
    for (var i = 0; i < classes.length; i++) {
      var prop = UTILITY_OVERLAP[classes[i]];
      if (prop) covered[prop] = true;
    }
    return covered;
  }

  var SharedStyleFilter = {
    /**
     * 过滤 style 对象，返回去重后的 CSS 字符串
     * @param {object} style          - { key: value } 样式对象
     * @param {string[]} classes      - className 数组
     * @param {object} [opts]         - 选项
     * @param {boolean} [opts.isAntComponent] - 是否 antd-mini 组件
     * @param {boolean} [opts.rpxToPx]  - 是否 rpx→px 转换（H5）
     * @returns {{ css: string, skipped: string[] }}
     */
    filterStyle: function (style, classes, opts) {
      opts = opts || {};
      if (!style || typeof style !== 'object') return { css: '', skipped: [] };

      var coveredProps = collectCoveredProps(Array.isArray(classes) ? classes : []);
      var entries = [];
      var skipped = [];

      for (var key in style) {
        if (!Object.prototype.hasOwnProperty.call(style, key)) continue;
        var cssProp = camelToKebab(key);

        // utility class 已覆盖 → 跳过
        if (coveredProps[cssProp]) continue;

        // antd-mini 组件自管属性 → 跳过
        if (opts.isAntComponent && ANT_MANAGED_PROPS.indexOf(cssProp) !== -1) {
          skipped.push(cssProp);
          continue;
        }

        var val = style[key];
        // H5 端 rpx→px
        if (opts.rpxToPx) {
          val = String(val).replace(/(\d+)rpx/g, function (_, n) { return (parseInt(n) / 2) + 'px'; });
        }
        entries.push(cssProp + ':' + val);
      }

      return { css: entries.join(';'), skipped: skipped };
    },
  };

  global.SharedStyleFilter = SharedStyleFilter;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharedStyleFilter;
  }
  if (typeof window !== 'undefined') window.SharedStyleFilter = SharedStyleFilter;

})(typeof window !== 'undefined' ? window : global);
