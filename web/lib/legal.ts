import type { Lang } from './i18n'

// 법적고지 본문 — 개인정보처리방침·이용약관·면책조항.
//
// 이 파일을 화면 문구(ui.ts)와 분리한 이유: 법적고지는 '번역투를 피하고 자연스럽게'가
// 아니라 '네 언어가 같은 것을 말한다'가 우선이다. ui.ts의 원칙과 정반대라 섞으면
// 나중에 누가 어느 쪽 기준으로 고쳐야 할지 알 수 없게 된다.
//
// 그리고 이 내용은 코드와 반드시 일치해야 한다. 카카오 개발자 콘솔도 "동의항목 관리
// 화면에 입력한 사실이 실제 서비스 내용과 다를 경우 API 서비스의 거부 사유가 될 수
// 있습니다"라고 경고한다. 아래 수집 항목은 2026-08-19 기준으로 코드를 직접 확인해
// 적었다 — 무엇을 어디서 확인했는지는 각 항목 옆 주석에 남긴다.
//
//   소셜 로그인   components/SocialLogin.tsx  (kakao: profile_nickname, account_email)
//   후기          components/detail/Reviews.tsx  (rating, body + profiles.display_name)
//   제보          components/detail/ReportError.tsx  (body, contact — contact는 선택)
//   이용 기록     lib/track.ts  (visitor=브라우저 난수, kind, festival_id, payload, lang)
//   위치          components/FestivalList.tsx  (거리 계산만, 서버로 보내지 않음)
//
// 수집 항목을 바꾸면 여기도 같이 고칠 것. 한쪽만 고치면 거짓말이 된다.

export type LegalKind = 'privacy' | 'terms' | 'disclaimer'
export const LEGAL_KINDS: LegalKind[] = ['privacy', 'terms', 'disclaimer']

export type Section = { h: string; p?: string[]; ul?: string[] }
export type Doc = { title: string; updated: string; intro: string; sections: Section[] }

/** 시행일 — 문서를 고치면 올릴 것 */
const UPDATED = '2026-08-19'

const OPERATOR_KO = '프로젝트윤'
const CONTACT = 'yuneunmi814@gmail.com'

