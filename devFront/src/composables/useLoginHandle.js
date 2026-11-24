import { getPublicKeyServer, loginServer, userTokenValidServer } from '@/api/allRequest/loginAPI.js';
import { createRSAUtils } from '@/utils/rsaUtils.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { getUserInfoServer } from '@/api/allRequest/userManagerApi.js';

export const useLoginHandle = () => {
  const userStore = useLoginUserStore();

  const { setLoginInfo, setUserInfo, setPublicKey } = userStore;

  /**
   * 登录函数
   *
   * @param params 登录参数对象，包括用户名和密码
   * @returns 登录结果
   */
  const userLogin = async (params) => {
    // 获取公钥
    const {
      data: { publicKey, uuid },
    } = await getPublicKeyServer();

    setPublicKey(publicKey);

    // 创建RSA工具类实例
    const rsaUtil = createRSAUtils();

    // 使用公钥加密密码
    params.password = await rsaUtil.encrypt(params.password);

    // 调用登录服务并传入加密后的密码和uuid
    const loginResult = await loginServer({ ...params, uuid });

    if (loginResult.data?.access_token) {
      // 设置登录信息
      setLoginInfo(loginResult.data);

      const userInfo = await getUserInfoServer();

      setUserInfo(userInfo.data);
    }

    // 返回登录结果
    return loginResult;
  };

  const validUserToken = async () => {
    // 检查sessionStorage中是否存在token
    const loginInfo = sessionStorage.getItem('loginInfo');

    if (loginInfo) {
      const loginInfoParse = JSON.parse(loginInfo);
      return await userTokenValidServer(loginInfoParse.loginInfo.access_token);
    }

    if (userStore.loginInfo.access_token) {
      return await userTokenValidServer(userStore.loginInfo.access_token);
    }

    return false;
  };

  return {
    userLogin,
    validUserToken,
  };
};
