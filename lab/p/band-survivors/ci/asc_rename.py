"""Runs on the Mac (mac-build-hub): the App Store Connect name change for this game.

    python3 asc_rename.py            # read only: shows the current names and what would change
    python3 asc_rename.py --apply    # saves the new name on App Store Connect (only after Studio has been told)

Copy it next to asc_setup.py in the hub's artifacts folder; it uses the hub's App Store Connect API key.
"""
import pathlib
import sys

hub = pathlib.Path.home() / 'Dev' / 'mac-build-hub'
sys.path.insert(0, str(hub / 'scripts'))
import apps  # noqa: E402

KEY = {'ascApiKeyId': '3F24P2VZAU', 'ascApiKeyIssuerId': 'c4f4536a-2518-4f23-b614-58d5e6984278'}
APP, NAME = '6839352857', 'One Monster Band'
apply = '--apply' in sys.argv

todo = 0
for info in apps.asc(KEY, f'/v1/apps/{APP}/appInfos', 'GET', None)['data']:
    state = info['attributes'].get('appStoreState') or info['attributes'].get('state')
    for loc in apps.asc(KEY, f'/v1/appInfos/{info["id"]}/appInfoLocalizations', 'GET', None)['data']:
        old = loc['attributes'].get('name')
        print(state, loc['attributes'].get('locale'), repr(old), '->', repr(NAME), 'localization', loc['id'])
        if old == NAME:
            continue
        todo += 1
        if apply:
            apps.asc(KEY, f'/v1/appInfoLocalizations/{loc["id"]}', 'PATCH', {'data': {
                'type': 'appInfoLocalizations', 'id': loc['id'], 'attributes': {'name': NAME}}})
            print('  saved')
print(f'{todo} name(s) {"changed" if apply else "to change; nothing saved"}; {len(NAME)} of 30 characters')
