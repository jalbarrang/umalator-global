import destructureProps from './rules/destructure-props.js';
import requireUseShallow from './rules/require-use-shallow.js';

const plugin = {
  meta: {
    name: 'react-props',
  },
  rules: {
    'destructure-props': destructureProps,
    'require-use-shallow': requireUseShallow,
  },
};

export default plugin;
