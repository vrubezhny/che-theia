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

import {
    ChePluginRegistry,
    ChePluginMetadata,
    ChePluginService,
    CheApiService
} from '../../common/che-protocol';

import { HostedPluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { MessageService, Emitter, Event } from '@theia/core/lib/common';

@injectable()
export class ChePluginManager {

    /**
     * Default plugin registry
     */
    private defaultRegistry: ChePluginRegistry;

    /**
     * Active plugin registry.
     * Plugin widget should display the list of plugins from this registry.
     */
    private activeRegistry: ChePluginRegistry;

    /**
     * List of plugins configured in workspace config.
     */
    private workspacePlugins: string[];

    /**
     * List of plugins, currently available on active plugin registry.
     */
    private availablePlugins: ChePluginMetadata[] = [];

    @inject(ChePluginService)
    protected readonly chePluginService: ChePluginService;

    @inject(HostedPluginServer)
    protected readonly hostedPluginServer: HostedPluginServer;

    @inject(CheApiService)
    protected readonly cheApiService: CheApiService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    protected readonly pluginRegistryChanged = new Emitter<ChePluginRegistry>();

    protected readonly workspaceConfigurationChanged = new Emitter<boolean>();

    get onPluginRegistryChanged(): Event<ChePluginRegistry> {
        return this.pluginRegistryChanged.event;
    }

    get onWorkspaceConfigurationChanged(): Event<boolean> {
        return this.workspaceConfigurationChanged.event;
    }

    getDefaultRegistry(): ChePluginRegistry {
        return this.defaultRegistry;
    }

    changeRegistry(registry: ChePluginRegistry): void {
        this.activeRegistry = registry;
        this.pluginRegistryChanged.fire(registry);
    }

    private async initDefaults(): Promise<void> {
        if (!this.defaultRegistry) {
            this.defaultRegistry = await this.chePluginService.getDefaultRegistry();

            // const defaultRegistryURI = await this.chePluginService.getDefaultRegistryURI();
            // this.defaultRegistry = {
            //     name: 'Default',
            //     uri: defaultRegistryURI
            // };
        }

        if (!this.activeRegistry) {
            this.activeRegistry = this.defaultRegistry;
        }

        if (!this.workspacePlugins) {
            // Get list of plugins from workspace config
            this.workspacePlugins = await this.chePluginService.getWorkspacePlugins();
        }
    }

    /**
     * Returns plugin list from active registry
     */
    async getPlugins(): Promise<ChePluginMetadata[]> {
        // get list of deployed plugins from runtime
        // will be used in the future
        // const metadata = await this.hostedPluginServer.getDeployedMetadata();

        await this.initDefaults();

        this.availablePlugins = await this.chePluginService.getPlugins(this.activeRegistry);

        // console.log('----------------------------------------------------------------------------------');
        // this.availablePlugins.forEach(plugin => {
        //     console.log('> plugin > ' + plugin.key);
        // });
        // console.log('----------------------------------------------------------------------------------');

        return this.availablePlugins;
    }

    isPluginInstalled(plugin: ChePluginMetadata): boolean {
        // const key = plugin.id + ':' + plugin.version;
        // const index = this.workspacePlugins.indexOf(plugin.key);
        // return index >= 0;
        return this.workspacePlugins.indexOf(plugin.key) >= 0;
    }

    async install(plugin: ChePluginMetadata): Promise<boolean> {
        this.messageService.info(`Installing plugin ${plugin.name}:${plugin.version}...`);

        try {
            await this.delay(1000);
            await this.chePluginService.addPlugin(plugin.key);
            await this.delay(1000);

            this.messageService.info(`Plugin ${plugin.name}:${plugin.version} has been successfully installed`);
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to install plugin ${plugin.name}:${plugin.version}. ${error.message}`);
            return false;
        }
    }

    async remove(plugin: ChePluginMetadata): Promise<boolean> {
        this.messageService.info(`Removing plugin ${plugin.name}:${plugin.version}...`);

        try {
            await this.delay(1000);
            await this.chePluginService.removePlugin(plugin.key);
            await this.delay(1000);

            this.messageService.info(`Plugin ${plugin.name}:${plugin.version} has been successfully removed`);
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to remove plugin ${plugin.name}:${plugin.version}. ${error.message}`);
            return false;
        }
    }

    async delay(miliseconds: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, miliseconds);
        });
    }

    private notifyWorkspaceConfigurationChanged() {
        setTimeout(() => {
            this.workspaceConfigurationChanged.fire(true);
        }, 500);
    }

    async restartWorkspace(): Promise<void> {
        this.messageService.info('Workspace is restarting...');

        try {
            await this.cheApiService.stop();
            this.messageService.info('Workspace stopped!');

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            this.messageService.error(`Unable to restart your workspace. ${error.message}`);
        }
    }

}
