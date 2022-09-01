// Based on and copied from: https://github.com/vitejs/vite/blob/main/packages/create-vite/src/index.js
// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import prompts from 'prompts';
import { green, red, reset } from 'kolorist';

const argv = minimist(process.argv.slice(2), { string: ['_'] });
const cwd = process.cwd();

function copy(src, dest) {
	const stat = fs.statSync(src);
	if (stat.isDirectory()) {
		copyDir(src, dest);
	} else {
		fs.copyFileSync(src, dest);
	}
}

/**
 * @param {string} targetDir
 */
function formatTargetDir(targetDir) {
	return !targetDir ? '.' : targetDir?.trim().replace(/\/+$/g, '');
}

/**
 * @param {string} srcDir
 * @param {string} destDir
 */
function copyDir(srcDir, destDir) {
	fs.mkdirSync(destDir, { recursive: true });
	for (const file of fs.readdirSync(srcDir)) {
		const srcFile = path.resolve(srcDir, file);
		const destFile = path.resolve(destDir, file);
		copy(srcFile, destFile);
	}
}

/**
 * @param {string} path
 */
function isEmpty(path) {
	const files = fs.readdirSync(path);
	return files.length === 0 || (files.length === 1 && files[0] === '.git');
}
/**
 * @param {string} dir
 */
function emptyDir(dir) {
	if (!fs.existsSync(dir)) return;
	for (const file of fs.readdirSync(dir)) {
		if (file === '.git') continue;
		fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
	}
}

/**
 * @param {string} projectName
 */
function isValidPackageName(projectName) {
	return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
		projectName
	);
}

/**
 * @param {string} projectName
 */
function toValidPackageName(projectName) {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/^[._]/, '')
		.replace(/[^a-z0-9-~]+/g, '-');
}

(async function main() {
	let targetDir = formatTargetDir(argv._[0]);
	const defaultTargetDir = 'react-vite-project';

	const getProjectName = () =>
		!targetDir || targetDir === '.'
			? path.basename(path.resolve())
			: targetDir;

	let result = {};
	try {
		result = await prompts(
			[
				{
					type: targetDir ? null : 'text',
					message: reset('Project name:'),
					initial: defaultTargetDir,
					onState: (state) => {
						targetDir =
							formatTargetDir(state.value) || defaultTargetDir;
					},
					name: 'projectName',
				},
				{
					type: () =>
						targetDir &&
						(!fs.existsSync(targetDir) || isEmpty(targetDir))
							? null
							: 'confirm',
					message: () =>
						(targetDir === '.'
							? 'Current directory'
							: `Target directory "${targetDir}"`) +
						` is not empty. Remove existing files and continue? `,
					name: 'overwrite',
				},
				{
					type: (_, { overwrite }) => {
						if (overwrite === false) {
							throw new Error(red('✖') + ' Operation cancelled');
						}
						return null;
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
			],
			{
				onCancel: () => {
					throw new Error(red('✖') + ' Operation cancelled');
				},
			}
		);
	} catch (e) {
		console.log(e.message);
		return;
	}

	const { overwrite, packageName } = result;
	const root = path.join(cwd, targetDir);

	if (overwrite) {
		emptyDir(root);
	} else if (!fs.existsSync(root)) {
		fs.mkdirSync(root, { recursive: true });
	}

	console.log(`\nScaffolding project in ${root}...`);

	const templateDir = path.resolve(
		fileURLToPath(import.meta.url),
		'../..',
		`template`
	);
	const write = (file, content) => {
		const targetPath =
			file === '_gitignore'
				? path.join(root, '.gitignore')
				: path.join(root, file);
		if (content) {
			fs.writeFileSync(targetPath, content);
		} else {
			copy(path.join(templateDir, file), targetPath);
		}
	};

	const files = fs.readdirSync(templateDir);
	for (const file of files.filter((f) => f !== 'package.json')) {
		write(file);
	}
	const pkg = JSON.parse(
		fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8')
	);
	pkg.name = packageName || getProjectName();
	write('package.json', JSON.stringify(pkg, null, 2));

	console.log(green(`\nDone! Now run:\n`));
	if (root !== cwd) {
		console.log(`  cd ${path.relative(cwd, root)}`);
	}
	console.log('  npm install');
	console.log('  npm run dev');
	console.log();
})().catch((e) => console.error(e));
