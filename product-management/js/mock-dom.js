/**
 * 轻量级 Mock DOM 实现
 * 用于在 Node.js 环境中替代浏览器 DOMParser
 *
 * 功能：提供与浏览器 DOMParser 兼容的解析接口，以及 Node 类型常量。
 * 仅支持当前存量数据中出现的标签和属性，不支持 script/style/CDATA。
 *
 * @author Qoder Agent
 * @version 1.0.0
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. Node 类型常量与基础节点工厂
  // ============================================================

  const Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8,
  };

  function createTextNode(text) {
    return {
      nodeType: Node.TEXT_NODE,
      textContent: text,
    };
  }

  function createElement(tagName, attrStr) {
    const el = {
      nodeType: Node.ELEMENT_NODE,
      tagName: tagName.toUpperCase(),
      attributes: {},
      childNodes: [],
      getAttribute(name) {
        return this.attributes[name] !== undefined ? this.attributes[name] : null;
      },
    };

    parseAttributes(el, attrStr);

    // 映射常用布尔属性
    Object.defineProperty(el, 'disabled', {
      get() { return this.attributes.disabled !== undefined; },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(el, 'readOnly', {
      get() {
        return this.attributes.readonly !== undefined || this.attributes.readOnly !== undefined;
      },
      enumerable: true,
      configurable: true,
    });

    return el;
  }

  function parseAttributes(el, attrStr) {
    if (!attrStr) return;
    // 匹配：name="value" | name='value' | name=value | name（布尔）
    const regex = /([a-zA-Z][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;
    while ((match = regex.exec(attrStr)) !== null) {
      const name = match[1];
      let value;
      if (match[2] !== undefined) {
        value = match[2];
      } else if (match[3] !== undefined) {
        value = match[3];
      } else if (match[4] !== undefined) {
        value = match[4];
      } else {
        value = true;
      }
      el.attributes[name] = value;
    }
  }

  // ============================================================
  // 2. 轻量级 HTML 解析器
  // ============================================================

  /**
   * 轻量级 HTML 解析器
   * 仅支持当前存量数据中出现的标签和属性，不支持 script/style/CDATA
   * @param {string} html
   * @returns {Array} childNodes 数组
   */
  function parseHtmlLite(html) {
    // 移除 HTML 注释
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    const root = [];
    const stack = [{ childNodes: root }];
    const voidElements = new Set([
      'input', 'img', 'br', 'hr', 'meta', 'link',
      'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr',
    ]);

    let i = 0;
    while (i < html.length) {
      if (html[i] !== '<') {
        const nextTag = html.indexOf('<', i);
        const text = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag);
        if (text.length > 0) {
          stack[stack.length - 1].childNodes.push(createTextNode(text));
        }
        i = nextTag === -1 ? html.length : nextTag;
        continue;
      }

      // 处理以 '<' 开头的情况
      if (html[i + 1] === '/') {
        // 结束标签
        const end = html.indexOf('>', i);
        if (end === -1) break;
        if (stack.length > 1) stack.pop();
        i = end + 1;
        continue;
      }

      // 开始标签或自闭合标签
      const end = html.indexOf('>', i);
      if (end === -1) break;

      const tagContent = html.slice(i + 1, end).trim();
      const selfClosing = tagContent.endsWith('/');
      const actualTagContent = selfClosing
        ? tagContent.slice(0, -1).trim()
        : tagContent;

      const spaceIdx = actualTagContent.search(/\s/);
      const tagName = spaceIdx === -1
        ? actualTagContent
        : actualTagContent.slice(0, spaceIdx);
      const attrStr = spaceIdx === -1
        ? ''
        : actualTagContent.slice(spaceIdx + 1);

      const el = createElement(tagName, attrStr);
      stack[stack.length - 1].childNodes.push(el);

      if (!selfClosing && !voidElements.has(tagName.toLowerCase())) {
        stack.push(el);
      }

      i = end + 1;
    }

    return root;
  }

  // ============================================================
  // 3. MockDOMParser（兼容 DOMParser 接口）
  // ============================================================

  class MockDOMParser {
    parseFromString(html, mimeType) {
      const childNodes = parseHtmlLite(html);
      return {
        body: { childNodes },
        querySelector(sel) {
          if (sel === 'parsererror') return null;
          return null;
        },
      };
    }
  }

  // ============================================================
  // 4. 导出
  // ============================================================

  const MockDOM = {
    Node,
    MockDOMParser,
    // 同时以 DOMParser 别名暴露，方便上层统一使用
    DOMParser: MockDOMParser,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockDOM;
  }
  global.MockDOM = MockDOM;

})(typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this));
