# TAG2.GG Tracker EXE 빌드 및 배포 방법

이 문서는 Windows에서 `TAG2GGTracker.exe`를 빌드하고 GitHub Release에 배포하는 방법을 설명한다.

현재 기준 버전은 `0.1.0`이다. 새 버전을 만들 때는 이 문서의 버전 갱신 절차를 먼저 따른다.

## 1. 필요한 파일

다음 파일을 같은 폴더에 둔다.

```text
C:\1\ttt2_tracker\
├─ tracker.py
├─ gui_launcher.py
├─ TTT2TrackerGUI.spec
├─ version_info.txt
├─ app-icon.svg
├─ app-icon-192.png
├─ app-icon-256.png
├─ app-icon-512.png
└─ app-icon.ico
```

`tracker.py`는 실제 RPCS3 메모리 감시 및 Supabase 업로드 코드이고,
`gui_launcher.py`는 콘솔창 없이 안내 화면을 표시하는 GUI 시작 파일이다.

## 2. Python 확인

PowerShell에서 다음 명령을 실행한다.

```powershell
python --version
```

Python이 설치되어 있지 않다면 Python을 먼저 설치한다.

## 3. 필요한 패키지 설치

다음 명령을 실행한다.

```powershell
python -m pip install Pillow
python -m pip install cairosvg
```

`cairosvg`가 Windows에서 Cairo DLL 오류를 내는 경우에는 아이콘 생성 단계에서
아래의 Pillow 방식으로 생성할 수 있으므로 빌드 자체에는 문제가 없다.

PyInstaller가 설치되어 있는지 확인한다.

```powershell
python -c "import importlib.util; print('PyInstaller available' if importlib.util.find_spec('PyInstaller') else 'PyInstaller missing')"
```

없으면 설치한다.

```powershell
python -m pip install pyinstaller
```

## 4. 웹사이트 아이콘 복사

웹사이트의 SVG 아이콘을 tracker 폴더에 복사한다.

```powershell
Copy-Item -LiteralPath C:\1\ttt2_web\assets\app-icon.svg -Destination C:\1\ttt2_tracker\app-icon.svg -Force
Copy-Item -LiteralPath C:\1\ttt2_web\assets\app-icon-192.png -Destination C:\1\ttt2_tracker\app-icon-192.png -Force
Copy-Item -LiteralPath C:\1\ttt2_web\assets\app-icon-512.png -Destination C:\1\ttt2_tracker\app-icon-512.png -Force
```

## 5. 아이콘 생성

아래 명령은 `TAG2.GG`가 표시된 PNG와 Windows용 ICO를 생성한다.

```powershell
@'
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

font_path = r'C:\Windows\Fonts\arialbi.ttf'

def render(size, path):
    scale = size / 512
    image = Image.new('RGBA', (size, size), '#0c0a18')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (24*scale, 24*scale, 488*scale, 488*scale),
        radius=76*scale,
        fill='#17152b',
        outline='#5b8cff',
        width=max(1, round(12*scale))
    )
    font = ImageFont.truetype(font_path, round(86*scale))
    text = 'TAG2.GG'
    box = draw.textbbox((0, 0), text, font=font)
    x = (size - (box[2]-box[0])) / 2 - box[0]
    y = 270*scale - (box[3]-box[1]) / 2 - box[1]
    draw.text((x, y), text, font=font, fill='#f4f0ff')
    r = 27*scale
    cx, cy = 414*scale, 408*scale
    draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill='#ff3f73')
    image.save(path)

web = Path(r'C:\1\ttt2_web\assets')
tracker = Path(r'C:\1\ttt2_tracker')

render(192, web / 'app-icon-192.png')
render(512, web / 'app-icon-512.png')
render(192, tracker / 'app-icon-192.png')
render(512, tracker / 'app-icon-512.png')

Image.open(tracker / 'app-icon-512.png').save(
    tracker / 'app-icon.ico',
    sizes=[(16,16), (24,24), (32,32), (48,48),
           (64,64), (128,128), (256,256)]
)
print('icons generated')
'@ | python -
```

tracker 폴더에 intermediate GUI 리소스도 만든다.

```powershell
@'
from PIL import Image

source = Image.open(r'C:\1\ttt2_tracker\app-icon-512.png')
source.resize((256, 256), Image.Resampling.LANCZOS).save(
    r'C:\1\ttt2_tracker\app-icon-256.png'
)
'@ | python -
```

## 6. 버전 변경

