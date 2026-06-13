/**
 * 结构化页面描述 → JSON Schema 编译器
 * 产品管理端 —— 替代 HTML 输入层
 *
 * 功能：将简洁的结构化 JSON 描述转换为现有的 JSON Schema 中间表示。
 * 下游编译器（schema-to-axml.js / schema-to-html.js）无需改动。
 *
 * 设计原则：
 * 1. 每个对象只有 ONE key，key 名即组件类型
 * 2. 值可以是字符串（纯文本内容）、数组（children）、或配置对象
 * 3. Props、events、className、style 都在配置对象中扁平表达
 * 4. 嵌套结构尽量使用语义化 slot 名（header/body/items）
 *
 * @author Qoder Agent
 * @version 1.0.0
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. 结构化格式 → Schema 映射表
  // ============================================================

  /**
   * 每个组件的转换规则：
   * - key: 结构化格式中的 key 名
   * - schemaType: 对应的 Schema type 值
   * - build: 转换函数 (config, context) → Schema node
   *
   * context 提供额外信息，如 defaultSize、parentType 等
   */

  var HANDLERS = {};

  // ---- 容器类 ----

  HANDLERS.page = function (config) {
    if (typeof config === 'string') {
      return { type: 'page', children: [{ type: 'text', children: config }] };
    }
    return {
      type: 'page',
      id: config.id || '',
      title: config.title || '',
      backgroundColor: config.backgroundColor || '#f5f5f5',
      navigationBar: config.navigationBar || { title: '' },
      children: compileChildren(config.children),
    };
  };

  HANDLERS.card = function (config) {
    var children = [];
    if (config.header) {
      var headerChildren = [];
      if (typeof config.header === 'string') {
        headerChildren.push({ type: 'cardTitle', children: config.header });
      } else if (typeof config.header === 'object') {
        if (config.header.title) {
          headerChildren.push({ type: 'cardTitle', children: config.header.title });
        }
        if (config.header.extra) {
          headerChildren.push({ type: 'cardExtra', children: config.header.extra });
        }
      }
      if (headerChildren.length > 0) {
        children.push({ type: 'cardHeader', children: headerChildren });
      }
    }
    if (config.body) {
      children.push({ type: 'cardBody', children: compileChildren(config.body) });
    }
    if (config.footer) {
      children.push({ type: 'cardFooter', children: compileChildren(config.footer) });
    }
    return { type: 'card', children: children, className: config.class || undefined };
  };

  HANDLERS.list = function (config) {
    var children = [];
    if (config.header) {
      children.push({ type: 'listHeader', children: config.header });
    }
    if (Array.isArray(config.items)) {
      for (var i = 0; i < config.items.length; i++) {
        children.push(compileListItem(config.items[i]));
      }
    }
    if (config.footer) {
      children.push({ type: 'listFooter', children: config.footer });
    }
    var node = { type: 'list', children: children };
    if (config.flush) node.className = ['am-list--flush'];
    return node;
  };

  function compileListItem(item) {
    var children = [];
    // title
    if (item.title) {
      children.push({ type: 'listItemContent', children: [
        { type: 'listItemTitle', children: item.title },
        item.brief ? { type: 'listItemBrief', children: item.brief } : null
      ].filter(Boolean) });
    }
    // slot (右侧控件，如 input)
    if (item.slot) {
      children.push(compileNode(item.slot));
    }
    // extra
    if (item.extra) {
      children.push({ type: 'text', className: ['am-list-item__extra'], children: '' + item.extra });
    }
    // arrow
    if (item.arrow) {
      children.push({ type: 'text', className: ['am-list-item__arrow'], children: '\u203A' });
    }
    return { type: 'listItem', children: children };
  }

  HANDLERS.steps = function (config) {
    return {
      type: 'steps',
      props: { current: config.current || 0, items: config.items || [] },
    };
  };

  HANDLERS.view = function (config) {
    if (Array.isArray(config)) {
      return { type: 'view', children: compileChildren(config) };
    }
    if (typeof config === 'string') {
      return { type: 'view', children: [{ type: 'text', children: config }] };
    }
    var node = { type: 'view' };
    var hasChildren = false;
    if (config.children) { node.children = compileChildren(config.children); hasChildren = true; }
    if (config.class) node.className = toClassArray(config.class);
    if (config.style) node.style = config.style;
    if (config.events) node.events = config.events;
    if (config.dataBinding) node.dataBinding = config.dataBinding;
    // 如果只有内容字符串，简化
    if (config.content && !hasChildren) {
      node.children = [{ type: 'text', children: config.content }];
    }
    return node;
  };

  HANDLERS.flex = function (config) {
    // flex 是 view 的语义别名，自动添加 am-flex class
    var node = HANDLERS.view(config);
    if (!node.className) node.className = [];
    if (node.className.indexOf('am-flex') === -1) node.className.unshift('am-flex');
    return node;
  };

  // ---- 表单类 ----

  HANDLERS.button = function (config) {
    if (typeof config === 'string') {
      return { type: 'button', props: { type: 'primary' }, children: config };
    }
    var props = {};
    if (config.variant) props.type = config.variant;
    if (config.size) props.size = config.size;
    if (config.disabled) props.disabled = true;
    var events = {};
    if (config.onTap) events.onTap = config.onTap;
    var node = {
      type: 'button',
      props: props,
    };
    if (Object.keys(events).length > 0) node.events = events;
    if (config.class) node.className = toClassArray(config.class);
    if (config.style) node.style = config.style;
    // 处理 children：可能是字符串、对象、或数组
    if (Array.isArray(config.children)) {
      node.children = compileChildren(config.children);
    } else if (config.children && typeof config.children === 'object') {
      node.children = [compileNode(config.children)];
    } else if (config.label) {
      node.children = config.label;
    } else if (config.children) {
      node.children = '' + config.children;
    }
    return node;
  };

  HANDLERS.input = function (config) {
    if (typeof config === 'string') {
      return { type: 'input', props: { placeholder: config } };
    }
    var props = {};
    if (config.placeholder) props.placeholder = config.placeholder;
    if (config.value !== undefined) props.value = config.value;
    if (config.readonly) props.readonly = true;
    if (config.disabled) props.disabled = true;
    var node = { type: 'input', props: props };
    var classes = [];
    if (config.inline) classes.push('am-input--inline');
    if (config.danger) classes.push('am-input--danger');
    if (config.textAlign === 'right') classes.push('am-text--right');
    if (classes.length > 0) node.className = classes;
    if (config.style) node.style = config.style;
    if (config.class) {
      if (!node.className) node.className = [];
      node.className = node.className.concat(toClassArray(config.class));
    }
    return node;
  };

  HANDLERS.checkbox = function (config) {
    var node = { type: 'checkbox' };
    if (config.checked) node.props = { checked: true };
    if (config.onToggle) node.events = { onToggle: config.onToggle };
    if (config.class) node.className = toClassArray(config.class);
    return node;
  };

  HANDLERS.checkboxRow = function (config) {
    var children = [];
    if (Array.isArray(config)) {
      children = compileChildren(config);
    } else if (config.children) {
      children = compileChildren(config.children);
    }
    var node = {
      type: 'checkboxRow',
      children: children,
    };
    if (config.onToggle) node.events = { onToggle: config.onToggle };
    return node;
  };

  HANDLERS.radio = function (config) {
    var node = { type: 'radio' };
    if (config.checked) node.props = { checked: true };
    if (config.onChange) node.events = { onChange: config.onChange };
    if (config.class) node.className = toClassArray(config.class);
    return node;
  };

  HANDLERS.tag = function (config) {
    if (typeof config === 'string') {
      return { type: 'tag', children: config };
    }
    var props = {};
    if (config.variant) props.type = config.variant;
    var node = { type: 'tag', props: props, children: config.label || '' };
    if (config.class) node.className = toClassArray(config.class);
    return node;
  };

  // ---- 展示类 ----

  HANDLERS.text = function (config) {
    if (typeof config === 'string') {
      return { type: 'text', children: config };
    }
    // 文本内容：优先 content，其次 children（字符串），再次空
    var textContent = '';
    if (typeof config.content === 'string') {
      textContent = config.content;
    } else if (typeof config.children === 'string') {
      textContent = config.children;
    } else if (config.content !== undefined) {
      textContent = '' + config.content;
    }
    var node = { type: 'text', children: textContent };
    var classes = [];
    if (config.size) classes.push('am-text--' + config.size);
    if (config.color) classes.push('am-text--' + config.color);
    if (config.bold) classes.push('am-text--bold');
    if (config.medium) classes.push('am-text--medium');
    if (config.relaxed) classes.push('am-text--relaxed');
    if (config.align) classes.push('am-text--' + config.align);
    if (config.class) classes = classes.concat(toClassArray(config.class));
    if (classes.length > 0) node.className = classes;
    if (config.style) node.style = config.style;
    if (config.events) node.events = config.events;
    return node;
  };

  HANDLERS.image = function (config) {
    var props = {};
    if (typeof config === 'string') {
      props.src = config;
    } else {
      if (config.src) props.src = config.src;
      if (config.mode) props.mode = config.mode;
    }
    var node = { type: 'image', props: props };
    if (config && config.class) node.className = toClassArray(config.class);
    return node;
  };

  HANDLERS.loading = function (config) {
    var props = {};
    if (config && config.size) props.size = config.size;
    return { type: 'loading', props: props };
  };

  HANDLERS.result = function (config) {
    var props = {};
    if (config && config.status) props.status = config.status;
    if (config && config.title) props.title = config.title;
    if (config && config.description) props.description = config.description;
    return { type: 'result', props: props };
  };

  HANDLERS.empty = function (config) {
    var props = {};
    if (typeof config === 'string') {
      props.description = config;
    } else if (config) {
      if (config.description) props.description = config.description;
    }
    return { type: 'empty', props: props };
  };

  // ---- 专用业务组件 ----

  HANDLERS.licensePrefix = function (config) {
    return { type: 'licensePrefix', children: typeof config === 'string' ? config : (config && config.label) || '' };
  };

  HANDLERS.licenseNewEnergy = function (config) {
    return { type: 'licenseNewEnergy', children: [
      { type: 'text', className: ['am-text', 'am-text--md', 'am-leading-none'], style: { lineHeight: '1' }, children: config && config.plus ? config.plus : '+' },
      { type: 'text', className: ['am-text'], children: config && config.label ? config.label : '新能源' }
    ]};
  };

  HANDLERS.displayField = function (config) {
    return { type: 'displayField', children: typeof config === 'string' ? config : (config && config.content) || '' };
  };

  HANDLERS.helpIcon = function (config) {
    return { type: 'helpIcon', children: typeof config === 'string' ? config : '?' };
  };

  HANDLERS.divider = function (config) {
    return { type: 'divider', children: typeof config === 'string' ? config : (config && config.label) || '' };
  };

  HANDLERS.navBar = function (config) {
    var children = [];
    if (config && config.back !== false) {
      children.push({ type: 'navBarBack', children: '\u2039' });
    }
    if (config && config.title) {
      children.push({ type: 'navBarTitle', children: config.title });
    }
    return { type: 'navBar', children: children };
  };

  // ---- 辅助函数 ----

  /**
   * class 字符串或数组 → className 数组
   */
  function toClassArray(cls) {
    if (!cls) return undefined;
    if (Array.isArray(cls)) return cls.slice();
    if (typeof cls === 'string') return cls.split(/\s+/).filter(Boolean);
    return undefined;
  }

  /**
   * 编译单个结构化节点 → Schema 节点
   */
  function compileNode(node) {
    if (!node || typeof node !== 'object') {
      return { type: 'text', children: node != null ? String(node) : '' };
    }
    if (Array.isArray(node)) {
      return { type: 'view', children: compileChildren(node) };
    }

    var keys = Object.keys(node);
    if (keys.length === 0) return null;

    // 找到类型 key（即第一个语义 key，非普通属性）
    // 如果 value 是对象且没有 type/props/children，则 key 即类型
    var typeKey = keys[0];
    var config = node[typeKey];

    // 处理纯字符串值：{ "text": "hello" }
    if (typeof config === 'string') {
      if (HANDLERS[typeKey]) {
        return HANDLERS[typeKey](config);
      }
      return { type: 'text', children: config };
    }

    // 处理数组值：{ "view": [...] } → view with children
    if (Array.isArray(config)) {
      if (HANDLERS[typeKey]) {
        return HANDLERS[typeKey]({ children: config });
      }
      return { type: 'view', children: compileChildren(config) };
    }

    // 使用注册的 handler
    if (HANDLERS[typeKey]) {
      return HANDLERS[typeKey](config || {});
    }

    // 回退：未知类型 → view
    console.warn('[StructuredCompiler] 未知类型: ' + typeKey + '，使用 view 回退');
    return { type: 'view', children: typeof config === 'string' ? [compileNode(config)] : compileChildren(config && config.children) };
  }

  /**
   * 编译子节点数组
   */
  function compileChildren(children) {
    if (!Array.isArray(children)) return [];
    var result = [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child === null || child === undefined) continue;
      var compiled = compileNode(child);
      if (compiled) result.push(compiled);
    }
    return result;
  }

  // ============================================================
  // 2. 公开 API
  // ============================================================

  var StructuredCompiler = {
    /**
     * 编译结构化页面描述 → JSON Schema
     *
     * @param {object} structuredPage - 结构化页面描述
     *   {
     *     id: 'page-id',
     *     title: '页面标题',
     *     navigationBar: { title: '标题' },
     *     backgroundColor: '#f5f5f5',
     *     children: [
     *       { card: { header: { title: '标题' }, body: [...] } },
     *       { button: { label: '提交', variant: 'primary', onTap: 'handleSubmit' } }
     *     ]
     *   }
     * @returns {object} JSON Schema 对象（与 html-to-schema 输出格式完全一致）
     */
    compile(structuredPage) {
      if (!structuredPage) {
        throw new Error('[StructuredCompiler] 缺少页面描述');
      }

      var schema = {
        version: '2.0',
        page: {
          id: structuredPage.id || '',
          title: structuredPage.title || '',
          backgroundColor: structuredPage.backgroundColor || '#f5f5f5',
          navigationBar: structuredPage.navigationBar || { title: '' },
          children: compileChildren(structuredPage.children || []),
        },
      };

      // 数据模型：页面状态字段声明
      if (structuredPage.dataModel) {
        schema.dataModel = structuredPage.dataModel;
      }

      // API 契约：页面使用的接口声明
      if (structuredPage.apiContracts) {
        schema.apiContracts = structuredPage.apiContracts;
      }

      // 校验规则：表单字段校验声明
      if (structuredPage.validationRules) {
        schema.validationRules = structuredPage.validationRules;
      }

      return schema;
    },

    /**
     * 从场景描述编译（兼容现有的 scenarios 结构）
     *
     * @param {object} scenario - { title, tips, page: { id, children, ... } }
     * @returns {object} { title, tips, schema }
     */
    compileScenario(scenario) {
      if (!scenario || !scenario.page) {
        throw new Error('[StructuredCompiler] 场景必须包含 page 字段');
      }
      var schema = this.compile(scenario.page);
      return {
        title: scenario.title || '',
        tips: scenario.tips || [],
        schema: schema,
      };
    },

    /**
     * 注册自定义组件 handler
     * @param {string} typeKey - 结构化格式中的 key
     * @param {function} handler - (config) → Schema node
     */
    register(typeKey, handler) {
      HANDLERS[typeKey] = handler;
    },
  };

  // ============================================================
  // 3. 测试用例
  // ============================================================

  function runTests() {
    console.group('[StructuredCompiler] 单元测试');
    var passed = 0;
    var failed = 0;

    function assert(condition, message) {
      if (condition) { passed++; console.log('  \u2713 ' + message); }
      else { failed++; console.error('  \u2717 ' + message); }
    }

    // 测试 1：简单按钮
    try {
      var schema = StructuredCompiler.compile({
        id: 'test',
        children: [
          { button: { label: '提交', variant: 'primary', onTap: 'handleSubmit' } }
        ]
      });
      assert(schema.page.children.length === 1, '页面有 1 个子节点');
      assert(schema.page.children[0].type === 'button', '按钮类型正确');
      assert(schema.page.children[0].props.type === 'primary', '按钮 variant 映射为 primary');
      assert(schema.page.children[0].children === '提交', '按钮文本保留');
      assert(schema.page.children[0].events.onTap === 'handleSubmit', '事件映射正确');
    } catch (e) { assert(false, '按钮编译失败: ' + e.message); }

    // 测试 2：卡片 + 列表
    try {
      var schema = StructuredCompiler.compile({
        id: 'test',
        children: [
          { card: {
            header: { title: '办理人核验' },
            body: [
              { list: { items: [
                { title: '本人姓名', slot: { input: { placeholder: '请输入姓名' } } }
              ]}}
            ]
          }}
        ]
      });
      var card = schema.page.children[0];
      assert(card.type === 'card', '卡片类型正确');
      assert(card.children[0].type === 'cardHeader', '有 cardHeader');
      assert(card.children[1].type === 'cardBody', '有 cardBody');
    } catch (e) { assert(false, '卡片编译失败: ' + e.message); }

    // 测试 3：步骤条
    try {
      var schema = StructuredCompiler.compile({
        id: 'test',
        children: [
          { steps: { current: 0, items: [{ title: '步骤1' }, { title: '步骤2' }] } }
        ]
      });
      var steps = schema.page.children[0];
      assert(steps.type === 'steps', '步骤条类型正确');
      assert(steps.props.items.length === 2, '有 2 个步骤');
    } catch (e) { assert(false, '步骤条编译失败: ' + e.message); }

    // 测试 4：纯文本
    try {
      var schema = StructuredCompiler.compile({
        id: 'test',
        children: [
          { text: 'hello' },
          { text: { content: 'world', size: 'lg', color: 'primary', bold: true } }
        ]
      });
      assert(schema.page.children[0].children === 'hello', '字符串文本');
      assert(schema.page.children[1].children === 'world', '对象文本');
      assert(schema.page.children[1].className.indexOf('am-text--lg') !== -1, 'size 映射');
      assert(schema.page.children[1].className.indexOf('am-text--primary') !== -1, 'color 映射');
      assert(schema.page.children[1].className.indexOf('am-text--bold') !== -1, 'bold 映射');
    } catch (e) { assert(false, '文本编译失败: ' + e.message); }

    // 测试 5：checkboxRow
    try {
      var schema = StructuredCompiler.compile({
        id: 'test',
        children: [
          { checkboxRow: {
            children: [
              { checkbox: { onToggle: 'agree' } },
              { text: '同意协议' }
            ]
          }}
        ]
      });
      var row = schema.page.children[0];
      assert(row.type === 'checkboxRow', '类型正确');
      assert(row.children.length === 2, '有 2 个子节点');
    } catch (e) { assert(false, 'checkboxRow 编译失败: ' + e.message); }

    // 测试 6：编译输出可被 schema-to-axml 消费
    try {
      var schema = StructuredCompiler.compile({
        id: 'test',
        children: [
          { steps: { current: 0, items: [{ title: '步骤1' }] } },
          { button: { label: '提交', variant: 'primary', onTap: 'handleSubmit' } }
        ]
      });
      // 验证 Schema 结构符合现有编译器要求
      assert(schema.version === '2.0', 'Schema version 正确 (v2.0 with dataModel support)');
      assert(schema.page.id === 'test', 'page id 正确');
      assert(typeof schema.page.children === 'object', 'children 是数组');
    } catch (e) { assert(false, 'Schema 结构验证失败: ' + e.message); }

    console.log('\n\u6D4B\u8BD5\u7ED3\u679C: ' + passed + ' \u901A\u8FC7, ' + failed + ' \u5931\u8D25');
    console.groupEnd();
    return { passed: passed, failed: failed };
  }

  StructuredCompiler.runTests = runTests;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StructuredCompiler;
  }
  global.StructuredCompiler = StructuredCompiler;

  if (typeof window !== 'undefined') {
    console.log('[StructuredCompiler] 已加载，版本 1.0.0');
  }

})(typeof window !== 'undefined' ? window : global);
