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
import { ChePluginMetadata } from '../../common/che-protocol';
import { ChePluginFrontendService } from './che-plugin-frontend-service';

@injectable()
export class ChePluginWidget extends ReactWidget {

    protected plugins: ChePluginMetadata[] = [];

    protected readonly toDisposeOnFetch = new DisposableCollection();
    protected readonly toDisposeOnSearch = new DisposableCollection();
    protected ready = false;

    protected needToBeRendered = true;

    constructor(
        @inject(ChePluginFrontendService) protected chePluginFrontendService: ChePluginFrontendService
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
        this.plugins = await this.chePluginFrontendService.getPlugins();

        console.log('CLIENT WIDGET. PLUGINS: ', this.plugins);

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
        const list = this.plugins.map(plugin =>
            <ChePlugin key={plugin.id + ':' + plugin.version} plugin={plugin} pluginService={this.chePluginFrontendService}></ChePlugin>);

        return <div className='che-plugin-list'>
            {list}
        </div>;
    }

}

export class ChePlugin extends React.Component<ChePlugin.Props, ChePlugin.State> {

    constructor(props: ChePlugin.Props) {
        super(props);

        const plugin = props.plugin;
        const state = props.pluginService.isPluginInstalled(plugin) ? 'installed' : 'not_installed';

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
            <div className='che-plugin-content'>
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
            </div>
        </div>;
    }

    protected renderPluginAction(plugin: ChePluginMetadata): React.ReactNode {
        if (plugin.disabled) {
            return undefined;
        }

        switch (this.state.pluginState) {
            case 'installed':
                return <div className='che-plugin-action-remove' onClick={this.removePlugin}>Installed</div>;
            case 'installing':
                return <div className='che-plugin-action-installing'>Installing...</div>;
            case 'removing':
                return <div className='che-plugin-action-removing'>Removing...</div>;
        }

        // 'not_installed'
        return <div className='che-plugin-action-add' onClick={this.installPlugin}>Install</div>;
    }

    protected set(state: ChePluginState): void {
        this.setState({
            pluginState: state
        });
    }

    protected installPlugin = async () => {
        const previousState = this.state.pluginState;
        this.set('installing');

        const installed = await this.props.pluginService.install(this.id());
        if (installed) {
            this.set('installed');
        } else {
            this.set(previousState);
        }
    }

    protected removePlugin = async () => {
        const previousState = this.state.pluginState;
        this.set('removing');

        const removed = await this.props.pluginService.remove(this.id());
        if (removed) {
            this.set('not_installed');
        } else {
            this.set(previousState);
        }
    }

}

export type ChePluginState =
    'not_installed'
    | 'installed'
    | 'installing'
    | 'removing';

export namespace ChePlugin {

    export interface Props {
        pluginService: ChePluginFrontendService;
        plugin: ChePluginMetadata;
    }

    export interface State {
        pluginState: ChePluginState;
    }

}
