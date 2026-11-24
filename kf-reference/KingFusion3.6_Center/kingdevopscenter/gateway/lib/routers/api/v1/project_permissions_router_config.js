// modified by jinlong.feng at 2026-11-09 运维中心权限改造
const path = require('path');
const {query} = require('../../../../../../common/project-permissions');
const {midware_verifyToken} = require('../../../../core/middlewares');
const {reqHandler} = require('../../../../core/utils');
module.exports = {post:{'/project/permissions':[midware_verifyToken, (req,res) => {
  try {
    const identity = reqHandler.getHeaderInfo(req);
    res.sendOk({items:query(path.resolve(__dirname, '../../../../../..', 'sdb'), identity.tenant_id, identity.user_id, req.body.projects)});
  } catch(error) {res.status(error.status || 503).json({errorCode:error.status || 503,message:error.message,data:null});}
}]}};

// end

// modified by jinlong.feng at 2026-11-09 运维中心权限改造
module.exports.protectMonitoring = function(config) {
  const paths = ['/collect/getMonitorVariablesGroup','/collect/getMonitorVariables'];
  for (const route of paths) {
    const handlers = config.get[route];
    if (!handlers) continue;
    config.get[route] = [handlers[0], (req,res,next) => {
      try {
        const identity = req.session;
        if (['02','05'].includes(identity.userType)) return next();
        const item = query(path.resolve(__dirname, '../../../../../..', 'sdb'), identity.tenantId, identity.userID,
          [{projectType:2,projectId:req.query.projectId}])[0];
        if (!item.hasProjectPermission) return res.status(403).json({errorCode:403,message:'无工程监视权限',data:null});
        next();
      } catch(error) {res.status(error.status || 503).json({errorCode:error.status || 503,message:error.message,data:null});}
    }, ...handlers.slice(1)];
  }
};
// end
