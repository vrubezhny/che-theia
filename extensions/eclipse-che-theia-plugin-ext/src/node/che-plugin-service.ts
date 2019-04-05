/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { ChePluginService, ChePluginMetadata } from '../common/che-protocol';
import { injectable, interfaces } from 'inversify';
import axios, { AxiosInstance } from 'axios';

// const { yaml } = require('js-yaml');
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

    //                            https://che-plugin-registry.openshift.io"
    // private baseURL: string = 'https://che-plugin-registry.openshift.io/';

    // private pluginsURL: string = 'plugins/';

    constructor(container: interfaces.Container) {
        console.log('> CREATING CHE PLUGIN SERVICE IMPL');
    }

    private async getBaseURL(): Promise<string> {
        return 'https://che-plugin-registry.openshift.io';
    }

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
        const getPluginsRequest = await this.axiosInstance.request<ChePluginMetadataInternal[]>({
            method: 'GET',
            baseURL: await this.getBaseURL(),
            url: '/plugins/'
        });

        if (getPluginsRequest.status === 200) {
            return getPluginsRequest.data;
        }

        return [];
    }

    /**
     * Loads plugin metadata
     */
    private async getChePluginMetadata(pluginYamlURL: string): Promise<ChePluginMetadata | undefined> {
        if (pluginYamlURL) {
            try {
                const request = await this.axiosInstance.request<ChePluginMetadata[]>({
                    method: 'GET',
                    baseURL: await this.getBaseURL(),
                    url: pluginYamlURL
                });

                if (request.status === 200) {
                    const props: ChePluginMetadata = yaml.safeLoad(request.data);

                    return {
                        id: props.id,
                        type: props.type,
                        name: props.name,
                        version: props.version,
                        description: props.description,
                        publisher: props.publisher,
                        icon: props.icon
                    };
                }
            } catch (error) {
                console.log(error);
            }
        }

        return undefined;
    }

    /**
     * Loads content of plugin icon
     */
    async getPluginIcon(iconURL: string): Promise<string | undefined> {
        const iconContent = await this.axiosInstance.get<string>(iconURL);
        if (iconContent.status === 200) {
            return iconContent.data;
        }

        return undefined;
    }

}
