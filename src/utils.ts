import fs from 'node:fs';
import path from 'node:path';

export function matchesPatterns(
    str: string,
    matchPatterns: (string | RegExp)[]
) {
    if (!Array.isArray(matchPatterns)) return false;
    const patterns = matchPatterns
        .filter((p) => p instanceof RegExp || typeof p === 'string')
        .map((p) => (p instanceof RegExp ? p : new RegExp(p)));
    return patterns.some((p) => p.test(str));
}

export function copy(
    src: string,
    dest: string,
    excludePatterns?: (string | RegExp)[]
) {
    if (excludePatterns && matchesPatterns(src, excludePatterns)) return;
    fs.statSync(src).isDirectory()
        ? copyDir(src, dest, excludePatterns)
        : fs.copyFileSync(src, dest);
}
export function copyDir(
    srcDir: string,
    destDir: string,
    excludePatterns?: (string | RegExp)[]
) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
        const srcFile = path.resolve(srcDir, file);
        const destFile = path.resolve(destDir, file);
        copy(srcFile, destFile, excludePatterns);
    }
}
export function formatTargetDir(targetDir: string | undefined) {
    return targetDir?.trim().replace(/\/+$/g, '') || '';
}
export function isEmpty(path: string) {
    const files = fs.readdirSync(path);
    return files.length === 0 || (files.length === 1 && files[0] === '.git');
}
export function emptyDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
        if (file === '.git') continue;
        fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
    }
}
export function isValidPackageName(projectName: string) {
    return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
        projectName
    );
}
export function toValidPackageName(projectName: string) {
    return projectName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/^[._]/, '')
        .replace(/[^a-z0-9-~]+/g, '-');
}
