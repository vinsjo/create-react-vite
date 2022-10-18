// Based on (and copied from):
// https://github.com/vitejs/vite/blob/main/packages/create-vite/src/index.ts

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import minimist from 'minimist';
import prompts from 'prompts';
import { green, red, reset, yellow } from 'kolorist';
import {
    copy,
    formatTargetDir,
    emptyDir,
    isEmpty,
    isValidPackageName,
    toValidPackageName,
} from './utils';

const argv = minimist(process.argv.slice(2), { string: ['_'] });
const cwd = process.cwd();

(async function main() {
    let targetDir = formatTargetDir(argv._[0]);
    const defaultTargetDir = 'vite-react-app';

    const getProjectName = () =>
        !targetDir ? path.basename(path.resolve()) : targetDir;

    let result: prompts.Answers<
        'projectName' | 'overwrite' | 'packageName' | 'useTypeScript'
    >;
    try {
        result = await prompts(
            [
                {
                    type: targetDir ? null : 'text',
                    message: reset('Project name:'),
                    initial: defaultTargetDir,
                    onState: ({ value }) => {
                        targetDir = formatTargetDir(value) || defaultTargetDir;
                    },
                    name: 'projectName',
                },
                {
                    type: () =>
                        !targetDir ||
                        !fs.existsSync(targetDir) ||
                        isEmpty(targetDir)
                            ? null
                            : 'toggle',
                    message: () =>
                        (targetDir === '.'
                            ? 'Current directory'
                            : `Target directory "${targetDir}"`) +
                        ` is not empty. Remove existing files and continue? `,
                    name: 'overwrite',
                    initial: false,
                    active: 'yes',
                    inactive: 'no',
                },
                {
                    type: (_, { overwrite }) => {
                        if (overwrite !== false) return null;
                        throw new Error(`${red('✖')} Operation cancelled`);
                    },
                    name: 'overwriteChecker',
                },
                {
                    type: () =>
                        isValidPackageName(getProjectName()) ? null : 'text',
                    name: 'packageName',
                    message: reset('Package name:'),
                    initial: () => toValidPackageName(getProjectName()),
                    validate: (dir) =>
                        isValidPackageName(dir) || 'Invalid package.json name',
                },
                {
                    type: 'toggle',
                    name: 'useTypeScript',
                    message: 'Use TypeScript? ',
                    initial: false,
                    active: 'yes',
                    inactive: 'no',
                },
            ],
            {
                onCancel: () => {
                    throw new Error(`${red('✖')} Operation cancelled`);
                },
            }
        );
    } catch (err: Error | unknown) {
        if (err instanceof Error) console.log(err.message);
        return;
    }

    const { overwrite, packageName, useTypeScript } = result;
    const root = path.join(cwd, targetDir);

    if (overwrite) {
        emptyDir(root);
    } else if (!fs.existsSync(root)) {
        fs.mkdirSync(root, { recursive: true });
    }

    console.log(`\nScaffolding project into ${root}...`);

    const templateDir = path.resolve(
        fileURLToPath(import.meta.url),
        '../..',
        `template-${useTypeScript ? 'ts' : 'js'}`
    );

    const write = (file: string, content?: string) => {
        const targetPath = path.join(
            root,
            file === '_gitignore' ? '.gitignore' : file
        );
        content
            ? fs.writeFileSync(targetPath, content)
            : copy(path.join(templateDir, file), targetPath);
    };

    const files = fs.readdirSync(templateDir);
    for (const file of files) {
        if (file === 'package.json') continue;
        write(file);
    }

    const pkg = JSON.parse(
        fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8')
    );
    pkg.name = packageName || getProjectName();
    write('package.json', JSON.stringify(pkg, null, 2));

    console.log(
        `\n${green('Success!')} Created vite react app at ${yellow(root)}:\n`
    );
    console.log(`Now run:\n`);
    if (root !== cwd) {
        console.log(`  cd ${path.relative(cwd, root)}`);
    }
    console.log('  npm install');
    console.log('  npm run dev');
    console.log();
})().catch((e) => console.error(red(e)));
