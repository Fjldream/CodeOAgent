import { useLangStore } from '@/stores/langStore.js';

// 核心组件引入
import { CellValueType, LocaleType, mergeLocales, Univer, UniverInstanceType } from '@univerjs/core';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverSheetsFilterPlugin } from '@univerjs/sheets-filter';
import { UniverSheetsFilterUIPlugin } from '@univerjs/sheets-filter-ui';
import { FUniver } from '@univerjs/core/facade';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt';
import { UniverSheetsNumfmtUIPlugin } from '@univerjs/sheets-numfmt-ui';
import { UniverSheetsSortPlugin } from '@univerjs/sheets-sort';
import { UniverSheetsSortUIPlugin } from '@univerjs/sheets-sort-ui';
import { UniverDataValidationPlugin } from '@univerjs/data-validation';
import { UniverSheetsDataValidationPlugin } from '@univerjs/sheets-data-validation';
import { UniverSheetsDataValidationUIPlugin } from '@univerjs/sheets-data-validation-ui';
import { UniverSheetsConditionalFormattingPlugin } from '@univerjs/sheets-conditional-formatting';
import { UniverSheetsConditionalFormattingUIPlugin } from '@univerjs/sheets-conditional-formatting-ui';
import { UniverSheetsHyperLinkPlugin } from '@univerjs/sheets-hyper-link';
import { UniverSheetsHyperLinkUIPlugin } from '@univerjs/sheets-hyper-link-ui';
import { UniverFindReplacePlugin } from '@univerjs/find-replace';
import { UniverSheetsFindReplacePlugin } from '@univerjs/sheets-find-replace';
import { UniverDrawingPlugin } from '@univerjs/drawing';
import { UniverDrawingUIPlugin } from '@univerjs/drawing-ui';
import { UniverSheetsDrawingPlugin } from '@univerjs/sheets-drawing';
import { UniverSheetsDrawingUIPlugin } from '@univerjs/sheets-drawing-ui';

// i18n（最小集） 中文环境
import DesignZhCN from '@univerjs/design/locale/zh-CN';
import UIZhCN from '@univerjs/ui/locale/zh-CN';
import DocsUIZhCN from '@univerjs/docs-ui/locale/zh-CN';
import SheetsZhCN from '@univerjs/sheets/locale/zh-CN';
import SheetsUIZhCN from '@univerjs/sheets-ui/locale/zh-CN';
import SheetsFormulaUIZhCN from '@univerjs/sheets-formula-ui/locale/zh-CN';
import SheetsNumfmtUIZhCN from '@univerjs/sheets-numfmt-ui/locale/zh-CN';

import SheetsFilterUIZhCN from '@univerjs/sheets-filter-ui/locale/zh-CN';
import SheetsSortUIZhCN from '@univerjs/sheets-sort-ui/locale/zh-CN';
import SheetsDataValidationZhCN from '@univerjs/sheets-data-validation-ui/locale/zh-CN';
import SheetsConditionalFormattingUIZhCN from '@univerjs/sheets-conditional-formatting-ui/locale/zh-CN';
import SheetsFindReplaceZhCN from '@univerjs/sheets-find-replace/locale/zh-CN';
import FindReplaceZhCN from '@univerjs/find-replace/locale/zh-CN';
import SheetsHyperLinkUIZhCN from '@univerjs/sheets-hyper-link-ui/locale/zh-CN';
import SheetsDrawingUIZhCN from '@univerjs/sheets-drawing-ui/locale/zh-CN';
import DrawingUIZhCN from '@univerjs/drawing-ui/locale/zh-CN';

