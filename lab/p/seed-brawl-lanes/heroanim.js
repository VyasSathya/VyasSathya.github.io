// Hand-keyed hero clips: an idle loop, an optional walk overlay and a super cast for each of the nine heroes.
// Keys are bone rotations (radians, Euler XYZ in the hero's own frame, the same frame main.js setBone uses) laid ON TOP of
// the hand base pose (arms hanging at the hero's measured drop, elbows a little bent). They animate the existing skeleton:
// meshes, weights and proportions are untouched.
// Frame: UpperArm x<0 swings the arm forward, z<0 on the left (z>0 on the right) lowers it further / brings it in across
// the body, z the other way lifts it out to the side (the T-pose side, kept small). Forearm y<0 on the left (y>0 on the
// right) bends the elbow. Spine/Chest x>0 leans forward, y turns, z tilts. 'Body' is [lift (share of height), forward
// (share of height), pitch (rad)].
// Each key: [time, {Bone:[x,y,z]}, ease], ease is for the stretch that ends at the key: 'io' (default), 'o' (snap out
// fast, then settle: releases), 'i' (slow start: wind-ups), 'l' (linear). A bone missing from a key holds the value of
// the keys around it.
// cast: t = 0 is the frame the rules fire the super (core.js castSuper). From 0 the body winds up fast and releases by
// `rel`; when my own hero aims the super first, the wind-up pose (the clip at `rel` - `pre`) is held while aiming and
// the clip starts at that point, so the release lands 2 to 3 frames after the rules fire.
import * as THREE from 'three';

const E = { io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, o: k => 1 - Math.pow(1 - k, 3), i: k => k * k * k, l: k => k };

// mirror helper: [x,y,z] for the left side becomes the right side (y and z flip)
const M = v => [v[0], -v[1], -v[2]];
const arms = (ul, fl, ur, fr) => ({ UpperArm_L: ul, Forearm_L: fl, UpperArm_R: ur || M(ul), Forearm_R: fr || M(fl) });
const P = (...o) => Object.assign({}, ...o);
// a loop through poses evenly spaced, back to the first; every pose gets every bone (0 where it is not named)
const fill = ps => { const n = [...new Set(ps.flatMap(o => Object.keys(o)))]; return ps.map(o => { const r = {}; for (const k of n) r[k] = o[k] || [0, 0, 0]; return r; }); };
const loop = (dur, ...ps) => { ps = fill(ps); return { dur, loop: true, keys: [...ps.map((o, i) => [dur * i / ps.length, o]), [dur, ps[0]]] }; };
// a super cast: from the idle start pose, wind up by 0.08 s, release by 0.13 s (snap), hold to 0.32 s, settle by 0.62 s
const cast = (rest, wind, rel, hold, end) => { const [a, b, c, d, e] = fill([rest, wind, rel, hold || rel, end || rest]);
  return { dur: .62, rel: .13, pre: .05, keys: [[0, a], [.08, b, 'i'], [.13, c, 'o'], [.32, d], [.62, e]] }; };

