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
    walk: { dur: 1, loop: true, keys: [   // a boxer's jog: the guard stays up, the gloves pump in turn with the steps, the head bobs
      [0, P(arms([-.6, .1, -.4], [0, -1.6, 0]), { Head: [-.05, 0, 0] })],
      [.25, P(arms([-.42, .1, -.42], [0, -1.78, 0], [-.78, -.1, .38], [0, 1.42, 0]), { Head: [-.05, 0, 0] })],   // left foot forward: right glove out
      [.75, P(arms([-.78, .1, -.38], [0, -1.42, 0], [-.42, -.1, .42], [0, 1.78, 0]), { Head: [-.05, 0, 0] })],
      [1, P(arms([-.6, .1, -.4], [0, -1.6, 0]), { Head: [-.05, 0, 0] })]] },
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
  // shifting. Super (Blade trap, a pond of blades): he leaps with the sword held high in both hands and plunges it into
  // the ground as he lands.
  frog: {
    idle: loop(2.4,
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Head: [-.05, -.1, 0], Thigh_L: [-.3, 0, 0], Thigh_R: [-.3, 0, 0], Shin_L: [.55, 0, 0], Shin_R: [.55, 0, 0], Body: [-.04, 0, 0] }),
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.65, 0, .45], [0, 1.75, 0]), { Spine: [.24, .16, .04], Head: [-.1, .15, 0], Thigh_L: [-.38, 0, 0], Thigh_R: [-.38, 0, 0], Shin_L: [.7, 0, 0], Shin_R: [.7, 0, 0], Body: [-.06, 0, 0] }),
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Head: [-.05, .25, 0], Thigh_L: [-.3, 0, 0], Thigh_R: [-.3, 0, 0], Shin_L: [.55, 0, 0], Shin_R: [.55, 0, 0], Body: [-.04, 0, 0] }),
      P(arms([-.3, 0, -.18], [0, -1, 0], [-.65, 0, .45], [0, 1.75, 0]), { Spine: [.24, .08, -.04], Head: [-.1, -.2, 0], Thigh_L: [-.38, 0, 0], Thigh_R: [-.38, 0, 0], Shin_L: [.7, 0, 0], Shin_R: [.7, 0, 0], Body: [-.06, 0, 0] })),
    cast: cast(P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Body: [-.04, 0, 0] }),
      P(arms([-2.75, 0, -.05], [0, -.2, 0]), { Spine: [-.2, 0, 0], Head: [.2, 0, 0], Thigh_L: [-.5, 0, 0], Thigh_R: [-.5, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [.28, -.04, 0] }),
      P(arms([-.75, 0, -.12], [0, -.1, 0]), { Spine: [.7, 0, 0], Head: [-.35, 0, 0], Thigh_L: [-.7, 0, 0], Thigh_R: [-.7, 0, 0], Shin_L: [1.4, 0, 0], Shin_R: [1.4, 0, 0], Body: [-.16, .12, 0] })),
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
      P(arms([1.15, 0, -.2], [0, -.15, 0]), { Spine: [.85, 0, 0], Head: [-.55, 0, 0], Thigh_L: [-.7, 0, 0], Thigh_R: [.45, 0, 0], Shin_L: [.5, 0, 0], Shin_R: [.6, 0, 0], Body: [.05, .26, .5] }),
      P(arms([1.05, 0, -.2], [0, -.2, 0]), { Spine: [.6, 0, 0], Head: [-.4, 0, 0], Thigh_L: [-.6, 0, 0], Thigh_R: [.35, 0, 0], Shin_L: [.5, 0, 0], Shin_R: [.6, 0, 0], Body: [.03, .22, .42] })),
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
  // Super (Seed charge, the grand finale): a hop with both flippers flung up in a V (ta-da), then thrown forward at the spot.
  penguin: {
    idle: loop(1.4,
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0]), { Spine: [0, 0, .09], Head: [0, .1, -.05], Hips: [0, 0, -.06], Body: [0, 0, 0] }),
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.95, 0, .2], [0, 1.6, 0]), { Spine: [0, 0, 0], Head: [-.05, 0, 0], Hips: [0, 0, 0], Body: [.035, 0, 0] }),
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0]), { Spine: [0, 0, -.09], Head: [0, -.1, .05], Hips: [0, 0, .06], Body: [0, 0, 0] }),
      P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.95, 0, .2], [0, 1.6, 0]), { Spine: [0, 0, 0], Head: [-.05, 0, 0], Hips: [0, 0, 0], Body: [.035, 0, 0] })),
    cast: cast(P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0])),
      P(arms([-2.55, 0, .55], [0, -.2, 0]), { Spine: [-.25, 0, 0], Head: [.3, 0, 0], Body: [.28, 0, 0] }),
      P(arms([-1.5, 0, -.05], [0, -.05, 0]), { Spine: [.45, 0, 0], Head: [-.15, 0, 0], Body: [-.02, .16, .18] })),
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
      P(arms([-.35, 0, -.25], [0, -2.1, 0]), { Hips: [0, 3.3, 0], Spine: [-.15, 0, 0], Head: [.1, 0, 0], Body: [.22, -.03, 0] }),
      P(arms([-1.45, 0, -.12], [0, -.1, 0]), { Hips: [0, 6.2832, 0], Spine: [.45, 0, 0], Head: [-.2, 0, 0], Body: [.02, .18, .18] }), null,
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

// Basic attacks (lanes/core.js aname). t = 0 is the frame the rules fire the shot (core.js attack()). Keys: rest (the
// idle's first pose), wind-up at 0.05 s, hit at 0.09 s (snap), follow-through at 0.18 s, back to rest by 0.34 s.
// main.js starts the clip so the hit lands on the fire: when my own hero aims the attack first, the wind-up is held
// while aiming and the clip starts 1 frame before the hit; otherwise (a tap, auto-fire, bots) it starts 0.03 s before
// the hit, a 2 frame snap through the wind-up. Leg and hip keys only play while standing; walking keeps the walk legs
// (the body lean and lunge still play).
const atk = (rest, wind, hit, follow) => { const [a, b, c, d] = fill([rest, wind, hit, follow]);
  return { dur: .34, hit: .09, wind: .05, keys: [[0, a], [.05, b, 'i'], [.09, c, 'o'], [.18, d], [.34, a]] }; };
const rest = id => CLIPS[id].idle.keys[0][1];
// Champ, Haymaker: the right glove cocked back with the body turned, then a big hook swung across the front.
CLIPS.bear.atk = atk(rest('bear'),
  P(arms([-.7, .1, -.22], [0, -1.35, 0], [.55, 0, -.25], [0, 1.4, 0]), { Spine: [.05, .55, 0], Chest: [0, .2, 0], Head: [-.05, -.3, 0], Body: [0, -.03, 0] }),
  P(arms([-.7, .1, -.22], [0, -1.35, 0], [-1.45, 0, .55], [0, .55, 0]), { Spine: [.3, -.6, 0], Chest: [.05, -.25, 0], Head: [-.1, .2, 0], Body: [-.02, .1, 0] }),
  P(arms([-.6, .1, -.22], [0, -1.35, 0], [-1.3, 0, .85], [0, .7, 0]), { Spine: [.28, -.8, 0], Chest: [.05, -.3, 0], Head: [-.1, .25, 0], Body: [-.02, .08, 0] }));
