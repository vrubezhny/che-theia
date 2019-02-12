/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheTelemetry, CheTelemetryMain } from '../common/che-protocol';

export class CheTelemetryMainImpl implements CheTelemetryMain {

    private readonly proxy: CheTelemetry;

    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY);
    }

    async $event(id: string, properties: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.proxy.event(id, properties).then(() => {
                resolve();
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

}