export const CLIPS = {
  // Bramble, bear boxer: a loose boxing guard (gloves up in front of the chin), bouncing on his toes, gloves rolling.
  // Super (Briar ring: a boxing ring drops on the lane): both gloves cocked back, then slammed down onto the mat.
  bear: {
    idle: { dur: 1.6, loop: true, keys: [
      [0, P(arms([-.7, .1, -.22], [0, -1.35, 0]), { Spine: [.1, .1, 0], Chest: [.04, .08, 0], Head: [-.08, -.08, 0], Hips: [0, -.08, 0], Body: [0, 0, 0] })],
      [.4, P(arms([-.85, .1, -.16], [0, -1.15, 0], [-.6, -.1, .28], [0, 1.5, 0]), { Spine: [.16, 0, .07], Chest: [.06, 0, 0], Head: [-.14, 0, 0], Hips: [0, 0, .03], Body: [.05, 0, 0] })],
      [.8, P(arms([-.7, .1, -.22], [0, -1.35, 0]), { Spine: [.1, -.1, 0], Chest: [.04, -.08, 0], Head: [-.08, .08, 0], Hips: [0, .08, 0], Body: [0, 0, 0] })],
      [1.2, P(arms([-.6, .1, -.28], [0, -1.5, 0], [-.85, -.1, .16], [0, 1.15, 0]), { Spine: [.16, 0, -.07], Chest: [.06, 0, 0], Head: [-.14, 0, 0], Hips: [0, 0, -.03], Body: [.05, 0, 0] })],
      [1.6, P(arms([-.7, .1, -.22], [0, -1.35, 0]), { Spine: [.1, .1, 0], Chest: [.04, .08, 0], Head: [-.08, -.08, 0], Hips: [0, -.08, 0], Body: [0, 0, 0] })],
    ] },
    walk: { dur: 1, loop: true, keys: [   // the guard stays up while he walks (the walk swing still moves the legs and hips)
      [0, P(arms([-.6, .1, -.4], [0, -1.6, 0]))], [1, P(arms([-.6, .1, -.4], [0, -1.6, 0]))]] },
    cast: { dur: .62, rel: .13, pre: .05, keys: [
      [0, P(arms([-.7, .1, -.22], [0, -1.35, 0]), { Spine: [.1, 0, 0], Body: [0, 0, 0] })],
      [.08, P(arms([-2.6, .1, -.3], [0, -1.2, 0]), { Spine: [-.3, 0, 0], Chest: [-.15, 0, 0], Head: [.25, 0, 0], Body: [.12, -.04, 0] }), 'i'],
      [.13, P(arms([-1.15, .1, -.4], [0, -.25, 0]), { Spine: [.55, 0, 0], Chest: [.2, 0, 0], Head: [-.25, 0, 0], Body: [-.04, .1, 0] }), 'o'],
      [.32, P(arms([-1.05, .1, -.4], [0, -.3, 0]), { Spine: [.5, 0, 0], Chest: [.18, 0, 0], Head: [-.2, 0, 0], Body: [-.03, .09, 0] })],
      [.62, P(arms([-.7, .1, -.22], [0, -1.35, 0]), { Spine: [.12, 0, 0], Chest: [0, 0, 0], Head: [0, 0, 0], Body: [0, 0, 0] })],
    ] },
  },
  // Sow, owl archer: wings folded in front, the head turning to look round (an owl's head), slow breathing.
  // Super (Nursery, the feathered roost): an archer's draw, the front wing pointing at the spot, the back hand pulled to
  // the chest, then loosed.
  owl: {
    idle: loop(3.2,
      P(arms([-.45, 0, -.25], [0, -.9, 0]), { Head: [0, 0, 0], Chest: [-.02, 0, 0], Body: [0, 0, 0] }),
      P(arms([-.5, 0, -.25], [0, -1, 0]), { Head: [-.05, .6, .05], Chest: [.04, 0, 0], Body: [.02, 0, 0] }),
      P(arms([-.45, 0, -.25], [0, -.9, 0]), { Head: [0, .6, .05], Chest: [-.02, 0, 0], Body: [0, 0, 0] }),
      P(arms([-.5, 0, -.25], [0, -1, 0]), { Head: [-.05, -.6, -.05], Chest: [.04, 0, 0], Body: [.02, 0, 0] }),
      P(arms([-.45, 0, -.25], [0, -.9, 0]), { Head: [0, -.6, -.05], Chest: [-.02, 0, 0], Body: [0, 0, 0] })),
    cast: cast(P(arms([-.45, 0, -.25], [0, -.9, 0])),
      P(arms([-1.5, 0, -.05], [0, -.1, 0], [-1.25, 0, .35], [0, 2.1, 0]), { Spine: [-.05, -.45, 0], Head: [0, .4, 0], Body: [.1, -.03, 0] }),
      P(arms([-1.55, 0, -.05], [0, -.1, 0], [-1.6, 0, .1], [0, .2, 0]), { Spine: [.12, -.2, 0], Head: [0, .2, 0], Body: [.04, .06, 0] })),
  },
  // Mower, frog samurai: crouched, right hand on the hilt at his left hip, left hand on the scabbard, breathing, eyes
  // shifting. Super (Blade trap, a pond of blades): a draw-cut, the body coiled to the left, then the arm whips across
  // and out in front.
  frog: {
    idle: loop(2.4,
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Head: [-.05, -.1, 0], Thigh_L: [-.3, 0, 0], Thigh_R: [-.3, 0, 0], Shin_L: [.55, 0, 0], Shin_R: [.55, 0, 0], Body: [-.04, 0, 0] }),
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.65, 0, .45], [0, 1.75, 0]), { Spine: [.24, .16, .04], Head: [-.1, .15, 0], Thigh_L: [-.38, 0, 0], Thigh_R: [-.38, 0, 0], Shin_L: [.7, 0, 0], Shin_R: [.7, 0, 0], Body: [-.06, 0, 0] }),
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Head: [-.05, .25, 0], Thigh_L: [-.3, 0, 0], Thigh_R: [-.3, 0, 0], Shin_L: [.55, 0, 0], Shin_R: [.55, 0, 0], Body: [-.04, 0, 0] }),
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.65, 0, .45], [0, 1.75, 0]), { Spine: [.24, .08, -.04], Head: [-.1, -.2, 0], Thigh_L: [-.38, 0, 0], Thigh_R: [-.38, 0, 0], Shin_L: [.7, 0, 0], Shin_R: [.7, 0, 0], Body: [-.06, 0, 0] })),
    cast: cast(P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Body: [-.04, 0, 0] }),
      P(arms([-.2, 0, -.18], [0, -1.2, 0], [-.55, 0, .7], [0, 1.9, 0]), { Spine: [.3, .6, 0], Head: [0, -.4, 0], Thigh_L: [-.45, 0, 0], Thigh_R: [-.45, 0, 0], Shin_L: [.85, 0, 0], Shin_R: [.85, 0, 0], Body: [-.08, 0, 0] }),
      P(arms([.45, 0, -.1], [0, -.6, 0], [-1.5, 0, -.35], [0, .1, 0]), { Spine: [.3, -.55, 0], Head: [0, .3, 0], Thigh_L: [-.55, 0, 0], Thigh_R: [.1, 0, 0], Shin_L: [.6, 0, 0], Shin_R: [.3, 0, 0], Body: [-.1, .16, 0] })),
  },
  // Magpie, mouse thief: a sneaky hunch, paws rubbing together in front, the head darting left and right.
  // Super (Heist, the dash): she coils, then throws herself forward, arms swept back behind her.
  mouse: {
    idle: loop(1.8,
      P(arms([-.65, 0, -.32], [0, -1.45, 0], [-.6, 0, .28], [0, 1.3, 0]), { Spine: [.3, 0, 0], Head: [-.2, .45, 0], Thigh_L: [-.2, 0, 0], Thigh_R: [-.2, 0, 0], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Body: [-.03, 0, 0] }),
      P(arms([-.6, 0, -.28], [0, -1.3, 0], [-.65, 0, .32], [0, 1.45, 0]), { Spine: [.34, 0, 0], Head: [-.2, .45, 0], Thigh_L: [-.2, 0, 0], Thigh_R: [-.2, 0, 0], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Body: [-.01, 0, 0] }),
      P(arms([-.65, 0, -.32], [0, -1.45, 0], [-.6, 0, .28], [0, 1.3, 0]), { Spine: [.3, 0, 0], Head: [-.2, -.45, 0], Thigh_L: [-.2, 0, 0], Thigh_R: [-.2, 0, 0], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Body: [-.03, 0, 0] }),
      P(arms([-.6, 0, -.28], [0, -1.3, 0], [-.65, 0, .32], [0, 1.45, 0]), { Spine: [.34, 0, 0], Head: [-.2, -.45, 0], Thigh_L: [-.2, 0, 0], Thigh_R: [-.2, 0, 0], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Body: [-.01, 0, 0] })),
    cast: cast(P(arms([-.65, 0, -.32], [0, -1.45, 0]), { Spine: [.3, 0, 0], Body: [-.03, 0, 0] }),
      P(arms([.5, 0, -.1], [0, -.5, 0]), { Spine: [.5, 0, 0], Head: [-.3, 0, 0], Thigh_L: [-.5, 0, 0], Thigh_R: [-.5, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [-.08, 0, 0] }),
      P(arms([1.15, 0, -.2], [0, -.15, 0]), { Spine: [.65, 0, 0], Head: [-.45, 0, 0], Thigh_L: [-.7, 0, 0], Thigh_R: [.45, 0, 0], Shin_L: [.5, 0, 0], Shin_R: [.6, 0, 0], Body: [.04, .16, .35] }),
      P(arms([1.05, 0, -.2], [0, -.2, 0]), { Spine: [.6, 0, 0], Head: [-.4, 0, 0], Thigh_L: [-.6, 0, 0], Thigh_R: [.35, 0, 0], Shin_L: [.5, 0, 0], Shin_R: [.6, 0, 0], Body: [.02, .14, .3] })),
  },
  // Drover, elephant general: at ease, hands clasped behind his back, chest out, rocking heel to toe and nodding.
  // Super (Rally post, the war horn): he rears back with an arm raised high, then points the charge with it.
  elephant: {
    idle: loop(2.4,
      P(arms([.5, 0, -.18], [0, -1.25, 0]), { Spine: [-.08, 0, 0], Chest: [-.06, 0, 0], Head: [-.06, 0, 0], Body: [0, 0, -.03] }),
      P(arms([.55, 0, -.2], [0, -1.3, 0]), { Spine: [-.12, .08, 0], Chest: [-.08, 0, 0], Head: [-.14, .12, 0], Body: [.015, 0, .04] }),
      P(arms([.5, 0, -.18], [0, -1.25, 0]), { Spine: [-.08, 0, 0], Chest: [-.06, 0, 0], Head: [-.06, 0, 0], Body: [0, 0, -.03] }),
      P(arms([.55, 0, -.2], [0, -1.3, 0]), { Spine: [-.12, -.08, 0], Chest: [-.08, 0, 0], Head: [-.14, -.12, 0], Body: [.015, 0, .04] })),
    cast: cast(P(arms([.5, 0, -.18], [0, -1.25, 0]), { Spine: [-.08, 0, 0] }),
      P(arms([.6, 0, -.1], [0, -1.6, 0], [-2.7, 0, .1], [0, .4, 0]), { Spine: [-.3, .2, 0], Chest: [-.12, 0, 0], Head: [-.25, 0, 0], Body: [.06, -.06, -.12] }),
      P(arms([.45, 0, -.1], [0, -1.6, 0], [-2.05, 0, .05], [0, .05, 0]), { Spine: [.25, -.1, 0], Chest: [.08, 0, 0], Head: [0, 0, 0], Body: [0, .08, 0] })),
  },
  // Thistle, penguin magician: a side to side waddle, one flipper on the belly, the other twirling a wand.
  // Super (Seed charge, the grand finale): both flippers flung up (ta-da), then thrown forward at the spot.
  penguin: {
    idle: loop(1.4,
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0]), { Spine: [0, 0, .09], Head: [0, .1, -.05], Hips: [0, 0, -.06], Body: [0, 0, 0] }),
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.95, 0, .2], [0, 1.6, 0]), { Spine: [0, 0, 0], Head: [-.05, 0, 0], Hips: [0, 0, 0], Body: [.035, 0, 0] }),
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0]), { Spine: [0, 0, -.09], Head: [0, -.1, .05], Hips: [0, 0, .06], Body: [0, 0, 0] }),
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.95, 0, .2], [0, 1.6, 0]), { Spine: [0, 0, 0], Head: [-.05, 0, 0], Hips: [0, 0, 0], Body: [.035, 0, 0] })),
    cast: cast(P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0])),
      P(arms([-2.75, 0, .1], [0, -.2, 0]), { Spine: [-.25, 0, 0], Head: [.3, 0, 0], Body: [.2, 0, 0] }),
      P(arms([-1.5, 0, -.05], [0, -.05, 0]), { Spine: [.3, 0, 0], Head: [-.1, 0, 0], Body: [-.02, .1, .1] })),
  },
  // Nightshade, cat ninja: a low ninja crouch, the lead hand out in front, the back hand drawn, swaying, tail flicking.
  // Super (Vanish, the smoke bomb): the hand goes up with the bomb, then she slams it at her feet and drops low.
  cat: {
    idle: loop(2,
      P(arms([-.9, 0, -.05], [0, -.45, 0], [.45, 0, .2], [0, 1.1, 0]), { Spine: [.3, .15, 0], Head: [-.25, -.1, 0], Thigh_L: [-.45, 0, 0], Thigh_R: [-.45, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [-.08, 0, 0] }),
      P(arms([-.95, 0, -.08], [0, -.5, 0], [.5, 0, .2], [0, 1.2, 0]), { Spine: [.34, .25, .03], Head: [-.25, -.2, 0], Thigh_L: [-.52, 0, 0], Thigh_R: [-.52, 0, 0], Shin_L: [1.02, 0, 0], Shin_R: [1.02, 0, 0], Body: [-.1, 0, 0] }),
      P(arms([-.9, 0, -.05], [0, -.45, 0], [.45, 0, .2], [0, 1.1, 0]), { Spine: [.3, .05, 0], Head: [-.25, 0, 0], Thigh_L: [-.45, 0, 0], Thigh_R: [-.45, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [-.08, 0, 0] }),
      P(arms([-.95, 0, -.08], [0, -.5, 0], [.5, 0, .2], [0, 1.2, 0]), { Spine: [.34, .15, -.03], Head: [-.25, -.1, 0], Thigh_L: [-.52, 0, 0], Thigh_R: [-.52, 0, 0], Shin_L: [1.02, 0, 0], Shin_R: [1.02, 0, 0], Body: [-.1, 0, 0] })),
    cast: cast(P(arms([-.9, 0, -.05], [0, -.45, 0], [.45, 0, .2], [0, 1.1, 0]), { Spine: [.3, .15, 0], Thigh_L: [-.45, 0, 0], Thigh_R: [-.45, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [-.08, 0, 0] }),
      P(arms([-.5, 0, -.1], [0, -.8, 0], [-2.7, 0, .1], [0, .3, 0]), { Spine: [-.1, 0, 0], Head: [.15, 0, 0], Thigh_L: [-.15, 0, 0], Thigh_R: [-.15, 0, 0], Shin_L: [.3, 0, 0], Shin_R: [.3, 0, 0], Body: [.03, 0, 0] }),
      P(arms([.4, 0, -.1], [0, -.6, 0], [-.85, 0, .05], [0, .05, 0]), { Spine: [.6, 0, 0], Head: [-.3, 0, 0], Thigh_L: [-.7, 0, 0], Thigh_R: [-.7, 0, 0], Shin_L: [1.4, 0, 0], Shin_R: [1.4, 0, 0], Body: [-.16, .04, 0] })),
  },
  // Foxglove, fox bandit: weight on one leg, a hand on the hip, the other flipping a coin, the head following it.
  // Super (Lure, the fox-fire circle): both hands drawn in to the chest, then pushed out at the spot.
  fox: {
    idle: loop(2,
      P(arms([.15, 0, .25], [0, -1.9, 0], [-.55, 0, .12], [0, 1, 0]), { Hips: [0, 0, .06], Spine: [0, 0, -.06], Head: [0, 0, -.04], Body: [0, 0, 0] }),
      P(arms([.15, 0, .25], [0, -1.9, 0], [-.75, 0, .12], [0, 1.9, 0]), { Hips: [0, 0, .06], Spine: [-.04, 0, -.06], Head: [.2, -.1, -.04], Body: [.015, 0, 0] }),
      P(arms([.15, 0, .25], [0, -1.9, 0], [-.55, 0, .12], [0, 1, 0]), { Hips: [0, 0, .08], Spine: [0, .06, -.08], Head: [-.05, .15, -.04], Body: [0, 0, 0] }),
      P(arms([.15, 0, .25], [0, -1.9, 0], [-.7, 0, .12], [0, 1.5, 0]), { Hips: [0, 0, .06], Spine: [0, 0, -.06], Head: [0, 0, -.04], Body: [.01, 0, 0] })),
    cast: cast(P(arms([.15, 0, .25], [0, -1.9, 0], [-.55, 0, .12], [0, 1, 0]), { Hips: [0, 0, .06], Spine: [0, 0, -.06] }),
      P(arms([-.35, 0, -.25], [0, -2.1, 0]), { Hips: [0, 3.3, 0], Spine: [-.15, 0, 0], Head: [.1, 0, 0], Body: [.1, -.03, 0] }),
      P(arms([-1.45, 0, -.12], [0, -.1, 0]), { Hips: [0, 6.2832, 0], Spine: [.28, 0, 0], Head: [-.1, 0, 0], Body: [0, .1, 0] }), null,
      P(arms([.15, 0, .25], [0, -1.9, 0], [-.55, 0, .12], [0, 1, 0]), { Hips: [0, 6.2832, .06], Spine: [0, 0, -.06] })),
  },
  // Bamboo, panda sumo: a wide sumo squat, hands on his thighs, heavy breathing, slow side to side.
  // Super (Shelter, the sumo ring): the shiko stomp, one leg lifted high out to the side, then stamped down.
  panda: {
    idle: loop(2.2,
      P(arms([-.35, 0, -.08], [0, -.5, 0]), { Thigh_L: [-.2, 0, .3], Thigh_R: [-.2, 0, -.3], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Spine: [.15, 0, .05], Chest: [0, 0, 0], Head: [-.1, 0, 0], Body: [-.05, 0, 0] }),
      P(arms([-.4, 0, -.06], [0, -.55, 0]), { Thigh_L: [-.25, 0, .32], Thigh_R: [-.25, 0, -.32], Shin_L: [.5, 0, 0], Shin_R: [.5, 0, 0], Spine: [.18, 0, 0], Chest: [-.08, 0, 0], Head: [-.16, 0, 0], Body: [-.035, 0, 0] }),
      P(arms([-.35, 0, -.08], [0, -.5, 0]), { Thigh_L: [-.2, 0, .3], Thigh_R: [-.2, 0, -.3], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Spine: [.15, 0, -.05], Chest: [0, 0, 0], Head: [-.1, 0, 0], Body: [-.05, 0, 0] }),
      P(arms([-.4, 0, -.06], [0, -.55, 0]), { Thigh_L: [-.25, 0, .32], Thigh_R: [-.25, 0, -.32], Shin_L: [.5, 0, 0], Shin_R: [.5, 0, 0], Spine: [.18, 0, 0], Chest: [-.08, 0, 0], Head: [-.16, 0, 0], Body: [-.035, 0, 0] })),
    cast: cast(P(arms([-.35, 0, -.08], [0, -.5, 0]), { Thigh_L: [-.2, 0, .3], Thigh_R: [-.2, 0, -.3], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Spine: [.15, 0, 0], Body: [-.05, 0, 0] }),
      P(arms([-.5, 0, -.15], [0, -.6, 0], [-.3, 0, .1], [0, .4, 0]), { Thigh_L: [-.15, 0, .2], Thigh_R: [-.6, 0, -1], Shin_L: [.2, 0, 0], Shin_R: [.7, 0, 0], Spine: [.05, 0, .3], Head: [0, 0, -.15], Body: [.1, 0, 0] }),
      P(arms([-.8, 0, -.05], [0, -.3, 0]), { Thigh_L: [-.35, 0, .38], Thigh_R: [-.35, 0, -.38], Shin_L: [.7, 0, 0], Shin_R: [.7, 0, 0], Spine: [.35, 0, 0], Head: [-.25, 0, 0], Body: [-.17, .03, 0] })),
  },
};

// sample a clip at time t into out {Bone:[x,y,z]}; returns out
export function sample(clip, t, out) {
  const K = clip.keys; out = out || {};
  for (const n in out) out[n][0] = out[n][1] = out[n][2] = 0;
  if (clip.loop) { t = ((t % clip.dur) + clip.dur) % clip.dur; } else t = Math.max(K[0][0], Math.min(t, K[K.length - 1][0]));
  const names = clip._n || (clip._n = [...new Set(K.flatMap(k => Object.keys(k[1])))]);
  for (const n of names) {
    let a = null, b = null;
    for (const k of K) { if (!(n in k[1])) continue; if (k[0] <= t) a = k; else { b = k; break; } }
    const o = out[n] || (out[n] = [0, 0, 0]), va = a ? a[1][n] : b[1][n];
    if (!a || !b) { o[0] = va[0]; o[1] = va[1]; o[2] = va[2]; continue; }
    const vb = b[1][n], k = (E[b[2] || 'io'])((t - a[0]) / (b[0] - a[0]));
    for (let i = 0; i < 3; i++) o[i] = va[i] + (vb[i] - va[i]) * k;
    if (o[1] > Math.PI || o[1] < -Math.PI) o[1] -= Math.round(o[1] / 6.2832) * 6.2832;   // a full spin (turn about the vertical) ends where it began, so the cast can fade out without unwinding it
  }
  return out;
}
// add w * src into acc
export function addTo(acc, src, w) { if (!src || w <= 0) return acc; for (const n in src) { const s = src[n], o = acc[n] || (acc[n] = [0, 0, 0]); o[0] += s[0] * w; o[1] += s[1] * w; o[2] += s[2] * w; } return acc; }
export function clear(acc) { for (const n in acc) acc[n][0] = acc[n][1] = acc[n][2] = 0; return acc; }

// A hero standing in its idle outside the match (the effects proof page): the same base pose main.js uses (arms at the
// measured drop, elbows a little bent) with the idle clip on top. standRig(H) once per loaded hero (LOOK.loadHero),
// stand(rig, t) each frame.
const SB_BONES = ['Hips', 'Spine', 'Chest', 'Head', 'UpperArm_L', 'UpperArm_R', 'Forearm_L', 'Forearm_R', 'Thigh_L', 'Thigh_R', 'Shin_L', 'Shin_R', 'Tail'];
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function standRig(H) {
  const rig = { id: H.info && H.info.id, ph: Math.random() * 9, X: {}, T: {} }, rq = new THREE.Quaternion(); H.root.updateMatrixWorld(true); H.root.getWorldQuaternion(rq).invert();
  H.root.traverse(o => { if (o.isBone && SB_BONES.includes(o.name) && !rig[o.name]) { const w = new THREE.Quaternion(); o.getWorldQuaternion(w).premultiply(rq); rig[o.name] = { b: o, q0: o.quaternion.clone(), w, wi: w.clone().invert() }; } });
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const sd of ['L', 'R']) { const u = rig['UpperArm_' + sd], f = rig['Forearm_' + sd]; let dr = 0; if (u && f) { u.b.getWorldPosition(a); f.b.getWorldPosition(b); dr = Math.atan2(a.y - b.y, Math.abs(b.x - a.x)); } rig['dn' + sd] = Math.max(.25, 1.12 - Math.max(0, dr - .17)); }
  rig.body = H.body; rig.by0 = H.body.position.y; rig.ht = H.size ? H.size.height : 1; return rig;
}
function setB(r, n, x, y, z) { const o = r[n]; if (!o) return; const e = r.X[n]; if (e) { x += e[0]; y += e[1]; z += e[2]; } _q.setFromEuler(_e.set(x, y, z, 'XYZ')); o.b.quaternion.copy(o.q0).multiply(o.wi).multiply(_q).multiply(o.w); }
export function stand(r, t) {
  const C = CLIPS[r.id]; clear(r.X); if (C && C.idle) addTo(r.X, sample(C.idle, t + r.ph, r.T), 1);
  for (const n of SB_BONES) setB(r, n, 0, 0, 0);
  setB(r, 'UpperArm_L', 0, 0, -r.dnL); setB(r, 'UpperArm_R', 0, 0, r.dnR); setB(r, 'Forearm_L', 0, -.3, 0); setB(r, 'Forearm_R', 0, .3, 0);
  const B = r.X.Body || [0, 0, 0]; r.body.position.y = r.by0 + B[0] * r.ht;
}