프로그램 버전은 다음 두 파일에 함께 기록해야 한다.

### `gui_launcher.py`

```python
VERSION = "0.1.0"
```

### `version_info.txt`

다음 값을 같은 버전으로 변경한다.

```text
filevers=(0, 1, 0, 0)
prodvers=(0, 1, 0, 0)
FileVersion: 0.1.0.0
ProductVersion: 0.1.0
```

예를 들어 `0.1.1`을 만들 때는 `gui_launcher.py`의 `VERSION`을 `0.1.1`로,
`version_info.txt`의 파일 버전을 `0.1.1.0`, 제품 버전을 `0.1.1`로 변경한다.
두 파일의 버전이 다르면 화면 표시, 버전 차단, Windows 파일 속성이 서로 달라질 수 있다.

## 7. EXE 메타데이터

`version_info.txt`에 다음 정보를 넣는다.

```text
Product name: TAG2.GG Tracker
Product version: 0.1.0
File version: 0.1.0.0
Author: legbreaker
Copyright: Copyright (C) 2026 legbreaker
Company name: 공란
File description: TAG2.GG online match tracker
```

PyInstaller가 읽는 실제 `version_info.txt` 형식은 다음과 같다.

```python
VSVersionInfo(
  ffi=FixedFileInfo(
    filevers=(0, 1, 0, 0),
    prodvers=(0, 1, 0, 0),
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
  ),
  kids=[
    StringFileInfo(
      [
        StringTable(
          '040904B0',
          [
            StringStruct('CompanyName', ''),
            StringStruct('FileDescription', 'TAG2.GG online match tracker'),
            StringStruct('FileVersion', '0.1.0.0'),
            StringStruct('InternalName', 'TAG2GGTracker'),
            StringStruct('LegalCopyright', 'Copyright (C) 2026 legbreaker'),
            StringStruct('OriginalFilename', 'TAG2GGTracker.exe'),
            StringStruct('ProductName', 'TAG2.GG Tracker'),
            StringStruct('ProductVersion', '0.1.0'),
            StringStruct('Author', 'legbreaker'),
          ]
        )
      ]
    ),
    VarFileInfo([VarStruct('Translation', [1033, 1200])])
  ]
)
```

## 8. PyInstaller spec 확인

`TTT2TrackerGUI.spec`는 다음 조건을 포함해야 한다.

```python
a = Analysis(
    ['gui_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app-icon-192.png', '.'),
        ('app-icon-256.png', '.'),
        ('app-icon.svg', '.'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TAG2GGTracker',
    icon='app-icon.ico',
    version='version_info.txt',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

`console=False`가 CMD 창을 숨기는 핵심 옵션이다.

## 9. 빌드 전 기존 실행 파일 종료

기존 EXE가 실행 중이면 덮어쓰기에 실패할 수 있다.

```powershell
Get-Process -Name TAG2GGTracker -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.Id }
```

빌드 spec의 아이콘/데이터 파일 경로가 상대 경로이므로 tracker 폴더에서 빌드한다.

```powershell
Set-Location C:\1\ttt2_tracker
```

## 10. 문법 검사

```powershell
python -m py_compile C:\1\ttt2_tracker\gui_launcher.py C:\1\ttt2_tracker\tracker.py
```

오류가 없으면 다음 빌드 단계로 진행한다.

## 11. EXE 빌드

```powershell
python -m PyInstaller --clean --noconfirm C:\1\ttt2_tracker\TTT2TrackerGUI.spec
```

`TTT2TrackerGUI.spec`의 상대 경로 리소스를 사용하므로 반드시 tracker 폴더에서
명령을 실행한다. 빌드 결과는 다음 위치에 생성된다.

```text
C:\1\ttt2_tracker\dist\TAG2GGTracker.exe
```

배포용으로 사용하기 편하도록 `C:\1\dist`에도 복사한다.

```powershell
New-Item -ItemType Directory -Path C:\1\dist -Force
Copy-Item `
  -LiteralPath C:\1\ttt2_tracker\dist\TAG2GGTracker.exe `
  -Destination C:\1\dist\TAG2GGTracker.exe `
  -Force
```

최종적으로 두 파일은 동일한 빌드 결과여야 한다.

```text
C:\1\ttt2_tracker\dist\TAG2GGTracker.exe
C:\1\dist\TAG2GGTracker.exe
```

## 12. 빌드 결과 확인

Windows 파일 속성에 들어가기 전에 PowerShell에서 메타데이터를 확인할 수 있다.

