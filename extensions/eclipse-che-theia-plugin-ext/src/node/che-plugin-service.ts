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

    private defaultRegistryURI: string;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);

        // this.pluginRegistryUrl = 'https://che-plugin-registry.openshift.io';
    }

    async getDefaultRegistryURI(): Promise<string> {
        if (this.defaultRegistryURI) {
            return this.defaultRegistryURI;
        }

        // console.log('>> get DEFAULT PLUGIN REGISTRY URI...');
        try {
            const workpsaceSettings: WorkspaceSettings = await this.cheApiService.getWorkspaceSettings();
            if (workpsaceSettings && workpsaceSettings['cheWorkspacePluginRegistryUrl']) {
                this.defaultRegistryURI = workpsaceSettings['cheWorkspacePluginRegistryUrl'];
                // console.log('>>> cheWorkspacePluginRegistryUrl: ' + pluginRegistryUrl);
                return this.defaultRegistryURI;
            }

            return Promise.reject('Plugin registry URI is not set.');
        } catch (error) {
            // console.log('ERROR', error);
            // return Promise.reject('Unable to get default plugin registry URI. ' + error.message);

            // A temporary solution. Should throw an error instead.
            this.defaultRegistryURI = 'https://che-plugin-registry.openshift.io';
            return this.defaultRegistryURI;
        }
    }

    /**
     * Returns a list of available plugins on the plugin registry.
     *
     * @param registryURI URI to the plugin registry
     * @return list of available plugins
     */
    async getPlugins(registryURI: string): Promise<ChePluginMetadata[]> {
        // ensure default plugin registry URI is set
        if (!this.defaultRegistryURI) {
            await this.getDefaultRegistryURI();
        }

        // all the plugins present on marketplace
        const marketplacePlugins = await this.loadPluginList(registryURI);
        if (!marketplacePlugins) {
            return Promise.reject('Unable to get plugins from marketplace');
        }

        const shortKeyFormat = registryURI === this.defaultRegistryURI;
        const plugins: ChePluginMetadata[] = await Promise.all(
            marketplacePlugins.map(async marketplacePlugin => {
                const pluginYamlURI = this.getPluginYampURI(registryURI, marketplacePlugin);
                return await this.loadPluginMetadata(pluginYamlURI, shortKeyFormat);
            }
            ));

        return plugins.filter(plugin => plugin !== null && plugin !== undefined);
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

    private async loadPluginMetadata(yamlURI: string, shortKeyFormat: boolean): Promise<ChePluginMetadata> {
        try {
            const noCache = { headers: { 'Cache-Control': 'no-cache' } };
            const data = (await this.axiosInstance.get<ChePluginMetadata[]>(yamlURI, noCache)).data;
            const props: ChePluginMetadata = yaml.safeLoad(data);

            const disabled: boolean = props.type === 'Che Editor';

            let key: string;
            if (shortKeyFormat) {
                key = props.id + ':' + props.version;
            } else {
                const suffix = `${props.id}/${props.version}/meta.yaml`;
                if (yamlURI.endsWith(suffix)) {
                    const uri = yamlURI.substring(0, yamlURI.length - suffix.length);
                    key = `${uri}${props.id}:${props.version}`;
                }
            }

            return {
                id: props.id,
                type: props.type,
                name: props.name,
                version: props.version,
                description: props.description,
                publisher: props.publisher,
                icon: props.icon,
                disabled: disabled,
                key: key
            };
        } catch (error) {
            console.log(error);
            return Promise.reject('Unable to load plugin metadata. ' + error.message);
        }
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
        console.log('Set workspace plugins...');
        console.log('----------------------------------------------------------------------------------');
        plugins.forEach(plugin => {
            console.log('> plugin > ' + plugin);
        });
        console.log('----------------------------------------------------------------------------------');

        const workspace: cheApi.workspace.Workspace = await this.cheApiService.currentWorkspace();
        if (workspace.config && workspace.config.attributes && workspace.config.attributes['plugins']) {
            workspace.config.attributes['plugins'] = plugins.join(',');
            await this.cheApiService.updateWorkspace(workspace.id, workspace);
        }
    }

    /**
     * Adds a plugin to workspace configuration.
     */
    async addPlugin(pluginKey: string): Promise<void> {
        try {
            const plugins: string[] = await this.getWorkspacePlugins();
            plugins.push(pluginKey);
            await this.setWorkspacePlugins(plugins);
        } catch (error) {
            // Uncomment following error output and rejection when the workspace service become ready
            // console.error(error);
            // return Promise.reject('Unable to install plugin ' + plugin + ' ' + error.message);
        }
    }

    /**
     * Removes a plugin from workspace configuration.
     */
    async removePlugin(pluginKey: string): Promise<void> {
        try {
            const plugins: string[] = await this.getWorkspacePlugins();
            const filteredPlugins = plugins.filter(p => p !== pluginKey);
            await this.setWorkspacePlugins(filteredPlugins);
        } catch (error) {
            // Uncomment following error output and rejection when the workspace service become ready
            // console.error(error);
            // return Promise.reject('Unable to remove plugin ' + plugin + ' ' + error.message);
        }
    }

}
