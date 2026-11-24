export const useBaseTreeKeys = ({ t }) => {
  const baseTreeKeys = computed(() => ({
    id: 80001100,
    text: t('reservedWord'),

    iconCls: 'scriptEditor',
    children: [
      {
        text: t('keyWord'),

        iconCls: 'scriptEditor',
        children: [
          { type: 'key', iconCls: 'script', text: 'this' },
          { type: 'key', iconCls: 'script', text: 'Boolean' },
          { type: 'key', iconCls: 'script', text: 'Number' },
          { type: 'key', iconCls: 'script', text: 'String' },
          { type: 'key', iconCls: 'script', text: 'Date' },
          { type: 'key', iconCls: 'script', text: 'RegExp' },
          { type: 'key', iconCls: 'script', text: 'Function' },
          { type: 'key', iconCls: 'script', text: 'Object' },
        ],
      },
      {
        text: t('controlStatement'),

        iconCls: 'scriptEditor',
        children: [
          { type: 'key', iconCls: 'script', text: 'break' },
          { type: 'key', iconCls: 'script', text: 'continue' },
          { type: 'key', iconCls: 'script', text: 'do...while' },
          { type: 'key', iconCls: 'script', text: 'for' },
          { type: 'key', iconCls: 'script', text: 'if...else' },
          { type: 'key', iconCls: 'script', text: 'return' },
          { type: 'key', iconCls: 'script', text: 'switch' },
          { type: 'key', iconCls: 'script', text: 'try...catch' },
        ],
      },
      {
        text: t('arithmeticOperator'),

        iconCls: 'scriptEditor',
        children: [
          { type: 'key', iconCls: 'script', text: '+' },
          { type: 'key', iconCls: 'script', text: '-' },
          { type: 'key', iconCls: 'script', text: '*' },
          { type: 'key', iconCls: 'script', text: '/' },
          { type: 'key', iconCls: 'script', text: '%' },
          { type: 'key', iconCls: 'script', text: '++' },
          { type: 'key', iconCls: 'script', text: '--' },
          { type: 'key', iconCls: 'script', text: '=' },
          { type: 'key', iconCls: 'script', text: '+=' },
          { type: 'key', iconCls: 'script', text: '-=' },
          { type: 'key', iconCls: 'script', text: '*=' },
          { type: 'key', iconCls: 'script', text: '/=' },
          { type: 'key', iconCls: 'script', text: '%=' },
        ],
      },
      {
        text: t('relationalOperator'),

        iconCls: 'scriptEditor',
        children: [
          { type: 'key', iconCls: 'script', text: '==' },
          { type: 'key', iconCls: 'script', text: '===' },
          { type: 'key', iconCls: 'script', text: '!=' },
          { type: 'key', iconCls: 'script', text: '!==' },
          { type: 'key', iconCls: 'script', text: '>' },
          { type: 'key', iconCls: 'script', text: '<' },
          { type: 'key', iconCls: 'script', text: '>=' },
          { type: 'key', iconCls: 'script', text: '<=' },
          { type: 'key', iconCls: 'script', text: '?' },
        ],
      },
      {
        text: t('logicalOperator'),

        iconCls: 'scriptEditor',
        children: [
          { type: 'key', iconCls: 'script', text: '&&' },
          { type: 'key', iconCls: 'script', text: '||' },
          { type: 'key', iconCls: 'script', text: '!' },
        ],
      },
    ],
  }));
  return {
    baseTreeKeys,
  };
};
