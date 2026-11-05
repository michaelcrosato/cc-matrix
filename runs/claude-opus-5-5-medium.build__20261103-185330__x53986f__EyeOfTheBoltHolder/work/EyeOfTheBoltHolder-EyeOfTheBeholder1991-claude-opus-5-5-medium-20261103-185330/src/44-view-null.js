/* VIEW: NullView, the presenter's stand-in where there is no 3D (Node, the tests): the same interface, doing nothing. */
B.NullView = class {
  constructor() { this.fid = null; this.worlds = {}; this.hover = null; this.pose = null; }
  get world() { return null; }
  build() {} enter(fid) { this.fid = fid; } sync() {} camera() {} draw() {} pick() { return null; } dispose() {}
};
