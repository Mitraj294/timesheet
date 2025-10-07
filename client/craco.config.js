const path = require('path');

module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.ignoreWarnings = [
          // Ignore all source map warnings from node_modules
          {
            module: /node_modules/,
            message: /Failed to parse source map/,
          },
          // Ignore all deprecation warnings from node_modules
          {
            module: /node_modules/,
            message: /DeprecationWarning/,
          },
        ];
        // Remove source-map-loader from module.rules (for nested oneOf arrays too)
        function removeSourceMapLoader(rules) {
          if (!Array.isArray(rules)) return rules;
          return rules
            .filter((rule) => {
              if (rule?.loader && typeof rule.loader === 'string') {
                return !rule.loader.includes('source-map-loader');
              }
              return true;
            })
            .map((rule) => {
              if (rule.oneOf) {
                return { ...rule, oneOf: removeSourceMapLoader(rule.oneOf) };
              }
              return rule;
            });
        }
        if (webpackConfig.module?.rules && Array.isArray(webpackConfig.module.rules)) {
          webpackConfig.module.rules = removeSourceMapLoader(webpackConfig.module.rules);
        }
        // Only override host and server, do not replace the whole devServer object
        webpackConfig.devServer = {
          ...webpackConfig.devServer,
          allowedHosts: 'all',
          host: '0.0.0.0',
          port: 3000,
          https: {
            key: path.resolve(__dirname, '../key.pem'),
            cert: path.resolve(__dirname, '../cert.pem'),
          },
          historyApiFallback: true,
          hot: true,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
          },
          proxy: {
            '/api': {
              target: 'https://192.168.1.63:5000',
              changeOrigin: true,
              secure: false
            }
          },
          client: {
            webSocketURL: {
              hostname: '0.0.0.0',
              pathname: '/ws',
              port: 0,
              protocol: 'ws'
            }
          }
        };
        webpackConfig.devServer.onBeforeSetupMiddleware = undefined;
        webpackConfig.devServer.onAfterSetupMiddleware = undefined;
        return webpackConfig;
      },
    },
  };