// i18n（最小集） 英文环境
import DesignENUS from '@univerjs/design/locale/en-US';
import UIENUS from '@univerjs/ui/locale/en-US';
import DocsUIENUS from '@univerjs/docs-ui/locale/en-US';
import SheetsENUS from '@univerjs/sheets/locale/en-US';
import SheetsUIENUS from '@univerjs/sheets-ui/locale/en-US';
import SheetsFormulaUIENUS from '@univerjs/sheets-formula-ui/locale/en-US';
import SheetsNumfmtUIENUS from '@univerjs/sheets-numfmt-ui/locale/en-US';

import SheetsFilterUIENUS from '@univerjs/sheets-filter-ui/locale/en-US';
import SheetsSortUIENUS from '@univerjs/sheets-sort-ui/locale/en-US';
import SheetsDataValidationENUS from '@univerjs/sheets-data-validation-ui/locale/en-US';
import SheetsConditionalFormattingUIENUS from '@univerjs/sheets-conditional-formatting-ui/locale/en-US';
import SheetsFindReplaceENUS from '@univerjs/sheets-find-replace/locale/en-US';
import FindReplaceENUS from '@univerjs/find-replace/locale/en-US';
import SheetsHyperLinkUIENUS from '@univerjs/sheets-hyper-link-ui/locale/en-US';
import SheetsDrawingUIENUS from '@univerjs/sheets-drawing-ui/locale/en-US';
import DrawingUIENUS from '@univerjs/drawing-ui/locale/en-US';

// i18n（最小集） 韩文环境
import DesignKOKR from '@univerjs/design/locale/ko-KR';
import UIKOKR from '@univerjs/ui/locale/ko-KR';
import DocsUIKOKR from '@univerjs/docs-ui/locale/ko-KR';
import SheetsKOKR from '@univerjs/sheets/locale/ko-KR';
import SheetsUIKOKR from '@univerjs/sheets-ui/locale/ko-KR';
import SheetsFormulaUIKOKR from '@univerjs/sheets-formula-ui/locale/ko-KR';
import SheetsNumfmtUIKOKR from '@univerjs/sheets-numfmt-ui/locale/ko-KR';

import SheetsFilterUIKOKR from '@univerjs/sheets-filter-ui/locale/ko-KR';
import SheetsSortUIKOKR from '@univerjs/sheets-sort-ui/locale/ko-KR';
import SheetsDataValidationKOKR from '@univerjs/sheets-data-validation-ui/locale/ko-KR';
import SheetsConditionalFormattingUIKOKR from '@univerjs/sheets-conditional-formatting-ui/locale/ko-KR';
import SheetsFindReplaceKOKR from '@univerjs/sheets-find-replace/locale/ko-KR';
import FindReplaceKOKR from '@univerjs/find-replace/locale/ko-KR';
import SheetsHyperLinkUIKOKR from '@univerjs/sheets-hyper-link-ui/locale/ko-KR';
import SheetsDrawingUIKOKR from '@univerjs/sheets-drawing-ui/locale/ko-KR';
import DrawingUIKOKR from '@univerjs/drawing-ui/locale/ko-KR';

// i18n（最小集） 韩文环境
import DesignJAJP from '@univerjs/design/locale/ja-JP';
import UIJAJP from '@univerjs/ui/locale/ja-JP';
import DocsUIJAJP from '@univerjs/docs-ui/locale/ja-JP';
import SheetsJAJP from '@univerjs/sheets/locale/ja-JP';
import SheetsUIJAJP from '@univerjs/sheets-ui/locale/ja-JP';
import SheetsFormulaUIJAJP from '@univerjs/sheets-formula-ui/locale/ja-JP';
import SheetsNumfmtUIJAJP from '@univerjs/sheets-numfmt-ui/locale/ja-JP';

