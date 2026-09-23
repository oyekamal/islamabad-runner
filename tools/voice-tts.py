#!/usr/bin/env python3
"""Generate the voice lines with the local MMS Urdu TTS model.

LICENCE WARNING: facebook/mms-tts-urd-script_arabic is CC-BY-NC-4.0 (non-commercial). Clips made
with it are fine for development and testing, but must be cleared or replaced with original
recordings before a commercial/Play Store release. See docs/flavour-plan.md.

Usage:  python3 tools/voice-tts.py           # writes public/voice/<id>.webm
"""
import json, subprocess, sys, os
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'voice'
MODEL = 'facebook/mms-tts-urd-script_arabic'

# Arabic-script Urdu for each line id (the model reads script, not transliteration).
URDU = {
 'pu_wah': 'واہ واہ', 'pu_kyabaat': 'کیا بات ہے', 'pu_shabash': 'شاباش',
 'pu_mazaa': 'مزہ آ گیا', 'pu_ayahai': 'آیا مزہ',
 'cc_arre': 'ارے', 'cc_bhai': 'بھائی بھائی بھائی', 'cc_bachgaya': 'بچ گیا',
 'cc_oye': 'اوئے ہوئے', 'cc_yaar': 'یار',
 'tb_chalo': 'چلو چلو چلو', 'tb_full': 'فل سپیڈ', 'tb_nikal': 'نکل گیا',
 'tb_pakar': 'اب پکڑو مجھے',
 'ms_shot': 'کیا شاٹ ہے', 'ms_chakka': 'سیدھا چھکا', 'ms_kamaal': 'کمال کر دیا',
 'ms_dekhte': 'دیکھتے ہی دیکھتے نکل گیا',
 'hs_zabardast': 'زبردست', 'hs_record': 'نیا ریکارڈ', 'hs_ustaad': 'استاد ہو تم',
 'dd_hayehaye': 'ہائے ہائے', 'dd_gaya': 'گیا کام سے', 'dd_afsos': 'افسوس',
 'dd_phirse': 'کوئی بات نہیں، پھر سے',
 'rv_wapas': 'واپس آ گیا', 'rv_chalo': 'چلو پھر سے', 'rv_shukriya': 'شکریہ',
 'dz_ankhen': 'آنکھیں بند ہو گئیں', 'dz_kuch': 'کچھ نظر نہیں آ رہا',
 'dz_ghoom': 'سب گھوم رہا ہے',
}

def main():
    import torch, scipy.io.wavfile as wav
    from transformers import VitsModel, AutoTokenizer
    print(f'loading {MODEL} (CPU)...')
    model = VitsModel.from_pretrained(MODEL)
    tok = AutoTokenizer.from_pretrained(MODEL)
    model.eval()
    OUT.mkdir(parents=True, exist_ok=True)
    sr = model.config.sampling_rate
    tmp = Path('/tmp/voice_wav'); tmp.mkdir(exist_ok=True)
    made = []
    for vid, text in URDU.items():
        inputs = tok(text, return_tensors='pt')
        with torch.no_grad():
            wave = model(**inputs).waveform[0].cpu().numpy()
        peak = float(abs(wave).max()) or 1.0
        wave = (wave / peak) * 0.92                      # normalise so quiet lines still cut through
        w = tmp / f'{vid}.wav'
        wav.write(w, sr, (wave * 32767).astype('int16'))
        dest = OUT / f'{vid}.webm'
        # mono Opus at a low bitrate: these are short shouts, not music
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(w),
                        '-ac', '1', '-c:a', 'libopus', '-b:a', '24k', str(dest)], check=True)
        made.append((vid, dest.stat().st_size, len(wave) / sr))
    total = sum(s for _, s, _ in made)
    print(f'{len(made)} clips, {total/1024:.0f} KB total, '
          f'longest {max(d for _,_,d in made):.2f}s')
    for vid, size, dur in made:
        print(f'  {vid:16s} {size/1024:5.1f} KB  {dur:.2f}s')

if __name__ == '__main__':
    main()
