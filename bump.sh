#!/usr/bin/env bash
# מעלה את מחרוזת המטמון (?v=) בכל קבצי ה-HTML — הרץ אחרי כל שינוי ב-data.js/*.css/*.js
# שימוש:  ./bump.sh          (תאריך היום + מונה רץ)
set -euo pipefail
cd "$(dirname "$0")"
today=$(date +%Y%m%d)
cur=$(grep -oh '?v=[0-9a-z]*' ./*.html | head -1 | cut -d= -f2)

# מונה מספרי ולא אות רצה. הגרסה הקודמת גלגלה אות עם tr 'a-y' 'b-z', ו-z לא
# נמצא בקבוצת המקור — כלומר אחרי 26 העלאות ביום אחד הגרסה נתקעה על z בשקט,
# sw.js הפסיק להשתנות, ושום מכשיר לא זיהה גרסה חדשה יותר.
suf=${cur#"$today"}
if [[ "$cur" == "$today"* && "$suf" =~ ^[0-9]+$ ]]; then
  n=$(( 10#$suf + 1 ))
elif [[ "$cur" == "$today"* ]]; then
  n=27                      # אחרי סיומת אות ישנה — ממשיכים מעבר לאלפבית
else
  n=1
fi
new=$(printf '%s%02d' "$today" "$n")

if [[ "$new" == "$cur" ]]; then
  echo "❌ מחרוזת המטמון לא השתנתה ($cur) — שום מכשיר לא יזהה גרסה חדשה." >&2
  exit 1
fi

sed -i "s/?v=[0-9a-z]*/?v=$new/g" ./*.html
sed -i "s/^const V = '[0-9a-z]*';/const V = '$new';/" sw.js

# רשת ביטחון אחרונה: לוודא שזה באמת נכתב לקבצים, ולא רק חושב
grep -q "const V = '$new';" sw.js || { echo "❌ sw.js לא עודכן ל-$new" >&2; exit 1; }
node build-trip-json.js
echo "מטמון: $cur → $new"
node check.js
