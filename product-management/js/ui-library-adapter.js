/**
 * UI 库适配器 — 通过 npm 依赖 + IDE 编译使用 antd-mini 组件库
 *
 * ⚠️ 踩坑录：
 * 1. 组件路径不能用裸 antd-mini/es/ 格式，IDE 会爬到父项目 node_modules，
 *    必须用 /node_modules/antd-mini/es/ 绝对路径。
 * 2. ListItem 这类子组件路径不是 antd-mini/es/ListItem/ 而是 es/List/ListItem/，
 *    需从 ComponentRegistry 中提取完整相对路径。
 * 3. mini.project.json: compileType 是 "mini" 不是 "miniprogram"，
 *    component2 在 format 2 下必须嵌套在 compileOptions 里。
 *    enableNodeModuleBabelTransform / node_modules_es6_whitelist 是微信的，无效。
 *
 * 适配器接口：
 *   name                      - 库名称
 *   mode                      - 构建模式: 'npm'
 *   getSourceDir()            - 组件源码目录（npm 模式返回 null）
 *   getComponentPath(path)    - 组件在 page.json usingComponents 中的路径
 *   getProjectConfig()        - mini.project.json 内容
 *   getDependencies()         - package.json 依赖声明
 *   getInstallHint()          - 使用提示信息
 *
 * @author Qoder Agent
 * @version 2.0.0
 */

(function (global) {
  'use strict';

  var AntdMiniAdapter = {
    name: 'antd-mini',
    mode: 'npm',

    /** npm 模式不拷贝组件 */
    getSourceDir: function () { return null; },

    /**
     * 组件在 page.json 中的引用路径
     * 使用 /node_modules/ 绝对路径，避免 IDE 解析到父项目
     */
    getComponentPath: function (componentPath) {
      return '/node_modules/antd-mini/es/' + componentPath + '/index';
    },

    /** mini.project.json */
    getProjectConfig: function () {
      return {
        miniprogramRoot: './',
        format: 2,
        compileType: 'mini',
        compileOptions: {
          component2: true,
        },
      };
    },

    /** package.json 依赖（含 antd-mini 的传递依赖） */
    getDependencies: function () {
      return {
        'antd-mini': '^2.0.0',
        'dayjs': '^1.11.0',
        'async-validator': '^4.0.0',
        'fast-deep-equal': '^3.1.3',
      };
    },

    /** 使用提示 */
    getInstallHint: function () {
      return '\n\u2728   \u5BFC\u51FA\u540E\u8BF7\u5728\u652F\u4ED8\u5B9D IDE \u4E2D\u8FD0\u884C npm install \uFF0C\u7136\u540E\u76F4\u63A5\u7F16\u8BD1\u9884\u89C8\u3002\n';
    },
  };

  var adapters = {
    'antd-mini': AntdMiniAdapter,
  };

  var UIAdapter = {
    get: function (name) {
      return adapters[name] || adapters['antd-mini'];
    },

    getDefault: function () {
      return adapters['antd-mini'];
    },

    register: function (name, adapter) {
      if (!adapter.name) adapter.name = name;
      if (!adapter.getProjectConfig) throw new Error('Adapter must implement getProjectConfig()');
      if (!adapter.getDependencies) throw new Error('Adapter must implement getDependencies()');
      adapters[name] = adapter;
    },

    list: function () {
      return Object.keys(adapters);
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIAdapter;
  }
  global.UIAdapter = UIAdapter;
  if (typeof window !== 'undefined') window.UIAdapter = UIAdapter;

})(typeof window !== 'undefined' ? window : global);
