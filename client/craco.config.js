module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.ignoreWarnings = [
          {
            module: /react-datepicker/,
            message: /Failed to parse source map/
          }
        ];
        // Update Webpack configuration to address deprecation warnings
        webpackConfig.devServer = {
          server: {
            type: 'https',
          },
          setupMiddlewares: (middlewares, devServer) => {
            console.log('Custom middlewares setup');
            return middlewares;
          },
        };
        // Address Webpack deprecation warnings
        webpackConfig.devServer.onBeforeSetupMiddleware = undefined;
        webpackConfig.devServer.onAfterSetupMiddleware = undefined;
        return webpackConfig;
      },
    },
  };
