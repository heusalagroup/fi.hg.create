// Copyright (c) 2022. Heusala Group Oy <info@heusalagroup.fi>. All rights reserved.

import { GitSubmoduleConfig, isGitSubmoduleConfig } from "./GitSubmoduleConfig";
import {
    hasNoOtherKeys,
    isArrayOfOrUndefined,
    isRegularObject,
    isString
} from "../../core/modules/lodash";

export interface CreatePackageConfigDataObject {

    readonly preferredPackageSystem ?: string;
    readonly gitOrganization        ?: string;
    readonly organizationName       ?: string;
    readonly organizationEmail      ?: string;
    readonly sourceDir              ?: string;
    readonly templatesDir           ?: string;
    readonly buildDir               ?: string;
    readonly mainSourceFileTemplate ?: string;
    readonly gitCommitMessage       ?: string;
    readonly gitBranch              ?: string;
    readonly files                  ?: readonly string[];
    readonly packages               ?: readonly string[];
    readonly gitSubmodules          ?: readonly GitSubmoduleConfig[];

}

export function isCreatePackageConfigDataObject (value: any): value is CreatePackageConfigDataObject {
    return (
        isRegularObject(value)
        && hasNoOtherKeys(value, [
            'preferredPackageSystem',
            'gitOrganization',
            'organizationName',
            'organizationEmail',
            'sourceDir',
            'templatesDir',
            'buildDir',
            'mainSourceFileTemplate',
            'gitCommitMessage',
            'gitBranch',
            'files',
            'packages',
            'gitSubmodules',
        ])
        && isString(value?.preferredPackageSystem)
        && isString(value?.gitOrganization)
        && isString(value?.organizationName)
        && isString(value?.organizationEmail)
        && isString(value?.sourceDir)
        && isString(value?.templatesDir)
        && isString(value?.buildDir)
        && isString(value?.mainSourceFileTemplate)
        && isString(value?.gitCommitMessage)
        && isString(value?.gitBranch)
        && isArrayOfOrUndefined(value?.files, isString)
        && isArrayOfOrUndefined(value?.packages, isString)
        && isArrayOfOrUndefined(value?.gitSubmodules, isGitSubmoduleConfig)
    );
}

export function stringifyCreatePackageConfigDataObject (value: CreatePackageConfigDataObject): string {
    return `CreatePackageConfigDataObject(${value})`;
}

export function parseCreatePackageConfigDataObject (value: any): CreatePackageConfigDataObject | undefined {
    if ( isCreatePackageConfigDataObject(value) ) return value;
    return undefined;
}
