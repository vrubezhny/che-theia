/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import '../../src/browser/style/che-plugins.css';

import { ContainerModule } from 'inversify';
import { MainPluginApiProvider } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { CheApiProvider } from './che-api-provider';
import {
    CHE_API_SERVICE_PATH,
    CHE_TASK_SERVICE_PATH,
    CHE_PLUGIN_SERVICE_PATH,
    CheApiService,
    CheTaskClient,
    CheTaskService,
    ChePluginService
} from '../common/che-protocol';
import { WebSocketConnectionProvider, bindViewContribution, WidgetFactory } from '@theia/core/lib/browser';
// import { FrontendApplicationContribution, FrontendApplication, WidgetFactory,  } from '@theia/core/lib/browser';
import { CheTaskClientImpl } from './che-task-client';
import { ChePluginViewContribution } from './plugin/che-plugin-view-contribution';
import { ChePluginWidget } from './plugin/che-plugin-widget';

export default new ContainerModule(bind => {
    bind(CheApiProvider).toSelf().inSingletonScope();
    bind(MainPluginApiProvider).toService(CheApiProvider);

    bind(CheApiService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CheApiService>(CHE_API_SERVICE_PATH);
    }).inSingletonScope();

    bind(CheTaskClient).to(CheTaskClientImpl).inSingletonScope();
    bind(CheTaskService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        const client: CheTaskClient = ctx.container.get(CheTaskClient);
        return provider.createProxy<CheTaskService>(CHE_TASK_SERVICE_PATH, client);
    }).inSingletonScope();

    bind(ChePluginService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CheApiService>(CHE_PLUGIN_SERVICE_PATH);
    }).inSingletonScope();

    bindViewContribution(bind, ChePluginViewContribution);

    bind(ChePluginWidget).toSelf().inSingletonScope();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: ChePluginViewContribution.PLUGINS_WIDGET_ID,
        createWidget: () => ctx.container.get(ChePluginWidget)
    }));

});