```powershell
$v = (Get-Item C:\1\dist\TAG2GGTracker.exe).VersionInfo
$v | Select-Object `
  FileDescription,
  ProductName,
  ProductVersion,
  FileVersion,
  CompanyName,
  LegalCopyright,
  OriginalFilename
```

예상 결과:

```text
FileDescription  : TAG2.GG online match tracker
ProductName      : TAG2.GG Tracker
ProductVersion   : 0.1.0
FileVersion      : 0.1.0.0
CompanyName      :
LegalCopyright   : Copyright (C) 2026 legbreaker
OriginalFilename : TAG2GGTracker.exe
```

## 13. 실행 테스트

```powershell
$p = Start-Process -FilePath C:\1\dist\TAG2GGTracker.exe -PassThru
Start-Sleep -Seconds 2
Get-Process -Id $p.Id | Select-Object Id,ProcessName,Responding
Stop-Process -Id $p.Id
```

`Responding`이 `True`이면 GUI가 정상적으로 열렸다는 뜻이다.

## 14. 최초 실행 검사 동작

프로그램은 매번 최초 시작 시 GitHub의 최신 정식 Release를 확인한다.

```text
https://api.github.com/repos/opggttt2pj/TAG2GG-Tracker/releases/latest
```

응답의 `tag_name` 값(예: `v0.1.2`)에서 앞의 `v`를 제거한 뒤 현재 프로그램
버전과 숫자로 비교한다. Release 첨부 파일의 파일명이나 Windows 파일 속성은
비교하지 않는다.

### 정상 실행

- GitHub 연결 성공
- `tag_name`이 현재 버전보다 높지 않음

### 업데이트 차단

GitHub의 최신 버전이 현재 버전보다 높으면 tracker를 실행하지 않고 업데이트
안내창을 표시한다. 안내창에서 GitHub 최신 Release 페이지를 열 수 있다.

```text
https://github.com/opggttt2pj/TAG2GG-Tracker/releases/latest
```

### 인터넷 또는 GitHub 연결 실패

프로그램 최초 시작 시 `api.github.com:443` 연결과 Release API 요청이 모두
필요하다. 인터넷 연결, DNS, GitHub 서버, API 응답 형식에 문제가 있으면
안내창을 표시하고 tracker를 실행하지 않는다.

## 15. 버전 차단 테스트

현재 Release보다 낮은 버전의 EXE를 준비한 뒤 실행한다.

예를 들어 GitHub에 `v0.1.2` Release가 있고 EXE의 내부 버전이 `0.1.1`이면:

```text
현재 버전: 0.1.1
최신 버전: v0.1.2
결과: 업데이트 안내창 표시 후 종료
```

오프라인 차단은 Windows 네트워크를 일시적으로 끊은 뒤 EXE를 실행해 확인한다.
다음 안내창이 표시되고 tracker가 실행되지 않아야 한다.

```text
최신 버전 확인 실패
인터넷 연결 또는 GitHub 서버 상태를 확인한 후 다시 실행해 주세요.
```

테스트가 끝나면 네트워크를 복구한다.

## 16. GitHub Release 업로드

1. GitHub 저장소에서 `Releases`를 연다.
2. `Draft a new release`를 선택한다.
3. 버전과 동일한 태그를 만든다. 예: `v0.1.1`
4. Release 제목과 변경 내용을 작성한다.
5. `C:\1\dist\TAG2GGTracker.exe`를 Release asset으로 첨부한다.
6. `Publish release`를 누른다.

`/releases/latest`는 공개된 정식 Release를 대상으로 하므로 Draft 상태에서는
최신 버전으로 인식되지 않는다. 태그는 반드시 `v`를 포함한 세 부분 버전
형식(`v0.1.0`, `v0.1.1`)을 사용한다.

## 17. 배포 시 주의사항

- 사용자의 컴퓨터에는 Python을 설치할 필요가 없다.
- 사용자의 컴퓨터에는 PyInstaller를 설치할 필요가 없다.
- RPCS3와 Tekken Tag Tournament 2는 사용자의 컴퓨터에 설치되어 있어야 한다.
- EXE는 RPCS3가 실행 중일 때 메모리를 읽는다.
- Windows Defender가 처음 실행을 경고할 수 있다.
- EXE를 배포하기 전에 Supabase 키가 포함된 코드가 공개되어도 괜찮은지 확인한다.
- GitHub Release에 업로드하는 파일은 빌드 후 버전과 파일 크기를 확인한 최종 EXE여야 한다.
