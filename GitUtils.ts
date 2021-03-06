// Copyright (c) 2022. Heusala Group Oy <info@heusalagroup.fi>. All rights reserved.

import {
    resolve as pathResolve,
    dirname as pathDirname
} from "path";
import { execa } from "execa";
import { SyncFileUtils } from "../core/SyncFileUtils";
import { LogService } from "../core/LogService";
import { isString } from "../core/modules/lodash";

const LOG = LogService.createLogger('GitUtils');

export class GitUtils {

    /**
     * Returns the git directory path
     *
     * @param filePath
     */
    static getGitDir (filePath: string): string | undefined {

        let dirPath: string = filePath;
        let newDirPath: string = dirPath;

        do {

            LOG.debug(`getGitDir: Searching git directory from `, dirPath);

            dirPath = newDirPath;

            if ( SyncFileUtils.fileExists(pathResolve(dirPath, '.git')) ) {
                return dirPath;
            }

            newDirPath = pathDirname(dirPath);

        } while ( newDirPath !== dirPath );

        return undefined;

    }

    static async initGit () {

        const currentGitDir = GitUtils.getGitDir(process.cwd());

        if ( !currentGitDir ) {
            LOG.debug(`Creating git directory`);
            await GitUtils._git([ "init" ]);
        } else {
            LOG.warn(`Warning! Git directory already exists: `, currentGitDir);
        }

    }

    static async addFiles (filePath: string | string[]) {

        const files = isString(filePath) ? [ filePath ] : filePath;

        LOG.debug(`addFiles: Adding files: `, filePath);
        await GitUtils._git([ "add", ...files ]);

    }

    static async commit (message: string) {

        LOG.debug(`commit with: `, message);
        await GitUtils._git([ "commit", '-m', message ]);

    }

    /**
     *
     * git branch -M main
     * @param newName
     */
    static async renameMainBranch (newName: string) {

        LOG.debug(`rename branch: `, newName);
        await GitUtils._git([ "branch", '-M', newName ]);

    }

    static async addSubModule (
        moduleUrl: string,
        modulePath: string
    ) {

        if ( !SyncFileUtils.fileExists(modulePath) ) {
            await GitUtils._git([ "submodule", 'add', moduleUrl, modulePath ]);
        } else {
            LOG.warn(`Warning! Git sub module directory already exists: `, modulePath);
        }

    }

    static async setSubModuleBranch (
        modulePath: string,
        moduleBranch: string
    ) {
        await GitUtils._git(
            [ "config", '-f', '.gitmodules', `submodule.${modulePath}.branch`, moduleBranch ]);
    }

    static async initSubModule (
        moduleUrl: string,
        modulePath: string,
        moduleBranch: string
    ) {

        const parentPath = pathDirname(modulePath);

        // mkdir -p src/fi/hg
        LOG.debug(`initSubModule: Creating: `, parentPath);
        SyncFileUtils.mkdirp(parentPath);

        // git submodule add git@github.com:sendanor/typescript.git src/fi/hg/ts
        LOG.debug(`initSubModule: Adding submodule: `, moduleUrl, modulePath);
        await GitUtils.addSubModule(moduleUrl, modulePath);

        // git config -f .gitmodules submodule.src/fi/hg/ts.branch main
        LOG.debug(
            `initSubModule: Configuring branch for `, moduleUrl, modulePath, ': ', moduleBranch);
        await GitUtils.setSubModuleBranch(modulePath, moduleBranch);

    }

    private static async _git (
        args: string[]
    ): Promise<void> {

        await execa(
            'git',
            args,
            {
                stdio: "inherit"
            }
        );

    }

}
