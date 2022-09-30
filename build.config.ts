// Based on: https://github.com/vitejs/vite/blob/main/packages/create-vite/build.config.ts
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    entries: ['src/index'],
    clean: true,
    rollup: {
        inlineDependencies: true,
        esbuild: {
            minify: true,
        },
    },
});
