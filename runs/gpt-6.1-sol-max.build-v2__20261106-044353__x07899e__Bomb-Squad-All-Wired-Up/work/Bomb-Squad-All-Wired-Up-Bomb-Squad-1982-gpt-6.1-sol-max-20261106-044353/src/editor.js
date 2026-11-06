/* Small versioned content editor. Edits a scratch copy, never the authored templates. */
(() => {
  'use strict';
  const W = globalThis.Wired;
  W.Editor = class {
    constructor(app) {
      this.app = app;
      this.index = 0;
      this.cell = 0;
      this.data = null;
      this.message = 'Scratch edits do not change campaign templates.';
      this.lastExport = '';
    }
    open() {
      if (this.app.net.mode === 'hub') return;
      this.load(0);
      this.show();
    }
    load(i) {
      const s = W.makeCase('relay', 'editor', ['solo']);
      this.data = {
        format: 'wired-board',
        version: 1,
        case: { name: 'New dispatch', duration: 360, digits: 1 },
        board: W.clone(s.boards[i % s.boards.length]),
      };
      this.data.board.digit = 0;
      this.index = 0;
      this.cell = 0;
      this.bind();
    }
    bind() {
      const S = this.app.g.settings,
        ed = this;
      const range = (key, label, min, max, step, value, fn) => {
        S.define({
          key: 'editor_' + key,
          label,
          type: 'slider',
          min,
          max,
          step,
          value,
          group: 'Editor',
          apply: (_, v) => {
            if (ed.binding) return;
            fn(v);
          },
        });
        S.set('editor_' + key, value);
      };
      this.binding = true;
      range('x', 'Component X', 28, 256, 1, this.part().x, (v) => (this.part().x = v));
      range('y', 'Component Y', 32, 164, 1, this.part().y, (v) => (this.part().y = v));
      range(
        'left',
        'Left terminal X',
        -26,
        -8,
        1,
        this.part().anchors[0][0],
        (v) => (this.part().anchors[0][0] = v),
      );
      range(
        'right',
        'Right terminal X',
        8,
        26,
        1,
        this.part().anchors[1][0],
        (v) => (this.part().anchors[1][0] = v),
      );
      range(
        'duration',
        'Case fuse (seconds)',
        60,
        900,
        15,
        this.data.case.duration,
        (v) => (this.data.case.duration = v),
      );
      range('cell', 'Stencil cell (0–19)', 0, 19, 1, this.cell, (v) => (this.cell = v));
      this.binding = false;
    }
    part() {
      return this.data.board.components[this.index];
    }
    show() {
      const { app } = this,
        b = this.data.board,
        p = this.part();
      app.ui.show('editor', {
        kicker: 'SCRATCH AUTHORING · FORMAT 1',
        title: 'Board workshop',
        text: () =>
          `${this.message}\n${p.id}: ${p.shape} / ${p.color}. Order: ${b.order.join(' → ')}. Rule: ${b.rule}. Evidence: ${b.mask.length} cells.`,
        rows: [
          'editor_x',
          'editor_y',
          'editor_left',
          'editor_right',
          'editor_cell',
          'editor_duration',
        ],
        actions: [
          [
            'Next component',
            () => {
              this.index = (this.index + 1) % b.components.length;
              this.bind();
              this.show();
            },
          ],
          [
            'Add component',
            () => {
              const id = 'C' + (b.components.length + 1);
              b.components.push({
                ...W.clone(p),
                id,
                x: 65,
                y: 130,
                required: false,
                phase: 'attached',
                leads: [0, 0],
                spare: null,
              });
              this.index = b.components.length - 1;
              this.bind();
              this.show();
            },
          ],
          [
            'Toggle job in order',
            () => {
              if (b.order.includes(p.id)) b.order = b.order.filter((id) => id !== p.id);
              else b.order.push(p.id);
              this.show();
            },
          ],
          [
            'Rotate shape',
            () => {
              p.shape = W.SHAPES[(W.SHAPES.indexOf(p.shape) + 1) % 3];
              this.show();
            },
          ],
          [
            'Rotate color pattern',
            () => {
              p.color = W.PALETTE[(W.PALETTE.findIndex((c) => c.id === p.color) + 1) % 3].id;
              this.show();
            },
          ],
          [
            'Toggle shape / color rule',
            () => {
              b.rule = b.rule === 'shape' ? 'color' : 'shape';
              this.show();
            },
          ],
          [
            'Rebuild unambiguous spare tray',
            () => {
              b.stock = [];
              for (const id of b.order) {
                const c = b.components.find((p) => p.id === id);
                if (!c) continue;
                const sp = {
                  id: 'S' + (b.stock.length + 1),
                  shape:
                    b.rule === 'shape' ? c.shape : W.SHAPES[(W.SHAPES.indexOf(c.shape) + 1) % 3],
                  color:
                    b.rule === 'color'
                      ? c.color
                      : W.PALETTE[(W.PALETTE.findIndex((p) => p.id === c.color) + 1) % 3].id,
                };
                const existing = b.stock.find((p) => p.shape === sp.shape && p.color === sp.color);
                if (existing) existing.qty = (existing.qty || 1) + 1;
                else b.stock.push({ ...sp, qty: 1 });
              }
              this.show();
            },
          ],
          [
            'Paint / erase selected evidence cell',
            () => {
              b.mask = b.mask.includes(this.cell)
                ? b.mask.filter((i) => i !== this.cell)
                : [...b.mask, this.cell].sort((a, b) => a - b);
              this.show();
            },
          ],
          [
            'Fill complete evidence stencil',
            () => {
              b.mask = Array.from({ length: 20 }, (_, i) => i);
              this.show();
            },
          ],
          [
            'Validate scratch board',
            () => {
              const errors = W.validateBoard(b);
              this.message = errors.length
                ? errors.join('\n')
                : 'VALID · Sockets reachable, order valid, unambiguous reusable stock, evidence mask sound.';
              this.show();
            },
          ],
          ['Playtest scratch copy', () => this.playtest()],
          ['Export JSON', () => this.export()],
          ['Import JSON', () => this.importPage()],
          [
            'Load next template',
            () => {
              this.load((this.template = (this.template || 0) + 1));
              this.show();
            },
          ],
          ['Return to developer tools', () => app.dev()],
        ],
        back: () => app.dev(),
      });
      this.preview();
    }
    preview() {
      this.app.editorPreview = this.data.board;
    }
    export() {
      const errors = W.validateBoard(this.data.board);
      if (errors.length) {
        this.message = errors.join('\n');
        this.show();
        return null;
      }
      this.lastExport = JSON.stringify(this.data, null, 2);
      this.message =
        'Export ready · JSON saved to the scratch text field and available to download.';
      this.app.ui.show('editorIO', {
        kicker: 'VERSIONED BOARD JSON',
        title: 'Export scratch board',
        text: this.message,
        actions: [
          ['Download JSON', () => this.app.download('wired-board.json', this.lastExport)],
          ['Back to workshop', () => this.show()],
        ],
        back: () => this.show(),
      });
      this.textField(this.lastExport, false);
      return this.lastExport;
    }
    importPage() {
      this.app.ui.show('editorIO', {
        kicker: 'VERSIONED BOARD JSON',
        title: 'Import scratch board',
        text: 'Paste exported JSON below, then import. Invalid content stays in the editor with a readable diagnostic.',
        actions: [
          [
            'Import text',
            () => {
              const value = this.app.ui.root.querySelector('.editor-json')?.value || '';
              try {
                this.import(value);
                this.message = 'IMPORTED · Version 1 scratch board loaded.';
                this.bind();
                this.show();
              } catch (e) {
                this.message = e.message;
                this.importPage();
              }
            },
          ],
          ['Back to workshop', () => this.show()],
        ],
        back: () => this.show(),
      });
      this.textField(this.lastExport || '', true);
    }
    textField(value, edit) {
      if (!this.app.ui.root) return;
      const box = this.app.ui.root.querySelector('.esh-mod');
      if (!box) return;
      const field = document.createElement('textarea');
      field.className = 'editor-json';
      field.value = value;
      field.readOnly = !edit;
      field.setAttribute('aria-label', 'Board JSON');
      field.spellcheck = false;
      box.insertBefore(field, box.querySelector('.esh-btns'));
    }
    import(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw Error('Invalid JSON. Paste a complete exported board object.');
      }
      if (data.format !== 'wired-board' || data.version !== 1 || !data.board)
        throw Error('Expected wired-board format version 1.');
      const errors = W.validateBoard(data.board);
      if (errors.length) throw Error(errors.join('\n'));
      if (
        !data.case ||
        !Number.isFinite(data.case.duration) ||
        data.case.duration < 60 ||
        data.case.duration > 900
      )
        throw Error('Case duration must be 60–900 seconds.');
      this.data = W.clone(data);
      this.index = 0;
      this.cell = 0;
      return this.data;
    }
    playtest() {
      const errors = W.validateBoard(this.data.board);
      if (errors.length) {
        this.message = errors.join('\n');
        this.show();
        return;
      }
      const a = this.app;
      a.net.solo('training', 'scratch');
      const s = a.net.sim.s,
        b = W.clone(this.data.board);
      b.id = 'B1';
      b.digit = 0;
      b.job = 0;
      b.done = false;
      b.owner = null;
      b.hold = null;
      b.held = null;
      b.fault = null;
      b.heat = 0;
      b.fire = false;
      b.revision = 0;
      b.reward = b.mask.map((i) => [i, W.GLYPHS[s.code[0]][i]]);
      b.components.forEach((c) => {
        c.phase = 'attached';
        c.leads = [0, 0];
        c.spare = null;
      });
      s.boards = [b];
      s.duration = this.data.case.duration;
      s.remaining = s.duration;
      s.modified = true;
      a.editorPreview = null;
      a.enterField();
      a.openEvidence();
    }
  };
})();
