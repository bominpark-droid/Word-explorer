# Word Explorer (쉬운 영영한 사전)

미국 3~5학년 과정을 공부하는 아이를 위한 영영한 사전 앱입니다. 아이폰과 안드로이드에서 모두 돌아가는 Expo(React Native) 앱이고, 사전 전체가 앱 안에 들어 있어서 Wi-Fi가 없어도 검색이 됩니다.

## 기능
- 영어 단어 검색 (입력하는 동안 자동완성, `valleys`, `ran`, `hiking` 같은 변형도 기본형으로 찾아 줌)
- ⭐ 표시 단어: 4학년 눈높이의 쉬운 영어 설명 + 탭하면 한국어 뜻 + 외우기 쉬운 예문 2개(예문도 탭하면 한국어)
- 🇰🇷 표시 단어: 자주 쓰는 약 12,000단어의 뜻(12,583개)에 쉬운 영어 설명 + 한국어 뜻 + 예문 1개
- 단어장의 🏪 영어편의점으로 옮기기: 📋 단어 복사하기(`단어 | 뜻 | 영어 정의 | 예문` 형식) 후 영어편의점 열기 버튼으로 이동해 학교 단어 관리에 붙여 넣기
- 그 밖의 모든 단어: Open English WordNet 사전 뜻과 예문 (약 12만 8천 표제어)
- 🔊 발음 듣기 (폰에 내장된 음성 사용, 오프라인 가능)
- ☆ 한 번 탭으로 단어장에 추가, 단어장에서 카드로 외우기

## 데이터 출처와 라이선스
| 데이터 | 출처 | 라이선스 |
|---|---|---|
| 영어 사전 본문(뜻, 예문, 발음기호, 동의어) | [Open English WordNet](https://github.com/globalwordnet/english-wordnet) (Princeton WordNet 기반) | CC BY 4.0 + WordNet License |
| 불규칙 변화형(ran→run, mice→mouse) | Princeton WordNet 3.0 exception lists (npm `wndb-with-exceptions`) | WordNet License |
| ⭐ 단어의 쉬운 설명, 한국어 뜻, 예문 | 이 앱을 위해 AI(Claude)가 작성, `data/curated/` | 이 저장소 소유 |
| 🇰🇷 자주 쓰는 단어의 쉬운 설명, 한국어 뜻, 예문 | 이 앱을 위해 AI(Claude)가 작성, `data/gloss/` | 이 저장소 소유 |

AI가 쓴 쉬운 설명과 한국어 뜻은 사람이 전수 검토한 것이 아닙니다. 이상한 내용을 발견하면 `data/curated/*.json` 또는 `data/gloss/*.json`에서 고치고 사전을 다시 빌드하면 됩니다.

## 웹 버전 (링크로 열기)
GitHub Pages로 배포하면 폰 브라우저에서 링크만 눌러서 쓸 수 있어요: https://bominpark-droid.github.io/Word-explorer/
- 저장소 Settings > Pages > Source를 <GitHub Actions>로 한 번만 바꿔 두면, main에 올라가는 변경이 자동으로 배포돼요.
- 처음 열 때 사전(약 27MB)을 한 번 내려받고, 이후에는 브라우저에 저장돼서 Wi-Fi가 없어도 열려요.
- 폰 브라우저의 <홈 화면에 추가>를 하면 앱처럼 아이콘으로 열 수 있어요.
- 직접 만들어 보기: `npm run web:build` (결과는 `dist/`).

## 폰에서 실행하기 (Expo Go, 선택)
1. 컴퓨터에 Node.js(22 이상)를 설치합니다.
2. 이 폴더에서 `npm install` 후 `npx expo start`를 실행합니다.
3. 폰에 Expo Go 앱을 설치하고, 화면에 뜨는 QR 코드를 찍으면 앱이 열립니다.

앱으로 설치해서 컴퓨터 없이 쓰려면 EAS Build(`npx eas-cli build -p android --profile preview`)로 안드로이드 APK를 만들 수 있습니다. 아이폰에 설치하려면 Apple Developer 계정이 필요합니다.

## 사전 다시 만들기
```bash
python3 -m pip install pyyaml
git clone --depth 1 https://github.com/globalwordnet/english-wordnet /tmp/oewn
npm pack wndb-with-exceptions@3.0.2 && tar xzf wndb-with-exceptions-3.0.2.tgz -C /tmp
python3 scripts/build_db.py /tmp/oewn /tmp/package/data data/curated assets/db/dict.db data/gloss
npx tsx scripts/test_queries.ts
```
사전 파일을 다시 만들었으면 `App.tsx`의 `DICT_DB` 이름(`dict-v1.db`)의 숫자를 올려야 폰에 새 사전이 복사됩니다.
