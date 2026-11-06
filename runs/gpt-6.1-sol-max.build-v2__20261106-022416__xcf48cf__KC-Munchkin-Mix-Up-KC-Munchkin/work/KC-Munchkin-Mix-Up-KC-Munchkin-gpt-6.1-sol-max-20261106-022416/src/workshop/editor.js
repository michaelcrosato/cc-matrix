(function (M) {
  "use strict";
  class Profile {
    constructor(storage) {
      this.storage =
        storage === undefined
          ? typeof localStorage === "undefined"
            ? null
            : localStorage
          : storage;
      this.notice = "";
      this.key = "mix-up:profile:v1";
      this.data = { version: 1, best: 0, unlocked: 1, boards: [null, null, null] };
      try {
        const text = this.storage?.getItem(this.key);
        if (text) {
          const d = JSON.parse(text);
          if (
            d.version !== 1 ||
            !Number.isFinite(d.best) ||
            !Number.isInteger(d.unlocked) ||
            !Array.isArray(d.boards) ||
            d.boards.length !== 3
          )
            throw new Error("invalid save");
          this.data = {
            version: 1,
            best: Math.max(0, d.best),
            unlocked: M.clamp(d.unlocked, 1, 6),
            boards: d.boards.map((b) => (b && M.validate(b).ok ? b : null)),
          };
        }
      } catch {
        this.notice = "The saved data was unreadable. Fresh defaults are ready.";
      }
    }
    save() {
      try {
        this.storage?.setItem(this.key, JSON.stringify(this.data));
        return !!this.storage;
      } catch {
        this.notice = "Storage is unavailable. Your changes stay for this visit.";
        return false;
      }
    }
    record(w) {
      if (w.assisted) return;
      this.data.best = Math.max(this.data.best, w.score);
      this.data.unlocked = Math.max(this.data.unlocked, Math.min(6, w.stats.stages + 1));
      this.save();
    }
  }
  class Editor {
    constructor(data = M.template(0)) {
      this.data = M.copy(data);
      this.data.id = "workshop";
      this.data.name = "My Mischief Maze";
      this.undoStack = [];
      this.redoStack = [];
      this.x = 3;
      this.y = 3;
      this.tool = 0;
      this.foodCursor = 0;
      this.starCursor = 8;
      this.message = "Make a little mischief. The pen stays put.";
      this.errors = [];
      this.slot = 0;
      this.dirty = false;
    }
    get tools() {
      return [
        "Wall toggle",
        "Erase wall",
        "Hero 1 start",
        "Hero 2 start",
        `Snack ${this.foodCursor + 1}/8`,
        `Star ${this.starCursor - 7}/4`,
        "Side tunnel pair",
        "Turning pen",
      ];
    }
    checkpoint() {
      this.undoStack.push(M.copy(this.data));
      if (this.undoStack.length > 64) this.undoStack.shift();
      this.redoStack = [];
      this.dirty = true;
    }
    apply(x = this.x, y = this.y) {
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || x > 19 || y < 1 || y > 15)
        return false;
      this.x = x;
      this.y = y;
      if (x >= 8 && x <= 12 && y >= 6 && y <= 10 && this.tool !== 7) {
        this.message = "The permanent pen is protected. Try a lane outside it.";
        return false;
      }
      this.checkpoint();
      const rows = this.data.rows.map((r) => r.split(""));
      if (this.tool === 0) rows[y][x] = rows[y][x] === "#" ? "." : "#";
      if (this.tool === 1) rows[y][x] = ".";
      if (this.tool === 2 || this.tool === 3) {
        this.data.spawns[this.tool - 2] = [x, y];
        rows[y][x] = ".";
      }
      if (this.tool === 4 || this.tool === 5) {
        const i = this.tool === 4 ? this.foodCursor : this.starCursor;
        this.data.food[i].x = x;
        this.data.food[i].y = y;
        rows[y][x] = ".";
        if (this.tool === 4) this.foodCursor = (i + 1) % 8;
        else this.starCursor = 8 + ((i - 7) % 4);
      }
      if (this.tool === 6) {
        const index = this.data.tunnels.findIndex((t) => t.a[1] === y);
        if (index >= 0) {
          this.data.tunnels.splice(index, 1);
          rows[y][0] = rows[y][20] = "#";
        } else {
          if (this.data.tunnels.length >= 3) {
            const old = this.data.tunnels.shift();
            rows[old.a[1]][0] = rows[old.b[1]][20] = "#";
          }
          this.data.tunnels.push({ a: [0, y], b: [20, y], ad: 3, bd: 1 });
          for (const cx of [0, 1, 19, 20]) rows[y][cx] = ".";
        }
      }
      if (this.tool === 7) {
        M.penTemplate(rows);
        this.data.gate.turning = !this.data.gate.turning;
        if (this.data.gate.turning) M.moatTemplate(rows);
      }
      this.data.rows = rows.map((r) => r.join(""));
      this.errors = [];
      this.message =
        this.tool === 6
          ? "Tunnel mouths are paired across this row."
          : "Change made. Validate before you munch.";
      return true;
    }
    undo() {
      if (!this.undoStack.length) {
        this.message = "Nothing to undo yet.";
        return false;
      }
      this.redoStack.push(M.copy(this.data));
      this.data = this.undoStack.pop();
      this.dirty = true;
      this.message = "Undone.";
      return true;
    }
    redo() {
      if (!this.redoStack.length) {
        this.message = "Nothing to redo yet.";
        return false;
      }
      this.undoStack.push(M.copy(this.data));
      this.data = this.redoStack.pop();
      this.dirty = true;
      this.message = "Redone.";
      return true;
    }
    validate() {
      const v = M.validate(this.data);
      this.errors = v.errors;
      this.message = v.ok ? "All routes connected. Twelve snacks ready!" : v.errors[0].message;
      if (!v.ok && v.errors[0].cells.length) [this.x, this.y] = v.errors[0].cells[0];
      return v;
    }
    save(profile, slot = this.slot) {
      if (!this.validate().ok) return false;
      profile.data.boards[slot] = M.copy(this.data);
      profile.save();
      this.slot = slot;
      this.dirty = false;
      this.message = `Saved in slot ${slot + 1}.`;
      return true;
    }
    load(profile, slot = this.slot) {
      const d = profile.data.boards[slot];
      if (!d) {
        this.message = `Slot ${slot + 1} is empty. Save a maze here first.`;
        return false;
      }
      this.checkpoint();
      this.data = M.copy(d);
      this.slot = slot;
      this.dirty = false;
      this.errors = [];
      this.message = `Loaded slot ${slot + 1}.`;
      return true;
    }
    export() {
      return JSON.stringify({ format: "mix-up-maze", version: 1, board: this.data });
    }
    import(text) {
      let d;
      try {
        if (typeof text !== "string" || text.length > 40000) throw new Error();
        const pack = JSON.parse(text);
        if (pack.format !== "mix-up-maze" || pack.version !== 1) throw new Error();
        d = pack.board;
      } catch {
        this.message = "That is not a Mix-Up maze code. Your maze is unchanged.";
        return false;
      }
      const v = M.validate(d);
      if (!v.ok) {
        this.message = v.errors[0].message + " Your maze is unchanged.";
        return false;
      }
      this.checkpoint();
      this.data = M.copy(d);
      this.errors = [];
      this.message = "Imported, validated and ready to munch.";
      return true;
    }
    reset(index) {
      this.checkpoint();
      this.data = M.template(index);
      this.data.id = "workshop";
      this.data.name = "My Mischief Maze";
      this.errors = [];
      this.message = "Fresh template, fresh trouble.";
    }
    rename(name) {
      const clean = String(name)
        .replace(/[\x00-\x1f<>]/g, "")
        .trim()
        .slice(0, 32);
      this.checkpoint();
      this.data.name = clean || "My Mischief Maze";
      this.message = "Maze name saved.";
    }
  }
  M.Profile = Profile;
  M.Editor = Editor;
})(globalThis.Mix);
