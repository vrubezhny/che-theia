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
import { Message } from '@phosphor/messaging';
import { DisposableCollection } from '@theia/core';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import * as React from 'react';
import { ChePluginMetadata, ChePluginService } from '../../common/che-protocol';

export interface PluginVirtualService {

    isPluginInstalled(plugin: ChePluginMetadata): boolean;

}

@injectable()
export class ChePluginWidget extends ReactWidget implements PluginVirtualService {

    private installedPlugins: string[] = [];

    protected plugins: ChePluginMetadata[] = [];

    protected readonly toDisposeOnFetch = new DisposableCollection();
    protected readonly toDisposeOnSearch = new DisposableCollection();
    protected ready = false;

    protected needToBeRendered = true;

    constructor(
        @inject(ChePluginService) protected readonly chePluginService: ChePluginService
    ) {
        super();
        this.id = 'che-plugins';
        this.title.label = 'Che Plugins';
        this.title.caption = 'Che Plugins';
        this.title.iconClass = 'fa che-plugins-tab-icon';
        this.title.closable = true;
        this.addClass('theia-plugins');

        this.node.tabIndex = 0;
    }

    protected onAfterShow(msg: Message) {
        super.onAfterShow(msg);

        if (this.needToBeRendered) {
            this.needToBeRendered = false;

            this.update();
            this.updatePlugins();
        }
    }

    protected onActivateRequest(msg: Message) {
        super.onActivateRequest(msg);

        this.node.focus();
    }

    protected async updatePlugins(): Promise<void> {
        this.installedPlugins = await this.chePluginService.getInstalledPlugins();
        console.log('-------------------------------------------------------------------------');
        console.log(this.installedPlugins);
        console.log('-------------------------------------------------------------------------');

        this.plugins = await this.chePluginService.getPlugins();

        this.ready = true;
        this.update();
    }

    protected render(): React.ReactNode {
        if (this.ready) {
            if (!this.plugins.length) {
                return <AlertMessage type='INFO' header='No plugins currently available.' />;
            }

            return <React.Fragment>
                {this.renderPluginList()}
            </React.Fragment>;
        } else {
            return <div className='spinnerContainer'>
                <div className='fa fa-spinner fa-pulse fa-3x fa-fw'></div>
            </div>;
        }
    }

    protected renderPluginList(): React.ReactNode {
        const instance = this;

        const list = this.plugins.map(plugin =>
            <ChePlugin key={plugin.id + ':' + plugin.version} plugin={plugin} service={instance}></ChePlugin>);

        return <div className='che-plugin-list'>
            {list}
        </div>;
    }

    isPluginInstalled(plugin: ChePluginMetadata): boolean {
        const key = plugin.id + ':' + plugin.version;
        const index = this.installedPlugins.indexOf(key);
        return index >= 0;
    }

}

export class ChePlugin extends React.Component<ChePlugin.Props, ChePlugin.State> {

    constructor(props: ChePlugin.Props) {
        super(props);

        const plugin = props.plugin;
        const state = props.service.isPluginInstalled(plugin) ? 'installed' : 'not_installed';

        this.state = {
            pluginState: state
        };
    }

    id(): string {
        return this.props.plugin.id + ':' + this.props.plugin.version;
    }

    render(): React.ReactNode {
        const plugin = this.props.plugin;

        return <div key={plugin.id} className='che-plugin'>
            <div className='che-plugin-icon'>
                <img src={plugin.icon}></img>
            </div>
            <div className='che-plugin-info'>
                <div className='che-plugin-title'>
                    <div className='che-plugin-name'>{plugin.name}</div>
                    <div className='che-plugin-version'>{plugin.version}</div>
                </div>
                <div className='che-plugin-description'>
                    <div>
                        <div>{plugin.description}</div>
                    </div>
                </div>
                <div className='che-plugin-publisher'>
                    {plugin.publisher}
                    <span className='che-plugin-type'>{plugin.type}</span>
                </div>
                {this.renderPluginAction(plugin)}
            </div>
        </div>;
    }

    protected renderPluginAction(plugin: ChePluginMetadata): React.ReactNode {
        if (this.state.pluginState === 'installing' || this.state.pluginState === 'installed') {
            return <div className='che-plugin-action-remove' onClick={this.uninstallPlugin}>Installed</div>;
        }

        return <div className='che-plugin-action-add' onClick={this.installPlugin}>Install</div>;
    }

    protected installPlugin = async () => {
        console.log('> INSTALL plugin ' + this.id());

        this.setState({
            pluginState: 'installing'
        });
    }

    protected uninstallPlugin = async () => {
        console.log('> UNINSTALL plugin ' + this.id());

        this.setState({
            pluginState: 'uninstalling'
        });
    }

}

export type ChePluginState =
    'not_installed'
    | 'installed'
    | 'installing'
    | 'uninstalling';

export namespace ChePlugin {

    export interface Props {
        service: PluginVirtualService;
        plugin: ChePluginMetadata;
    }

    export interface State {
        pluginState: ChePluginState;
    }

}
