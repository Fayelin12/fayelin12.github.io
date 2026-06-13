/**
 * JSON Schema → AXML 编译器
 * 产品管理端跨端编译层 —— 支付宝小程序编译器（注册表驱动）
 *
 * 组件元数据（标签、类名映射、antd-mini 路径）及特殊组件渲染逻辑
 * 已收敛至 component-registry.js，本文件仅保留 AXML 特有的通用编译逻辑
 * （事件映射、缩进管理、工程导出）。
 *
 * ⚠️ 踩坑录：
 * 1. getComponentPaths() 中 npm 路径提取：不能用 parts[-2] 取最后一段，
 *    /components/List/ListItem/index → ListItem ✗ → List/ListItem ✓。
 * 2. loadBaseAcss() 不能硬编码绝对路径，换机器就挂。
 * 3. package.json 导出后不能每次重写，IDE 的 Node Package Manager 会反复提示。
 * 4. exportProject 清理只用 cleanDir 处理 pages/，不动 node_modules/ 和 package-lock.json。
 *
 * @author Qoder Agent
 * @version 3.1.0
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. 辅助函数
  // ============================================================

  function escapeAttr(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeText(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  // ============================================================
  // 2. 样式与类名构建（委托给共享模块或注册表）
  // ============================================================

  function styleToAxmlString(style, classes, isAntComponent) {
    return SharedStyleFilter.filterStyle(style, classes, { isAntComponent: isAntComponent }).css;
  }

  function buildAxmlClasses(type, props, originalClasses) {
    return ComponentRegistry.buildClasses(type, props, originalClasses);
  }

  // ============================================================
  // 3. 属性构建（特殊组件渲染已迁移至 component-registry.js）
  // ============================================================

  var NATIVE_TAGS_WITHOUT_ONCHANGE = ['view', 'text', 'image', 'scroll-view', 'swiper'];

  var AXML_EVENT_MAP = {
    onTap: 'onTap',
    onToggle: 'onChange',
    onChange: 'onChange',
    onInput: 'onInput',
    onFocus: 'onFocus',
    onBlur: 'onBlur',
    onLongTap: 'onLongTap',
  };

  function buildAntProps(type, props, events, dataBinding, tag) {
    var attrs = [];

    // 组件专用 props（通过统一注册表）
    var nativeProps = ComponentRegistry.buildProps(type, props, 'axml');
    if (nativeProps) attrs.push(nativeProps);

    // 数据绑定
    if (dataBinding) {
      if (dataBinding.if) attrs.push('a:if="' + escapeAttr(dataBinding.if) + '"');
      if (dataBinding.for) {
        attrs.push('a:for="' + escapeAttr(dataBinding.for) + '"');
        if (dataBinding.forItem) attrs.push('a:for-item="' + escapeAttr(dataBinding.forItem) + '"');
        if (dataBinding.forIndex) attrs.push('a:for-index="' + escapeAttr(dataBinding.forIndex) + '"');
        if (dataBinding.key) attrs.push('a:key="' + escapeAttr(dataBinding.key) + '"');
      }
    }

    // 事件
    if (events) {
      for (var eventName in events) {
        if (!Object.prototype.hasOwnProperty.call(events, eventName)) continue;
        var handler = events[eventName];
        var axmlEvent = AXML_EVENT_MAP[eventName];
        if (axmlEvent) {
          if (NATIVE_TAGS_WITHOUT_ONCHANGE.indexOf(tag) !== -1 && (axmlEvent === 'onChange' || axmlEvent === 'onInput')) {
            axmlEvent = 'onTap';
          }
          attrs.push(axmlEvent + '="' + escapeAttr(handler) + '"');
        }
      }
    }

    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  }

  // ============================================================
  // 4. 核心递归渲染
  // ============================================================

  let axmlIndentLevel = 0;

  function indent() {
    return '  '.repeat(axmlIndentLevel);
  }

  function incIndent() {
    axmlIndentLevel++;
  }

  function decIndent() {
    axmlIndentLevel--;
  }

  var axmlContext = {
    escapeText: escapeText,
    escapeAttr: escapeAttr,
    renderAxmlNode: renderAxmlNode,
    indent: indent,
    incIndent: incIndent,
    decIndent: decIndent,
    buildAxmlClasses: buildAxmlClasses,
    buildAntProps: buildAntProps,
    getTag: function (type) { return ComponentRegistry.getTag(type, 'axml'); },
    isSelfClosing: function (type) { return ComponentRegistry.isSelfClosing(type); },
    styleToAxmlString: styleToAxmlString,
  };

  function renderAxmlNode(node) {
    if (typeof node === 'string') {
      return escapeText(node);
    }
    if (!node || typeof node !== 'object') return '';

    const type = node.type;
    const props = node.props || {};
    const style = node.style || {};
    const events = node.events || null;
    const dataBinding = node.dataBinding || null;
    const originalClasses = node.className || [];

    // 查询注册表是否有平台特定的完整渲染回调
    var customRender = ComponentRegistry.getRender(type, 'axml', 'full');
    if (customRender) {
      return customRender(node, axmlContext);
    }

    const tag = ComponentRegistry.getTag(type, 'axml');
    const selfClosing = ComponentRegistry.isSelfClosing(type);

    // 构建 class
    const classes = buildAxmlClasses(type, props, originalClasses);
    const classStr = classes.length > 0 ? ' class="' + classes.join(' ') + '"' : '';

    // 构建 style
    var isAnt = ComponentRegistry.isAntComponent(type) || type === 'input';
    const styleStrObj = styleToAxmlString(style, classes, isAnt);
    const styleStr = styleStrObj ? ' style="' + styleStrObj + '"' : '';

    // 属性
    const attrs = buildAntProps(type, props, events, dataBinding, tag);

    // 自闭合
    if (selfClosing) {
      return indent() + '<' + tag + classStr + styleStr + attrs + ' />\n';
    }

    // 普通节点
    let childrenContent = '';
    var customInner = ComponentRegistry.getRender(type, 'axml', 'inner');
    if (customInner) {
      childrenContent = customInner(node, axmlContext);
    } else if (node.children !== undefined) {
      if (typeof node.children === 'string') {
        childrenContent = escapeText(node.children);
      } else if (Array.isArray(node.children)) {
        axmlIndentLevel++;
        for (const child of node.children) {
          childrenContent += renderAxmlNode(child);
        }
        axmlIndentLevel--;
      }
    }

    if (childrenContent) {
      return indent() + '<' + tag + classStr + styleStr + attrs + '>\n' + childrenContent + indent() + '</' + tag + '>\n';
    }
    return indent() + '<' + tag + classStr + styleStr + attrs + '></' + tag + '>\n';
  }

  // ============================================================
  // 5. ACSS 生成
  // ============================================================

  var _baseAcssCache = null;

  function loadBaseAcss() {
    if (_baseAcssCache) return _baseAcssCache;
    try {
      if (typeof require !== 'undefined') {
        var fs = require('fs');
        var path = require('path');
        var candidates = [];
        try { candidates.push(path.join(__dirname, '..', 'css', 'miniprogram-base.acss')); } catch (e) {}
        try { candidates.push(path.resolve(process.cwd(), 'css', 'miniprogram-base.acss')); } catch (e) {}
        try { candidates.push(path.resolve(process.cwd(), '..', 'css', 'miniprogram-base.acss')); } catch (e) {}
        for (var i = 0; i < candidates.length; i++) {
          if (fs.existsSync(candidates[i])) {
            _baseAcssCache = fs.readFileSync(candidates[i], 'utf8');
            return _baseAcssCache;
          }
        }
      }
    } catch (e) { /* fall through */ }
    _baseAcssCache = '/* 基础 ACSS 未加载 */\n';
    return _baseAcssCache;
  }

  function generateAcss(schema, axml) {
    var baseAcss = loadBaseAcss();
    if (!axml) return baseAcss;
    var classRegex = /class="([^"]+)"/g;
    var used = {};
    var match;
    while ((match = classRegex.exec(axml)) !== null) {
      var classList = match[1].split(/\s+/);
      for (var ci = 0; ci < classList.length; ci++) {
        var cls = classList[ci];
        used[cls] = true;
        var p = cls;
        var d = p.indexOf('--'); if (d !== -1) p = p.substring(0, d);
        var e = p.indexOf('__'); if (e !== -1) p = p.substring(0, e);
        used[p] = true;
      }
    }
    var nestedBlocks = [];
    var cleanAcss = baseAcss.replace(/@(keyframes|-webkit-keyframes)\s+[^{]+\{[^}]*\{[^}]*\}[^}]*\}/g, function (block) {
      nestedBlocks.push(block);
      return '';
    });
    var rules = cleanAcss.match(/[^{}]+\{[^}]*\}/g) || [];
    var globalRules = [];
    var classRules = [];
    for (var ri = 0; ri < rules.length; ri++) {
      var rule = rules[ri].trim();
      var braceIdx = rule.indexOf('{');
      var selector = rule.substring(0, braceIdx).trim();
      if (!selector || selector.charAt(0) !== '.') {
        globalRules.push(rule);
        continue;
      }
      var selectors = selector.split(',');
      var keep = false;
      for (var si = 0; si < selectors.length && !keep; si++) {
        var sel = selectors[si].replace(/[:\[][^,]*/g, '').trim();
        if (sel.charAt(0) !== '.') continue;
        var dotParts = sel.split(/\s+/);
        for (var di = 0; di < dotParts.length && !keep; di++) {
          var dp = dotParts[di];
          while (dp.charAt(0) === '.') {
            var dotIdx = dp.indexOf('.', 1);
            var cn = dotIdx === -1 ? dp.substring(1) : dp.substring(1, dotIdx);
            dp = dotIdx === -1 ? '' : dp.substring(dotIdx);
            if (used[cn]) { keep = true; break; }
          }
        }
      }
      if (keep) classRules.push(rule);
    }
    return globalRules.concat(classRules, nestedBlocks).join('\n');
  }

  // ============================================================
  // 6. JS 生成
  // ============================================================

  function collectEventHandlers(node, handlers) {
    handlers = handlers || new Set();
    if (typeof node === 'string') return handlers;
    if (!node || typeof node !== 'object') return handlers;
    if (node.events) {
      for (const handler of Object.values(node.events)) {
        const fnName = handler.split('(')[0].trim();
        if (fnName) handlers.add(fnName);
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        collectEventHandlers(child, handlers);
      }
    }
    return handlers;
  }

  function collectStepsData(node, data) {
    data = data || {};
    if (typeof node === 'string') return data;
    if (!node || typeof node !== 'object') return data;
    if (node.type === 'steps' && node.props) {
      data.stepsItems = node.props.items || [];
      data.stepsCurrent = node.props.current || 0;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        collectStepsData(child, data);
      }
    }
    return data;
  }

  function collectEventContext(node, context, parentType) {
    context = context || {};
    if (typeof node === 'string') return context;
    if (!node || typeof node !== 'object') return context;
    if (node.events) {
      for (var evtName in node.events) {
        if (!Object.prototype.hasOwnProperty.call(node.events, evtName)) continue;
        var handler = node.events[evtName];
        var fnName = handler.split('(')[0].trim();
        if (fnName) {
          var axmlEvent = AXML_EVENT_MAP[evtName] || evtName;
          context[fnName] = {
            schemaEvent: evtName,
            axmlEvent: axmlEvent,
            componentType: node.type || '',
            tag: ComponentRegistry.getTag(node.type || '', 'axml')
          };
        }
      }
    }
    if (Array.isArray(node.children)) {
      for (var i = 0; i < node.children.length; i++) {
        collectEventContext(node.children[i], context, node.type || parentType);
      }
    }
    return context;
  }

  function eventDocComment(eventName, context) {
    var ctx = context || {};
    var axmlEvent = ctx.axmlEvent || eventName;
    if (axmlEvent === 'onChange') {
      return '  // 支付宝小程序 onChange 事件: e.detail (值类型取决于组件)\n' +
             '  // 例如 checkbox: e.detail.value (boolean)\n' +
             '  // 例如 input: e.detail.value (string)';
    }
    if (axmlEvent === 'onTap') {
      return '  // 支付宝小程序 onTap 事件: e.detail 包含触摸信息\n' +
             '  // e.currentTarget.dataset 可获取 data-* 属性';
    }
    if (axmlEvent === 'onInput') {
      return '  // 支付宝小程序 onInput 事件: e.detail.value (用户输入值)';
    }
    return '  // 支付宝小程序 ' + axmlEvent + ' 事件';
  }

  function buildDataFromModel(dataModel) {
    if (!dataModel || !dataModel.fields) return [];
    var entries = [];
    var fields = dataModel.fields;
    for (var fieldName in fields) {
      if (!Object.prototype.hasOwnProperty.call(fields, fieldName)) continue;
      var field = fields[fieldName];
      var defaultValue;
      switch (field.type) {
        case 'string':  defaultValue = JSON.stringify(field.default !== undefined ? field.default : ''); break;
        case 'number':  defaultValue = field.default !== undefined ? field.default : 0; break;
        case 'boolean': defaultValue = field.default !== undefined ? field.default : false; break;
        case 'array':   defaultValue = JSON.stringify(field.default || []); break;
        case 'object':  defaultValue = JSON.stringify(field.default || {}); break;
        default:        defaultValue = JSON.stringify(field.default !== undefined ? field.default : null);
      }
      entries.push('    ' + fieldName + ': ' + defaultValue + ',');
    }
    return entries;
  }

  function buildApiStubs(apiContracts) {
    if (!apiContracts) return [];
    var lines = [];
    lines.push('');
    lines.push('  // ===== API 调用 =====');
    for (var apiName in apiContracts) {
      if (!Object.prototype.hasOwnProperty.call(apiContracts, apiName)) continue;
      var api = apiContracts[apiName];
      var method = (api.method || 'GET').toUpperCase();
      var url = api.url || '';
      var reqFields = api.request ? Object.keys(api.request) : [];
      var respFields = api.response ? Object.keys(api.response) : [];
      lines.push('  /**');
      lines.push('   * ' + (api.description || apiName));
      lines.push('   * ' + method + ' ' + url);
      if (reqFields.length > 0) lines.push('   * @param {' + reqFields.join('|') + '} 请求参数');
      if (respFields.length > 0) lines.push('   * @returns 响应字段: ' + respFields.join(', '));
      lines.push('   */');
      lines.push('  ' + apiName + '(params) {');
      lines.push('    var that = this;');
      lines.push('    console.log(\'' + apiName + ' 请求:\', params);');
      lines.push('    my.request({');
      lines.push('      url: \'' + url + '\',');
      lines.push('      method: \'' + method + '\',');
      lines.push('      data: params,');
      lines.push('      success: function(res) {');
      lines.push('        console.log(\'' + apiName + ' 响应:\', res);');
      lines.push('        // TODO: 根据业务逻辑处理响应');
      lines.push('      },');
      lines.push('      fail: function(err) {');
      lines.push('        console.error(\'' + apiName + ' 失败:\', err);');
      lines.push('        my.showToast({ content: \'' + (api.errorMessage || '请求失败') + '\', type: \'fail\' });');
      lines.push('      }');
      lines.push('    });');
      lines.push('  },');
    }
    return lines;
  }

  function buildValidationStubs(validationRules) {
    if (!validationRules) return [];
    var lines = [];
    lines.push('');
    lines.push('  // ===== 表单校验 =====');
    lines.push('  validate() {');
    lines.push('    var errors = [];');
    for (var fieldName in validationRules) {
      if (!Object.prototype.hasOwnProperty.call(validationRules, fieldName)) continue;
      var rules = validationRules[fieldName];
      lines.push('');
      lines.push('    // ' + fieldName + ' 校验');
      if (rules.required) {
        lines.push('    if (!this.data.' + fieldName + ') {');
        lines.push('      errors.push(\'' + (rules.message || fieldName + '不能为空') + '\');');
        lines.push('    }');
      }
      if (rules.minLength) {
        lines.push('    if (this.data.' + fieldName + ' && this.data.' + fieldName + '.length < ' + rules.minLength + ') {');
        lines.push('      errors.push(\'' + (rules.message || fieldName + '长度不能少于' + rules.minLength + '位') + '\');');
        lines.push('    }');
      }
      if (rules.maxLength) {
        lines.push('    if (this.data.' + fieldName + ' && this.data.' + fieldName + '.length > ' + rules.maxLength + ') {');
        lines.push('      errors.push(\'' + (rules.message || fieldName + '长度不能超过' + rules.maxLength + '位') + '\');');
        lines.push('    }');
      }
      if (rules.pattern) {
        lines.push('    if (this.data.' + fieldName + ' && !/(' + rules.pattern.replace(/\\/g, '\\\\') + ')/.test(this.data.' + fieldName + ')) {');
        lines.push('      errors.push(\'' + (rules.message || fieldName + '格式不正确') + '\');');
        lines.push('    }');
      }
      if (rules.min) {
        lines.push('    if (this.data.' + fieldName + ' < ' + rules.min + ') {');
        lines.push('      errors.push(\'' + (rules.message || fieldName + '不能小于' + rules.min) + '\');');
        lines.push('    }');
      }
      if (rules.max) {
        lines.push('    if (this.data.' + fieldName + ' > ' + rules.max + ') {');
        lines.push('      errors.push(\'' + (rules.message || fieldName + '不能大于' + rules.max) + '\');');
        lines.push('    }');
      }
    }
    lines.push('');
    lines.push('    if (errors.length > 0) {');
    lines.push('      my.showToast({ content: errors[0], type: \'fail\' });');
    lines.push('      return false;');
    lines.push('    }');
    lines.push('    return true;');
    lines.push('  },');
    return lines;
  }

  function generateJs(schema) {
    var page = schema.page || {};
    var handlers = collectEventHandlers(page);
    var eventContext = collectEventContext(page);
    var stepsData = collectStepsData(page);
    var dataEntries = [];
    if (schema.dataModel) {
      dataEntries = buildDataFromModel(schema.dataModel);
    }
    if (stepsData.stepsItems) {
      dataEntries.push('    stepsItems: ' + JSON.stringify(stepsData.stepsItems) + ',');
    }
    if (stepsData.stepsCurrent !== undefined) {
      dataEntries.push('    stepsCurrent: ' + JSON.stringify(stepsData.stepsCurrent) + ',');
    }
    var dataBlock = dataEntries.length > 0
      ? '  data: {\n' + dataEntries.join('\n') + '\n  },'
      : '  data: {\n  },';
    var handlerMethods = [];
    for (var _i = 0, _handlers = Array.from(handlers); _i < _handlers.length; _i++) {
      var h = _handlers[_i];
      var ctx = eventContext[h] || {};
      handlerMethods.push(eventDocComment(h, ctx));
      handlerMethods.push('  ' + h + '(e) {\n    console.log(\'[' + h + ']\', e);\n  },');
    }
    var apiStubs = schema.apiContracts ? buildApiStubs(schema.apiContracts) : [];
    var validationStubs = schema.validationRules ? buildValidationStubs(schema.validationRules) : [];
    var bodyParts = [dataBlock];
    bodyParts.push('');
    bodyParts.push('  onLoad(query) {');
    bodyParts.push('    console.log(\'[Page] onLoad\', query);');
    bodyParts.push('  },');
    bodyParts.push('');
    bodyParts.push('  onReady() {');
    bodyParts.push('    console.log(\'[Page] onReady\');');
    bodyParts.push('  },');
    if (handlerMethods.length > 0) {
      bodyParts.push('');
      bodyParts.push(handlerMethods.join('\n'));
    }
    if (apiStubs.length > 0) {
      bodyParts.push(apiStubs.join('\n'));
    }
    if (validationStubs.length > 0) {
      bodyParts.push(validationStubs.join('\n'));
    }
    return 'Page({\n' + bodyParts.join('\n') + '\n});\n';
  }

  // ============================================================
  // 7. 公开 API
  // ============================================================

  const SchemaToAxml = {
    compile(schema) {
      if (!schema || !schema.page) {
        throw new Error('[SchemaToAxml] Schema 必须包含 page 根节点');
      }
      axmlIndentLevel = 0;
      let axml = '';
      for (const child of schema.page.children || []) {
        axml += renderAxmlNode(child);
      }
      return { axml, acss: generateAcss(schema, axml), js: generateJs(schema) };
    },

    compileAxml(schema) {
      if (!schema || !schema.page) return '';
      axmlIndentLevel = 0;
      let axml = '';
      for (const child of schema.page.children || []) {
        axml += renderAxmlNode(child);
      }
      return axml;
    },

    compileAcss(schema) {
      return generateAcss(schema);
    },

    compileJs(schema) {
      return generateJs(schema);
    },

    ANT_COMPONENT_MAP: {}, // 运行时由 getComponentPaths() 填充

    registerComponent(type, def) {
      ComponentRegistry.register(type, def);
      if (def.componentPath) {
        SchemaToAxml.ANT_COMPONENT_MAP[def.axmlTag || def.tag || 'view'] = def.componentPath;
      }
    },

    collectUsedComponents(axml) {
      if (!axml) return [];
      var used = new Set();
      var antCompMap = ComponentRegistry.getComponentPaths();
      var antTags = Object.keys(antCompMap);
      for (var i = 0; i < antTags.length; i++) {
        var tag = antTags[i];
        var re = new RegExp('<' + tag + '[\\s/>]', 'g');
        if (re.test(axml)) used.add(tag);
      }
      return Array.from(used).sort();
    },

    generateAppJs() {
      return `App({\n  onLaunch(options) {\n    console.log('[App] onLaunch', options);\n  },\n\n  onShow(options) {\n    console.log('[App] onShow', options);\n  },\n\n  onHide() {\n    console.log('[App] onHide');\n  },\n});\n`;
    },

    generateAppJson(pageRoutes) {
      return JSON.stringify({ pages: pageRoutes, window: { defaultTitle: '官方ETC', titleBarColor: '#ffffff' } }, null, 2);
    },

    generateAppAcss() {
      return `/* 全局样式 */\npage {\n  box-sizing: border-box;\n  background: #f5f5f5;\n  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;\n  color: #333;\n}\n*, *::before, *::after {\n  box-sizing: inherit;\n}\n`;
    },

    generateMiniProjectJson(adapter) {
      var config = (adapter || UIAdapter.getDefault()).getProjectConfig();
      return JSON.stringify(config, null, 2);
    },

    generatePageJson(axml, pageTitle, adapter) {
      var usedComponents = SchemaToAxml.collectUsedComponents(axml);
      var antCompMap = ComponentRegistry.getComponentPaths(adapter);
      var usingComponents = {};
      for (var ti = 0; ti < usedComponents.length; ti++) {
        var tag = usedComponents[ti];
        var compPath = antCompMap[tag];
        if (compPath) usingComponents[tag] = compPath;
      }
      return JSON.stringify({
        defaultTitle: pageTitle || '',
        pullRefresh: false,
        allowsBounceVertical: 'NO',
        usingComponents: usingComponents,
      }, null, 2);
    },

    generatePackageJson(adapter) {
      var deps = (adapter || UIAdapter.getDefault()).getDependencies();
      return JSON.stringify({
        name: 'product-manager-miniprogram',
        version: '1.0.0',
        description: '产品管理端 - 支付宝小程序',
        dependencies: deps,
      }, null, 2);
    },

    flattenPages(pages) {
      const result = [];
      function walk(items) {
        if (!Array.isArray(items)) return;
        for (const item of items) {
          if (item.isFolder && item.children) {
            walk(item.children);
          } else if (item.scenarios) {
            const scenario = item.scenarios.normal || Object.values(item.scenarios)[0];
            if (scenario && scenario.schema) {
              result.push({
                pageId: item.id,
                pageName: item.name,
                stepName: item.stepName || item.name,
                schema: scenario.schema,
                route: 'pages/' + item.id + '/' + item.id,
              });
            }
          }
        }
      }
      walk(pages);
      return result;
    },

    compileProject(versionData, adapter) {
      var adp = adapter || UIAdapter.getDefault();
      var flatPages = SchemaToAxml.flattenPages(versionData.pages || []);
      var pageRoutes = flatPages.map(function (p) { return p.route; });
      var project = {
        'app.js': SchemaToAxml.generateAppJs(),
        'app.json': SchemaToAxml.generateAppJson(pageRoutes),
        'app.acss': SchemaToAxml.generateAppAcss(),
        'mini.project.json': SchemaToAxml.generateMiniProjectJson(adp),
        'package.json': SchemaToAxml.generatePackageJson(adp),
        pages: {},
      };
      for (var i = 0; i < flatPages.length; i++) {
        var page = flatPages[i];
        var compiled = SchemaToAxml.compile(page.schema);
        project.pages[page.pageId] = {};
        project.pages[page.pageId][page.pageId + '.axml'] = compiled.axml;
        project.pages[page.pageId][page.pageId + '.acss'] = compiled.acss;
        project.pages[page.pageId][page.pageId + '.js'] = compiled.js;
        project.pages[page.pageId][page.pageId + '.json'] = SchemaToAxml.generatePageJson(compiled.axml, page.stepName, adp);
      }
      return project;
    },

    exportProject(versionData, outputDir, adapter) {
      if (typeof require === 'undefined') {
        throw new Error('[SchemaToAxml] exportProject 仅支持 Node.js 环境');
      }
      var fs = require('fs');
      var path = require('path');
      var adp = adapter || UIAdapter.getDefault();
      var project = SchemaToAxml.compileProject(versionData, adp);
      var filesWritten = 0;
      function writeFile(relPath, content) {
        var fullPath = path.join(outputDir, relPath);
        var dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
        filesWritten++;
      }
      var rootFiles = ['app.js', 'app.json', 'app.acss', 'mini.project.json'];
      for (var ri = 0; ri < rootFiles.length; ri++) {
        writeFile(rootFiles[ri], project[rootFiles[ri]]);
      }
      if (!fs.existsSync(path.join(outputDir, 'package.json'))) {
        writeFile('package.json', project['package.json']);
      }
      var pageIds = Object.keys(project.pages);
      for (var pi = 0; pi < pageIds.length; pi++) {
        var pid = pageIds[pi];
        var pageFiles = project.pages[pid];
        var fileNames = Object.keys(pageFiles);
        for (var fi = 0; fi < fileNames.length; fi++) {
          writeFile('pages/' + pid + '/' + fileNames[fi], pageFiles[fileNames[fi]]);
        }
      }
      console.log('[SchemaToAxml] 导出完成，请在 IDE 中运行 npm install 后编译预览');
      if (adp.getInstallHint) console.log(adp.getInstallHint());
      return { success: true, filesWritten: filesWritten, outputDir: outputDir, adapter: adp.name };
    },

    _registry: ComponentRegistry,
  };

  // 延迟填充 ANT_COMPONENT_MAP，确保 ComponentRegistry 已加载
  if (typeof ComponentRegistry !== 'undefined') {
    SchemaToAxml.ANT_COMPONENT_MAP = ComponentRegistry.getComponentPaths();
  }

  if (typeof window !== 'undefined') {
    console.log('[SchemaToAxml] 已加载，版本 3.0.0');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchemaToAxml;
  }
  global.SchemaToAxml = SchemaToAxml;

})(typeof window !== 'undefined' ? window : global);
