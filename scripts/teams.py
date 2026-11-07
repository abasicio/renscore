"""Bygger teams.json: alle hold i appens ligaer, så søgningen kun skal hente én lille fil.

Holdene tages fra ESPN's stilling (den viser denne sæsons hold, /teams har også gamle med).
Ligaerne læses fra LEAGUES i app.js, så listen altid passer til appen.
GitHub Actions kører scriptet ved hver udgivelse.
"""
import json, re, time, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ids = re.findall(r"\{ id: '([a-z]{3}\.\d)'", (ROOT / 'app.js').read_text(encoding='utf-8'))


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'RenScore (github.com/abasicio/renscore)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


leagues = {}
for lid in ids:
    try:
        d = get(f'https://site.api.espn.com/apis/v2/sports/soccer/{lid}/standings')
    except Exception as err:  # en liga, der fejler, må ikke stoppe resten
        print(lid, 'fejl:', err)
        continue
    seen, teams = set(), []
    for group in d.get('children', []):
        for e in group.get('standings', {}).get('entries', []):
            t = e['team']
            if t['id'] in seen:
                continue
            seen.add(t['id'])
            teams.append({
                'id': t['id'], 'name': t['displayName'], 'short': t.get('shortDisplayName', ''),
                'abbr': t.get('abbreviation', ''), 'logo': (t.get('logos') or [{}])[0].get('href', ''),
            })
    if not teams:  # nogle ligaer har ingen stilling hos ESPN; så bruges holdlisten
        try:
            for x in get(f'https://site.api.espn.com/apis/site/v2/sports/soccer/{lid}/teams')['sports'][0]['leagues'][0]['teams']:
                t = x['team']
                teams.append({'id': t['id'], 'name': t['displayName'], 'short': t.get('shortDisplayName', ''),
                              'abbr': t.get('abbreviation', ''), 'logo': (t.get('logos') or [{}])[0].get('href', '')})
        except Exception:
            pass
    if teams:
        leagues[lid] = teams
    print(lid, len(teams))

if len(leagues) < len(ids) // 2:
    raise SystemExit('For få ligaer hentet; beholder den gamle teams.json')
(ROOT / 'teams.json').write_text(json.dumps({'t': int(time.time() * 1000), 'leagues': leagues}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
