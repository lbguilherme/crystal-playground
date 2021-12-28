import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.less'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class TerminalComponent {
  @ViewChild("terminal") terminalDiv!: ElementRef;

  terminal = new Terminal({
    convertEol: true
  });

  fitAddon = new FitAddon();

  ngAfterViewInit() {
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalDiv.nativeElement);
    this.fitAddon.fit();
  }

  write(data: string | Uint8Array) {
    this.terminal.write(data);
  }

  writeln(data: string | Uint8Array) {
    this.terminal.writeln(data);
  }

  onResize() {
    this.fitAddon.fit();
  }
}
