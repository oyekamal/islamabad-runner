#!/usr/bin/env python3
"""Generate the game's voice lines with ElevenLabs (eleven_v3, Urdu-capable, Pakistani-accent voice).

Why this and not the local MMS model: MMS Urdu is CC-BY-NC-4.0 (non-commercial), which is a licence
risk for a Play Store release. ElevenLabs paid plans grant commercial usage rights to the generated
audio, and the delivery is far better. Key comes from synctoon's .env; never commit it.

Usage:  python3 tools/voice-elevenlabs.py [--only id1,id2] [--dry]
"""
import json, os, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'voice'
# A CAST, not one voice. Kamal wanted the lines mixed and shuffled, so each trigger's variants are
# spread across different speakers: the game already picks a random variant per trigger, so the
# voice changes by itself and the roadside sounds like several people rather than one narrator.
# Rahul leads because he is a native Urdu/Hindi voice and pronounces the lines correctly.
VOICES = {
    'rahul':  'tbNmrxvBSFe1YOyXX3mh',   # punchy energetic storyteller, native Urdu/Hindi — best diction
    'rian':   'dtb2DcRUiZX01F9bvBi0',   # energetic Indian-accent creator — the energy Kamal liked
    'raju':   'IX4AgWzTnD6q0cNvHqvK',   # real cricket-match commentator — used for the milestone calls
    'fareed': 'k42BxeBdw5qn3CqJ2slC',   # friendly Pakistani accent — warmer, used for softer beats
}
# Per-line casting. Milestones are all Raju so the commentary reads as one continuous match call;
# everything else rotates so consecutive lines rarely repeat a speaker.
CAST = {
 'pu_wah':'rahul','pu_kyabaat':'rian','pu_shabash':'fareed','pu_mazaa':'rahul','pu_ayahai':'rian',
 'cc_arre':'rian','cc_bhai':'rahul','cc_bachgaya':'fareed','cc_oye':'rahul','cc_yaar':'rian',
 'tb_chalo':'rahul','tb_full':'rian','tb_nikal':'fareed','tb_pakar':'rahul',
 'ms_shot':'raju','ms_chakka':'raju','ms_kamaal':'raju','ms_dekhte':'raju',
 'hs_zabardast':'rahul','hs_record':'raju','hs_ustaad':'fareed',
 'dd_hayehaye':'fareed','dd_gaya':'rahul','dd_afsos':'rian','dd_phirse':'fareed',
 'rv_wapas':'rahul','rv_chalo':'rian','rv_shukriya':'fareed',
 'dz_ankhen':'rahul','dz_kuch':'rian','dz_ghoom':'fareed',
}
VOICE_ID = os.environ.get('VOICE_ID')   # set to override the cast and force one voice everywhere
MODEL = 'eleven_v3'

