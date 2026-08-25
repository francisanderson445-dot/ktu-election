const serverless = require('serverless-http');
const { app, initialization } = require('../../server');

module.exports.handler = async (event, context) => {
  await initialization;
  return serverless(app)(event, context);
};