// Hoot, Fire Arrow: bow wing out at the target, string hand drawn to the chest, then loosed and the wing held.
CLIPS.owl.atk = atk(rest('owl'),
  P(arms([-1.5, 0, -.05], [0, -.1, 0], [-1.2, 0, .35], [0, 2.2, 0]), { Spine: [-.05, -.45, 0], Head: [0, .4, 0] }),
  P(arms([-1.55, 0, -.05], [0, -.1, 0], [-1.35, 0, -.25], [0, .1, 0]), { Spine: [.08, -.3, 0], Head: [0, .3, 0], Body: [.02, -.04, 0] }),
  P(arms([-1.5, 0, -.05], [0, -.1, 0], [-1.1, 0, -.4], [0, .3, 0]), { Spine: [.05, -.3, 0], Head: [0, .3, 0] }));
// Kero, Wide Cut: the hand at the hilt by his left hip, body coiled, then a flat sweep out to his right.
CLIPS.frog.atk = atk(rest('frog'),
  P(arms([-.2, 0, -.18], [0, -1.2, 0], [-.55, 0, .75], [0, 1.9, 0]), { Spine: [.35, .85, 0], Head: [0, -.5, 0], Body: [-.08, -.04, 0] }),
  P(arms([.4, 0, -.1], [0, -.6, 0], [-1.45, 0, -.15], [0, .1, 0]), { Spine: [.45, -.7, 0], Head: [0, .4, 0], Body: [-.08, .26, .15] }),
  P(arms([.45, 0, -.1], [0, -.6, 0], [-1.3, 0, -.55], [0, .15, 0]), { Spine: [.4, -1.05, 0], Head: [0, .5, 0], Body: [-.07, .22, .12] }));
// Whiskers, Knife Toss: both paws cocked up by the ears, then a quick two-handed throw forward.
CLIPS.mouse.atk = atk(rest('mouse'),
  P(arms([-2.6, 0, .25], [0, -1.6, 0]), { Spine: [-.25, 0, 0], Head: [.1, 0, 0], Body: [.1, -.1, -.15] }),
  P(arms([-1.35, 0, -.05], [0, -.05, 0]), { Spine: [.7, 0, 0], Head: [-.4, 0, 0], Body: [0, .24, .3] }),
  P(arms([-1.1, 0, -.1], [0, -.15, 0]), { Spine: [.6, 0, 0], Head: [-.35, 0, 0], Body: [0, .2, .25] }));
// Tusk, Cannon Volley: braced, both hands forward on an unseen gun, then the recoil kicks him back.
CLIPS.elephant.atk = atk(rest('elephant'),
  P(arms([-1.35, 0, -.3], [0, -.35, 0]), { Spine: [.25, 0, 0], Head: [-.15, 0, 0], Thigh_L: [-.25, 0, 0], Thigh_R: [.15, 0, 0], Shin_L: [.4, 0, 0], Body: [-.04, .04, 0] }),
  P(arms([-1.85, 0, -.3], [0, -.2, 0]), { Spine: [-.25, 0, 0], Chest: [-.1, 0, 0], Head: [.15, 0, 0], Thigh_L: [-.25, 0, 0], Thigh_R: [.15, 0, 0], Shin_L: [.4, 0, 0], Body: [.03, -.22, -.25] }),
  P(arms([-1.5, 0, -.3], [0, -.3, 0]), { Spine: [-.1, 0, 0], Head: [.05, 0, 0], Body: [0, -.14, -.12] }));
// Presto, Spell Orb: the wand flipper up and back over the head, then flicked forward and down; a little hop.
CLIPS.penguin.atk = atk(rest('penguin'),
  P(arms([-.35, 0, -.25], [0, -1.2, 0], [-2.7, 0, -.1], [0, 1.4, 0]), { Spine: [-.3, 0, 0], Head: [.2, 0, 0], Body: [.2, -.06, -.1] }),
  P(arms([-.35, 0, -.25], [0, -1.2, 0], [-1.25, 0, .05], [0, .05, 0]), { Spine: [.55, 0, 0], Head: [-.2, 0, 0], Body: [0, .2, .25] }),
  P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.9, 0, .1], [0, .2, 0]), { Spine: [.45, 0, 0], Head: [-.15, 0, 0], Body: [0, .16, .2] }));