const ko: Record<LegalKind, Doc> = {
  privacy: {
    title: '개인정보처리방침',
    updated: UPDATED,
    intro: `${OPERATOR_KO}(이하 "운영자")은 KOTA를 운영하며 「개인정보 보호법」을 비롯한 관련 법령을 지킵니다. 이 방침은 KOTA가 실제로 무엇을 받고 무엇을 받지 않는지를 있는 그대로 적은 것입니다.`,
    sections: [
      {
        h: '1. 받는 정보와 그 이유',
        p: ['KOTA는 로그인하지 않아도 축제를 찾아보는 데 아무 제약이 없습니다. 아래는 이용자가 직접 무언가를 남길 때에만 해당합니다.'],
        ul: [
          '소셜 로그인(선택) — 카카오는 닉네임과 이메일, 구글은 이름과 이메일을 받습니다. 후기를 누가 썼는지 구분하고 본인이 쓴 글을 다시 고칠 수 있게 하기 위해서입니다. 카카오 프로필 사진은 받지 않습니다.',
          '후기(선택) — 별점과 후기 내용, 그리고 화면에 표시할 이름을 저장합니다.',
          '정보 수정 제보(선택) — 제보 내용을 저장합니다. 연락처는 입력란이 있지만 비워 두셔도 되고, 적어 주신 경우에만 저장하며 확인 결과를 알려드리는 데에만 씁니다.',
          '이용 기록(자동) — 어떤 축제를 봤는지, 무엇을 검색하고 어떤 필터를 눌렀는지를 남깁니다. 사람을 특정하지 않기 위해 브라우저가 만든 임의의 문자열을 방문자 구분에 쓰며, IP 주소와 기기 정보는 수집하지 않습니다. 이 문자열은 브라우저 저장소를 지우면 사라집니다.',
        ],
      },
      {
        h: '2. 위치 정보는 보내지 않습니다',
        p: [
          '“가까운 순”으로 정렬하거나 내 주변 축제를 볼 때 브라우저에 위치를 물어봅니다. 이때 받은 좌표는 이용자의 브라우저 안에서 축제까지의 거리를 계산하는 데에만 쓰이며, 운영자의 서버로 전송되거나 저장되지 않습니다.',
          '위치 제공을 거부하셔도 거리순 정렬 외의 모든 기능을 그대로 쓰실 수 있습니다.',
        ],
      },
      {
        h: '3. 얼마나 보관하나요',
        ul: [
          '계정 정보와 후기 — 이용자가 삭제를 요청하거나 계정을 지울 때까지 보관합니다.',
          '정보 수정 제보 — 처리가 끝난 뒤 1년까지 보관하고 지웁니다.',
          '이용 기록 — 수집일로부터 1년까지 보관하고 지웁니다.',
          '법령이 보관을 따로 정한 경우에는 그 기간을 따릅니다.',
        ],
      },
      {
        h: '4. 제3자에게 주지 않습니다',
        p: ['운영자는 이용자의 개인정보를 다른 곳에 팔거나 넘기지 않습니다. 법령에 따라 수사기관이 적법한 절차로 요구하는 경우에만 예외입니다.'],
      },
      {
        h: '5. 맡겨서 처리하는 곳',
        p: ['서비스를 돌리기 위해 아래 사업자의 설비를 이용합니다. 이들 회사의 서버는 해외에 있을 수 있고, 그 경우 개인정보가 국외에 보관됩니다.'],
        ul: [
          'Supabase — 데이터베이스와 로그인 처리',
          'Vercel — 웹사이트 호스팅',
          '카카오 · 구글 — 이용자가 선택한 경우의 로그인 인증',
        ],
      },
      {
        h: '6. 이용자의 권리',
        p: [
          '본인의 정보를 열람·정정·삭제하거나 처리를 멈춰 달라고 요청하실 수 있습니다. 후기는 로그인 후 직접 고치거나 지울 수 있고, 그 밖의 요청은 아래 연락처로 알려주시면 지체 없이 처리합니다.',
          '만 14세 미만 아동의 개인정보는 수집하지 않습니다.',
        ],
      },
      {
        h: '7. 안전조치',
        p: ['데이터베이스에는 행 단위 접근 제어를 걸어 두어, 이용자는 자신이 남긴 것만 고치거나 지울 수 있고 남의 기록은 읽을 수 없습니다. 이용 기록은 남기는 것만 허용되어 브라우저에서 조회할 수 없습니다.'],
      },
      {
        h: '8. 문의',
        p: [`개인정보와 관련한 문의는 ${CONTACT} 로 보내주세요. 개인정보 침해에 대한 신고·상담이 필요하시면 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118)를 이용하실 수 있습니다.`],
      },
      {
        h: '9. 방침의 변경',
        p: ['이 방침을 고칠 때에는 시행일을 바꾸어 이 페이지에 알립니다. 받는 정보가 늘어나는 등 중요한 변경은 시행 전에 미리 알립니다.'],
      },
    ],
  },

  terms: {
    title: '이용약관',
    updated: UPDATED,
    intro: 'KOTA를 이용해 주셔서 고맙습니다. 이 약관은 운영자와 이용자 사이의 약속을 적은 것입니다.',
    sections: [
      {
        h: '1. 서비스의 내용',
        p: [
          'KOTA는 ⓒ한국관광공사와 공공데이터포털, 각 지방자치단체가 공개한 자료를 모아 전국의 축제를 날짜·지역·주제로 찾아볼 수 있게 하는 정보 서비스입니다. 한국어·영어·일본어·태국어로 제공합니다.',
          '모든 기능은 무료이며, 운영자는 축제를 주최하거나 입장권을 판매하지 않습니다.',
        ],
      },
      {
        h: '2. 회원가입 없이 쓰실 수 있습니다',
        p: ['축제를 찾아보는 데에는 로그인이 필요 없습니다. 후기를 남기실 때에만 카카오 또는 구글 계정으로 로그인하시면 됩니다.'],
      },
      {
        h: '3. 이용자가 남긴 글',
        p: [
          '후기와 제보의 내용에 대한 책임은 작성한 분에게 있습니다. 저작권도 작성한 분에게 있으며, 운영자는 그 글을 KOTA 안에서 보여주는 범위에서만 사용합니다.',
          '작성한 글은 로그인 후 언제든 직접 고치거나 지우실 수 있습니다.',
        ],
      },
      {
        h: '4. 이런 것은 삼가 주세요',
        ul: [
          '다른 사람을 모욕하거나 명예를 훼손하는 글',
          '허위 사실, 광고, 같은 내용의 반복 게시',
          '타인의 개인정보나 저작물을 무단으로 올리는 행위',
          '자동화된 수단으로 서비스에 과도한 부하를 주는 행위',
        ],
        p: ['위와 같은 글은 사전 통지 없이 보이지 않게 하거나 삭제할 수 있습니다.'],
      },
      {
        h: '5. 서비스의 변경과 중단',
        p: ['운영자는 서비스의 내용을 바꾸거나 중단할 수 있습니다. 이용자가 남긴 글이 사라지는 등 중요한 변경은 미리 알립니다. 다만 설비 장애나 천재지변처럼 미리 알릴 수 없는 사정은 예외입니다.'],
      },
      {
        h: '6. 책임의 한계',
        p: ['축제 정보의 정확성에 관해서는 별도의 면책조항을 함께 확인해 주세요. 운영자는 무료로 제공되는 정보 서비스의 성격상, 고의나 중대한 과실이 없는 한 이용자에게 생긴 손해에 대해 책임을 지지 않습니다.'],
      },
      {
        h: '7. 준거법과 관할',
        p: ['이 약관은 대한민국 법을 따르며, 분쟁이 생긴 경우 민사소송법이 정한 법원을 관할로 합니다.'],
      },
      {
        h: '8. 문의',
        p: [`약관에 관한 문의는 ${CONTACT} 로 보내주세요.`],
      },
    ],
  },

  disclaimer: {
    title: '면책조항',
    updated: UPDATED,
    intro: 'KOTA가 보여주는 축제 정보에 대해 미리 알려드릴 것이 있습니다.',
    sections: [
      {
        h: '1. 일정과 장소는 바뀝니다',
        p: [
          'KOTA의 축제 정보는 공공기관이 공개한 자료와 주최 측이 알린 내용을 모은 것입니다. 축제의 날짜·장소·요금·프로그램은 주최 측 사정이나 날씨로 예고 없이 바뀌거나 취소될 수 있습니다.',
          '먼 길을 나서기 전에는 반드시 각 축제의 공식 홈페이지나 주최 기관에 확인해 주세요. 운영자는 정보가 실제와 달라 생긴 손해에 대해 책임지지 않습니다.',
        ],
      },
      {
        h: '2. 요금 정보',
        p: ['입장료가 확인되지 않은 축제는 “무료”라고 단정하지 않고 확인이 필요하다고 표시합니다. 표시된 요금도 현장 사정에 따라 다를 수 있습니다.'],
      },
      {
        h: '3. 이용자가 남긴 후기',
        p: ['후기는 작성한 분의 개인적인 경험과 의견이며, 운영자의 견해가 아닙니다. 운영자가 그 내용의 사실 여부를 보증하지 않습니다.'],
      },
      {
        h: '4. 외부 링크와 사진',
        p: [
          '축제의 공식 홈페이지나 예매처로 연결되는 링크가 있습니다. 연결된 곳의 내용과 거래에 대해서는 운영자가 책임지지 않습니다.',
          '축제 사진은 각 출처의 이용 조건에 따라 보여주며, 원본을 변형하지 않습니다. 저작권은 각 저작권자에게 있습니다.',
        ],
      },
      {
        h: '5. 데이터 출처',
        p: ['출처: ⓒ한국관광공사. 그 밖에 문화포털, 공공데이터포털의 전국문화축제표준데이터, 각 지방자치단체의 공개 자료를 이용합니다. 공공데이터는 공공누리 이용 조건을 따릅니다.'],
      },
    ],
  },
}

