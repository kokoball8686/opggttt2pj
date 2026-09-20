# TAG2.GG Tracker EXE 빌드 및 배포 방법

이 문서는 Nuitka로 `TAG2GGTracker.exe`를 빌드하고, 사용자가 다운로드할
`TAG2GGTracker.zip`을 만드는 절차를 설명한다.

## 1. 필요한 파일

`C:\1\ttt2_tracker\`에 다음 파일이 있어야 한다.

```text
tracker.py
gui_launcher.py
version_info.txt
app-icon.ico
app-icon-192.png
app-icon-256.png
app-icon.svg
```

## 2. 빌드 환경

현재 공식 빌드는 Python 3.12와 Nuitka, Zig 컴파일러를 사용한다.

```powershell
py -3.12 -m pip install nuitka ziglang
```

Nuitka는 필요한 의존성 분석 도구를 처음 빌드할 때 자동으로 다운로드할 수
있다. 다운로드 확인 메시지가 나오면 허용한다.

## 3. 버전 변경

새 버전을 만들 때 다음 두 파일의 버전을 동일하게 변경한다.

### `gui_launcher.py`

```python
VERSION = "0.1.0"
```

### `version_info.txt`

```text
filevers=(0, 1, 0, 0)
prodvers=(0, 1, 0, 0)
FileVersion = 0.1.0.0
ProductVersion = 0.1.0
```

`VERSION`은 업데이트 차단 비교에 사용하고, `version_info.txt`는 Windows
파일 속성에 표시되는 버전에 사용한다. 두 값은 항상 일치해야 한다.

## 4. Nuitka 빌드

PowerShell에서 다음 명령을 실행한다.

```powershell
Set-Location C:\1\ttt2_tracker
py -3.12 -m nuitka `
  --onefile `
  --zig `
  --assume-yes-for-downloads `
  --enable-plugin=tk-inter `
  --windows-console-mode=disable `
  --windows-icon-from-ico=app-icon.ico `
  --include-data-file=app-icon-192.png=app-icon-192.png `
  --include-data-file=app-icon-256.png=app-icon-256.png `
  --include-data-file=app-icon.svg=app-icon.svg `
  --product-name="TAG2.GG Tracker" `
  --file-description="TAG2.GG online match tracker" `
  --company-name="legbreaker" `
  --product-version="0.1.0" `
  --file-version="0.1.0.0" `
  --output-filename=TAG2GGTracker.exe `
  --remove-output `
  .\gui_launcher.py
```

결과 파일:

```text
C:\1\ttt2_tracker\TAG2GGTracker.exe
```

## 5. ZIP 배포 파일 만들기

사용자에게는 EXE 자체가 아니라 ZIP을 배포한다.

```powershell
Set-Location C:\1\ttt2_tracker
Compress-Archive `
  -Path .\TAG2GGTracker.exe `
  -DestinationPath C:\1\dist\TAG2GGTracker.zip `
  -Force
```

배포 파일:

```text
C:\1\dist\TAG2GGTracker.zip
```

GitHub Release asset 파일명은 버전과 관계없이 항상 다음으로 유지한다.

```text
TAG2GGTracker.zip
```

웹사이트와 Tracker의 업데이트 버튼은 다음 고정 주소를 사용한다.

```text
https://github.com/opggttt2pj/TAG2.GG-Tracker/releases/latest/download/TAG2GGTracker.zip
```

## 6. 빌드 결과 확인

```powershell
$v = (Get-Item C:\1\ttt2_tracker\TAG2GGTracker.exe).VersionInfo
$v | Select-Object `
  FileDescription,
  ProductName,
  ProductVersion,
  FileVersion,
  OriginalFilename
```

현재 `0.1.0` 기준 예상 결과:

```text
ProductName      : TAG2.GG Tracker
ProductVersion   : 0.1.0.0
FileVersion      : 0.1.0.0
OriginalFilename : TAG2GGTracker.exe
```

## 7. 실행 테스트

```powershell
$p = Start-Process -FilePath C:\1\ttt2_tracker\TAG2GGTracker.exe -PassThru
Start-Sleep -Seconds 5
Get-Process -Id $p.Id | Select-Object Id,ProcessName,Responding
Stop-Process -Id $p.Id
```

GUI가 열리고 `Responding`이 `True`인지 확인한다.

## 8. Release 업로드 전 확인

- GitHub 태그는 `v0.1.0` 형식을 사용한다.
- Release는 정식 공개 상태여야 한다.
- Release asset 이름은 반드시 `TAG2GGTracker.zip`이어야 한다.
- ZIP 안에는 `TAG2GGTracker.exe`가 들어 있어야 한다.
- Source code ZIP이 아니라 직접 만든 `TAG2GGTracker.zip`을 업로드한다.
- 실제 RPCS3 연결과 온라인 경기 기록을 확인한 뒤 배포한다.
- `C:\1\github` 폴더의 문서는 이 절차와 별도로 관리한다.
