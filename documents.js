App.screen('documents.html', function () {
  const A = App, T = A.T;

  const row = d => `<a href="${d.url}" target="_blank" rel="noopener" class="step" style="margin-top:7px;text-decoration:none;color:inherit">
    <b class="ic">${d.ic || '📄'}</b>
    <span><div class="t">${A.txt(d.t)}</div><div class="d" style="margin:0">${A.txt(d.d)}</div></span>
    <span style="color:var(--dim)">↗</span></a>`;

  let h = `<div class="head"><div class="kicker">מקור האמת — מקושר לגוגל דרייב</div><div class="h1">מסמכים</div></div>`;

  h += `<div class="lbl q" style="margin-top:16px">מסמכי הטיול<i></i></div>`;
  h += (T.docs || []).map(row).join('') || `<div class="d" style="text-align:center;padding:10px 0">אין מסמכים עדיין</div>`;

  if ((T.resources || []).length) {
    h += `<div class="lbl q" style="margin-top:22px">מקורות שימושיים<i></i></div>`;
    h += T.resources.map(row).join('');
  }

  h += `<div class="d" style="margin-top:18px;line-height:1.6;text-align:center">
    💡 ערכו במסמכים בדרייב מכל מכשיר. כשתרצו שהקלסר יתעדכן — תגידו לי "תעדכן את האתר לפי הדרייב".</div>`;

  document.getElementById('main').innerHTML = h;
  A.reveal(document.getElementById('main'));
});
