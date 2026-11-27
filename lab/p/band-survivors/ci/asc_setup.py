"""Runs on the Mac (mac-build-hub): register Band Survivors' bundle id and make its App Store profile.

    python3 asc_setup.py

Run again any time: it reuses what exists. Uses the hub's App Store Connect API key (apps.asc). Writes
signing/band-survivors/ with the team's existing Apple Distribution identity (copied from signing/paint, the same
certificate) and a new App Store profile for com.vyassathya.bandsurvivors. The App Store Connect app record itself
cannot be made through the API; it is made once in the signed-in browser. The last line says whether it exists.
"""
import base64
import pathlib
import plistlib
import shutil
import subprocess
import sys
import time

hub = pathlib.Path.home() / 'Dev' / 'mac-build-hub'
sys.path.insert(0, str(hub / 'scripts'))
import apps  # noqa: E402

KEY = {'ascApiKeyId': '3F24P2VZAU', 'ascApiKeyIssuerId': 'c4f4536a-2518-4f23-b614-58d5e6984278'}
BUNDLE, NAME = 'com.vyassathya.bandsurvivors', 'One Monster Band'
SOURCE = hub / 'signing' / 'paint'
OUT = hub / 'signing' / 'band-survivors'


def asc(path, method='GET', body=None):
    return apps.asc(KEY, path, method, body)


found = asc(f'/v1/bundleIds?filter[identifier]={BUNDLE}')['data']
found = [b for b in found if b['attributes']['identifier'] == BUNDLE]
if found:
    bid = found[0]['id']
    print('bundle id exists', bid)
else:
    bid = asc('/v1/bundleIds', 'POST', {'data': {'type': 'bundleIds', 'attributes': {
        'identifier': BUNDLE, 'name': NAME, 'platform': 'IOS'}}})['data']['id']
    print('bundle id created', bid)

# the distribution certificate inside signing/paint's profile, matched to App Store Connect by serial number
paint_profile = next(SOURCE.glob('*.mobileprovision'))
info = plistlib.loads(subprocess.check_output(['security', 'cms', '-D', '-i', str(paint_profile)]))
der = info['DeveloperCertificates'][0]
serial = subprocess.run(['openssl', 'x509', '-inform', 'der', '-noout', '-serial'], input=der, capture_output=True).stdout.decode()
serial = serial.strip().split('=')[-1].upper().lstrip('0')
certs = asc('/v1/certificates?limit=200')['data']
cert = next((c for c in certs if c['attributes'].get('serialNumber', '').upper().lstrip('0') == serial), None)
if not cert:
    sys.exit(f'no App Store Connect certificate with serial {serial}')
print('certificate', cert['id'], cert['attributes'].get('certificateType'), cert['attributes'].get('expirationDate'))

have = sorted(OUT.glob('*.mobileprovision')) if OUT.exists() else []
if have:
    print('profile already in', OUT, have[0].name)
else:
    name = f'BandSurvivors-AppStore-{time.strftime("%Y%m%d")}'
    existing = [p for p in asc(f'/v1/profiles?filter[name]={name}')['data'] if p['attributes']['name'] == name]
    if existing:
        profile = existing[0]
    else:
        profile = asc('/v1/profiles', 'POST', {'data': {'type': 'profiles', 'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
                                                         'relationships': {'bundleId': {'data': {'type': 'bundleIds', 'id': bid}},
                                                                           'certificates': {'data': [{'type': 'certificates', 'id': cert['id']}]}}}})['data']
    print('profile', profile['id'], profile['attributes']['profileState'])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{name}.mobileprovision').write_bytes(base64.b64decode(profile['attributes']['profileContent']))
    for f in ('ios_distribution.p12', 'p12pass'):
        shutil.copy2(SOURCE / f, OUT / f)
print('signing/band-survivors ready:', sorted(p.name for p in OUT.iterdir()))
apps_found = asc(f'/v1/apps?filter[bundleId]={BUNDLE}')['data']
print('ASC app record:', apps_found[0]['id'] + ' ' + apps_found[0]['attributes']['name'] if apps_found else 'NOT YET (made once in the signed-in browser)')
