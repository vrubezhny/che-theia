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
import URI from '@theia/core/lib/common/uri';

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

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);

        // this.pluginRegistryUrl = 'https://che-plugin-registry.openshift.io';
    }

    async getDefaultPluginRegistryURI(): Promise<string> {
        console.log('>> get DEFAULT PLUGIN REGISTRY URI...');
        try {
            const workpsaceSettings: WorkspaceSettings = await this.cheApiService.getWorkspaceSettings();
            if (workpsaceSettings && workpsaceSettings['cheWorkspacePluginRegistryUrl']) {
                const pluginRegistryUrl = workpsaceSettings['cheWorkspacePluginRegistryUrl'];
                console.log('>>> cheWorkspacePluginRegistryUrl: ' + pluginRegistryUrl);
                return pluginRegistryUrl;
            }

            return Promise.reject('Plugin registry URI is not set.');
        } catch (error) {
            console.log('ERROR', error);
            // return Promise.reject('Unable to get default plugin registry URI. ' + error.message);

            // A temporary solution. Should throw an error instead.
            return 'https://che-plugin-registry.openshift.io';
        }
    }

    /**
     * Returns a list of available plugins on the plugin registry.
     *
     * @param registryURI URI to the plugin registry
     * @return list of available plugins
     */
    async getPlugins(registryURI: string): Promise<ChePluginMetadata[]> {
        const marketplacePlugins = await this.loadPluginList(registryURI);
        // const marketplacePlugins = await this.getPluginsFromMarketplace();
        if (!marketplacePlugins) {
            return Promise.reject('Unable to get plugins from marketplace');
        }

        console.log('> MARKETPLACE PLUGINS > ', marketplacePlugins);

        const plugins: ChePluginMetadata[] = await Promise.all(
            marketplacePlugins.map(async marketplacePlugin => {
                const pluginYamlURI = this.getPluginYampURI(registryURI, marketplacePlugin);
                return await this.loadPluginMetadata(pluginYamlURI);
            }
            ));

        // console.log('================================================================================');
        // console.log('> plugins ', plugins);
        const filteredPlugins = plugins.filter(plugin => plugin !== null && plugin !== undefined);
        // console.log('================================================================================');
        return filteredPlugins;
    }

    /**
     * Loads list of plugins from plugin registry.
     *
     * @param registryURI URI to the plugin registry
     * @return list of available plugins
     */
    private async loadPluginList(registryURI: string): Promise<ChePluginMetadataInternal[] | undefined> {
        const axiosInstance = this.axiosInstance;

        const load = async function (url: string): Promise<ChePluginMetadataInternal[] | undefined> {
            try {
                const noCache = { headers: { 'Cache-Control': 'no-cache' } };
                return (await axiosInstance.get<ChePluginMetadataInternal[]>(url, noCache)).data;
            } catch (error) {
                return undefined;
            }
        };

        let plugins = await load(`${registryURI}/plugins/`);
        if (!plugins) {
            plugins = await load(`${registryURI}/plugins/plugins.json`);
        }

        return plugins;
    }

    /**
     * Creates an URI to plugin metadata yaml file.
     *
     * @param registryURI URI to the plugin registry
     * @param plugin plugin metadata
     * @return uri to plugin yaml file
     */
    private getPluginYampURI(registryURI: string, plugin: ChePluginMetadataInternal): string | undefined {
        if (plugin.links && plugin.links.self) {
            const self: string = plugin.links.self;
            if (self.startsWith('/')) {
                // /vitaliy-guliy/che-theia-plugin-registry/master/plugins/org.eclipse.che.samples.hello-world-frontend-plugin/0.0.1/meta.yaml
                const uri = new URI(registryURI);
                return `${uri.scheme}://${uri.authority}${self}`;
            } else {
                // org.eclipse.che.samples.hello-world-frontend-plugin/0.0.1/meta.yaml
                return `${registryURI}/plugins/${self}`;
            }

        } else {
            return `${registryURI}/plugins/${plugin.id}/${plugin.version}/meta.yaml`;
        }
    }

    private async loadPluginMetadata(yamlURI: string): Promise<ChePluginMetadata> {
        try {
            const noCache = { headers: { 'Cache-Control': 'no-cache' } };
            const data = (await this.axiosInstance.get<ChePluginMetadata[]>(yamlURI, noCache)).data;
            const props: ChePluginMetadata = yaml.safeLoad(data);

            const disabled: boolean = props.type === 'Che Editor';

            const installId: string = 'vetal';

            return {
                id: props.id,
                type: props.type,
                name: props.name,
                version: props.version,
                description: props.description,
                publisher: props.publisher,
                icon: props.icon,
                disabled: disabled,
                installId: installId
            };
        } catch (error) {
            console.log(error);
            return Promise.reject('Unable to load plugin metadata. ' + error.message);
        }
    }

    // /**
    //  * Loads plugin metadata
    //  */
    // private async getChePluginMetadata(pluginYamlURL: string): Promise<ChePluginMetadata | undefined> {
    //     const baseURL = await this.getBaseURL();
    //     if (pluginYamlURL && baseURL) {
    //         try {
    //             const request = await this.axiosInstance.request<ChePluginMetadata[]>({
    //                 method: 'GET',
    //                 baseURL: baseURL,
    //                 url: pluginYamlURL
    //             });

    //             if (request.status === 200) {
    //                 const props: ChePluginMetadata = yaml.safeLoad(request.data);

    //                 const disabled: boolean = props.type === 'Che Editor';

    //                 return {
    //                     id: props.id,
    //                     type: props.type,
    //                     name: props.name,
    //                     version: props.version,
    //                     description: props.description,
    //                     publisher: props.publisher,
    //                     icon: props.icon,
    //                     disabled: disabled
    //                 };
    //             }
    //         } catch (error) {
    //             console.log(error);
    //         }
    //     }

    //     return undefined;
    // }

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
