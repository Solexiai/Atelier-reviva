/* ATELIER REVIVA — Page Contact : envoi du message au Google Sheets (onglet Messages) + heures d'ouverture */
(function () {
  'use strict';
  const API = 'https://script.google.com/macros/s/AKfycbxUNcPUhB7HPZa6l9rCJaNuNPS1ngCbYOpYr_2m65ub1KtEpGh5nN0tAGjOFbc-wMHR6g/exec';
  const $ = id => document.getElementById(id);

  /* Ouvert / fermé maintenant (heure de Montréal) */
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const val = t => (parts.find(x => x.type === t) || {}).value;
    const jour = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(val('weekday'));
    const minutes = (Number(val('hour')) % 24) * 60 + Number(val('minute'));
    const ouvert = jour >= 1 && jour <= 5 && minutes >= 540 && minutes < 990;
    const statut = $('contactStatut');
    statut.textContent = ouvert ? 'Ouvert maintenant' : 'Fermé en ce moment';
    statut.classList.add(ouvert ? 'is-ouvert' : 'is-ferme');
    const ligne = document.querySelector('#contactHeures li[data-jour="' + jour + '"]');
    if (ligne) ligne.classList.add('is-aujourdhui');
  } catch (e) { /* navigateur ancien */ }

  const form = $('contactForm');
  if (!form) return;
  const sujet = $('cSujet');
  sujet.addEventListener('change', () => { $('contactHint').hidden = sujet.value !== 'Meuble à transformer'; });

  form.addEventListener('input', e => { if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid'); });
  form.addEventListener('change', e => { if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid'); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alerte = $('contactErreur');
    alerte.hidden = true;
    let premier = null;
    form.querySelectorAll('[required]').forEach(c => {
      const v = c.type === 'checkbox' ? c.checked : c.value.trim();
      const ok = !!v && (c.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
      c.classList.toggle('is-invalid', !ok);
      if (!ok && !premier) premier = c;
    });
    if (premier) {
      alerte.textContent = 'Veuillez compléter les champs en rouge (courriel valide et case cochée).';
      alerte.hidden = false;
      premier.focus();
      return;
    }
    const bouton = $('contactSubmit');
    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';
    const champs = {};
    new FormData(form).forEach((v, k) => { if (k.charAt(0) !== '_') champs[k] = String(v); });
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'contact', champs: champs, _gotcha: form.elements._gotcha.value }) }).then(x => x.json());
      if (!r.ok) throw new Error(r.erreur || 'erreur');
      $('contactNumero').textContent = r.numero ? ' (référence ' + r.numero + ')' : '';
      form.hidden = true;
      $('contactSuccess').classList.add('visible');
      $('contactSuccess').focus();
    } catch (err) {
      console.warn('[Atelier Reviva] Contact —', err.message);
      alerte.textContent = 'Le message n\'a pas pu être envoyé. Réessayez, ou appelez-nous au (514) 430-6221.';
      alerte.hidden = false;
      bouton.disabled = false;
      bouton.textContent = 'Envoyer mon message';
    }
  });
})();
