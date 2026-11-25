"""Runs on the Mac (mac-build-hub) from a build folder that holds src.tar (sent by ci/mac.sh).

    python3 mac_run.py sim <sha>                  simulator build, launch, tap Play, screenshots
    python3 mac_run.py testflight <sha> <build>   archive, App Store signing (signing/band-survivors), upload, wait VALID,
                                                  encryption answer, internal group "Team" with his tester
    python3 mac_run.py testers <sha>              no build: make sure the internal group exists and holds his tester

Native Swift app (SwiftUI + WKWebView), project from ios/project.yml (xcodegen). The game files arrive in src.tar as web/
(index.html, img/, levels/ with every part's mp3) and go into the app as Web/. Same lock, Xcode pin, keychain and
upload route as Wall Jump Tower's ci/mac_run.py (C:/Dev/wall-jump-tower), which this is cut down from.
Output lines: === step, QA ..., SHOT path, DONE_VALID, *_FAILED.
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tarfile
import threading
import time

hub = pathlib.Path.home() / 'Dev' / 'mac-build-hub'
sys.path.insert(0, str(hub / 'scripts'))
import apps  # noqa: E402
import build_lock  # noqa: E402
import xcode_pin  # noqa: E402

xcode_pin.preflight(os.environ)
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ.get('PATH', '')

MODE, SHA = sys.argv[1], sys.argv[2]
BUILD = sys.argv[3] if len(sys.argv) > 3 else None
APP, SCHEME = 'band-survivors', 'BandSurvivors'
BUNDLE = 'com.vyassathya.bandsurvivors'
TEAM = 'ZTHW3V7VS6'
KEY = {'ascApiKeyId': '3F24P2VZAU', 'ascApiKeyIssuerId': 'c4f4536a-2518-4f23-b614-58d5e6984278'}
LAB_APP = '6829299426'  # Unity Lab: its internal Team group holds his tester (LESSONS 2026-11-08)
SIM_NAME, SIM_TYPE = 'Band Survivors (16 Pro)', 'iPhone 16 Pro'  # one simulator per app; 16 Pro is his phone's model
SIM = None
work = pathlib.Path.cwd()
src = work / 'src'
ios = src / 'ios'
shots = work / 'shots'


def step(name):
    print(f'=== {name} {time.strftime("%H:%M:%S")}', flush=True)


def errors(log):
    return subprocess.run(f"grep -E ': error:' '{log}' | sort -u | head -20", shell=True, capture_output=True, text=True).stdout


def unpack():
    if src.exists():
        shutil.rmtree(src)
    src.mkdir(parents=True)
    with tarfile.open(work / 'src.tar') as t:
        t.extractall(src, filter='data')
    step('game files into the app')
    web = ios / SCHEME / 'Web'
    shutil.rmtree(web, ignore_errors=True)
    shutil.copytree(src / 'web', web)
    mp3 = len(list(web.glob('levels/*/*.mp3')))
    print('GAME_FILES index', 'present' if (web / 'index.html').exists() else 'MISSING', '| level parts', mp3,
          '| levels', len(list(web.glob('levels/*/level.json'))), flush=True)
    if mp3 == 0:
        sys.exit('NO_LEVEL_AUDIO')
    step('xcodegen')
    subprocess.run(['xcodegen', 'generate'], cwd=ios, check=True)


def simulator():
    have = subprocess.run(['xcrun', 'simctl', 'list', 'devices', 'available'], capture_output=True, text=True).stdout
    line = next((l for l in have.splitlines() if SIM_NAME in l), None)
    if line:
        return line.split('(')[-2].split(')')[0]
    return subprocess.run(['xcrun', 'simctl', 'create', SIM_NAME, SIM_TYPE], capture_output=True, text=True, check=True).stdout.strip()


def shot(name):
    path = shots / f'{name}.png'
    subprocess.run(['xcrun', 'simctl', 'io', SIM, 'screenshot', str(path)], capture_output=True)
    print('SHOT', path, flush=True)


def stream_log(lines, stop):
    proc = subprocess.Popen(['xcrun', 'simctl', 'spawn', SIM, 'log', 'stream', '--style', 'compact', '--level', 'default',
                             '--predicate', 'eventMessage CONTAINS "REUQA"'], stdout=subprocess.PIPE, text=True)
    while not stop.is_set():
        line = proc.stdout.readline()
        if not line:
            break
        if 'REUQA' in line:
            msg = line.split('REUQA', 1)[1].strip()
            lines.append(msg)
            print('QA', msg, flush=True)
    proc.terminate()


def axe(*args):
    return subprocess.run(['axe', *args, '--udid', SIM], capture_output=True, text=True)


def sim():
    global SIM
    unpack()
    shots.mkdir(exist_ok=True)
    SIM = simulator()
    print('SIMULATOR', SIM, flush=True)
    lock = build_lock.acquire(f'{APP} sim {SHA[:12]}', wait=True)
    lock.install_release(lambda *_: sys.exit('KILLED'))
    step('build (Debug, simulator)')
    with open(work / 'build.log', 'w') as log:
        built = subprocess.run(['xcodebuild', '-project', f'{SCHEME}.xcodeproj', '-scheme', SCHEME, '-configuration', 'Debug',
                                '-sdk', 'iphonesimulator', '-destination', f'id={SIM}', '-derivedDataPath', str(work / 'dd'),
                                'CODE_SIGNING_ALLOWED=NO', 'build'], cwd=ios, stdout=log, stderr=subprocess.STDOUT)
    lock.release()
    if built.returncode != 0:
        print(errors(work / 'build.log'))
        sys.exit('BUILD_FAILED')
    app = next((work / 'dd' / 'Build' / 'Products' / 'Debug-iphonesimulator').glob('*.app'))
    info = subprocess.run(['plutil', '-p', str(app / 'Info.plist')], capture_output=True, text=True).stdout
    print('INFO_PLIST scene manifest', 'present' if 'UIApplicationSceneManifest' in info else 'MISSING',
          '| encryption', 'set' if 'ITSAppUsesNonExemptEncryption' in info else 'MISSING', flush=True)
    print('PRIVACY_MANIFEST', 'present' if (app / 'PrivacyInfo.xcprivacy').exists() else 'MISSING', flush=True)
    step('simulator')
    subprocess.run(['python3', str(hub / 'scripts' / 'sim_slots.py'), 'acquire', SIM, '--wait-min', '60'], check=True)
    try:
        subprocess.run(['xcrun', 'simctl', 'boot', SIM], capture_output=True)
        subprocess.run(['xcrun', 'simctl', 'bootstatus', SIM, '-b'], check=True, capture_output=True)
        subprocess.run(['xcrun', 'simctl', 'uninstall', SIM, BUNDLE], capture_output=True)
        subprocess.run(['xcrun', 'simctl', 'install', SIM, str(app)], check=True)
        lines, stop = [], threading.Event()
        threading.Thread(target=stream_log, args=(lines, stop), daemon=True).start()
        axe('describe-ui')
        time.sleep(1)
        subprocess.run(['xcrun', 'simctl', 'launch', SIM, BUNDLE, '-qa'], check=True, capture_output=True)
        time.sleep(5)
        shot('1-title')
        time.sleep(4)   # the -qa script opens the map at about 6 s and starts stop 1 at about 9 s
        shot('2-map')
        time.sleep(14)
        shot('3-run')
        if not any(l.startswith('QA_RUN') for l in lines):
            print('QA_RUN missing', flush=True)
        stop.set()
        (work / 'qa.log').write_text(chr(10).join(lines) + chr(10))
    finally:
        subprocess.run(['xcrun', 'simctl', 'shutdown', SIM], capture_output=True)
        subprocess.run(['python3', str(hub / 'scripts' / 'sim_slots.py'), 'release', SIM], capture_output=True)
    print('SIM_DONE', flush=True)


def app_id():
    found = apps.asc(KEY, f'/v1/apps?filter[bundleId]={BUNDLE}')['data']
    if not found:
        sys.exit('NO_ASC_APP for ' + BUNDLE)
    return found[0]['id']


def add_tester(appid):
    groups = apps.asc(KEY, f'/v1/apps/{appid}/betaGroups')['data']
    internal = [g for g in groups if g['attributes'].get('isInternalGroup')]
    if not internal:  # a new app has none: make the internal group, open to every build
        body = {'data': {'type': 'betaGroups', 'attributes': {'name': 'Team', 'isInternalGroup': True, 'hasAccessToAllBuilds': True},
                         'relationships': {'app': {'data': {'type': 'apps', 'id': appid}}}}}
        try:
            internal = [apps.asc(KEY, '/v1/betaGroups', 'POST', body)['data']]
            print('TESTERS made internal group Team', flush=True)
        except Exception as e:  # noqa: BLE001
            print('TESTERS group create failed', str(e)[:300], flush=True)
            return
    group = internal[0]
    have = apps.asc(KEY, f'/v1/betaGroups/{group["id"]}/betaTesters')['data']
    if have:
        print('TESTERS', group['attributes']['name'], len(have), 'tester(s) already in the group', flush=True)
        return
    lab = [g for g in apps.asc(KEY, f'/v1/apps/{LAB_APP}/betaGroups')['data'] if g['attributes'].get('isInternalGroup')]
    emails = {t['attributes']['email'] for g in lab for t in apps.asc(KEY, f'/v1/betaGroups/{g["id"]}/betaTesters')['data']}
    for email in sorted(emails):
        body = {'data': {'type': 'betaTesters', 'attributes': {'email': email},
                         'relationships': {'betaGroups': {'data': [{'type': 'betaGroups', 'id': group['id']}]}}}}
        try:
            apps.asc(KEY, '/v1/betaTesters', 'POST', body)
            print('TESTERS added to', group['attributes']['name'], flush=True)
        except Exception as e:  # noqa: BLE001
            print('TESTERS add failed', str(e)[:300], flush=True)


def profile_folder_ready(minutes=45):
    """Xcode reads App Store profiles from its own folder; while another xcodebuild runs a test, new files there can be
    removed within seconds (Wall Jump Tower, 2026-11-13). Wait until a file stays before taking the build lock."""
    folder = pathlib.Path.home() / 'Library/Developer/Xcode/UserData/Provisioning Profiles'
    folder.mkdir(parents=True, exist_ok=True)
    source = next((hub / 'signing' / APP).glob('*.mobileprovision'))
    probe = folder / f'zz-probe-{os.getpid()}.mobileprovision'
    for n in range(minutes * 2):
        shutil.copy(source, probe)
        time.sleep(10)
        if probe.exists():
            probe.unlink()
            return
        if n % 4 == 0:
            print('PROFILE_WAIT new files in Xcode\'s profile folder are being removed; waiting', flush=True)
        time.sleep(20)
    sys.exit('PROFILE_FOLDER_FAILED')


def testflight():
    unpack()
    appid = app_id()
    profile_folder_ready()
    build_lock.acquire(f'{APP} {BUILD} {SHA[:12]}', wait=True).install_release(lambda *_: sys.exit('KILLED'))
    step('archive')
    profiles = apps.keychain_signing(APP)
    apps.manual_signing(ios, profiles, TEAM)
    archive = work / f'{SCHEME}.xcarchive'
    with apps.only_hub_keychain(), open(work / 'archive.log', 'w') as log:
        built = subprocess.run(['xcodebuild', '-project', f'{SCHEME}.xcodeproj', '-scheme', SCHEME, '-configuration', 'Release',
                                '-destination', 'generic/platform=iOS', '-archivePath', str(archive), '-derivedDataPath', str(work / 'dd-archive'),
                                f'OTHER_CODE_SIGN_FLAGS=--keychain {apps.HUB_KEYCHAIN}', f'CURRENT_PROJECT_VERSION={BUILD}', 'archive'],
                               cwd=ios, stdout=log, stderr=subprocess.STDOUT)
    if built.returncode != 0:
        print(errors(work / 'archive.log'))
        sys.exit('ARCHIVE_FAILED')
    shutil.rmtree(work / 'dd-archive', ignore_errors=True)
    plist = next((archive / 'Products' / 'Applications').glob('*.app')) / 'Info.plist'
    fam = subprocess.run(['plutil', '-extract', 'UIDeviceFamily', 'json', '-o', '-', str(plist)], capture_output=True, text=True).stdout.strip()
    print('DEVICE_FAMILY', fam, flush=True)
    if fam != '[1]':
        sys.exit('DEVICE_FAMILY_NOT_IPHONE_ONLY')
    step('export')
    mapping = ''.join(f'<key>{b}</key><string>{u}</string>' for b, u in profiles.items())
    options = work / 'ExportOptions.plist'
    options.write_text('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
                       '<plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>destination</key><string>export</string>'
                       f'<key>teamID</key><string>{TEAM}</string><key>signingStyle</key><string>manual</string><key>signingCertificate</key><string>Apple Distribution</string>'
                       f'<key>provisioningProfiles</key><dict>{mapping}</dict><key>manageAppVersionAndBuildNumber</key><false/></dict></plist>\n', encoding='utf-8')
    with apps.only_hub_keychain():
        subprocess.run(['xcodebuild', '-exportArchive', '-archivePath', str(archive), '-exportOptionsPlist', str(options),
                        '-exportPath', str(work / 'export')], cwd=work, check=True)
    step('upload')
    ipa = next((work / 'export').glob('*.ipa'))
    print('IPA_MB', round(ipa.stat().st_size / 1e6, 1), flush=True)
    up = subprocess.run(['xcrun', 'altool', '--upload-app', '-f', str(ipa), '-t', 'ios',
                         '--apiKey', KEY['ascApiKeyId'], '--apiIssuer', KEY['ascApiKeyIssuerId']], capture_output=True, text=True)
    print(up.stdout[-1200:], up.stderr[-1200:], flush=True)
    if up.returncode != 0:
        sys.exit('UPLOAD_FAILED')
    step('processing')
    for _ in range(90):
        found = apps.asc(KEY, f'/v1/builds?filter[app]={appid}&filter[version]={BUILD}&fields[builds]=version,processingState,usesNonExemptEncryption')['data']
        state = found[0]['attributes']['processingState'] if found else 'not listed yet'
        print(f'build {BUILD}:', state, flush=True)
        if found and state == 'VALID':
            bid = found[0]['id']
            if found[0]['attributes'].get('usesNonExemptEncryption') is None:
                apps.asc(KEY, f'/v1/builds/{bid}', 'PATCH', {'data': {'type': 'builds', 'id': bid, 'attributes': {'usesNonExemptEncryption': False}}})
            add_tester(appid)
            time.sleep(20)
            detail = apps.asc(KEY, f'/v1/builds/{bid}/buildBetaDetail')['data']['attributes']
            print('BETA', json.dumps(detail), flush=True)
            print('DONE_VALID', appid, flush=True)
            break
        if found and state in ('INVALID', 'FAILED'):
            sys.exit('build ' + state)
        time.sleep(30)
    shutil.rmtree(src, ignore_errors=True)
    shutil.rmtree(archive, ignore_errors=True)  # the Mac's disk is nearly full: an archive goes once its build is uploaded


if MODE == 'sim':
    sim()
elif MODE == 'testflight':
    if not BUILD:
        sys.exit('usage: mac_run.py testflight <sha> <build number>')
    testflight()
elif MODE == 'testers':
    appid = app_id()
    add_tester(appid)
    for g in apps.asc(KEY, f'/v1/apps/{appid}/betaGroups')['data']:
        print('TESTERS', g['attributes']['name'], len(apps.asc(KEY, f'/v1/betaGroups/{g["id"]}/betaTesters')['data']), 'tester(s)', flush=True)
    print('DONE_TESTERS', flush=True)
else:
    sys.exit('usage: mac_run.py sim|testflight|testers <sha> [build]')
