/**
 * ComponentRegistry + 双端渲染器 集成测试
 * 运行方式：node js/component-registry.test.js
 */

'use strict';

// Mock UIAdapter（schema-to-axml.js 依赖）
global.UIAdapter = {
  getDefault: function() {
    return {
      name: 'antd-mini',
      mode: 'npm',
      getComponentPath: function(relPath) {
        return '/node_modules/antd-mini/es/' + relPath.replace(/\//g, '') + '/index';
      },
      getDependencies: function() {
        return { 'antd-mini': '^2.x' };
      },
      getProjectConfig: function() {
        return { miniprogramRoot: './', setting: {} };
      },
      getInstallHint: function() {
        return '请运行: npm install antd-mini';
      }
    };
  }
};

// 按依赖顺序加载模块
require('./shared-style-filter.js');
require('./component-registry.js');
require('./schema-to-html.js');
require('./schema-to-axml.js');

// ============================================================
// 测试框架
// ============================================================

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log('  ✓ ' + message);
  } else {
    failed++;
    console.error('  ✗ ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log('  ✓ ' + message);
  } else {
    failed++;
    console.error('  ✗ ' + message + ' (期望: ' + expected + ', 实际: ' + actual + ')');
  }
}

function assertIncludes(haystack, needle, message) {
  if (haystack.indexOf(needle) !== -1) {
    passed++;
    console.log('  ✓ ' + message);
  } else {
    failed++;
    console.error('  ✗ ' + message + ' (未找到: ' + needle + ')');
  }
}

// ============================================================
// 测试套件
// ============================================================

console.log('\n============================================================');
console.log('ComponentRegistry 集成测试');
console.log('============================================================\n');

// ---- 测试 1：组件注册完整性 ----
console.log('【测试组 1】组件注册完整性');

var expectedTypes = [
  'page', 'view', 'scrollView', 'swiper',
  'card', 'cardHeader', 'cardTitle', 'cardExtra', 'cardBody', 'cardFooter',
  'list', 'listHeader', 'listFooter', 'listItem', 'listItemContent',
  'listItemTitle', 'listItemBrief', 'listItemExtra', 'listItemArrow',
  'button', 'text', 'input', 'textarea', 'image', 'icon',
  'checkbox', 'radio', 'switch', 'loading', 'result', 'empty', 'tag',
  'steps', 'step', 'navBar', 'navBarBack', 'navBarTitle', 'divider',
  'avatar', 'licensePrefix', 'licenseNewEnergy',
  'displayField', 'checkboxRow', 'helpIcon'
];

var allTypes = ComponentRegistry.getAllTypes();
for (var i = 0; i < expectedTypes.length; i++) {
  assert(allTypes.indexOf(expectedTypes[i]) !== -1,
    'ComponentRegistry 包含类型: ' + expectedTypes[i]);
}

// ---- 测试 2：双端标签映射 ----
console.log('\n【测试组 2】双端标签映射');
assertEqual(ComponentRegistry.getTag('button', 'html'), 'button', 'button H5 标签为 button');
assertEqual(ComponentRegistry.getTag('button', 'axml'), 'ant-button', 'button AXML 标签为 ant-button');
assertEqual(ComponentRegistry.getTag('input', 'html'), 'input', 'input H5 标签为 input');
assertEqual(ComponentRegistry.getTag('input', 'axml'), 'input', 'input AXML 标签为 input');
assertEqual(ComponentRegistry.getTag('text', 'html'), 'span', 'text H5 标签为 span');
assertEqual(ComponentRegistry.getTag('text', 'axml'), 'text', 'text AXML 标签为 text');
assertEqual(ComponentRegistry.getTag('view', 'html'), 'div', 'view H5 标签为 div');
assertEqual(ComponentRegistry.getTag('view', 'axml'), 'view', 'view AXML 标签为 view');
assert(ComponentRegistry.isAntComponent('button'), 'button 是 antd-mini 组件');
assert(!ComponentRegistry.isAntComponent('input'), 'input 不是 antd-mini 组件');
assert(ComponentRegistry.isSelfClosing('input'), 'input 是自闭合标签');
assert(!ComponentRegistry.isSelfClosing('button'), 'button 不是自闭合标签');

// ---- 测试 3：buildClasses 正确性 ----
console.log('\n【测试组 3】buildClasses 正确性');

var btnClasses = ComponentRegistry.buildClasses('button', { type: 'primary', block: true }, []);
assertIncludes(btnClasses.join(' '), 'am-button', 'button 包含基础类名 am-button');
assertIncludes(btnClasses.join(' '), 'am-button--primary', 'button primary 类名正确');
assertIncludes(btnClasses.join(' '), 'am-button--block', 'button block 类名正确');

var textClasses = ComponentRegistry.buildClasses('text', { size: 'lg', bold: true, color: 'primary' }, []);
assertIncludes(textClasses.join(' '), 'am-text', 'text 包含基础类名 am-text');
assertIncludes(textClasses.join(' '), 'am-text--lg', 'text size lg 类名正确');
assertIncludes(textClasses.join(' '), 'am-text--bold', 'text bold 类名正确');
assertIncludes(textClasses.join(' '), 'am-text--primary', 'text color primary 类名正确');

