"""Build the downloadable course-only calendar from the website's session data.
Run with Python 3 after updating data/projektkurs-kalender-2027.json.
"""
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin
import json

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://genaiedu.github.io/LearningApps2/'


def text(value):
    return str(value).replace('\\', '\\\\').replace('\r\n', '\n').replace('\r', '\n').replace('\n', '\\n').replace(';', '\\;').replace(',', '\\,')


def fold(line):
    """RFC 5545: physical lines at most 75 UTF-8 octets, CRLF continuation."""
    parts, part = [], ''
    for char in line:
        if len((part + char).encode('utf-8')) > 75:
            parts.append(part)
            part = ' '
        part += char
    return '\r\n'.join(parts + [part])


def build(data, stamp):
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0',
             'PRODID:-//Thomaeum Kempen//Projektkurs Wissenschaftskommunikation//DE',
             'CALSCALE:GREGORIAN',
             'X-WR-CALNAME:' + text('Projektkurs Wissenschaftskommunikation 2027/28'),
             'X-WR-CALDESC:' + text('Nur Kurstermine und Abgaben. Ganztägige Einträge, da die Unterrichtsuhrzeit noch nicht feststeht. Dauer jeweils 90 Minuten.')]
    seen = set()
    # Deliberately export sessions only; no closures, holidays, markers or phase ranges.
    for session in data['sessions']:
        day = date.fromisoformat(session['date'])
        assert day not in seen, 'Duplicate course date'
        seen.add(day)
        description = [data['title'], data['cohort'], data['status'],
                       f"Dauer: {session['ue']} × 45 Minuten. Die Unterrichtsuhrzeit steht noch nicht fest; deshalb als ganztägiger Eintrag angelegt.",
                       'Arbeitsziel / Abgabe: ' + session['goal']]
        if session.get('forms'):
            description += ['', 'Formulare:']
            for key in session['forms']:
                form = data['forms'][key]
                description.append(form['label'] + ': ' + urljoin(BASE, form['url']))
        if session.get('apps'):
            description += ['', 'Apps:']
            for key in session['apps']:
                app = data['apps'][key]
                description.append(app['label'] + ': ' + urljoin(BASE, app['url']))
        description += ['', 'Es gilt der veröffentlichte Planungsstand; Änderungen durch die Kursleitung bleiben möglich.',
                        'Kurskalender: ' + BASE + 'projektkurs-kalender-2027.html']
        lines += ['BEGIN:VEVENT',
                  'UID:projektkurs-wisskomm-2027-28-' + day.isoformat() + '@genaiedu.github.io',
                  'DTSTAMP:' + stamp,
                  'DTSTART;VALUE=DATE:' + day.strftime('%Y%m%d'),
                  'DTEND;VALUE=DATE:' + (day + timedelta(days=1)).strftime('%Y%m%d'),
                  'SUMMARY:' + text('Projektkurs · ' + session['title']),
                  'DESCRIPTION:' + text('\n'.join(description)),
                  'URL:' + BASE + 'projektkurs-kalender-2027.html',
                  'CATEGORIES:Projektkurs Wissenschaftskommunikation',
                  'TRANSP:TRANSPARENT', 'END:VEVENT']
    lines.append('END:VCALENDAR')
    return ('\r\n'.join(fold(line) for line in lines) + '\r\n').encode('utf-8')


if __name__ == '__main__':
    data = json.loads((ROOT / 'data/projektkurs-kalender-2027.json').read_text())
    output = ROOT / 'downloads/Projektkurs_Kurskalender_2027_2028.ics'
    output.write_bytes(build(data, datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')))
    print(f'{len(data["sessions"])} Kurstermine: {output}')
