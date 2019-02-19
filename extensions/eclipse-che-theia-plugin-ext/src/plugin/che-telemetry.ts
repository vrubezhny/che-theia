/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheTelemetry, CheTelemetryMain } from '../common/che-protocol';

export class CheTelemetryImpl implements CheTelemetry {

    private readonly telemetryMain: CheTelemetryMain;

    constructor(rpc: RPCProtocol) {
        this.telemetryMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY_MAIN);
    }

    // tslint:disable-next-line: no-any
    async event(id: string, properties: any): Promise<void> {
        try {
            return await this.telemetryMain.$event(id, properties);
        } catch (e) {
            return Promise.reject(e);
        }
    }

}
