#!/usr/bin/env python3
"""מסיר דמקת שקיפות שנצרבה לתוך הפיקסלים.

הגנרטור צרב את משבצות הרקע השקוף כפיקסלים אמיתיים באזור חלק של התמונה.
החתימה היא גל ריבועי במחזור קבוע: ההפרש מול היסט של חצי מחזור גדול,
ומול היסט של מחזור שלם אפסי. את האזור שמסומן כך מחליפים בגרסה
מטושטשת בדיוק ברוחב המחזור — בשטח חלק זה מבטל את הגל ולא מוחק פרטים.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def period_of(g):
    """המחזור הוא זה שבו ההיסט של חצי מחזור הכי שונה וההיסט המלא הכי דומה.
    מינימום של ההפרש לבדו בוחר תמיד את ההיסט הקטן ביותר, כי רוב התמונה
    חלקה — זה מה שהחזיר 6 במקום 20."""
    def d(k):
        return np.abs(g[:, :-k].astype(np.int16) - g[:, k:].astype(np.int16)).mean()
    best, bs = None, -1e9
    for p in range(8, 41, 2):
        s = d(p // 2) - d(p)
        if s > bs:
            bs, best = s, p
    return best


def fix(path, out):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)
    g = a[:, :, 1].astype(np.int16)
    p = period_of(g)
    h = p // 2
    H, W = g.shape
    half = np.zeros_like(g); half[:, :W - h] = np.abs(g[:, :W - h] - g[:, h:])
    full = np.zeros_like(g); full[:, :W - p] = np.abs(g[:, :W - p] - g[:, p:])
    mask = (half > 12) & (full < 5) & (a[:, :, 3] > 120)
    if mask.sum() < 500:
        print(f'  {path}: נקי (מחזור {p}, {int(mask.sum())} פיקסלים)')
        im.save(out); return False

    # הדמקה עומדת במקום "שקוף" — הגנרטור צייר את משבצות הרקע במקום
    # לא לצייר כלום. מיצוע הגל השאיר כתם אפור בהיר בצורת אותו אזור,
    # ולכן מה שנכון הוא למחוק אותו לגמרי: אלפא 0 עם קצה מרוכך.
    m = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7))
    m = m.filter(ImageFilter.GaussianBlur(p * 0.35))
    keep = np.asarray(m).astype(np.float32) / 255.0
    out_a = a.copy()
    out_a[:, :, 3] = (a[:, :, 3].astype(np.float32) * (1 - keep)).astype(np.uint8)
    Image.fromarray(out_a, 'RGBA').save(out)
    print(f'  {path}: תוקן (מחזור {p}, {int(mask.sum())} פיקסלים נמחקו)')
    return True


for f in sys.argv[1:]:
    fix(f, f)