// Kuro, Kunai Cross: both arms crossed over the chest, then flung out forward in a cross-cut.
CLIPS.cat.atk = atk(rest('cat'),
  P(arms([-.85, 0, -.75], [0, -1.7, 0]), { Spine: [.15, 0, 0], Head: [-.2, 0, 0], Thigh_L: [-.45, 0, 0], Thigh_R: [-.45, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [-.04, -.08, -.15] }),
  P(arms([-1.3, 0, .35], [0, -.05, 0]), { Spine: [.65, 0, 0], Head: [-.3, 0, 0], Thigh_L: [-.6, 0, 0], Thigh_R: [-.2, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.7, 0, 0], Body: [-.1, .3, .25] }),
  P(arms([-1.1, 0, .45], [0, -.1, 0]), { Spine: [.4, 0, 0], Head: [-.25, 0, 0], Thigh_L: [-.55, 0, 0], Thigh_R: [-.25, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.7, 0, 0], Body: [-.1, .26, .22] }));
// Sly, Ember Dagger (a thrown dagger, core.js shoot): the dagger hand pulled back by the ear with the body turned, then
// a sidearm throw across, the free hand thrown out for balance.
CLIPS.fox.atk = atk(rest('fox'),
  P(arms([.2, 0, -.1], [0, -1, 0], [-2.2, 0, -.2], [0, 1.7, 0]), { Spine: [-.1, .85, 0], Head: [0, -.5, 0], Body: [.04, -.08, -.1] }),
  P(arms([.45, 0, -.15], [0, -.6, 0], [-1.5, 0, .2], [0, .05, 0]), { Spine: [.5, -.7, 0], Head: [-.15, .4, 0], Body: [0, .24, .22] }),
  P(arms([.4, 0, -.15], [0, -.6, 0], [-1.2, 0, .5], [0, .15, 0]), { Spine: [.45, -.9, 0], Head: [-.15, .5, 0], Body: [0, .2, .18] }));
// Bao, Salt Throw: dips with the right arm swung back low, then an underhand toss up and forward.
CLIPS.panda.atk = atk(rest('panda'),
  P(arms([-.35, 0, -.08], [0, -.5, 0], [.9, 0, .05], [0, .3, 0]), { Spine: [.35, .25, 0], Head: [-.2, -.15, 0], Body: [-.08, 0, 0] }),
  P(arms([-.35, 0, -.08], [0, -.5, 0], [-1.9, 0, .1], [0, .05, 0]), { Spine: [-.05, -.2, 0], Head: [.05, .1, 0], Body: [-.02, .06, 0] }),
  P(arms([-.35, 0, -.08], [0, -.5, 0], [-2.2, 0, .1], [0, .1, 0]), { Spine: [-.1, -.25, 0], Head: [.1, .1, 0], Body: [-.03, .05, 0] }));

// After-match moods (lanes/menu.js showResult): win, loss and draw for each hero, NOT the super cast. Each is a short intro
// played once from the hero's idle start pose, then a loop from loopFrom (keys at uneven times, so it never ticks like a
// timer; the lag above makes head, arms and tail follow late). Extra channels, read by menu.js only: Sq [stretch] (body
// taller and thinner when > 0, squashed when < 0), Yaw [turn about the vertical] and Pos [step sideways, share of height].
// No key is held still: menu.js also lays a breath (squash) and a slow sway of its own speed on each hero.
// mood(base, loopFrom, dur, [t, overrides, ease]...): every key is the base pose plus its overrides; the loop's end key is
// a copy of the key at loopFrom.
const mood = (base, loopFrom, dur, ...ks) => {
  const ps = fill([{ Sq: [0, 0, 0], Yaw: [0, 0, 0], Pos: [0, 0, 0], Body: [0, 0, 0] }, ...ks.map(k => P(base, k[1]))]).slice(1), li = ks.findIndex(k => k[0] === loopFrom);
  return { dur, loopFrom, lag: true, keys: [...ks.map((k, i) => [k[0], ps[i], k[2]]), [dur, ps[li]]] };
};
const sq = v => ({ Sq: [v, 0, 0] }), B = (l, f, p) => ({ Body: [l, f || 0, p || 0] });
const BEAR = P(arms([-.7, .1, -.22], [0, -1.35, 0]), { Spine: [.1, 0, 0], Chest: [.04, 0, 0], Head: [-.08, 0, 0] });
const GUARD_L = { UpperArm_L: [-.5, .1, -.35], Forearm_L: [0, -1.15, 0] };   // the left glove in guard low at the chest, below the chin
const OWL = P(arms([-.45, 0, -.25], [0, -.9, 0]));
const FROG = P(arms([-.3, 0, -.18], [0, -1, 0], [-.6, 0, .45], [0, 1.65, 0]), { Spine: [.18, .12, 0], Thigh_L: [-.3, 0, 0], Thigh_R: [-.3, 0, 0], Shin_L: [.55, 0, 0], Shin_R: [.55, 0, 0], Body: [-.04, 0, 0] });
const FROGLEG = (th, sh) => ({ Thigh_L: [th, 0, 0], Thigh_R: [th, 0, 0], Shin_L: [sh, 0, 0], Shin_R: [sh, 0, 0] });
const MOUSE = P(arms([-.65, 0, -.32], [0, -1.45, 0], [-.6, 0, .28], [0, 1.3, 0]), { Spine: [.3, 0, 0], Head: [-.2, 0, 0], Thigh_L: [-.2, 0, 0], Thigh_R: [-.2, 0, 0], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Body: [-.03, 0, 0] });
const ELE = P(arms([.5, 0, -.18], [0, -1.25, 0]), { Spine: [-.08, 0, 0], Chest: [-.06, 0, 0], Head: [-.06, 0, 0] });
const PEN = P(arms([-.35, 0, -.25], [0, -1.2, 0], [-.7, 0, .1], [0, .7, 0]));
const CAT = P(arms([-.9, 0, -.05], [0, -.45, 0], [.45, 0, .2], [0, 1.1, 0]), { Spine: [.3, .15, 0], Head: [-.25, -.1, 0], Thigh_L: [-.45, 0, 0], Thigh_R: [-.45, 0, 0], Shin_L: [.9, 0, 0], Shin_R: [.9, 0, 0], Body: [-.08, 0, 0] });
const CATUP = P(CAT, arms([-.85, 0, -.75], [0, -1.7, 0]), { Spine: [.05, 0, 0], Head: [-.1, 0, 0], Thigh_L: [-.1, 0, 0], Thigh_R: [-.1, 0, 0], Shin_L: [.2, 0, 0], Shin_R: [.2, 0, 0], Body: [0, 0, 0] });
const FOX = P(arms([.15, 0, .25], [0, -1.9, 0], [-.55, 0, .12], [0, 1, 0]), { Hips: [0, 0, .06], Spine: [0, 0, -.06], Head: [0, 0, -.04] });
const PANDA = P(arms([-.35, 0, -.08], [0, -.5, 0]), { Thigh_L: [-.2, 0, .3], Thigh_R: [-.2, 0, -.3], Shin_L: [.4, 0, 0], Shin_R: [.4, 0, 0], Spine: [.15, 0, 0], Head: [-.1, 0, 0], Body: [-.05, 0, 0] });
const SUMO = (th, sh, sp) => ({ Thigh_L: [th, 0, .35], Thigh_R: [th, 0, -.35], Shin_L: [sh, 0, 0], Shin_R: [sh, 0, 0] });
const MOODS = {
  // Champ: a quick one-two on the air, a crouch, then the right glove up beside his head; loop: bouncing on his toes,
  // pumping the glove down and up again, the left glove low in guard below his grin.
  // Loss: gloves drop to his sides, head down, a slow head shake.
  bear: {
    win: mood(BEAR, 1.3, 2.5,
      [0, {}],
      [.17, P(arms([-1.5, .1, -.12], [0, -.12, 0], [-.6, -.1, .28], [0, 1.5, 0]), { Spine: [.16, -.35, 0], Head: [-.1, .2, 0] }, B(0, .05)), 'o'],
      [.31, P(GUARD_L, { Spine: [.12, 0, 0] })],
      [.46, P(GUARD_L, { UpperArm_R: [-1.5, -.1, .12], Forearm_R: [0, .12, 0], Spine: [.16, .38, 0], Head: [-.1, -.2, 0] }, B(0, .05)), 'o'],
      [.62, P(GUARD_L, { Spine: [.12, 0, 0] })],
      [.82, P(GUARD_L, { UpperArm_R: [.35, 0, .1], Forearm_R: [0, 1.2, 0], Spine: [.3, .1, 0], Head: [.05, 0, 0] }, sq(-.1), B(-.05)), 'i'],
      [1.02, P(GUARD_L, { UpperArm_R: [-1.45, 0, 0], Forearm_R: [0, 1.5, 0], Spine: [-.12, .1, 0], Chest: [-.1, 0, 0], Head: [-.2, 0, 0] }, sq(.09), B(.02)), 'o'],
      [1.3, P(GUARD_L, { UpperArm_R: [-1.4, 0, 0], Forearm_R: [0, 1.55, 0], Spine: [-.06, .1, 0], Head: [-.15, .1, 0] }, sq(.05), B(.02))],
      [1.6, P(GUARD_L, { UpperArm_L: [-.6, .1, -.3], Forearm_L: [0, -1.35, 0], UpperArm_R: [-1.1, 0, 0], Forearm_R: [0, 1.85, 0], Spine: [.06, 0, .05], Head: [0, -.08, 0] }, sq(-.07), B(-.025)), 'i'],
      [1.9, P(GUARD_L, { UpperArm_R: [-1.5, 0, 0], Forearm_R: [0, 1.45, 0], Spine: [-.1, -.08, 0], Head: [-.18, -.12, 0] }, sq(.07), B(.02), { Yaw: [.16, 0, 0] }), 'o'],
      [2.2, P(GUARD_L, { UpperArm_L: [-.6, .1, -.3], Forearm_L: [0, -1.35, 0], UpperArm_R: [-1.1, 0, 0], Forearm_R: [0, 1.8, 0], Spine: [.06, 0, -.05], Head: [0, .06, 0] }, sq(-.07), B(-.025), { Yaw: [.06, 0, 0] }), 'i']),
    loss: mood(BEAR, .9, 3.5,
      [0, {}],
      [.55, P(arms([.05, 0, -.05], [0, -.3, 0]), { Spine: [.32, 0, 0], Chest: [.12, 0, 0], Head: [.48, 0, 0] }, sq(-.05), B(-.03))],
      [.9, P(arms([.02, 0, -.05], [0, -.25, 0]), { Spine: [.27, 0, 0], Chest: [.1, 0, 0], Head: [.42, 0, 0] }, sq(-.03), B(-.02))],
      [1.6, P(arms([.02, 0, -.05], [0, -.25, 0]), { Spine: [.27, .05, 0], Chest: [.1, 0, 0], Head: [.42, .32, 0] }, sq(-.03), B(-.02))],
      [2.0, P(arms([.02, 0, -.05], [0, -.25, 0]), { Spine: [.27, -.05, 0], Chest: [.1, 0, 0], Head: [.44, -.3, 0] }, sq(-.03), B(-.02))],
      [2.45, P(arms([.02, 0, -.05], [0, -.25, 0]), { Spine: [.27, 0, 0], Chest: [.1, 0, 0], Head: [.4, .12, 0] }, sq(-.03), B(-.02))],
      [2.95, P(arms([0, 0, -.08], [0, -.3, 0]), { Spine: [.2, 0, 0], Chest: [-.04, 0, 0], Head: [.36, 0, 0] }, sq(.02), B(0))]),
  },
  // Hoot: crouches, then flaps both wings up over his head; loop: two flaps with a hop, wings folded, a look left and right
  // like an owl, a nod. The wings stay bent at the elbow all the way and drop fast, with no lag on this one, so no frame
  // shows them flat out.
  // Loss: wings droop, head sinks, he looks off to one side.
  owl: {
    win: Object.assign(mood(OWL, 1.0, 3.0,
      [0, {}],
      [.25, P({ Head: [.15, 0, 0], Spine: [.1, 0, 0] }, sq(-.09), B(-.03)), 'i'],
      [.5, P(arms([-.05, 0, 2.15], [0, -1.0, 0]), { Chest: [-.16, 0, 0], Spine: [-.1, 0, 0], Head: [-.2, 0, 0] }, sq(.12), B(.08)), 'o'],
      [.75, P(arms([-.5, 0, .1], [0, -1.5, 0]), { Chest: [-.1, 0, 0], Head: [-.05, 0, 0] }, sq(-.06), B(-.01)), 'o'],
      [1.0, P({ Chest: [-.08, 0, 0], Head: [0, .1, 0] }, sq(.04), B(0))],
      [1.25, P(arms([-.05, 0, 2.15], [0, -1.0, 0]), { Chest: [-.15, 0, 0], Spine: [-.08, 0, 0], Head: [-.2, 0, 0] }, sq(.11), B(.11)), 'o'],
      [1.48, P(arms([-.55, 0, .3], [0, -1.55, 0]), { Chest: [-.1, 0, 0], Head: [-.1, 0, 0] }, sq(0), B(.03)), 'o'],
      [1.7, P(arms([-.05, 0, 1.95], [0, -1.05, 0]), { Chest: [-.14, 0, 0], Spine: [-.06, 0, 0], Head: [-.18, 0, 0] }, sq(.09), B(.09)), 'o'],
      [1.95, P({ Chest: [-.06, 0, 0], Head: [.05, 0, 0] }, sq(-.08), B(-.025)), 'o'],
      [2.25, P({ Chest: [-.08, 0, 0], Head: [0, .7, .12] }, sq(.03), B(0))],
      [2.55, P({ Chest: [-.08, 0, 0], Spine: [0, -.08, 0], Head: [-.05, -.6, -.12] }, sq(.03), B(.005))],
      [2.8, P({ Chest: [-.06, 0, 0], Head: [.28, 0, 0] }, sq(-.02), B(-.01)), 'o']), { lag: false }),
    loss: mood(OWL, .7, 3.4,
      [0, {}],
      [.7, P(arms([.1, 0, -.05], [0, -.2, 0]), { Spine: [.25, 0, 0], Chest: [.08, 0, 0], Head: [.5, 0, 0] }, sq(-.06), B(-.02))],
      [1.5, P(arms([.1, 0, -.05], [0, -.2, 0]), { Spine: [.25, .1, 0], Chest: [.08, 0, 0], Head: [.45, .55, 0] }, sq(-.06), B(-.02))],
      [2.3, P(arms([.1, 0, -.05], [0, -.2, 0]), { Spine: [.25, 0, 0], Chest: [.08, 0, 0], Head: [.5, .12, 0] }, sq(-.06), B(-.02))],
      [2.85, P(arms([.08, 0, -.06], [0, -.25, 0]), { Spine: [.2, 0, 0], Chest: [-.04, 0, 0], Head: [.42, 0, 0] }, sq(-.02), B(-.01))]),
  },
  // Kero: sinks into a deep crouch and leaps with both arms up, lands, then keeps punching one fist up with a small hop.
  // Loss: squats lower, shoulders forward, head down, slow look from side to side.
  frog: {
    win: mood(FROG, .85, 2.3,
      [0, {}],
      [.2, P(FROGLEG(-.62, 1.15), { Spine: [.32, 0, 0], Head: [.1, 0, 0] }, sq(-.12), B(-.08)), 'i'],
      [.42, P(arms([-2.6, 0, .4], [0, -.2, 0]), FROGLEG(.1, .12), { Spine: [-.05, 0, 0], Head: [-.25, 0, 0] }, sq(.14), B(.34)), 'o'],
      [.62, P(arms([-.7, 0, .45], [0, -.4, 0]), FROGLEG(-.55, 1.0), { Spine: [.3, 0, 0], Head: [-.05, 0, 0] }, sq(-.12), B(-.07)), 'i'],
      [.85, P({ UpperArm_R: [-2.45, 0, 0], Forearm_R: [0, .9, 0] }, { Spine: [.1, 0, 0], Head: [-.15, 0, 0] }, sq(.02), B(-.02))],
      [1.05, P({ UpperArm_R: [-2.15, 0, 0], Forearm_R: [0, 1.35, 0] }, FROGLEG(-.45, .82), { Spine: [.2, 0, 0], Head: [-.05, 0, 0] }, sq(-.07), B(-.06)), 'i'],
      [1.25, P({ UpperArm_R: [-2.8, 0, 0], Forearm_R: [0, .45, 0] }, FROGLEG(-.12, .22), { Spine: [0, 0, 0], Head: [-.22, .1, 0] }, sq(.08), B(.14)), 'o'],
      [1.45, P({ UpperArm_R: [-2.4, 0, 0], Forearm_R: [0, .95, 0] }, FROGLEG(-.42, .78), { Spine: [.18, 0, 0], Head: [-.08, 0, 0] }, sq(-.08), B(-.05)), 'i'],
      [1.75, P({ UpperArm_R: [-2.5, 0, 0], Forearm_R: [0, .85, 0] }, { Spine: [.12, .1, 0], Head: [-.15, -.15, 0] }, sq(.01), B(-.02))]),
    loss: mood(FROG, .55, 3.3,
      [0, {}],
      [.55, P(arms([0, 0, -.1], [0, -.3, 0]), FROGLEG(-.5, .9), { Spine: [.42, 0, 0], Head: [.28, 0, 0] }, sq(-.05), B(-.08))],
      [1.35, P(arms([0, 0, -.1], [0, -.3, 0]), FROGLEG(-.5, .9), { Spine: [.42, .08, 0], Head: [.3, .28, 0] }, sq(-.05), B(-.08))],
      [2.05, P(arms([0, 0, -.1], [0, -.3, 0]), FROGLEG(-.5, .9), { Spine: [.42, -.06, .05], Head: [.3, -.22, 0] }, sq(-.05), B(-.08))],
      [2.65, P(arms([0, 0, -.1], [0, -.3, 0]), FROGLEG(-.46, .82), { Spine: [.36, 0, 0], Head: [.25, 0, 0] }, sq(-.02), B(-.065))]),
  },
  // Whiskers: a hop with her paws up by her face, then hops from side to side, paws flung up at the top of each hop, tail
  // swishing against the hips. Loss: hunches small, paws up at her chin, little sniffling shakes, tail flat.
  mouse: {
    win: mood(MOUSE, .8, 2.0,
      [0, {}],
      [.15, P({ Spine: [.4, 0, 0] }, sq(-.1), B(-.06)), 'i'],
      [.38, P(arms([-2.3, 0, .15], [0, -1.4, 0]), { Spine: [-.1, 0, 0], Head: [-.18, 0, 0], Tail: [.3, 0, 0] }, sq(.12), B(.22)), 'o'],
      [.58, P(arms([-1.6, 0, -.1], [0, -1.6, 0]), { Spine: [.35, 0, 0] }, sq(-.1), B(-.05)), 'i'],
      [.8, P(arms([-1.3, 0, -.4], [0, -1.6, 0]), { Spine: [.35, 0, 0], Head: [-.1, .25, .12], Tail: [0, .55, 0] }, sq(-.1), B(-.03), { Pos: [-.14, 0, 0] })],
      [.98, P(arms([-2.4, 0, .3], [0, -1.2, 0]), { Spine: [.05, 0, 0], Head: [-.22, 0, 0], Tail: [0, 0, 0] }, sq(.12), B(.2), { Pos: [0, 0, 0] }), 'o'],
      [1.16, P(arms([-1.3, 0, -.4], [0, -1.6, 0]), { Spine: [.35, 0, 0], Head: [-.1, -.25, -.12], Tail: [0, -.55, 0] }, sq(-.1), B(-.03), { Pos: [.14, 0, 0] }), 'i'],
      [1.4, P(arms([-1.15, 0, -.35], [0, -1.75, 0], [-1.35, 0, .4], [0, 1.45, 0]), { Spine: [.22, 0, -.1], Head: [-.16, -.15, -.15], Tail: [0, -.3, 0] }, sq(.03), B(0), { Pos: [.14, 0, 0] })],
      [1.58, P(arms([-2.4, 0, .3], [0, -1.2, 0]), { Spine: [.05, 0, 0], Head: [-.22, 0, 0], Tail: [0, 0, 0] }, sq(.12), B(.2), { Pos: [0, 0, 0] }), 'o'],
      [1.76, P(arms([-1.3, 0, -.4], [0, -1.6, 0]), { Spine: [.35, 0, 0], Head: [-.1, .25, .12], Tail: [0, .55, 0] }, sq(-.1), B(-.03), { Pos: [-.14, 0, 0] }), 'i']),
    loss: mood(MOUSE, .6, 2.9,
      [0, {}],
      [.6, P(arms([-1.3, 0, -.42], [0, -1.9, 0]), { Spine: [.32, 0, 0], Head: [.12, 0, 0], Tail: [.35, 0, 0] }, sq(-.07), B(-.05))],
      [1.2, P(arms([-1.3, 0, -.42], [0, -1.9, 0]), { Spine: [.32, 0, 0], Head: [.14, .16, 0], Tail: [.35, 0, 0] }, sq(-.07), B(-.05))],
      [1.32, P(arms([-1.3, 0, -.42], [0, -1.9, 0]), { Spine: [.34, 0, 0], Head: [.14, -.16, 0], Tail: [.35, 0, 0] }, sq(-.05), B(-.045))],
      [1.46, P(arms([-1.3, 0, -.42], [0, -1.9, 0]), { Spine: [.32, 0, 0], Head: [.14, .12, 0], Tail: [.35, 0, 0] }, sq(-.07), B(-.05))],
      [1.7, P(arms([-1.25, 0, -.42], [0, -1.85, 0]), { Spine: [.3, 0, 0], Head: [.12, 0, 0], Tail: [.35, 0, 0] }, sq(-.06), B(-.05))]),
  },
  // Tusk: chest out, a sharp salute held for a beat, then the arm shot up and out clear of his head and the trunk raised high
  // (the trumpet), pumped with a bounce.
  // Loss: hands stay behind his back, head bowed, slow heavy sighs.
  elephant: {
    win: mood(ELE, 2.1, 3.3,
      [0, {}],
      [.3, P({ Spine: [.1, 0, 0] }, sq(-.05), B(-.02)), 'i'],
      [.6, P({ UpperArm_R: [-1.55, 0, -.55], Forearm_R: [0, 2.15, 0], Chest: [-.14, 0, 0], Head: [-.1, 0, 0] }, sq(.06), B(.02)), 'o'],
      [1.0, P({ UpperArm_R: [-1.5, 0, -.55], Forearm_R: [0, 2.1, 0], Chest: [-.12, 0, 0], Head: [.05, 0, 0] }, sq(.03), B(.01))],
      [1.3, P({ UpperArm_R: [-1.55, 0, -.55], Forearm_R: [0, 2.15, 0], Chest: [-.14, 0, 0], Head: [-.08, .08, 0] }, sq(.05), B(.015))],
      [1.6, P({ UpperArm_R: [-1.55, 0, -1.6], Forearm_R: [0, .25, 0], Spine: [-.18, 0, 0], Head: [-.6, 0, 0] }, sq(.1), B(.05)), 'o'],
      [2.1, P({ UpperArm_R: [-1.45, 0, -1.6], Forearm_R: [0, .4, 0], Spine: [-.12, 0, 0], Head: [-.55, .08, 0] }, sq(.04), B(.02))],
      [2.4, P({ UpperArm_R: [-1.7, 0, -1.5], Forearm_R: [0, .1, 0], Spine: [-.18, .05, 0], Head: [-.65, -.06, 0] }, sq(.08), B(.05)), 'o'],
      [2.7, P({ UpperArm_R: [-1.35, 0, -1.65], Forearm_R: [0, .55, 0], Spine: [-.08, 0, 0], Head: [-.45, .1, 0] }, sq(-.04), B(-.01)), 'i'],
      [3.0, P({ UpperArm_R: [-1.7, 0, -1.5], Forearm_R: [0, .15, 0], Spine: [-.16, -.05, 0], Head: [-.62, -.1, 0] }, sq(.07), B(.04), { Yaw: [.1, 0, 0] }), 'o']),
    loss: mood(ELE, .7, 3.7,
      [0, {}],
      [.7, P({ Spine: [.2, 0, 0], Chest: [.05, 0, 0], Head: [.28, 0, 0] }, sq(-.04), B(-.02))],
      [1.6, P({ Spine: [.12, 0, 0], Chest: [-.06, 0, 0], Head: [.2, 0, 0] }, sq(.02), B(.01))],
      [2.4, P({ Spine: [.24, 0, 0], Chest: [.08, 0, 0], Head: [.32, 0, 0] }, sq(-.06), B(-.03))],
      [3.1, P({ Spine: [.2, 0, 0], Chest: [.05, 0, 0], Head: [.3, .2, 0] }, sq(-.04), B(-.02))]),
  },
  // Presto: a stage bow, face kept up (one flipper across the belly, the other swept out), then up with both flippers in a
  // V (ta-da); the loop waggles the flippers in turn with a waddle, tips an invisible hat with a nod, and hops. Loss: flippers hang, head down, a slow sad waddle.
  penguin: {
    win: mood(PEN, 1.45, 3.25,
      [0, {}],
      [.38, P(arms([-.6, 0, -.5], [0, -1.4, 0], [-.2, 0, -.9], [0, .2, 0]), { Spine: [.38, 0, 0], Chest: [.08, 0, 0], Head: [-.15, 0, 0] }, B(-.02))],
      [.75, P(arms([-.6, 0, -.5], [0, -1.4, 0], [-.2, 0, -.95], [0, .2, 0]), { Spine: [.42, 0, 0], Chest: [.1, 0, 0], Head: [-.12, 0, 0] }, sq(-.04), B(-.03)), 'i'],
      [1.0, P(arms([-2.55, 0, .55], [0, -.2, 0]), { Spine: [-.15, 0, 0], Head: [-.18, 0, 0] }, sq(.11), B(.12)), 'o'],
      [1.22, P(arms([-2.4, 0, .5], [0, -.25, 0]), { Spine: [-.05, 0, 0], Head: [-.1, 0, 0] }, sq(-.07), B(0))],
      [1.45, P(arms([-2.3, 0, .5], [0, -.3, 0]), { Spine: [-.05, 0, 0], Head: [-.1, 0, 0] }, sq(0), B(0))],
      [1.75, P(arms([-2.7, 0, .8], [0, -.1, 0], [-1.9, 0, -.45], [0, .7, 0]), { Spine: [0, 0, .12], Hips: [0, 0, -.08], Head: [-.1, .15, -.1] }, sq(.03), B(.03)), 'o'],
      [2.05, P(arms([-1.9, 0, .45], [0, -.7, 0], [-2.7, 0, -.8], [0, .1, 0]), { Spine: [0, 0, -.12], Hips: [0, 0, .08], Head: [-.1, -.15, .1] }, sq(.03), B(.03)), 'o'],
      [2.4, P(arms([-1.0, 0, .6], [0, -.5, 0], [-2.3, 0, -.2], [0, 1.6, 0]), { Spine: [.12, 0, 0], Head: [.25, 0, .1] }, sq(-.04), B(-.01))],   // a hat-tip: flipper to the brow, a nod
      [2.75, P(arms([-2.5, 0, .7], [0, -.2, 0]), { Spine: [-.1, 0, 0], Head: [-.15, 0, 0] }, sq(.1), B(.1)), 'o'],
      [3.0, P(arms([-2.25, 0, .55], [0, -.35, 0]), { Spine: [0, 0, 0], Head: [-.08, 0, 0] }, sq(-.06), B(-.01)), 'i']),
    loss: mood(PEN, .6, 3.0,
      [0, {}],
      [.6, P(arms([.1, 0, -.1], [0, -.1, 0]), { Spine: [.25, 0, 0], Head: [.5, 0, 0] }, sq(-.04), B(-.02))],
      [1.2, P(arms([.1, 0, -.12], [0, -.1, 0]), { Spine: [.25, 0, .08], Hips: [0, 0, -.05], Head: [.5, 0, .1] }, sq(-.03), B(-.01))],
      [1.8, P(arms([.1, 0, -.1], [0, -.1, 0]), { Spine: [.27, 0, 0], Head: [.52, 0, 0] }, sq(-.05), B(-.025))],
      [2.4, P(arms([.1, 0, -.08], [0, -.1, 0]), { Spine: [.25, 0, -.08], Hips: [0, 0, .05], Head: [.5, 0, -.1] }, sq(-.03), B(-.01))]),
  },
  // Kuro: coils, a spinning leap, lands and rises with her arms crossed; loop: head tilts side to side, tail flicks, weight
  // from hip to hip, a two-finger flick by her face. Loss: drops into a low crouch, looks away, tail low.
  cat: {
    win: mood(CATUP, 1.2, 3.6,
      [0, CAT],
      [.3, P(CAT, { Thigh_L: [-.65, 0, 0], Thigh_R: [-.65, 0, 0], Shin_L: [1.25, 0, 0], Shin_R: [1.25, 0, 0], Spine: [.4, 0, 0] }, sq(-.1), B(-.14)), 'i'],
      [.6, P(arms([-1.3, 0, .35], [0, -.05, 0]), { Spine: [-.05, 0, 0], Head: [-.15, 0, 0], Tail: [0, .6, 0] }, sq(.1), B(.24), { Yaw: [3.1416, 0, 0] }), 'o'],
      [.9, P(arms([-1.2, 0, .4], [0, -.1, 0]), { Thigh_L: [-.5, 0, 0], Thigh_R: [-.5, 0, 0], Shin_L: [1.0, 0, 0], Shin_R: [1.0, 0, 0], Spine: [.35, 0, 0], Tail: [0, -.4, 0] }, sq(-.1), B(-.09), { Yaw: [6.2832, 0, 0] }), 'i'],
      [1.2, P({ Hips: [0, 0, .06], Head: [-.1, .1, .22], Tail: [0, .6, 0] }, { Yaw: [6.2832, 0, 0] })],
      [1.55, P({ Hips: [0, 0, .06], Head: [-.12, .15, .26], Tail: [0, -.5, 0] }, sq(.03), B(.015), { Yaw: [6.2832, 0, 0] })],
      [1.9, P({ Hips: [0, 0, -.06], Spine: [.05, 0, .05], Head: [-.1, -.2, -.24], Tail: [0, .7, 0] }, { Yaw: [6.2832, 0, 0] })],
      [2.25, P({ Hips: [0, 0, -.06], Spine: [.05, 0, .05], Head: [.12, -.1, -.1], Tail: [0, .1, 0] }, sq(-.02), { Yaw: [6.2832, 0, 0] })],
      [2.6, P({ UpperArm_R: [-1.9, 0, -.2], Forearm_R: [0, 1.35, 0], Head: [-.15, -.25, .18], Tail: [0, .65, 0] }, sq(.04), B(.02), { Yaw: [6.2832, 0, 0] }), 'o'],
      [2.95, P({ Head: [-.1, .05, .22], Tail: [0, -.6, 0] }, { Yaw: [6.2832, 0, 0] })],
      [3.3, P({ Hips: [0, 0, .06], Head: [-.1, .15, .1], Tail: [0, .3, 0] }, sq(.02), B(.01), { Yaw: [6.2832, 0, 0] })]),
    loss: mood(CAT, .6, 3.0,
      [0, {}],
      [.6, P(arms([-.3, 0, -.1], [0, -.5, 0]), { Thigh_L: [-.6, 0, 0], Thigh_R: [-.6, 0, 0], Shin_L: [1.15, 0, 0], Shin_R: [1.15, 0, 0], Spine: [.3, .3, 0], Head: [.1, .5, 0], Tail: [.4, 0, 0] }, sq(-.04), B(-.12))],
      [1.5, P(arms([-.3, 0, -.1], [0, -.5, 0]), { Thigh_L: [-.6, 0, 0], Thigh_R: [-.6, 0, 0], Shin_L: [1.15, 0, 0], Shin_R: [1.15, 0, 0], Spine: [.3, .25, 0], Head: [.14, .35, 0], Tail: [.4, .3, 0] }, sq(-.04), B(-.12))],
      [2.2, P(arms([-.3, 0, -.1], [0, -.5, 0]), { Thigh_L: [-.6, 0, 0], Thigh_R: [-.6, 0, 0], Shin_L: [1.15, 0, 0], Shin_R: [1.15, 0, 0], Spine: [.3, .32, 0], Head: [.06, .55, 0], Tail: [.4, -.2, 0] }, sq(-.05), B(-.12))]),
  },
  // Sly: from a smug lean, a dip and a big overhead coin toss with the body rising, her head following it up, a low catch,
  // shows the coin, back to the lean; again. Loss: a shrug with both hands out, then hands drop and a head shake.
  fox: {
    win: mood(FOX, .3, 2.3,
      [0, {}],
      [.3, P({ UpperArm_R: [.15, 0, -.25], Forearm_R: [0, 1.9, 0], Spine: [-.12, 0, -.08], Hips: [0, 0, .08], Head: [-.1, 0, -.15], Tail: [0, .4, 0] })],
      [.65, P({ UpperArm_R: [.35, 0, .1], Forearm_R: [0, .7, 0], Spine: [.25, .2, 0], Head: [.1, 0, 0], Tail: [0, -.2, 0] }, sq(-.07), B(-.04)), 'i'],
      [.9, P({ UpperArm_R: [-2.5, 0, -.75], Forearm_R: [0, .05, 0], UpperArm_L: [-.4, 0, .6], Forearm_L: [0, -.4, 0], Spine: [-.25, -.15, -.1], Head: [-.5, 0, 0], Tail: [0, .6, 0] }, sq(.12), B(.1), { Yaw: [.35, 0, 0] }), 'o'],
      [1.3, P({ UpperArm_R: [-2.4, 0, -.7], Forearm_R: [0, .2, 0], UpperArm_L: [-.35, 0, .5], Forearm_L: [0, -.5, 0], Spine: [-.2, -.1, -.08], Head: [-.6, .1, 0] }, sq(.05), B(.05), { Yaw: [.25, 0, 0] })],
      [1.6, P({ UpperArm_R: [-1.2, 0, .1], Forearm_R: [0, .45, 0], Spine: [.45, 0, 0], Head: [.1, 0, 0], Tail: [0, -.5, 0], Thigh_L: [-.35, 0, 0], Thigh_R: [-.35, 0, 0], Shin_L: [.6, 0, 0], Shin_R: [.6, 0, 0] }, sq(-.1), B(-.08)), 'o'],
      [1.9, P({ UpperArm_R: [-1.6, 0, -.3], Forearm_R: [0, 1.2, 0], Spine: [-.05, 0, 0], Head: [-.1, .2, -.1], Tail: [0, .2, 0] }, sq(.02), B(.02))]),
    loss: mood(FOX, .9, 3.3,
      [0, {}],
      [.4, P(arms([-.4, 0, .6], [0, -1.2, 0]), { Chest: [-.05, 0, 0], Head: [0, 0, .15], Hips: [0, 0, 0], Spine: [0, 0, 0] }, sq(.03), B(.02)), 'o'],
      [.9, P(arms([.05, 0, -.05], [0, -.3, 0]), { Spine: [.2, 0, 0], Head: [.35, 0, 0], Tail: [.3, 0, 0] }, sq(-.03), B(-.02))],
      [1.6, P(arms([.05, 0, -.05], [0, -.3, 0]), { Spine: [.2, 0, 0], Head: [.35, .25, 0], Tail: [.3, 0, 0] }, sq(-.03), B(-.02))],
      [1.9, P(arms([.05, 0, -.05], [0, -.3, 0]), { Spine: [.2, 0, 0], Head: [.36, -.25, 0], Tail: [.3, 0, 0] }, sq(-.03), B(-.02))],
      [2.25, P(arms([.05, 0, -.05], [0, -.3, 0]), { Spine: [.2, 0, 0], Head: [.34, .08, 0], Tail: [.3, 0, 0] }, sq(-.03), B(-.02))]),
  },
  // Bao: the sumo shiko, a leg raised high to the side and stamped down, then hands on his belly, head back, laughing so his
  // belly bounces. Loss: sinks into a heavier squat, hands on his knees, head down, big slow sighs.
  panda: {
    win: mood(PANDA, 1.1, 2.55,
      [0, {}],
      [.38, P(arms([-.5, 0, -.15], [0, -.6, 0], [-.3, 0, .1], [0, .4, 0]), { Thigh_L: [-.15, 0, .2], Thigh_R: [-.6, 0, -1], Shin_L: [.2, 0, 0], Shin_R: [.7, 0, 0], Spine: [.05, 0, .3], Head: [0, 0, -.15] }, sq(.04), B(.08)), 'io'],
      [.56, P(arms([-.8, 0, -.05], [0, -.3, 0]), SUMO(-.35, .7), { Spine: [.35, 0, 0], Head: [-.2, 0, 0] }, sq(-.14), B(-.12)), 'o'],
      [.85, P(SUMO(-.25, .5), { Spine: [.2, 0, 0] }, sq(.04), B(-.05))],
      [1.1, P(arms([-.7, 0, -.4], [0, -1.2, 0]), SUMO(-.2, .4), { Spine: [-.05, 0, 0], Head: [-.25, 0, 0] }, sq(0), B(-.04))],
      [1.3, P(arms([-.8, 0, -.3], [0, -1.0, 0]), SUMO(-.18, .36), { Spine: [-.08, 0, 0], Chest: [-.1, 0, 0], Head: [-.3, .05, 0] }, sq(.045), B(-.015)), 'o'],
      [1.5, P(arms([-.7, 0, -.4], [0, -1.2, 0]), SUMO(-.22, .45), { Spine: [-.04, 0, 0], Head: [-.22, 0, 0] }, sq(-.04), B(-.05)), 'i'],
      [1.72, P(arms([-.8, 0, -.3], [0, -1.0, 0]), SUMO(-.18, .36), { Spine: [-.08, 0, 0], Chest: [-.1, 0, 0], Head: [-.3, -.05, 0] }, sq(.04), B(-.015)), 'o'],
      [1.95, P(arms([-.7, 0, -.4], [0, -1.2, 0]), SUMO(-.22, .45), { Spine: [-.04, 0, 0], Head: [-.22, 0, 0] }, sq(-.04), B(-.05)), 'i']),
    loss: mood(PANDA, .6, 3.6,
      [0, {}],
      [.6, P(arms([-.6, 0, -.05], [0, -.2, 0]), SUMO(-.35, .7), { Spine: [.4, 0, 0], Head: [.4, 0, 0] }, sq(-.04), B(-.08))],
      [1.6, P(arms([-.6, 0, -.05], [0, -.2, 0]), SUMO(-.32, .64), { Spine: [.32, 0, 0], Chest: [-.1, 0, 0], Head: [.3, 0, 0] }, sq(.03), B(-.05))],
      [2.4, P(arms([-.6, 0, -.05], [0, -.2, 0]), SUMO(-.37, .74), { Spine: [.42, 0, 0], Head: [.45, 0, 0] }, sq(-.06), B(-.09))],
      [3.0, P(arms([-.6, 0, -.05], [0, -.2, 0]), SUMO(-.35, .7), { Spine: [.4, 0, 0], Head: [.42, .2, 0] }, sq(-.04), B(-.08))]),
  },
};
// Draw: a shrug (both hands out, palms up, shoulders and head tilted), back to the idle start pose, then a slow breath and a
// look to each side.
for (const id in MOODS) {
  const r0 = CLIPS[id].idle.keys[0][1];
  MOODS[id].draw = mood(r0, 1.25, 3.65,
    [0, {}],
    [.35, P(arms([-.45, 0, .55], [0, -1.3, 0]), { Chest: [-.06, 0, .08], Head: [.05, .1, .2] }, sq(.04), B(.02)), 'o'],
    [.8, P(arms([-.42, 0, .5], [0, -1.25, 0]), { Chest: [-.05, 0, .06], Head: [.08, .05, .18] }, sq(.03), B(.015))],
    [1.25, {}],
    [1.85, P({ Spine: [0, .1, 0], Head: [-.04, .3, .08] }, sq(.02), B(.008))],
    [2.45, P({ Chest: [-.06, 0, 0], Head: [-.06, 0, 0] }, sq(.03), B(.014))],
    [3.05, P({ Spine: [0, -.1, 0], Head: [.02, -.3, -.08] }, sq(-.01))]);
  for (const k of ['win', 'loss']) CLIPS[id][k] = MOODS[id][k];
  CLIPS[id].draw = MOODS[id].draw;
}

// sample a clip at time t into out {Bone:[x,y,z]}; returns out
// Overlapping action (clips with lag: the idles, the walk overlay, the result moods): each bone runs a little behind the
// body, the head and the forearms later still, the tail last, and the two arms not quite together, so a loop never hits
// every pose on the same frame (the look he called robotic). Seconds behind the hips.
const LAG = { Spine: .03, Chest: .06, Head: .13, UpperArm_L: .05, UpperArm_R: .08, Forearm_L: .1, Forearm_R: .13, Tail: .22, Tail2: .3 };
// a clip with loopFrom plays its intro once (0 to loopFrom) and then loops from loopFrom to dur
const ctime = (clip, t) => clip.loopFrom !== undefined ? (t < clip.loopFrom ? Math.max(0, t) : clip.loopFrom + (t - clip.loopFrom) % (clip.dur - clip.loopFrom))
  : clip.loop ? ((t % clip.dur) + clip.dur) % clip.dur : Math.max(clip.keys[0][0], Math.min(t, clip.keys[clip.keys.length - 1][0]));
export function sample(clip, t0, out) {
  const K = clip.keys; out = out || {};
  for (const n in out) out[n][0] = out[n][1] = out[n][2] = 0;
  const lag = clip.lag !== undefined ? clip.lag : !!clip.loop;
  const names = clip._n || (clip._n = [...new Set(K.flatMap(k => Object.keys(k[1])))]);
  for (const n of names) {
    const t = ctime(clip, t0 - (lag && LAG[n] || 0));
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
// the same, with the leg and hip keys at weight wl (an attack while walking keeps the walk's legs)
const LEGS = new Set(['Hips', 'Thigh_L', 'Thigh_R', 'Shin_L', 'Shin_R']);
export function addSplit(acc, src, w, wl) { if (!src || w <= 0) return acc; for (const n in src) { const s = src[n], k = LEGS.has(n) ? w * wl : w, o = acc[n] || (acc[n] = [0, 0, 0]); o[0] += s[0] * k; o[1] += s[1] * k; o[2] += s[2] * k; } return acc; }
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