# Arabic-script Urdu + a v3 delivery tag. The tag shapes the performance, which is the whole point:
# a meme line lives on timing, and flat narration is worse than the procedural fallback.
LINES = {
 'pu_wah':       ('[screaming with joy, very loud, hyped] واہ واہ!', ),
 'pu_kyabaat':   ('[shouting, thrilled] کیا بات ہے!', ),
 'pu_shabash':   ('[cheering loudly] شاباش!', ),
 'pu_mazaa':     ('[shouting with delight] مزہ آ گیا!', ),
 'pu_ayahai':    ('[hyped, loud] آیا مزہ!', ),
 'cc_arre':      ('[shouting, startled] ارے!', ),
 'cc_bhai':      ('[yelling in disbelief] بھائی بھائی بھائی!', ),
 'cc_bachgaya':  ('[gasping then shouting with relief] بچ گیا!', ),
 'cc_oye':       ('[loud, playful, teasing] اوئے ہوئے!', ),
 'cc_yaar':      ('[exasperated shout] یار!', ),
 'tb_chalo':     ('[screaming, urgent, fast] چلو چلو چلو!', ),
 'tb_full':      ('[yelling at the top of his lungs] فل سپیڈ!', ),
 'tb_nikal':     ('[excited shout] نکل گیا!', ),
 'tb_pakar':     ('[taunting, loud and cocky] اب پکڑو مجھے!', ),
 'ms_shot':      ('[cricket commentator screaming, crowd going wild] کیا شاٹ ہے!', ),
 'ms_chakka':    ('[cricket commentator screaming, crowd going wild, ecstatic] سیدھا چھکا!', ),
 'ms_kamaal':    ('[cricket commentator, amazed, shouting] کمال کر دیا!', ),
 'ms_dekhte':    ('[cricket commentator, very fast, breathless, excited] دیکھتے ہی دیکھتے نکل گیا!', ),
 'hs_zabardast': ('[roaring with excitement] زبردست!', ),
 'hs_record':    ('[celebrating loudly, triumphant] نیا ریکارڈ!', ),
 'hs_ustaad':    ('[impressed, shouting] استاد ہو تم!', ),
 'dd_hayehaye':  ('[groaning, deflated] ہائے ہائے...', ),
 'dd_gaya':      ('[defeated, loud sigh] گیا کام سے!', ),
 'dd_afsos':     ('[disappointed, sharp] افسوس!', ),
 'dd_phirse':    ('[encouraging, upbeat] کوئی بات نہیں، پھر سے!', ),
 'rv_wapas':     ('[shouting, triumphant] واپس آ گیا!', ),
 'rv_chalo':     ('[energetic, rallying] چلو پھر سے!', ),
 'rv_shukriya':  ('[grateful, warm] شکریہ!', ),
 'dz_ankhen':    ('[coughing hard, choking, dazed] آنکھیں بند ہو گئیں!', ),
 'dz_kuch':      ('[dazed, disoriented, coughing] کچھ نظر نہیں آ رہا!', ),
 'dz_ghoom':     ('[slurred, woozy, stumbling] سب گھوم رہا ہے!', ),
}

def synth(key, text, dest_wav, voice_id):
    body = json.dumps({
        'text': text,
        'model_id': MODEL,
        # stability 0 = most dynamic delivery, style 1 = full performance. Anything tamer reads flat,
        # which is the note Kamal gave on the first pass.
        'voice_settings': {'stability': 0.0, 'similarity_boost': 0.6, 'style': 1.0, 'use_speaker_boost': True},
    }).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_64',
        data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest_wav.write_bytes(r.read())

def main():
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('ELEVENLABS_API_KEY not set (source synctoon/.env)')
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    dry = '--dry' in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path('/tmp/voice_el'); tmp.mkdir(exist_ok=True)
    chars = sum(len(v[0]) for k, v in LINES.items() if not only or k in only)
    print(f'{len([k for k in LINES if not only or k in only])} lines, ~{chars} characters, cast={sorted(set(CAST.values()))}, model={MODEL}')
    if dry:
        return
    made = []
    for vid, (text,) in LINES.items():
        if only and vid not in only:
            continue
        mp3 = tmp / f'{vid}.mp3'
        voice_id = VOICE_ID or VOICES[CAST.get(vid, 'rahul')]
        synth(key, text, mp3, voice_id)
        dest = OUT / f'{vid}.webm'
        # mono Opus, trimmed of leading/trailing silence, loudness-normalised so no line is buried
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3),
                        '-af', 'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,'
                               'areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse,'
                               'loudnorm=I=-16:TP=-1.5:LRA=11',
                        '-ac', '1', '-c:a', 'libopus', '-b:a', '28k', str(dest)], check=True)
        made.append((vid, dest.stat().st_size))
        print(f'  {vid:16s} {CAST.get(vid, "rahul"):7s} {dest.stat().st_size/1024:5.1f} KB')
    print(f'{len(made)} clips, {sum(s for _, s in made)/1024:.0f} KB total -> {OUT}')

if __name__ == '__main__':
    main()
