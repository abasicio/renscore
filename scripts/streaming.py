"""Henter Viaplays sportsprogram for de næste 7 dage og gemmer det som streaming.json.

Viaplays API må ikke kaldes direkte fra browseren (CORS), så GitHub Actions kører
dette script hver 3. time og lægger filen ud sammen med appen.
"""
import datetime, json, urllib.request

BASE = 'https://content.viaplay.com/pcdash-dk/sport/alle?date='


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'RenScore (github.com/abasicio/renscore)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def products(url):
    while url:
        block = get(url)['_embedded']['viaplay:blocks'][0]
        yield from block.get('_embedded', {}).get('viaplay:products', [])
        nxt = block.get('_links', {}).get('next', {}).get('href')
        url = nxt if nxt and nxt != url else None


def ms(iso):
    return int(datetime.datetime.fromisoformat(iso.replace('Z', '+00:00')).timestamp() * 1000)


out, seen = [], set()
today = datetime.date.today()
for i in range(7):
    for p in products(BASE + (today + datetime.timedelta(days=i)).isoformat()):
        c, epg = p.get('content', {}), p.get('epg', {})
        teams = c.get('title', '').split(' - ')
        if len(teams) != 2 or not epg.get('start'):
            continue
        key = (c['title'], epg['start'])
        if key in seen:
            continue
        seen.add(key)
        out.append({'s': 'Viaplay', 'start': ms(epg['start']), 'end': ms(epg.get('end') or epg['start']),
                    'home': teams[0].strip(), 'away': teams[1].strip(), 'league': c.get('format', {}).get('title', '')})

out.sort(key=lambda x: x['start'])
with open('streaming.json', 'w', encoding='utf-8') as f:
    json.dump({'updated': int(datetime.datetime.now().timestamp() * 1000), 'events': out}, f, ensure_ascii=False, separators=(',', ':'))
print(len(out), 'kampe fra Viaplay')
