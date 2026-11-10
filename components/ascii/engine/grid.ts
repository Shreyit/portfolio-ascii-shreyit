export class AsciiGrid {
  cols: number;
  rows: number;
  chars: Uint16Array;
  colors: Uint8Array;
  dirty: Uint8Array;
  dirtyCount = 0;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.chars = new Uint16Array(cols * rows).fill(32); // 32 = space
    this.colors = new Uint8Array(cols * rows);
    this.dirty = new Uint8Array(cols * rows);
    this.markAllDirty();
  }

  private index(x: number, y: number): number {
    return y * this.cols + x;
  }

  set(x: number, y: number, char: string, color = 0): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
      return;
    }
    const i = this.index(x, y);
    const code = char.charCodeAt(0);
    if (this.chars[i] === code && this.colors[i] === color) {
      return; // unchanged — no dirty mark
    }
    if (this.dirty[i] === 0) {
      this.dirtyCount += 1;
    }
    this.chars[i] = code;
    this.colors[i] = color;
    this.dirty[i] = 1;
  }

  get(x: number, y: number): { char: string; color: number } | null {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
      return null;
    }
    const i = this.index(x, y);
    return {
      char: String.fromCharCode(this.chars[i]!),
      color: this.colors[i]!,
    };
  }

  writeText(x: number, y: number, text: string, color = 0): void {
    for (let i = 0; i < text.length; i += 1) {
      this.set(x + i, y, text[i]!, color);
    }
  }

  fill(char: string, color = 0): void {
    const code = char.charCodeAt(0);
    for (let i = 0; i < this.chars.length; i += 1) {
      if (this.chars[i] === code && this.colors[i] === color) {
        continue;
      }
      if (this.dirty[i] === 0) {
        this.dirtyCount += 1;
      }
      this.chars[i] = code;
      this.colors[i] = color;
      this.dirty[i] = 1;
    }
  }

  clear(): void {
    this.fill(" ", 0);
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.chars = new Uint16Array(cols * rows).fill(32);
    this.colors = new Uint8Array(cols * rows);
    this.dirty = new Uint8Array(cols * rows);
    this.markAllDirty();
  }

  markAllDirty(): void {
    this.dirty.fill(1);
    this.dirtyCount = this.chars.length;
  }

  clearDirty(): void {
    this.dirty.fill(0);
    this.dirtyCount = 0;
  }

  forEachDirty(cb: (x: number, y: number, index: number) => void): void {
    for (let i = 0; i < this.dirty.length; i += 1) {
      if (this.dirty[i] === 1) {
        cb(i % this.cols, Math.floor(i / this.cols), i);
      }
    }
  }

  toPlainText(): string {
    const lines: string[] = [];
    for (let y = 0; y < this.rows; y += 1) {
      let line = "";
      for (let x = 0; x < this.cols; x += 1) {
        line += String.fromCharCode(this.chars[this.index(x, y)]!);
      }
      lines.push(line);
    }
    return lines.join("\n");
  }
}
