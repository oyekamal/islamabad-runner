/**
 * Pakistani street-Urdu voice stingers.
 *
 * LICENCE RULE (see docs/flavour-plan.md): every line here is generic spoken Urdu or wording we
 * wrote ourselves. Nothing is transcribed from a broadcast, drama, talk show or viral clip, and no
 * recording may ever be sampled from one — those are owned even when everybody repeats them.
 * Record them yourself with tools/voice-recorder.html.
 *
 * Files live in public/voice/<id>.webm and are OPTIONAL. With none present the game falls back to
 * procedural stingers and plays perfectly.
 */

const L = (id, urdu, meaning) => ({ id, urdu, meaning });

export const VOICE_LINES = {
  // grabbing a power-up
  powerup: [
    L('pu_wah', 'Wah wah!', 'Nice! / Bravo!'),
    L('pu_kyabaat', 'Kya baat hai!', 'What a thing! — admiration'),
    L('pu_shabash', 'Shabash!', 'Well done!'),
    L('pu_mazaa', 'Mazaa aa gaya!', 'That was fun! / Loved it!'),
    L('pu_ayahai', 'Aya maza!', 'Now that is fun!'),
  ],
  // squeaked past something
  closeCall: [
    L('cc_arre', 'Arre!', 'Whoa! / Hey!'),
    L('cc_bhai', 'Bhai bhai bhai!', 'Brother brother brother! — disbelief'),
    L('cc_bachgaya', 'Bach gaya!', 'Made it! / Survived!'),
    L('cc_oye', 'Oye hoye!', 'Oh my! — playful shock'),
    L('cc_yaar', 'Yaaaar!', 'Duuude!'),
  ],
  // Turbo
  turbo: [
    L('tb_chalo', 'Chalo chalo chalo!', 'Go go go!'),
    L('tb_full', 'Full speed!', 'Full speed!'),
    L('tb_nikal', 'Nikal gaya!', 'Off he goes!'),
    L('tb_pakar', 'Ab pakro mujhe!', 'Now catch me!'),
  ],
  // milestone lap — cricket-commentary energy, our own wording
  milestone: [
    L('ms_shot', 'Kya shot hai!', 'What a shot!'),
    L('ms_chakka', 'Seedha chakka!', 'A straight six!'),
    L('ms_kamaal', 'Kamaal kar diya!', 'He has done something wonderful!'),
    L('ms_dekhte', 'Dekhte hi dekhte nikal gaya!', 'Gone in the blink of an eye!'),
  ],
  // new personal best
  highScore: [
    L('hs_zabardast', 'Zabardast!', 'Outstanding!'),
    L('hs_record', 'Naya record!', 'New record!'),
    L('hs_ustaad', 'Ustaad ho tum!', 'You are a master!'),
  ],
  // caught
  death: [
    L('dd_hayehaye', 'Haye haye...', 'Oh dear...'),
    L('dd_gaya', 'Gaya kaam se!', 'Done for!'),
    L('dd_afsos', 'Afsos!', 'What a shame!'),
    L('dd_phirse', 'Koi baat nahi, phir se!', 'Never mind, again!'),
  ],
  // continued after paying
  revive: [
    L('rv_wapas', 'Wapas aa gaya!', 'He is back!'),
    L('rv_chalo', 'Chalo phir se!', 'Off we go again!'),
    L('rv_shukriya', 'Shukriya!', 'Thank you!'),
  ],
  // teargas
  dizzy: [
    L('dz_ankhen', 'Ankhen band ho gayin!', 'My eyes have shut!'),
    L('dz_kuch', 'Kuch nazar nahi aa raha!', 'I cannot see a thing!'),
    L('dz_ghoom', 'Sab ghoom raha hai!', 'Everything is spinning!'),
  ],
};

/** Flat list for the recorder page and for the packaging script. */
export const ALL_LINES = Object.entries(VOICE_LINES).flatMap(([trigger, lines]) =>
  lines.map((l) => ({ ...l, trigger })));