import SheetsFilterUIJAJP from '@univerjs/sheets-filter-ui/locale/ja-JP';
import SheetsSortUIJAJP from '@univerjs/sheets-sort-ui/locale/ja-JP';
import SheetsDataValidationJAJP from '@univerjs/sheets-data-validation-ui/locale/ja-JP';
import SheetsConditionalFormattingUIJAJP from '@univerjs/sheets-conditional-formatting-ui/locale/ja-JP';
import SheetsFindReplaceJAJP from '@univerjs/sheets-find-replace/locale/ja-JP';
import FindReplaceJAJP from '@univerjs/find-replace/locale/ja-JP';
import SheetsHyperLinkUIJAJP from '@univerjs/sheets-hyper-link-ui/locale/ja-JP';
import SheetsDrawingUIJAJP from '@univerjs/sheets-drawing-ui/locale/ja-JP';
import DrawingUIJAJP from '@univerjs/drawing-ui/locale/ja-JP';

// （可选）Facade
import '@univerjs/sheets-filter/facade';
import '@univerjs/engine-formula/facade';
import '@univerjs/ui/facade';
import '@univerjs/sheets/facade';
import '@univerjs/sheets-ui/facade';
import '@univerjs/sheets-formula/facade';
import '@univerjs/sheets-numfmt/facade';
import '@univerjs/sheets-sort/facade';
import '@univerjs/docs-ui/facade';
import '@univerjs/sheets-data-validation/facade';
import '@univerjs/sheets-conditional-formatting/facade';
import '@univerjs/sheets-hyper-link/facade';
import '@univerjs/sheets-hyper-link-ui/facade';
import '@univerjs/sheets-find-replace/facade';
import '@univerjs/sheets-drawing-ui/facade';

// 样式顺序很重要：design -> ui -> 其他
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';
import '@univerjs/sheets-filter-ui/lib/index.css';
import '@univerjs/sheets-sort-ui/lib/index.css';
import '@univerjs/sheets-formula-ui/lib/index.css';
import '@univerjs/sheets-numfmt-ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';
import '@univerjs/sheets-data-validation-ui/lib/index.css';
import '@univerjs/sheets-conditional-formatting-ui/lib/index.css';
import '@univerjs/sheets-hyper-link-ui/lib/index.css';
import '@univerjs/find-replace/lib/index.css';
import '@univerjs/drawing-ui/lib/index.css';
import '@univerjs/sheets-drawing-ui/lib/index.css';

const langEnums = {
  zh: LocaleType.ZH_CN,
  en: LocaleType.EN_US,
  ko: LocaleType.KO_KR,
  ja: LocaleType.JA_JP,
};

