/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { CommandRegistry, CommandContribution } from '@theia/core/lib/common';
// import { MessageService } from '@theia/core/lib/common/message-service';
import { MessageService, Command } from '@theia/core/lib/common';
import { ChePluginRegistry } from '../../common/che-protocol';
import { ChePluginManager } from './che-plugin-manager';

const PLUGIN_MANAGER_ID = 'plugin-manager';
const PLUGIN_MANAGER_CATEGORY = 'Plugin Manager';

export const ADD_REGISTRY: Command = {
    id: `${PLUGIN_MANAGER_ID}:add-registry`,
    category: PLUGIN_MANAGER_CATEGORY,
    label: 'ADD Registry'
};

export const OPEN_REGISTRY: Command = {
    id: `${PLUGIN_MANAGER_ID}:open-registry`,
    category: PLUGIN_MANAGER_CATEGORY,
    label: 'Open Registry'
};

export const LIST_DEFAULT_REGISTRY: Command = {
    id: `${PLUGIN_MANAGER_ID}:list-default-registry`,
    category: PLUGIN_MANAGER_CATEGORY,
    label: 'List Default Registry'
};

export const LIST_CUSTOM_REGISTRY: Command = {
    id: `${PLUGIN_MANAGER_ID}:list-custom-registry`,
    category: PLUGIN_MANAGER_CATEGORY,
    label: 'List Custom Registry'
};

@injectable()
export class ChePluginCommandContribution implements CommandContribution {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(ChePluginManager)
    protected readonly chePluginManager: ChePluginManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(ADD_REGISTRY, {
            execute: () => this.addPluginRegistry()
        });

        commands.registerCommand(OPEN_REGISTRY, {
            execute: () => this.openPluginRegistry()
        });

        commands.registerCommand(LIST_DEFAULT_REGISTRY, {
            execute: () => this.listDefaultRegistry()
        });

        commands.registerCommand(LIST_CUSTOM_REGISTRY, {
            execute: () => this.listCustomRegistry()
        });
    }

    async addPluginRegistry(): Promise<void> {
        this.messageService.info(`${PLUGIN_MANAGER_CATEGORY}: Add Plugin Registry...`);
    }

    async openPluginRegistry(): Promise<void> {
        this.messageService.info(`${PLUGIN_MANAGER_CATEGORY}: Open Plugin Registry...`);
    }

    async listDefaultRegistry(): Promise<void> {
        // const default: ChePluginRegistry = this.chePluginFrontendService.getDefaultRegistry();
        // console.log('> default registry ', default);
        // this.chePluginFrontendService.changeRegistry(default);
        const defaultRegistry = this.chePluginManager.getDefaultRegistry();
        console.log('> defaultRegistry ', defaultRegistry);
        this.chePluginManager.changeRegistry(defaultRegistry);
    }

    async listCustomRegistry(): Promise<void> {
        const custom: ChePluginRegistry = {
            name: 'My registry',
            uri: 'https://raw.githubusercontent.com/vitaliy-guliy/che-theia-plugin-registry/master'
            // 'https://raw.githubusercontent.com/vitaliy-guliy/che-theia-plugin-registry/master/plugins/plugins.json'
            // 'https://raw.githubusercontent.com/vitaliy-guliy/che-theia-plugin-registry/master/plugins/my.json'
            // 'https://raw.githubusercontent.com/vitaliy-guliy/che-theia-plugin-registry/master/alternative.json'
        };

        this.chePluginManager.changeRegistry(custom);
    }

}
