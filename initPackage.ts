// Copyright (c) 2022. Heusala Group Oy <info@heusalagroup.fi>. All rights reserved.

import { execa } from "execa";
import { LogService } from "../core/LogService";
import { PackageManagerType } from "./types/PackageManagerType";

const LOG = LogService.createLogger('initPackage');

/**
 *
 * @param pkgManager
 */
export async function initPackage (pkgManager : PackageManagerType) : Promise<void> {
    const args = process.argv.slice(2).filter((arg : string) => arg.startsWith("-"));
    LOG.debug(`Executing: `, pkgManager, "init", ...args);
    await execa(
        pkgManager,
        [ "init", ...args ],
        {
            stdio: "inherit"
        }
    );
}

