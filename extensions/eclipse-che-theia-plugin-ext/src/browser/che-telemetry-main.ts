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
import { CheTelemetryMain } from '../common/che-protocol';
import { CheApiService } from '../common/che-protocol';

export class CheTelemetryMainImpl implements CheTelemetryMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    // tslint:disable-next-line: no-any
    async $event(id: string, properties: any): Promise<void> {
        // TODO : get the infos from the browser
        const ip = 'anIpExample';
        const agent = 'anAgentExample';
        const resolution = 'anResolutionExample';
        return this.cheApiService.submitTelemetryEvent(id, properties, ip, agent, resolution);
    }
}