var inputClasses = ComponentRegistry.buildClasses('input', { disabled: true, inline: true }, []);
assertIncludes(inputClasses.join(' '), 'am-input--disabled', 'input disabled 类名正确');
assertIncludes(inputClasses.join(' '), 'am-input--inline', 'input inline 类名正确');

// ---- 测试 4：SchemaToHtml 渲染 ----
console.log('\n【测试组 4】SchemaToHtml H5 渲染');

var htmlOutput = SchemaToHtml.renderNode({
  type: 'button',
  props: { type: 'primary', block: true },
  children: '提交'
});
assertIncludes(htmlOutput, '<button', '按钮使用 button 标签');
assertIncludes(htmlOutput, 'am-button--primary', 'H5 按钮 primary 类名存在');
assertIncludes(htmlOutput, 'am-button--block', 'H5 按钮 block 类名存在');
assertIncludes(htmlOutput, '>提交</button>', 'H5 按钮文本正确');

var textHtml = SchemaToHtml.renderNode({
  type: 'text',
  props: { size: 'lg', bold: true, color: 'primary' },
  children: '标题'
});
assertIncludes(textHtml, '<span', '文本使用 span 标签');
assertIncludes(textHtml, 'am-text--lg', 'H5 文本 size 类名正确');
assertIncludes(textHtml, 'am-text--bold', 'H5 文本 bold 类名正确');
assertIncludes(textHtml, 'am-text--primary', 'H5 文本 color 类名正确');

var stepsHtml = SchemaToHtml.renderNode({
  type: 'steps',
  props: {
    current: 1,
    items: [
      { title: '步骤1' },
      { title: '步骤2' },
      { title: '步骤3' }
    ]
  }
});
assertIncludes(stepsHtml, 'am-step--completed', 'H5 步骤条已完成类名存在');
assertIncludes(stepsHtml, 'am-step--active', 'H5 步骤条当前类名存在');
assertIncludes(stepsHtml, '步骤2', 'H5 步骤条标题渲染正确');

var fullSchema = {
  version: '1.0',
  page: {
    id: 'test',
    title: '测试',
    children: [
      { type: 'text', children: 'Hello' },
      { type: 'view', style: { marginTop: '8rpx' }, children: 'World' }
    ]
  }
};
var fullHtml = SchemaToHtml.render(fullSchema);
assertIncludes(fullHtml, 'Hello', 'Schema 文本渲染正确');
assertIncludes(fullHtml, '4px', 'Schema rpx 样式已正确转换为 px');

// ---- 测试 5：SchemaToAxml 编译 ----
console.log('\n【测试组 5】SchemaToAxml 小程序编译');

var axmlSchema = {
  page: {
    children: [
      { type: 'button', props: { type: 'primary' }, children: '提交' },
      { type: 'text', children: '你好' }
    ]
  }
};
var compiled = SchemaToAxml.compile(axmlSchema);
assertIncludes(compiled.axml, '<ant-button', 'AXML 按钮使用 ant-button 标签');
assertIncludes(compiled.axml, 'type="primary"', 'AXML 按钮 type 属性正确');
assertIncludes(compiled.axml, '<text', 'AXML 文本使用 text 标签');
assertIncludes(compiled.axml, '你好', 'AXML 文本内容正确');
assert(typeof compiled.acss === 'string', 'ACSS 生成成功');
assert(typeof compiled.js === 'string', 'JS 生成成功');

// ---- 测试 6：组件路径收集 ----
console.log('\n【测试组 6】组件路径收集');
var compPaths = ComponentRegistry.getComponentPaths();
assert(typeof compPaths === 'object', 'getComponentPaths 返回对象');
assert(compPaths['ant-button'] === '/components/Button/index', 'button 组件路径正确');
assert(compPaths['ant-list-item'] === '/components/List/ListItem/index', 'listItem 组件路径正确');

// ---- 测试 7：html-to-schema 自动注入 ----
console.log('\n【测试组 7】html-to-schema 自动注入');
require('./html-to-schema.js');
assert(typeof HtmlToSchema !== 'undefined', 'HtmlToSchema 加载成功');
// 验证 ComponentRegistry 的 baseClasses 已自动注入到 CLASS_TYPE_MAP
// 通过解析一个简单 HTML 来验证
var parsed = HtmlToSchema.parseNodes('<button class="am-button am-button--primary">测试</button>');
assert(parsed.length > 0 && parsed[0].type === 'button', 'html-to-schema 自动识别 button 类型');
assert(parsed[0].props && parsed[0].props.type === 'primary', 'html-to-schema 正确提取 button primary props');

// ============================================================
// 测试报告
// ============================================================

console.log('\n============================================================');
console.log('测试结果: ' + passed + ' 通过, ' + failed + ' 失败');
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
