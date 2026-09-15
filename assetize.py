#!/usr/bin/env python3
"""PNG גולמי מהגנרטור  →  WebP מוכן לאפליקציה, ו-assets/manifest.json.

    python3 assetize.py <תיקיית-מקור>

המקור הוא התיקייה שירדה מהדרייב, עם אותם שמות קבצים. הקבוצה נגזרת מהשם
לפי TABLE למטה, וממנה גם הגודל: החתולות מוצגות עד ~140px לוגיים ולכן 448
(מסך ×3), השאר יושב בסצנה ב-30–90px ו-256 הוא כבר כפול ממה שצריך.

דורש Pillow.  אחרי הרצה: ./bump.sh
"""
import sys, os, glob, json
from PIL import Image

# קבוצה: (גודל מרבי, רשימת שמות). גודל 0 = לא מקטינים.
TABLE = {
    'cats':      (448, ['morgana-sit', 'bellatrix-sit', 'cat-sleep', 'cat-tail-up']),
    'landmarks': (256, ['torii', 'pagoda', 'tokyo-tower', 'tsutenkaku', 'nagoya-castle']),
    'street':    (256, ['gassho-farmhouse', 'maple-tree', 'black-pine', 'vending-machine',
                        'toro', 'noren', 'chochin', 'utility-pole', 'water-tank',
                        'red-umbrella', 'chimney-smoke']),
    'sky':       (256, ['sun', 'moon', 'clouds', 'birds', 'maple-leaves', 'leaf']),
    'food':      (288, ['ramen', 'gyutan', 'takoyaki', 'onigiri', 'nigiri-salmon',
                        'matcha', 'dango', 'yaki-imo']),
    'shuin':     (320, ['shuin']),
    'special':   (0,   ['ridges', 'washi-texture']),
}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')


def group_of(stem):
    """הקבוצה של קובץ לפי שמו. הבדיקה היא על התחלת השם, כדי ש-torii-day
    ו-torii-night ייפלו שניהם על 'torii'. הארוך ביותר קודם, אחרת
    'clouds' היה תופס לפני 'clouds-night' בקבוצה אחרת."""
    best = None
    for g, (_, names) in TABLE.items():
        for n in names:
            if stem == n or stem.startswith(n + '-'):
                if best is None or len(n) > best[1]:
                    best = (g, len(n))
    return best[0] if best else None


def main(src):
    made = 0
    for p in sorted(glob.glob(os.path.join(src, '*.png'))):
        stem = os.path.splitext(os.path.basename(p))[0].strip().replace(' ', '-')
        while '--' in stem:
            stem = stem.replace('--', '-')
        g = group_of(stem)
        if not g:
            print('  דילוג (קבוצה לא ידועה):', stem)
            continue
        size = TABLE[g][0]
        im = Image.open(p).convert('RGBA')
        # washi הוא אריח מרוצף — חיתוך לגבולות היה הורס אותו
        if stem != 'washi-texture':
            bb = im.getbbox()
            if bb:
                im = im.crop(bb)
        if size and max(im.size) > size:
            im.thumbnail((size, size), Image.LANCZOS)
        os.makedirs(os.path.join(OUT, g), exist_ok=True)
        # alpha_quality=100 + exact: אלפא lossy מדליפה שוליים אפורים סביב
        # צורות עם קצה חד, וזה נראה כמו הילה סביב כל נכס
        im.save(os.path.join(OUT, g, stem + '.webp'), format='WEBP',
                quality=86, method=6, alpha_quality=100, exact=True)
        made += 1
    man = {}
    for f in sorted(glob.glob(os.path.join(OUT, '*', '*.webp'))):
        g, n = f.split(os.sep)[-2], os.path.basename(f)[:-5]
        im = Image.open(f)
        man.setdefault(g, {})[n] = {'w': im.size[0], 'h': im.size[1],
                                    'kb': round(os.path.getsize(f) / 1024, 1)}
    json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
    tot = sum(x['kb'] for v in man.values() for x in v.values())
    print(f'{made} הומרו · {sum(len(v) for v in man.values())} נכסים בסך הכל · {tot/1024:.2f} MB')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
