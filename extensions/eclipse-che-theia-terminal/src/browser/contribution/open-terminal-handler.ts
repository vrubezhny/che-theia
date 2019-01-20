
import { TerminalQuickOpenService } from "./terminal-quick-open";
import { TerminalService } from "@theia/terminal/lib/browser/base/terminal-service";

export class TerminalOpenHandler {

    constructor(private readonly terminalQuickOpen: TerminalQuickOpenService,
                private readonly terminalService: TerminalService,
                private readonly containerName: string) {
    }

    async openTerminal(): Promise<void> {
        const termWidget = await this.terminalQuickOpen.newTerminalPerContainer(this.containerName, {});
        termWidget.start();
        this.terminalService.open(termWidget, {});
    }
}
