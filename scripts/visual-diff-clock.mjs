// Preloaded into builds by visual-diff.mjs: freezes "today" so pages that use the
// build day (Events, service times) render identically in both builds.
const FIXED = Date.parse(process.env.VISUAL_DIFF_NOW);
const RealDate = Date;
class FrozenDate extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(FIXED); }
  static now() { return FIXED; }
}
globalThis.Date = FrozenDate;
