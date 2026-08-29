#!/usr/bin/env bash
# מעלה את מחרוזת המטמון (?v=) בכל קבצי ה-HTML — הרץ אחרי כל שינוי ב-data.js/styles.css/*.js
# שימוש:  ./bump.sh          (תאריך היום + אות רצה)
set -euo pipefail
cd "$(dirname "$0")"
today=$(date +%Y%m%d)
cur=$(grep -oh '?v=[0-9a-z]*' ./*.html | head -1 | cut -d= -f2)
if [[ "$cur" == "$today"* ]]; then
  last=${cur: -1}; next=$(echo "$last" | tr 'a-y' 'b-z')
else
  next=a
fi
new="${today}${next}"
sed -i "s/?v=[0-9a-z]*/?v=$new/g" ./*.html
echo "מטמון: $cur → $new"
node check.js
