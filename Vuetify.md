# Vuetify

## Styles

### rounded
- 모서리 둥글게 처리
- https://vuetifyjs.com/en/styles/border-radius/#usage
- border-radius를 뜻함
- default : 4px

### elevation
- 컴포넌트들간의 높낮이를 설정
- https://vuetifyjs.com/en/styles/elevation/#usage

### colors
- 테마에서 설정한 기본 설정으로 색상 지정 가능
- 기존 색상 pallete
    - https://vuetifyjs.com/en/styles/colors/#material-colors
- default 테마 색상
    - https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/composables/theme.ts#L147
    - background : #FFFFFF
    - surface : #FFFFFF
    - primary : #1867C0
    - secondary : #48A9A6
    - error : #B00020
    - info : #2196F3
    - success : #4CAF50
    - warning : #FB8C00
---


## Components
### v-sheet
- https://vuetifyjs.com/en/components/sheets/#usage

### v-btn
- https://vuetifyjs.com/en/components/buttons/#usage

### v-app-bar
- 

---

## Layouts
### v-app
- https://vuetifyjs.com/en/components/application/?utm_source=chatgpt.com

---

## Features & Directives

### icon
- 다양한 MDI 아이콘을 정의
- https://vuetifyjs.com/en/features/icon-fonts/
( 아이콘 사용 방법 )
- https://pictogrammers.com/library/mdi/
( mdi(material design icon) 사이트 )

---

## Components Common props
### variant
- 각 컴포넌트의 퍼지는 애니메이션의 차이이
- 다양한 버튼 스타일들을 구사
    - https://vuetifyjs.com/en/components/buttons/#variants
- 다양한 텍스트 필드 스타일들을 구사
    - https://vuetifyjs.com/en/components/text-fields/#variant
- 다양한 칩 스타일들을 구사
    - https://vuetifyjs.com/en/components/chips/#color-and-variants
- 다양한 알림문 스타일들을 구사
    - https://vuetifyjs.com/en/components/alerts/#variants

### density
- 각 컴포넌트의 그림자 스타일
- 다양한 버튼 그림자 스타일
    - https://vuetifyjs.com/en/components/buttons/#density
- 3가지 텍스트 필드 그림자 스타일
    - https://vuetifyjs.com/en/components/text-fields/#density


## 참고 (vuetify만의 것이 아니더라도 정리)

### aria-label
- html 속성
- 태그가 가지고 있는 의미를 부여하는 이름표
