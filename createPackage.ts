// Copyright (c) 2022. Heusala Group Oy <info@heusalagroup.fi>. All rights reserved.

import { CreatePackageConfig } from "./types/CreatePackageConfig";
import {
    dirname as pathDirname,
    resolve as pathResolve
} from "path";
import { SyncFileUtils } from "../core/SyncFileUtils";
import { InstallConfig } from "pkg-install/lib/config";
import { PackageManagerType, parsePackageManagerType } from "./types/PackageManagerType";
import { getPackageManager, install } from "pkg-install";
import { initPackage } from "./initPackage";
import { camelCase, has, isEqual, map, reduce, uniq } from "../core/modules/lodash";
import { GitUtils } from "./GitUtils";
import { isReadonlyJsonObject } from "../core/Json";
import { LogService } from "../core/LogService";
import { GitSubmoduleConfig } from "./types/GitSubmoduleConfig";

const LOG = LogService.createLogger('createPackage');

export async function createPackage (
    config: CreatePackageConfig
) {

    let cwd: string = process.cwd();

    // Initialize the project directory
    const dirname = process.argv.slice(2).filter((arg: string) => !arg.startsWith("-")).shift();
    if ( dirname ) {
        const newCwd = pathResolve(cwd, dirname);
        LOG.debug(`Creating project directory: `, newCwd);
        SyncFileUtils.mkdirp(newCwd);
        process.chdir(newCwd);
        cwd = newCwd;
    }

    const packageSystem : PackageManagerType = config.getPreferredPackageSystem();

    // Initialize the package.json
    const installConfig: InstallConfig = {
        dev: false,
        exact: false,
        noSave: false,
        bundle: false,
        verbose: false,
        global: false,
        prefer: packageSystem === PackageManagerType.YARN ? "yarn" : "npm",
        stdio: "inherit",
        cwd: cwd
    };

    LOG.debug(`Initial install config: `, installConfig);
    const pkgManager: PackageManagerType = parsePackageManagerType( await getPackageManager(installConfig) );

    LOG.debug(`Initializing package.json using `, pkgManager);
    await initPackage(pkgManager);

    // Get information
    const packageJsonPath = pathResolve("package.json");
    if ( !SyncFileUtils.fileExists(packageJsonPath) ) {
        LOG.warn(`Warning! package.json did not exist: `, packageJsonPath);
        return;
    }

    config.setPackageDirectory( pathDirname(packageJsonPath) );

    const pkgDir = config.getPackageDirectory();
    const mainName = config.getMainName();

    const currentYear = (new Date().getFullYear());

    const replacements = {
        'GIT-ORGANISATION': config.getGitOrganization(),
        'ORGANISATION-NAME': config.getOrganizationName(),
        'ORGANISATION-EMAIL': config.getOrganizationEmail(),
        'CURRENT-YEAR': `${currentYear}`,
        'PROJECT-NAME': mainName,
        'projectName': camelCase(mainName)
    };

    const files = config.getFiles();
    const renameFiles = config.getRenameFiles();

    const directories = uniq(map(files, (item: string) => {
        let targetItem = item;
        if (has(renameFiles, item)) {
            targetItem = renameFiles[item];
        }
        return pathDirname(targetItem);
    }));

    const templatesDir = config.getTemplatesDirectory();

    // Create directories
    directories.forEach((item: string) => {
        const resolvedDir = pathResolve(pkgDir, item);
        LOG.debug(`Creating directory: `, resolvedDir);
        SyncFileUtils.mkdirp(resolvedDir);
    });

    // Initialize git
    LOG.debug(`Initializing git if necessary`);
    await GitUtils.initGit();

    // Copy files
    files.forEach((item: string) => {

        let targetItem = item;
        if (has(renameFiles, item)) {
            targetItem = renameFiles[item];
        }

        SyncFileUtils.copyTextFileWithReplacementsIfMissing(
            pathResolve(templatesDir, item),
            pathResolve(pkgDir, targetItem),
            replacements
        );

    });

    SyncFileUtils.copyTextFileWithReplacementsIfMissing(
        pathResolve(templatesDir, config.getMainSourceFileTemplate()),
        pathResolve(pkgDir, config.getMainSourceFileName()),
        replacements
    );

    // Update package.json
    const pkgJSON = SyncFileUtils.readJsonFile(packageJsonPath);
    if ( !isReadonlyJsonObject(pkgJSON) ) {
        throw new TypeError('package.json was invalid');
    }

    const packageJsonModifier = config.getPackageJsonModifier();
    const newPkgJson = packageJsonModifier(pkgJSON, config);

    if ( !isEqual(newPkgJson, pkgJSON) ) {
        SyncFileUtils.writeJsonFile(packageJsonPath, newPkgJson);
    } else {
        LOG.warn(`Warning! No changes to package.json detected`);
    }

    // Initialize git sub modules
    await reduce(
        config.getGitSubmodules(),
        async (prev: Promise<void>, config: GitSubmoduleConfig) : Promise<void> => {
            await prev;

            const {
                url,
                path,
                branch
            } = config;

            LOG.debug(
                `Initializing core git submodule from ${url} and branch ${branch} to ${path}`);
            await GitUtils.initSubModule(
                url,
                pathResolve('.', path),
                branch ?? 'main'
            );

        },
        Promise.resolve()
    );

    // Install packages
    const npmPackagesToInstall = config.getPackages();
    LOG.debug(`Installing packages: `, npmPackagesToInstall);
    await install( map(npmPackagesToInstall, (item : string) : string => item), installConfig );

    // Add files to git
    LOG.debug(`Adding files to git`);
    await GitUtils.addFiles([ "." ]);

    LOG.debug(`Initial git commit`);
    await GitUtils.commit(config.getGitCommitMessage());

    // Rename git branch
    const gitBranch = config.getGitBranch();
    LOG.debug(`Renaming main git branch to '${gitBranch}'`);
    await GitUtils.renameMainBranch(gitBranch);

}
