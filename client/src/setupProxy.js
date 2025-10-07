const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://192.168.1.63:5000',
      changeOrigin: true,
      secure: false,
      ssl: {
        cert: fs.readFileSync(path.resolve(__dirname, '../../cert.pem')),
        key: fs.readFileSync(path.resolve(__dirname, '../../key.pem'))
      },
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      }
    })
  );
};