const langStore = useLangStore();
export default async (container) => {
  const univer = new Univer({
    locale: langEnums[langStore.currentLang],
    locales: {
      [LocaleType.ZH_CN]: mergeLocales(
        // 基本插件
        DesignZhCN,
        UIZhCN,
        DocsUIZhCN,
        SheetsZhCN,
        SheetsUIZhCN,
        SheetsFormulaUIZhCN,
        SheetsNumfmtUIZhCN,
        // 筛选插件
        SheetsFilterUIZhCN,
        // 排序插件
        SheetsSortUIZhCN,
        // 数据验证插件
        SheetsDataValidationZhCN,
        //     条件格式
        SheetsConditionalFormattingUIZhCN,
        // 超链接
        SheetsHyperLinkUIZhCN,
        // 查找替换
        FindReplaceZhCN,
        SheetsFindReplaceZhCN,
        //     图片插件
        DrawingUIZhCN,
        SheetsDrawingUIZhCN,
      ),
      [LocaleType.EN_US]: mergeLocales(
        // 基本插件
        DesignENUS,
        UIENUS,
        SheetsUIENUS,
        SheetsENUS,
        SheetsFormulaUIENUS,
        DocsUIENUS,
        // 筛选插件
        SheetsFilterUIENUS,
        SheetsSortUIENUS,
        SheetsNumfmtUIENUS,
        SheetsDataValidationENUS,
        SheetsConditionalFormattingUIENUS,
        SheetsFindReplaceENUS,
        FindReplaceENUS,
        SheetsHyperLinkUIENUS,
        SheetsDrawingUIENUS,
        DrawingUIENUS,
      ),
      [LocaleType.KO_KR]: mergeLocales(
        // 基本插件
        DesignKOKR,
        UIKOKR,
        SheetsUIKOKR,
        SheetsKOKR,
        SheetsFormulaUIKOKR,
        DocsUIKOKR,
        // 筛选插件
        SheetsFilterUIKOKR,
        SheetsSortUIKOKR,
        SheetsNumfmtUIKOKR,
        SheetsDataValidationKOKR,
        SheetsConditionalFormattingUIKOKR,
        SheetsFindReplaceKOKR,
        FindReplaceKOKR,
        SheetsHyperLinkUIKOKR,
        SheetsDrawingUIKOKR,
        DrawingUIKOKR,
      ),
      [LocaleType.JA_JP]: mergeLocales(
        // 基本插件
        DesignJAJP,
        UIJAJP,
        SheetsUIJAJP,
        SheetsJAJP,
        SheetsFormulaUIJAJP,
        DocsUIJAJP,
        // 筛选插件
        SheetsFilterUIJAJP,
        SheetsSortUIJAJP,
        SheetsNumfmtUIJAJP,
        SheetsDataValidationJAJP,
        SheetsConditionalFormattingUIJAJP,
        SheetsFindReplaceJAJP,
        FindReplaceJAJP,
        SheetsHyperLinkUIJAJP,
        SheetsDrawingUIJAJP,
        DrawingUIJAJP,
      ),
    },
  });

  univer.registerPlugin(UniverRenderEnginePlugin);
  univer.registerPlugin(UniverFormulaEnginePlugin);

  univer.registerPlugin(UniverUIPlugin, {
    container,
    // TODO: 使用simple模式会出现莫名卡顿现象
    // ribbonType: 'simple',
  });

  // 基础功能
  univer.registerPlugin(UniverDocsPlugin);
  univer.registerPlugin(UniverDocsUIPlugin);
  univer.registerPlugin(UniverSheetsPlugin);
  univer.registerPlugin(UniverSheetsUIPlugin);
  univer.registerPlugin(UniverSheetsFormulaPlugin);
  univer.registerPlugin(UniverSheetsFormulaUIPlugin);
  univer.registerPlugin(UniverSheetsNumfmtPlugin);
  univer.registerPlugin(UniverSheetsNumfmtUIPlugin);
  // 筛选功能
  univer.registerPlugin(UniverSheetsFilterPlugin);
  univer.registerPlugin(UniverSheetsFilterUIPlugin);
  // 拍讯插件
  univer.registerPlugin(UniverSheetsSortPlugin);
  univer.registerPlugin(UniverSheetsSortUIPlugin);
  // 数据验证插件
  univer.registerPlugin(UniverDataValidationPlugin);
  univer.registerPlugin(UniverSheetsDataValidationPlugin);
  univer.registerPlugin(UniverSheetsDataValidationUIPlugin);
  // 条件格式插件
  univer.registerPlugin(UniverSheetsConditionalFormattingPlugin);
  univer.registerPlugin(UniverSheetsConditionalFormattingUIPlugin);
  // 超链接插件
  univer.registerPlugin(UniverSheetsHyperLinkPlugin);
  univer.registerPlugin(UniverSheetsHyperLinkUIPlugin);
  // 查找替换插件
  univer.registerPlugin(UniverFindReplacePlugin);
  univer.registerPlugin(UniverSheetsFindReplacePlugin);
  // 图片插件
  univer.registerPlugin(UniverDrawingPlugin);
  univer.registerPlugin(UniverDrawingUIPlugin);
  univer.registerPlugin(UniverSheetsDrawingPlugin);
  univer.registerPlugin(UniverSheetsDrawingUIPlugin);

  univer.createUnit(UniverInstanceType.UNIVER_SHEET, {});

  return { API: FUniver.newAPI(univer), cellType: CellValueType };
};
