/* Sakha sound: real recorded tracks only, nothing synthesised.
     audio/bed.mp3              calm bansuri bed under the whole site
     audio/story/<id>.mp3       a narrated story's finished mix (voice, score, ducking), from stories/build-story.mjs
     audio/score/default.mp3    the score under AI-picked stories, which have no narration
   Missing files are skipped quietly. */
(function () {
  'use strict';

  const BED_VOL = 0.55;   // site background, when sound is on
  const SCORE_VOL = 0.7;  // score under an AI-picked story

  function fade(el, to, dur, done) {
    if (!el) return;
    if (window.gsap) gsap.to(el, { volume: to, duration: dur, ease: 'sine.inOut', overwrite: true, onComplete: done });
    else { el.volume = to; done && done(); }
  }

  function Audio() {
    this.on = false;    // the viewer turned site sound on
    this.bed = null;
    this.story = null;  // set while a story plays
    this.score = null;  // the story's track, separate from the site bed
  }

  Audio.prototype._bed = function () {
    if (this.bed) return this.bed;
    const a = new window.Audio('audio/bed.mp3');
    a.loop = true; a.preload = 'auto'; a.volume = 0;
    a.addEventListener('error', () => { this.bedMissing = true; this.onMissing && this.onMissing(); });
    this.bed = a;
    return a;
  };

  const play = (el) => { const p = el.play(); if (p && p.catch) p.catch(() => {}); };

  Audio.prototype.start = function () {
    this.on = true;
    const a = this._bed();
    play(a);
    if (!this.story) fade(a, BED_VOL, 3);
  };

  Audio.prototype.stop = function () {
    this.on = false;
    if (this.bed) fade(this.bed, 0, 1.2, () => this.bed.pause());
  };

  // the site bed steps aside for a story, even with site sound off, because the viewer pressed play
  Audio.prototype._takeOver = function (a) {
    if (this.score) this.score.pause();
    this.score = a;
    this.story = {};
    if (this.bed) fade(this.bed, 0, 1.5, () => this.story && this.bed.pause());
  };

  // an AI-picked story: the default score, looped under the pictures
  Audio.prototype.scene = function () {
    const a = new window.Audio('audio/score/default.mp3');
    a.loop = true; a.volume = 0;
    this._takeOver(a);
    play(a);
    fade(a, SCORE_VOL, 3);
  };

  // Call while the viewer's click is still being handled: Safari only lets an element make sound
  // if play() was first called during a user gesture, so start it silently now and pause.
  Audio.prototype.load = function (src) {
    const a = new window.Audio(src);
    a.preload = 'auto'; a.volume = 0;
    play(a); a.pause();
    this.pending = a;
    return new Promise((ok) => {
      // enough to begin is enough: the mix streams while it plays, and the picture follows its clock
      a.addEventListener('canplay', ok, { once: true });
      a.addEventListener('error', ok, { once: true });
      setTimeout(ok, 2500);
    });
  };

  // a narrated story's finished mix; the player uses its currentTime as the clock
  Audio.prototype.playMix = function (src) {
    const a = this.pending && this.pending.src.endsWith(src) ? this.pending : new window.Audio(src);
    this.pending = null;
    this._takeOver(a);
    a.currentTime = 0; a.volume = 1;
    const p = a.play();
    if (p && p.catch) p.catch((e) => { if (e.name === 'NotAllowedError') a.blocked = true; });
    return a;
  };

  Audio.prototype.endScene = function () {
    const sc = this.score; this.score = null; this.story = null;
    if (sc) fade(sc, 0, 2, () => sc.pause());
    if (this.on && this.bed) { play(this.bed); fade(this.bed, BED_VOL, 3); }
  };

  window.SakhaAudio = Audio;
})();
