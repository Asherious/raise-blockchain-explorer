import { type Config } from 'prettier';

const config: Config = {
  trailingComma: 'none',
};

module.exports = config;
export default {
  content: ['./src/**/*.{html,ts,tsx,js,jsx}'],
};
