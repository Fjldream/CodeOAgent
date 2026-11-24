// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
// 按 Node 运行态注册源码生成。复核入口见 index-source.mjs。
export const kcRegistrations = {
  "dll": {
    "source": "service/globalFuncMng/dll_global_func.js",
    "sha256": "34d03de67c7540e14e7f6a5873ae97aea9f3721a677e04c881636d98ff39ba78",
    "symbols": {
      "LoadDllFile": {
        "formals": 2,
        "requiredFormals": 2,
        "async": true
      },
      "ExecuteDllFunction": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "UnloadDllFile": {
        "formals": 1,
        "requiredFormals": 1,
        "async": true
      }
    }
  },
  "file": {
    "source": "service/globalFuncMng/file_global_func.js",
    "sha256": "d1e14fbef7fdfedf7db1996b5264d5c848f391744918a2f9718ce01e56f5e2fb",
    "symbols": {
      "isFileExists": {
        "formals": 1,
        "requiredFormals": 1,
        "async": true
      },
      "ReadFile": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "WriteFile": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "AsynIsFileExists": {
        "formals": 2,
        "requiredFormals": 2,
        "async": false
      },
      "AsynReadFile": {
        "formals": 3,
        "requiredFormals": 3,
        "async": false
      },
      "AsynWriteFile": {
        "formals": 5,
        "requiredFormals": 5,
        "async": false
      }
    }
  },
  "kh": {
    "source": "service/globalFuncMng/kh_global_func.js",
    "sha256": "8ea65e69b10a8f219310c9fe33e6353751d8700578dc81dd8761e1a1998e2cf2",
    "symbols": {
      "KHAddDatas": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "KHQueryRawDatas": {
        "formals": 9,
        "requiredFormals": 9,
        "async": true
      },
      "KHQuerySampleDatas1": {
        "formals": 6,
        "requiredFormals": 6,
        "async": true
      },
      "KHQuerySampleDatas2": {
        "formals": 9,
        "requiredFormals": 9,
        "async": true
      },
      "KHGetCurrentValue": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "AsynKHAddDatas": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "AsynKHQueryRawDatas": {
        "formals": 9,
        "requiredFormals": 9,
        "async": true
      },
      "AsynKHQuerySampleDatas1": {
        "formals": 6,
        "requiredFormals": 6,
        "async": true
      },
      "AsynKHQuerySampleDatas2": {
        "formals": 9,
        "requiredFormals": 9,
        "async": true
      }
    }
  },
  "kio": {
    "source": "service/globalFuncMng/kio_global_func.js",
    "sha256": "303a271eefc9ff48c706476dd51d4bce446e8753fa7b758e23dcfd8050db5a6f",
    "symbols": {
      "KIOQueryDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "KIOUpdateDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "AsynKIOQueryDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "AsynKIOUpdateDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      }
    }
  },
  "ks": {
    "source": "service/globalFuncMng/ks_global_func.js",
    "sha256": "c2c803d4a38abd4b2a102a5f1afa87a9fe3557a22f13a847700979b4966c114a",
    "symbols": {
      "KSQueryDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "KSUpdateDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "KSQueryHistoryDatas": {
        "formals": 8,
        "requiredFormals": 8,
        "async": true
      },
      "AsynKSQueryHistoryDatas": {
        "formals": 8,
        "requiredFormals": 8,
        "async": true
      },
      "AsynKSQueryDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "AsynKSUpdateDatas": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      }
    }
  },
  "math": {
    "source": "service/globalFuncMng/math_global_func.js",
    "sha256": "85fe2c2944e4f03af92b7c0ca67df0a48057195430fe7ac3c42d25be035df921",
    "symbols": {
      "Abs": {
        "delegated": true
      },
      "Trunc": {
        "delegated": true
      },
      "Pow": {
        "delegated": true
      },
      "Sqrt": {
        "delegated": true
      },
      "Round": {
        "delegated": true
      },
      "ArcCos": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "ArcSin": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "ArcTan": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "Average": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "Cos": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "Sin": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "Tan": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "Exp": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "LogE": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "LogN": {
        "formals": 2,
        "requiredFormals": 2,
        "async": false
      },
      "PI": {
        "formals": 0,
        "requiredFormals": 0,
        "async": false
      },
      "Sgn": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "Sum": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      }
    }
  },
  "md5": {
    "source": "service/globalFuncMng/md5_global_func.js",
    "sha256": "819ce19c27030463cb98f54609be3b5772ca17f9099ec464c8752faede4f7d62",
    "symbols": {
      "hex_md5": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "md5": {
        "delegated": true
      }
    }
  },
  "mongo": {
    "source": "service/globalFuncMng/mongo_global_func.js",
    "sha256": "e5fdb7a2ab7226f0a689b60b586ca2679db52511f5ef249c8771d7c045f01e5d",
    "symbols": {
      "MongoDBQuery": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "MongoDBInsertMany": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "MongoDBUpdateMany": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "MongoDBDeleteMany": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "AsynMongoDBQuery": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "AsynMongoDBInsertMany": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "AsynMongoDBUpdateMany": {
        "formals": 5,
        "requiredFormals": 5,
        "async": true
      },
      "AsynMongoDBDeleteMany": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      }
    }
  },
  "redis": {
    "source": "service/globalFuncMng/redis_global_func.js",
    "sha256": "362e7e37077c62a96668552822d80ddf8dbcc3a33bd1945a073e3572db518063",
    "symbols": {
      "redisExists": {
        "formals": 2,
        "requiredFormals": 2,
        "async": true
      },
      "redisGet": {
        "formals": 2,
        "requiredFormals": 2,
        "async": true
      },
      "redisHget": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "redisSet": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "redisHset": {
        "formals": 4,
        "requiredFormals": 4,
        "async": true
      },
      "redisDel": {
        "formals": 2,
        "requiredFormals": 2,
        "async": true
      },
      "redisHdel": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      }
    }
  },
  "redundancy": {
    "source": "service/globalFuncMng/redundancy_global_func.js",
    "sha256": "8187fcf5b05806fb1bb2f7bddf6d4130a1a0acc91dbed9cf24574b9064591ff3",
    "symbols": {
      "SubscribeRedundancyMessage": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      },
      "UnsubscribeRedundancyMessage": {
        "formals": 1,
        "requiredFormals": 1,
        "async": false
      }
    }
  },
  "request": {
    "source": "service/globalFuncMng/request_global_func.js",
    "sha256": "c546b4ecd9ca8c82c35175c3b262f775852c46277bff05076c61363dd065dd6f",
    "symbols": {
      "sendHttpRequestwithToken": {
        "formals": 5,
        "requiredFormals": 5,
        "async": true
      },
      "getTokenbyUser": {
        "formals": 2,
        "requiredFormals": 2,
        "async": false
      },
      "sendHttpRequestwithUser": {
        "formals": 6,
        "requiredFormals": 6,
        "async": true
      }
    }
  },
  "sql": {
    "source": "service/globalFuncMng/sql_global_func.js",
    "sha256": "437c2f3a5e23a11b769a8b7c6958d5431822ab44999bc635b5e1e9d70afb8e7f",
    "symbols": {
      "SQLQuery": {
        "formals": 4,
        "requiredFormals": 3,
        "async": true
      },
      "SQLExecute": {
        "formals": 3,
        "requiredFormals": 2,
        "async": true
      },
      "AsynSQLQuery": {
        "formals": 4,
        "requiredFormals": 3,
        "async": true
      },
      "AsynSQLExecute": {
        "formals": 4,
        "requiredFormals": 3,
        "async": true
      }
    }
  },
  "user": {
    "source": "service/globalFuncMng/user_global_func.js",
    "sha256": "5035bd318a6822d546bea8b94915366d49dcfba4c1d8bbd7ff8b9a3cf91004d4",
    "symbols": {
      "batchCreateUser": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "batchModifyUser": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "batchQueryUser": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "batchResetPassword": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      },
      "batchDeleteUser": {
        "formals": 3,
        "requiredFormals": 3,
        "async": true
      }
    }
  }
} as const;
// end