const en: Record<LegalKind, Doc> = {
  privacy: {
    title: 'Privacy Policy',
    updated: UPDATED,
    intro: 'Project Yoon ("we") operates KOTA and follows Korea\'s Personal Information Protection Act. This page describes exactly what KOTA collects — and what it does not.',
    sections: [
      {
        h: '1. What we collect, and why',
        p: ['You can browse every festival without signing in. The items below apply only when you choose to leave something behind.'],
        ul: [
          'Social sign-in (optional) — from Kakao we receive your nickname and email; from Google, your name and email. We use these to attribute reviews and let you edit your own. We do not request your Kakao profile photo.',
          'Reviews (optional) — your rating, your text, and the display name shown beside it.',
          'Correction reports (optional) — the report itself. The contact field is optional; if you fill it in we store it only to tell you what came of your report.',
          'Usage records (automatic) — which festivals you opened, what you searched for, which filters you pressed. To avoid identifying anyone, visitors are distinguished by a random string generated in your browser; we do not collect IP addresses or device information. Clearing your browser storage erases that string.',
        ],
      },
      {
        h: '2. Your location never leaves your browser',
        p: [
          'Sorting by distance asks your browser for your position. Those coordinates are used only inside your browser to measure how far each festival is. They are never sent to our servers and never stored.',
          'Declining the location prompt costs you nothing but distance sorting.',
        ],
      },
      {
        h: '3. How long we keep it',
        ul: [
          'Account details and reviews — until you ask us to delete them or close your account.',
          'Correction reports — up to one year after the report is resolved.',
          'Usage records — up to one year from collection.',
          'Where the law sets its own retention period, we follow it.',
        ],
      },
      {
        h: '4. We do not share it',
        p: ['We do not sell or hand your personal information to anyone. The only exception is a lawful request from an investigative authority following due process.'],
      },
      {
        h: '5. Processors we rely on',
        p: ['We use the following providers to run the service. Their servers may sit outside Korea, in which case your information is stored abroad.'],
        ul: ['Supabase — database and authentication', 'Vercel — web hosting', 'Kakao and Google — sign-in, if you choose it'],
      },
      {
        h: '6. Your rights',
        p: [
          'You may ask to see, correct, or delete your information, or to stop us processing it. You can edit or delete your own reviews after signing in; for anything else, write to us and we will act without delay.',
          'We do not knowingly collect information from children under 14.',
        ],
      },
      {
        h: '7. How we protect it',
        p: ['Row-level security is enforced in the database: you can change or delete only what you wrote, and cannot read anyone else\'s records. Usage records are write-only and cannot be queried from a browser.'],
      },
      {
        h: '8. Contact',
        p: [`For any privacy question, write to ${CONTACT}.`],
      },
      {
        h: '9. Changes to this policy',
        p: ['When we revise this policy we update the effective date on this page. We announce material changes — such as collecting something new — before they take effect.'],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    updated: UPDATED,
    intro: 'Thank you for using KOTA. These terms set out the agreement between us and you.',
    sections: [
      {
        h: '1. What the service is',
        p: [
          'KOTA gathers festival information published by ⓒKorea Tourism Organization, data.go.kr, and local governments, and lets you search it by date, region, and theme. It is available in Korean, English, Japanese, and Thai.',
          'Everything is free. We neither host festivals nor sell tickets.',
        ],
      },
      { h: '2. No account required', p: ['Browsing needs no sign-in. You only sign in — with Kakao or Google — to leave a review.'] },
      {
        h: '3. What you write',
        p: [
          'You are responsible for your reviews and reports, and you keep their copyright. We use them only to display them within KOTA.',
          'You can edit or delete anything you wrote, at any time, after signing in.',
        ],
      },
      {
        h: '4. Please avoid',
        ul: [
          'Insulting or defaming others',
          'False claims, advertising, or repeated identical posts',
          'Posting other people\'s personal information or copyrighted work without permission',
          'Placing an unreasonable load on the service by automated means',
        ],
        p: ['We may hide or remove such posts without prior notice.'],
      },
      {
        h: '5. Changes and interruptions',
        p: ['We may change or discontinue the service. We give notice before material changes — such as anything that would remove what you wrote — except where equipment failure or force majeure makes notice impossible.'],
      },
      {
        h: '6. Limits of our responsibility',
        p: ['Please also read the Disclaimer regarding the accuracy of festival information. As a free information service, we are not liable for losses you incur except where we acted with intent or gross negligence.'],
      },
      { h: '7. Governing law', p: ['These terms are governed by the law of the Republic of Korea, and any dispute falls to the court designated by its Civil Procedure Act.'] },
      { h: '8. Contact', p: [`Questions about these terms: ${CONTACT}.`] },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    updated: UPDATED,
    intro: 'A few things to know about the festival information KOTA shows you.',
    sections: [
      {
        h: '1. Dates and venues change',
        p: [
          'Our festival information comes from public data and from what organisers have announced. Dates, venues, fees, and programmes can change or be cancelled without notice — because of the organiser, or the weather.',
          'Before travelling any distance, check the festival\'s own website or the organiser directly. We are not liable for losses arising from information that turns out to differ from reality.',
        ],
      },
      { h: '2. Admission fees', p: ['Where we could not confirm the fee, we say it needs checking rather than calling it free. Even a stated fee may differ on site.'] },
      { h: '3. Reviews', p: ['Reviews are the personal experience and opinion of whoever wrote them, not our view, and we do not vouch for their accuracy.'] },
      {
        h: '4. Outside links and photographs',
        p: [
          'Some links lead to official festival sites or ticket sellers. We are not responsible for their content or for any transaction you make there.',
          'Photographs are shown under each source\'s terms and are not altered. Copyright remains with the respective holders.',
        ],
      },
      { h: '5. Data sources', p: ['Source: ⓒKorea Tourism Organization. Also Culture Portal, the national festival standard dataset on data.go.kr, and material published by local governments. Public data is used under the Korea Open Government Licence (KOGL).'] },
    ],
  },
}

const ja: Record<LegalKind, Doc> = {
  privacy: {
    title: 'プライバシーポリシー',
    updated: UPDATED,
    intro: 'プロジェクトユン（以下「運営者」）はKOTAを運営し、韓国の「個人情報保護法」等の関連法令を遵守します。本ポリシーは、KOTAが実際に何を受け取り、何を受け取らないのかをそのまま記したものです。',
    sections: [
      {
        h: '1. お預かりする情報とその理由',
        p: ['ログインしなくても、お祭りを探すことに制限はありません。以下は、利用者が何かを書き込む場合にのみ当てはまります。'],
        ul: [
          'ソーシャルログイン（任意）— カカオからはニックネームとメールアドレス、グーグルからは氏名とメールアドレスをお預かりします。口コミの書き手を区別し、ご自身の投稿を編集できるようにするためです。カカオのプロフィール写真は取得しません。',
          '口コミ（任意）— 評価、本文、画面に表示する名前を保存します。',
          '情報修正のご報告（任意）— ご報告の内容を保存します。連絡先の入力欄は空欄のままで構いません。ご記入いただいた場合のみ保存し、確認結果をお知らせするためだけに使用します。',
          '利用記録（自動）— どのお祭りを開いたか、何を検索し、どの絞り込みを押したかを記録します。個人を特定しないよう、ブラウザが生成したランダムな文字列で訪問者を区別しており、IPアドレスや端末情報は取得しません。この文字列はブラウザの保存領域を消すと失われます。',
        ],
      },
      {
        h: '2. 位置情報は送信されません',
        p: [
          '「近い順」に並べ替える際、ブラウザに位置をお尋ねします。取得した座標は、利用者のブラウザ内でお祭りまでの距離を計算するためだけに使われ、運営者のサーバーへ送信も保存もされません。',
          '位置情報の提供を断っても、距離順の並べ替え以外のすべての機能をそのままご利用いただけます。',
        ],
      },
      {
        h: '3. 保存する期間',
        ul: [
          'アカウント情報と口コミ — 削除のご依頼、またはアカウント削除まで。',
          '情報修正のご報告 — 対応完了から1年まで。',
          '利用記録 — 取得日から1年まで。',
          '法令が別途保存期間を定める場合は、それに従います。',
        ],
      },
      { h: '4. 第三者には渡しません', p: ['運営者は利用者の個人情報を売却したり譲渡したりしません。法令に基づき捜査機関が適法な手続きで求める場合のみ例外です。'] },
      {
        h: '5. 業務を委託している事業者',
        p: ['サービスの運用のため以下の事業者の設備を利用します。これらのサーバーは韓国国外にある場合があり、その際は個人情報が国外に保管されます。'],
        ul: ['Supabase — データベースとログイン処理', 'Vercel — ウェブホスティング', 'カカオ・グーグル — 利用者が選択した場合のログイン認証'],
      },
      {
        h: '6. 利用者の権利',
        p: [
          'ご自身の情報の閲覧・訂正・削除、または処理の停止をご請求いただけます。口コミはログイン後にご自身で編集・削除でき、その他のご請求は下記の連絡先へお知らせいただければ遅滞なく対応します。',
          '満14歳未満のお子様の個人情報は取得しません。',
        ],
      },
      { h: '7. 安全管理', p: ['データベースには行単位のアクセス制御を設定しており、利用者はご自身が書き込んだものだけを編集・削除でき、他人の記録は読めません。利用記録は書き込み専用で、ブラウザから照会することはできません。'] },
      { h: '8. お問い合わせ', p: [`個人情報に関するお問い合わせは ${CONTACT} までご連絡ください。`] },
      { h: '9. ポリシーの変更', p: ['本ポリシーを改定する際は、施行日を更新して本ページでお知らせします。取得する情報が増えるなどの重要な変更は、施行前にあらかじめお知らせします。'] },
    ],
  },

  terms: {
    title: '利用規約',
    updated: UPDATED,
    intro: 'KOTAをご利用いただきありがとうございます。本規約は、運営者と利用者との約束を記したものです。',
    sections: [
      {
        h: '1. サービスの内容',
        p: [
          'KOTAは、ⓒ韓国観光公社、公共データポータル、各自治体が公開した資料をまとめ、全国のお祭りを日付・地域・テーマで探せるようにする情報サービスです。韓国語・英語・日本語・タイ語で提供します。',
          'すべての機能は無料であり、運営者はお祭りを主催せず、チケットも販売しません。',
        ],
      },
      { h: '2. 会員登録は不要です', p: ['お祭りを探すのにログインは必要ありません。口コミを投稿されるときにのみ、カカオまたはグーグルのアカウントでログインしてください。'] },
      {
        h: '3. 利用者が書き込んだもの',
        p: [
          '口コミやご報告の内容についての責任は、書かれたご本人にあります。著作権もご本人に帰属し、運営者はKOTA内で表示する範囲でのみ利用します。',
          '書き込まれた内容は、ログイン後いつでもご自身で編集・削除いただけます。',
        ],
      },
      {
        h: '4. おやめください',
        ul: ['他人を侮辱し、または名誉を毀損する書き込み', '虚偽の事実、広告、同一内容の繰り返し投稿', '他人の個人情報や著作物を無断で掲載する行為', '自動化された手段でサービスに過度な負荷をかける行為'],
        p: ['上記のような書き込みは、事前の通知なく非表示または削除する場合があります。'],
      },
      { h: '5. サービスの変更と中断', p: ['運営者はサービスの内容を変更し、または中断することがあります。利用者の書き込みが失われるなどの重要な変更は事前にお知らせします。ただし設備の障害や天災など、事前にお知らせできない事情は例外です。'] },
      { h: '6. 責任の範囲', p: ['お祭り情報の正確性については、別途の免責事項も併せてご確認ください。運営者は、無償で提供される情報サービスの性質上、故意または重大な過失がない限り、利用者に生じた損害について責任を負いません。'] },
      { h: '7. 準拠法と管轄', p: ['本規約は大韓民国法に準拠し、紛争が生じた場合は民事訴訟法の定める裁判所を管轄とします。'] },
      { h: '8. お問い合わせ', p: [`規約に関するお問い合わせは ${CONTACT} までご連絡ください。`] },
    ],
  },

  disclaimer: {
    title: '免責事項',
    updated: UPDATED,
    intro: 'KOTAが表示するお祭り情報について、あらかじめお伝えすることがあります。',
    sections: [
      {
        h: '1. 日程と会場は変わります',
        p: [
          'KOTAのお祭り情報は、公共機関が公開した資料と主催者が知らせた内容をまとめたものです。日付・会場・料金・プログラムは、主催者の都合や天候により予告なく変更または中止されることがあります。',
          '遠方へお出かけになる前には、必ず各お祭りの公式サイトまたは主催機関にご確認ください。情報が実際と異なることにより生じた損害について、運営者は責任を負いません。',
        ],
      },
      { h: '2. 料金について', p: ['入場料が確認できていないお祭りは「無料」と断定せず、確認が必要である旨を表示します。表示された料金も現地の事情により異なる場合があります。'] },
      { h: '3. 利用者の口コミ', p: ['口コミは書かれたご本人の個人的な経験と意見であり、運営者の見解ではありません。運営者はその内容の真偽を保証しません。'] },
      {
        h: '4. 外部リンクと写真',
        p: [
          'お祭りの公式サイトやチケット販売サイトへのリンクがあります。リンク先の内容や取引について、運営者は責任を負いません。',
          'お祭りの写真は各出典の利用条件に従って表示し、原本を改変しません。著作権は各著作権者に帰属します。',
        ],
      },
      { h: '5. データの出典', p: ['出典: ⓒ韓国観光公社。ほかに文化ポータル、公共データポータルの全国文化祭り標準データ、各自治体の公開資料を利用しています。公共データは公共누리（KOGL）の利用条件に従います。'] },
    ],
  },
}

const th: Record<LegalKind, Doc> = {
  privacy: {
    title: 'นโยบายความเป็นส่วนตัว',
    updated: UPDATED,
    intro: 'Project Yoon ("เรา") เป็นผู้ให้บริการ KOTA และปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคลของเกาหลี หน้านี้อธิบายว่า KOTA เก็บอะไรบ้าง และไม่เก็บอะไรบ้าง ตามความเป็นจริง',
    sections: [
      {
        h: '1. ข้อมูลที่เราเก็บ และเหตุผล',
        p: ['คุณสามารถค้นหาเทศกาลทั้งหมดได้โดยไม่ต้องเข้าสู่ระบบ รายการด้านล่างนี้ใช้เฉพาะเมื่อคุณเลือกที่จะฝากข้อความไว้เท่านั้น'],
        ul: [
          'การเข้าสู่ระบบผ่านโซเชียล (ไม่บังคับ) — จาก Kakao เราได้รับชื่อเล่นและอีเมล จาก Google ได้รับชื่อและอีเมล เพื่อระบุว่าใครเป็นผู้เขียนรีวิวและให้คุณแก้ไขรีวิวของตนเองได้ เราไม่ขอรูปโปรไฟล์ Kakao',
          'รีวิว (ไม่บังคับ) — คะแนน ข้อความ และชื่อที่แสดงข้างรีวิว',
          'การแจ้งแก้ไขข้อมูล (ไม่บังคับ) — เนื้อหาที่แจ้ง ช่องข้อมูลติดต่อไม่บังคับ หากกรอกไว้ เราจะเก็บไว้เพื่อแจ้งผลการตรวจสอบกลับเท่านั้น',
          'บันทึกการใช้งาน (อัตโนมัติ) — เทศกาลที่คุณเปิดดู คำที่ค้นหา ตัวกรองที่กด เพื่อไม่ให้ระบุตัวบุคคล เราแยกผู้เข้าชมด้วยข้อความสุ่มที่เบราว์เซอร์สร้างขึ้น และไม่เก็บที่อยู่ IP หรือข้อมูลอุปกรณ์ ข้อความนี้จะหายไปเมื่อคุณล้างข้อมูลเบราว์เซอร์',
        ],
      },
      {
        h: '2. ตำแหน่งของคุณไม่ถูกส่งออกจากเบราว์เซอร์',
        p: [
          'การเรียงตามระยะทางจะขอตำแหน่งจากเบราว์เซอร์ของคุณ พิกัดนั้นถูกใช้ภายในเบราว์เซอร์เพื่อคำนวณระยะทางถึงแต่ละเทศกาลเท่านั้น ไม่เคยถูกส่งไปยังเซิร์ฟเวอร์ของเราและไม่ถูกจัดเก็บ',
          'หากปฏิเสธการขอตำแหน่ง คุณยังใช้ทุกฟังก์ชันได้ตามปกติ ยกเว้นการเรียงตามระยะทาง',
        ],
      },
      {
        h: '3. ระยะเวลาจัดเก็บ',
        ul: [
          'ข้อมูลบัญชีและรีวิว — จนกว่าคุณจะขอให้ลบหรือปิดบัญชี',
          'การแจ้งแก้ไขข้อมูล — ไม่เกินหนึ่งปีหลังดำเนินการเสร็จ',
          'บันทึกการใช้งาน — ไม่เกินหนึ่งปีนับจากวันที่เก็บ',
          'หากกฎหมายกำหนดระยะเวลาไว้เป็นอย่างอื่น เราปฏิบัติตามกฎหมายนั้น',
        ],
      },
      { h: '4. เราไม่เปิดเผยต่อบุคคลที่สาม', p: ['เราไม่ขายหรือส่งต่อข้อมูลส่วนบุคคลของคุณให้ผู้ใด ยกเว้นกรณีที่หน่วยงานสอบสวนร้องขอตามกระบวนการที่ชอบด้วยกฎหมาย'] },
      {
        h: '5. ผู้ให้บริการที่เราใช้',
        p: ['เราใช้บริการต่อไปนี้ในการให้บริการ เซิร์ฟเวอร์ของผู้ให้บริการเหล่านี้อาจอยู่นอกประเทศเกาหลี ซึ่งหมายความว่าข้อมูลของคุณอาจถูกจัดเก็บในต่างประเทศ'],
        ul: ['Supabase — ฐานข้อมูลและการยืนยันตัวตน', 'Vercel — เว็บโฮสติ้ง', 'Kakao และ Google — การเข้าสู่ระบบ หากคุณเลือกใช้'],
      },
      {
        h: '6. สิทธิของคุณ',
        p: [
          'คุณสามารถขอดู แก้ไข หรือลบข้อมูลของคุณ หรือขอให้หยุดประมวลผลได้ รีวิวของคุณแก้ไขหรือลบเองได้หลังเข้าสู่ระบบ สำหรับเรื่องอื่นโปรดติดต่อเรา แล้วเราจะดำเนินการโดยไม่ชักช้า',
          'เราไม่เก็บข้อมูลของเด็กอายุต่ำกว่า 14 ปี',
        ],
      },
      { h: '7. การรักษาความปลอดภัย', p: ['ฐานข้อมูลบังคับใช้การควบคุมการเข้าถึงระดับแถว คุณแก้ไขหรือลบได้เฉพาะสิ่งที่คุณเขียน และไม่สามารถอ่านบันทึกของผู้อื่นได้ บันทึกการใช้งานเขียนได้อย่างเดียวและไม่สามารถเรียกดูจากเบราว์เซอร์'] },
      { h: '8. ติดต่อเรา', p: [`หากมีคำถามเกี่ยวกับความเป็นส่วนตัว โปรดเขียนถึง ${CONTACT}`] },
      { h: '9. การเปลี่ยนแปลงนโยบาย', p: ['เมื่อเราแก้ไขนโยบายนี้ เราจะปรับวันที่มีผลบังคับใช้บนหน้านี้ และจะแจ้งล่วงหน้าก่อนการเปลี่ยนแปลงที่สำคัญ เช่น การเก็บข้อมูลเพิ่มเติม'] },
    ],
  },

  terms: {
    title: 'ข้อกำหนดการใช้บริการ',
    updated: UPDATED,
    intro: 'ขอบคุณที่ใช้ KOTA ข้อกำหนดนี้ระบุข้อตกลงระหว่างเรากับคุณ',
    sections: [
      {
        h: '1. บริการนี้คืออะไร',
        p: [
          'KOTA รวบรวมข้อมูลเทศกาลที่เผยแพร่โดย ⓒองค์การส่งเสริมการท่องเที่ยวเกาหลี, data.go.kr และหน่วยงานท้องถิ่น เพื่อให้ค้นหาได้ตามวันที่ ภูมิภาค และธีม ให้บริการเป็นภาษาเกาหลี อังกฤษ ญี่ปุ่น และไทย',
          'ทุกฟังก์ชันใช้ฟรี เราไม่ได้เป็นผู้จัดเทศกาลและไม่ได้ขายบัตร',
        ],
      },
      { h: '2. ไม่ต้องสมัครสมาชิก', p: ['การค้นหาเทศกาลไม่ต้องเข้าสู่ระบบ คุณเข้าสู่ระบบด้วย Kakao หรือ Google เฉพาะเมื่อต้องการเขียนรีวิวเท่านั้น'] },
      {
        h: '3. สิ่งที่คุณเขียน',
        p: [
          'คุณรับผิดชอบต่อรีวิวและรายงานของคุณ และยังคงเป็นเจ้าของลิขสิทธิ์ เราใช้เพียงเพื่อแสดงภายใน KOTA เท่านั้น',
          'คุณแก้ไขหรือลบสิ่งที่เขียนได้ทุกเมื่อหลังเข้าสู่ระบบ',
        ],
      },
      {
        h: '4. สิ่งที่ควรหลีกเลี่ยง',
        ul: ['การดูหมิ่นหรือหมิ่นประมาทผู้อื่น', 'ข้อความเท็จ โฆษณา หรือการโพสต์ซ้ำ', 'การเผยแพร่ข้อมูลส่วนบุคคลหรือผลงานของผู้อื่นโดยไม่ได้รับอนุญาต', 'การสร้างภาระเกินควรแก่ระบบด้วยวิธีอัตโนมัติ'],
        p: ['เราอาจซ่อนหรือลบข้อความดังกล่าวโดยไม่ต้องแจ้งล่วงหน้า'],
      },
      { h: '5. การเปลี่ยนแปลงและการหยุดให้บริการ', p: ['เราอาจเปลี่ยนแปลงหรือยุติบริการ เราจะแจ้งล่วงหน้าก่อนการเปลี่ยนแปลงที่สำคัญ เช่น สิ่งที่จะทำให้ข้อความของคุณหายไป ยกเว้นกรณีระบบขัดข้องหรือเหตุสุดวิสัยที่ไม่อาจแจ้งได้'] },
      { h: '6. ขอบเขตความรับผิด', p: ['โปรดอ่านข้อจำกัดความรับผิดชอบเกี่ยวกับความถูกต้องของข้อมูลเทศกาลด้วย ในฐานะบริการข้อมูลที่ให้ฟรี เราไม่รับผิดต่อความเสียหายของคุณ เว้นแต่เกิดจากเจตนาหรือความประมาทเลินเล่ออย่างร้ายแรง'] },
      { h: '7. กฎหมายที่ใช้บังคับ', p: ['ข้อกำหนดนี้อยู่ภายใต้กฎหมายแห่งสาธารณรัฐเกาหลี และข้อพิพาทให้อยู่ในเขตอำนาจศาลตามประมวลกฎหมายวิธีพิจารณาความแพ่ง'] },
      { h: '8. ติดต่อเรา', p: [`คำถามเกี่ยวกับข้อกำหนดนี้: ${CONTACT}`] },
    ],
  },

  disclaimer: {
    title: 'ข้อจำกัดความรับผิดชอบ',
    updated: UPDATED,
    intro: 'มีบางเรื่องที่ควรทราบเกี่ยวกับข้อมูลเทศกาลที่ KOTA แสดง',
    sections: [
      {
        h: '1. วันและสถานที่เปลี่ยนแปลงได้',
        p: [
          'ข้อมูลเทศกาลของเรามาจากข้อมูลสาธารณะและสิ่งที่ผู้จัดประกาศไว้ วันที่ สถานที่ ค่าเข้าชม และกำหนดการอาจเปลี่ยนแปลงหรือยกเลิกโดยไม่แจ้งล่วงหน้า ทั้งจากผู้จัดหรือจากสภาพอากาศ',
          'ก่อนเดินทางไกล โปรดตรวจสอบกับเว็บไซต์ของเทศกาลหรือผู้จัดโดยตรง เราไม่รับผิดต่อความเสียหายที่เกิดจากข้อมูลที่ต่างไปจากความเป็นจริง',
        ],
      },
      { h: '2. ค่าเข้าชม', p: ['หากเราไม่สามารถยืนยันค่าเข้าชมได้ เราจะระบุว่าต้องตรวจสอบ แทนที่จะระบุว่าฟรี แม้ค่าเข้าชมที่ระบุไว้ก็อาจต่างออกไปเมื่อไปถึงสถานที่จริง'] },
      { h: '3. รีวิว', p: ['รีวิวเป็นประสบการณ์และความเห็นส่วนบุคคลของผู้เขียน ไม่ใช่ความเห็นของเรา และเราไม่รับรองความถูกต้อง'] },
      {
        h: '4. ลิงก์ภายนอกและรูปภาพ',
        p: [
          'บางลิงก์นำไปยังเว็บไซต์ทางการของเทศกาลหรือผู้จำหน่ายบัตร เราไม่รับผิดชอบต่อเนื้อหาหรือธุรกรรมที่นั่น',
          'รูปภาพแสดงตามเงื่อนไขของแต่ละแหล่งที่มาและไม่มีการดัดแปลง ลิขสิทธิ์ยังคงเป็นของเจ้าของแต่ละราย',
        ],
      },
      { h: '5. แหล่งข้อมูล', p: ['ที่มา: ⓒองค์การส่งเสริมการท่องเที่ยวเกาหลี, Culture Portal, ชุดข้อมูลมาตรฐานเทศกาลแห่งชาติบน data.go.kr และข้อมูลที่หน่วยงานท้องถิ่นเผยแพร่ ข้อมูลสาธารณะใช้ภายใต้เงื่อนไข KOGL'] },
    ],
  },
}

const ALL: Record<Lang, Record<LegalKind, Doc>> = { ko, en, ja, th }

export function legalDoc(lang: Lang, kind: LegalKind): Doc {
  return ALL[lang][kind]
}
