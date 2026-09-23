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
VOICE_ID = os.environ.get('VOICE_ID', 'k42BxeBdw5qn3CqJ2slC')   # Fareed — friendly Pakistani accent, male
MODEL = 'eleven_v3'

# Arabic-script Urdu + a v3 delivery tag. The tag shapes the performance, which is the whole point:
# a meme line lives on timing, and flat narration is worse than the procedural fallback.
LINES = {
 'pu_wah':       ('[excited] واہ واہ!', ),
 'pu_kyabaat':   ('[excited] کیا بات ہے!', ),
 'pu_shabash':   ('[cheerfully] شاباش!', ),
 'pu_mazaa':     ('[excited] مزہ آ گیا!', ),
 'pu_ayahai':    ('[happily] آیا مزہ!', ),
 'cc_arre':      ('[surprised] ارے!', ),
 'cc_bhai':      ('[shocked] بھائی بھائی بھائی!', ),
 'cc_bachgaya':  ('[relieved] بچ گیا!', ),
 'cc_oye':       ('[playfully] اوئے ہوئے!', ),
 'cc_yaar':      ('[exasperated] یار!', ),
 'tb_chalo':     ('[shouting] چلو چلو چلو!', ),
 'tb_full':      ('[shouting] فل سپیڈ!', ),
 'tb_nikal':     ('[excited] نکل گیا!', ),
 'tb_pakar':     ('[teasing] اب پکڑو مجھے!', ),
 'ms_shot':      ('[sports commentator, excited] کیا شاٹ ہے!', ),
 'ms_chakka':    ('[sports commentator, shouting] سیدھا چھکا!', ),
 'ms_kamaal':    ('[sports commentator, amazed] کمال کر دیا!', ),
 'ms_dekhte':    ('[sports commentator, fast] دیکھتے ہی دیکھتے نکل گیا!', ),
 'hs_zabardast': ('[amazed] زبردست!', ),
 'hs_record':    ('[celebrating] نیا ریکارڈ!', ),
 'hs_ustaad':    ('[impressed] استاد ہو تم!', ),
 'dd_hayehaye':  ('[disappointed] ہائے ہائے...', ),
 'dd_gaya':      ('[defeated] گیا کام سے!', ),
 'dd_afsos':     ('[sad] افسوس!', ),
 'dd_phirse':    ('[encouraging] کوئی بات نہیں، پھر سے!', ),
 'rv_wapas':     ('[excited] واپس آ گیا!', ),
 'rv_chalo':     ('[cheerfully] چلو پھر سے!', ),
 'rv_shukriya':  ('[grateful] شکریہ!', ),
 'dz_ankhen':    ('[coughing, dazed] آنکھیں بند ہو گئیں!', ),
 'dz_kuch':      ('[dazed] کچھ نظر نہیں آ رہا!', ),
 'dz_ghoom':     ('[dizzy, slurred] سب گھوم رہا ہے!', ),
}

def synth(key, text, dest_wav):
    body = json.dumps({
        'text': text,
        'model_id': MODEL,
        'voice_settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.6},
    }).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_64',
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
    print(f'{len([k for k in LINES if not only or k in only])} lines, ~{chars} characters, voice={VOICE_ID}, model={MODEL}')
    if dry:
        return
    made = []
    for vid, (text,) in LINES.items():
        if only and vid not in only:
            continue
        mp3 = tmp / f'{vid}.mp3'
        synth(key, text, mp3)
        dest = OUT / f'{vid}.webm'
        # mono Opus, trimmed of leading/trailing silence, loudness-normalised so no line is buried
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3),
                        '-af', 'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,'
                               'areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse,'
                               'loudnorm=I=-16:TP=-1.5:LRA=11',
                        '-ac', '1', '-c:a', 'libopus', '-b:a', '28k', str(dest)], check=True)
        made.append((vid, dest.stat().st_size))
        print(f'  {vid:16s} {dest.stat().st_size/1024:5.1f} KB')
    print(f'{len(made)} clips, {sum(s for _, s in made)/1024:.0f} KB total -> {OUT}')

if __name__ == '__main__':
    main()
