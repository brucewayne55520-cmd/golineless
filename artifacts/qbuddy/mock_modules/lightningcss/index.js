// Dummy mock for lightningcss to avoid binary issues on Windows
export const browserslistToTargets = () => ({});
export const transform = (opts) => ({ code: opts.code });
export default {};
