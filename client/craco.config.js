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
              if (rule && rule.loader && typeof rule.loader === 'string') {
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
        if (webpackConfig.module && Array.isArray(webpackConfig.module.rules)) {
          webpackConfig.module.rules = removeSourceMapLoader(webpackConfig.module.rules);
        }
        // Only override host and server, do not replace the whole devServer object
        webpackConfig.devServer = {
          ...webpackConfig.devServer,
          host: '192.168.1.47',
          port: 3000,
          server: {
            type: 'https',
            options: {
              key: require('fs').readFileSync('../key.pem'),
              cert: require('fs').readFileSync('../cert.pem'),
            },
          },
          allowedHosts: ['all'],
          setupMiddlewares: (middlewares, devServer) => {
            console.log('Custom middlewares setup');
            return middlewares;
          },
        };
        webpackConfig.devServer.onBeforeSetupMiddleware = undefined;
        webpackConfig.devServer.onAfterSetupMiddleware = undefined;
        return webpackConfig;
      },
    },
  };
