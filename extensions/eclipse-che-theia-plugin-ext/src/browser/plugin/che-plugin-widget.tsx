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

// import { injectable } from 'inversify';
import { injectable, inject } from 'inversify';
import { Message } from '@phosphor/messaging';
import { DisposableCollection } from '@theia/core';
// import { OpenerService } from '@theia/core/lib/browser';
// import { HostedPluginServer, PluginMetadata } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import * as React from 'react';
import { ChePluginMetadata, ChePluginService } from '../../common/che-protocol';

@injectable()
export class ChePluginWidget extends ReactWidget {

    protected plugins: ChePluginMetadata[] = [];

    protected readonly toDisposeOnFetch = new DisposableCollection();
    protected readonly toDisposeOnSearch = new DisposableCollection();
    protected ready = false;

    constructor(
        // @inject(HostedPluginServer) protected readonly hostedPluginServer: HostedPluginServer,
        // @inject(OpenerService) protected readonly openerService: OpenerService
        @inject(ChePluginService) protected readonly chePluginService: ChePluginService
    ) {
        super();
        this.id = 'che-plugins';
        this.title.label = 'Che Plugins';
        this.title.caption = 'Che Plugins';
        // this.title.iconClass = 'fa fa-check-square';
        this.title.iconClass = 'fa che-plugins-tab-icon';
        this.title.closable = true;
        this.addClass('theia-plugins');

        this.update();

        this.fetchPlugins();

        console.log('> che plugin service ', chePluginService);
    }

    protected onActivateRequest(msg: Message) {
        super.onActivateRequest(msg);
        // this.fetchPlugins();
        this.node.focus();
    }

    // public refreshPlugins(): void {
    //     this.fetchPlugins();
    // }

    protected async sleep(miliseconds: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, miliseconds);
        });
    }

    protected async fetchPlugins(): Promise<ChePluginMetadata[]> {
        // await this.sleep(3000);

        this.plugins = await this.chePluginService.getPlugins();

        this.ready = true;
        this.update();

        return this.plugins;
    }

    protected render(): React.ReactNode {
        console.log('>>> RENDER !!!');

        if (this.ready) {
            if (!this.plugins.length) {
                return <AlertMessage type='INFO' header='No plugins currently available.' />;
            }
            return <React.Fragment>
                {this.renderPluginList()}
                {this.renderUpdateButton()}
            </React.Fragment>;
        } else {
            return <div className='spinnerContainer'>
                <div className='fa fa-spinner fa-pulse fa-3x fa-fw'></div>
            </div>;
        }
    }

    protected renderUpdateButton(): React.ReactNode {
        return <button onClick={this.updatePlugins}>UPDATE</button>;
    }

    protected updatePlugins = async () => {
        console.log('> UPDATE plugins...');

        this.ready = false;
        this.update();

        // await this.sleep(10000);
        await this.fetchPlugins();
    }

    protected renderPluginList(): React.ReactNode {
        const theList: React.ReactNode[] = [];
        this.plugins.forEach(plugin => {
            const container = this.renderPlugin(plugin);
            theList.push(container);
        });

        return <div className='che-plugin-list'>
            {theList}
        </div>;
    }

    private renderPlugin(plugin: ChePluginMetadata) {
        // return <div key={plugin.id} className='che-plugin'>
        return <div key={plugin.id} className={this.pluginClassName(plugin)}>
            <div className='che-plugin-icon'>
                <img src={plugin.icon}></img>
            </div>
            <div className='che-plugin-info'>
                <div className='che-plugin-title'>
                    <div className='che-plugin-name'>{plugin.name}</div>
                    <div className='che-plugin-version'>{plugin.version}</div>
                </div>
                <div className='che-plugin-state'>Installed</div>
                <div className='che-plugin-description'>
                    <div>
                        <div>{plugin.description}</div>
                    </div>
                </div>
                <div className='che-plugin-publisher'>{plugin.publisher}</div>
                <div className='che-plugin-add'>Install</div>
            </div>
        </div>;

        // return <div key={plugin.id} className={this.createPluginClassName(plugin)}>
        //     <div className='column flexcontainer pluginInformationContainer'>
        //         <div className='row flexcontainer'>
        //             <div className='fa fa-puzzle-piece fa-2x fa-fw'></div>
        //             <div title={plugin.name} className='pluginName noWrapInfo'>{plugin.name}</div>
        //         </div>
        //         <div className='row flexcontainer'>
        //             <div className='pluginVersion'>{plugin.version}</div>
        //         </div>
        //         <div className='row flexcontainer'>
        //             <div className='pluginDescription noWrapInfo'>{plugin.description}</div>
        //         </div>
        //         <div className='row flexcontainer'>
        //             <div className='pluginPublisher noWrapInfo flexcontainer'>Vetal</div>
        //         </div>
        //     </div>
        // </div>;

    }

    protected pluginClassName(plugin: ChePluginMetadata): string {
        const classNames = ['che-plugin'];
        if (this.isPluginInstalled(plugin)) {
            classNames.push('che-plugin-installed');
        }
        return classNames.join(' ');
    }

    private installedPlugins: string[] = [
        'org.eclipse.che.editor.theia:1.0.0',
        'che-machine-exec-plugin:0.0.1'
    ];

    protected isPluginInstalled(plugin: ChePluginMetadata): boolean {
        const key = plugin.id + ':' + plugin.version;
        const index = this.installedPlugins.indexOf(key);

        console.log('>> plugin key: ' + key + '  >> index: ' + index);
        return index >= 0;
    }

    // protected createPluginClassName(plugin: ChePluginMetadata): string {
    //     const classNames = ['pluginHeaderContainer'];
    //     return classNames.join(' ');
    // }

}
