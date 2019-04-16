/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheApiService, ChePluginService, ChePluginMetadata, WorkspaceSettings } from '../common/che-protocol';
import { injectable, interfaces } from 'inversify';
import axios, { AxiosInstance } from 'axios';
import { che as cheApi } from '@eclipse-che/api';

const yaml = require('js-yaml');

export interface ChePluginMetadataInternal {
    id: string,
    version: string,
    type: string,
    name: string,
    description: string,
    links: {
        self?: string,
        [link: string]: string
    }
}

@injectable()
export class ChePluginServiceImpl implements ChePluginService {

    private axiosInstance: AxiosInstance = axios;

    private cheApiService: CheApiService;

    private pluginRegistryUrl: string | undefined;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);

        this.pluginRegistryUrl = 'https://che-plugin-registry.openshift.io';
    }

    private async getBaseURL(): Promise<string | undefined> {
        if (this.pluginRegistryUrl) {
            return this.pluginRegistryUrl;
        }

        if (this.cheApiService) {
            try {
                const workpsaceSettings: WorkspaceSettings = await this.cheApiService.getWorkspaceSettings();
                if (workpsaceSettings && workpsaceSettings['cheWorkspacePluginRegistryUrl']) {
                    this.pluginRegistryUrl = workpsaceSettings['cheWorkspacePluginRegistryUrl'];
                    return this.pluginRegistryUrl;
                }
            } catch (error) {
                console.error(error);
            }
        }

        return undefined;
    }

    /**
     * Returns a list of available plugins.
     */
    async getPlugins(): Promise<ChePluginMetadata[]> {
        const marketplacePlugins = await this.getPluginsFromMarketplace();

        const plugins: ChePluginMetadata[] = await Promise.all(
            marketplacePlugins.map(async marketplacePlugin =>
                await this.getChePluginMetadata(marketplacePlugin.links.self)
            ));

        return plugins;
    }

    /**
     * Loads list of plugins from the marketplace
     */
    private async getPluginsFromMarketplace(): Promise<ChePluginMetadataInternal[]> {
        const baseURL = await this.getBaseURL();
        if (baseURL) {
            const getPluginsRequest = await this.axiosInstance.request<ChePluginMetadataInternal[]>({
                method: 'GET',
                baseURL: baseURL,
                url: '/plugins/'
            });

            if (getPluginsRequest.status === 200) {
                return getPluginsRequest.data;
            }
        }

        return [];
    }

    /**
     * Loads plugin metadata
     */
    private async getChePluginMetadata(pluginYamlURL: string): Promise<ChePluginMetadata | undefined> {
        const baseURL = await this.getBaseURL();
        if (pluginYamlURL && baseURL) {
            try {
                const request = await this.axiosInstance.request<ChePluginMetadata[]>({
                    method: 'GET',
                    baseURL: baseURL,
                    url: pluginYamlURL
                });

                if (request.status === 200) {
                    const props: ChePluginMetadata = yaml.safeLoad(request.data);

                    const disabled: boolean = props.type === 'Che Editor';

                    return {
                        id: props.id,
                        type: props.type,
                        name: props.name,
                        version: props.version,
                        description: props.description,
                        publisher: props.publisher,
                        icon: props.icon,
                        disabled: disabled
                    };
                }
            } catch (error) {
                console.log(error);
            }
        }

        return undefined;
    }

    /**
     * Returns list of plugins described in workspace configuration.
     */
    async getWorkspacePlugins(): Promise<string[]> {
        const workspace: cheApi.workspace.Workspace = await this.cheApiService.currentWorkspace();

        if (workspace.config && workspace.config.attributes && workspace.config.attributes['plugins']) {
            const plugins = workspace.config.attributes['plugins'];
            return plugins.split(',');
        }

        return Promise.reject('Unable to get Workspace plugins');
    }

    /**
     * Sets new list of plugins to workspace configuration.
     */
    async setWorkspacePlugins(plugins: string[]): Promise<void> {
        const workspace: cheApi.workspace.Workspace = await this.cheApiService.currentWorkspace();
        const workspaceId = workspace.id;

        if (workspace.config && workspace.config.attributes && workspace.config.attributes['plugins']) {
            workspace.config.attributes['plugins'] = plugins.join(',');

            await this.cheApiService.updateWorkspace(workspaceId, workspace);
        }
    }

    /**
     * Adds a plugin to workspace configuration.
     */
    async addPlugin(plugin: string): Promise<void> {
        try {
            const plugins: string[] = await this.getWorkspacePlugins();
            plugins.push(plugin);
            await this.setWorkspacePlugins(plugins);
        } catch (error) {
            console.error(error);
            return Promise.reject('Unable to install plugin ' + plugin + ' ' + error.message);
        }
    }

    /**
     * Removes a plugin from workspace configuration.
     */
    async removePlugin(plugin: string): Promise<void> {
        try {
            const plugins: string[] = await this.getWorkspacePlugins();
            const filteredPlugins = plugins.filter(p => p !== plugin);
            await this.setWorkspacePlugins(filteredPlugins);
        } catch (error) {
            console.error(error);
            return Promise.reject('Unable to remove plugin ' + plugin + ' ' + error.message);
        }
    }

}
