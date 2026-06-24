// Mock for lightningcss to avoid binary issues on Windows
export const Features = {
  Nesting: 1 << 0,
  MediaQueries: 1 << 1,
  LogicalProperties: 1 << 2,
  DirSelector: 1 << 3,
  LightDark: 1 << 4,
};

export function transform(options) {
  return {
    code: options.code,
    map: options.sourceMap ? "{}" : undefined,
    warnings: [],
  };
}

export function browserslistToTargets(browserslist) {
  return {};
}

export default {};
