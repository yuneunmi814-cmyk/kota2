import type { Lang } from './i18n.ts'

// Display translations, never ingredient/allergen guarantees. Longest terms win;
// unfamiliar words stay visible in Korean rather than becoming guessed dishes.
const rows = `

바나나|Banana|バナナ|กล้วย
오레오|Oreo|オレオ|โอรีโอ
두바이|Dubai|ドバイ|ดูไบ
딸바|Strawberry & banana|イチゴとバナナ|สตรอว์เบอร์รีกับกล้วย
팟타이|Pad Thai|パッタイ|ผัดไทย
치킨|Chicken|チキン|ไก่
나시고랭|Nasi goreng|ナシゴレン|นาซิโกเร็ง
미고랭|Mie goreng|ミーゴレン|หมี่โกเร็ง
케밥|Kebab|ケバブ|เคบับ
곱창|Intestines|ホルモン|ไส้
무뼈|Boneless|骨なし|ไม่มีกระดูก
순살|Boneless|骨なし|ไม่มีกระดูก
해장국밥|Hangover soup with rice|ヘジャンクッパ|ซุปแฮจังกุกกับข้าว
해장국|Hangover soup|ヘジャングク|ซุปแฮจังกุก
우거지|Cabbage leaves|白菜の外葉|ใบกะหล่ำ
시래기|Dried radish greens|干した大根の葉|ใบหัวไชเท้าแห้ง
청국장|Fermented soybean stew|チョングクチャン|แกงถั่วหมักชองกุกจัง
솥밥|Pot-cooked rice|釜飯|ข้าวอบหม้อ
밀키트|Meal kit|ミールキット|ชุดอาหารพร้อมปรุง
잡채|Japchae glass noodles|チャプチェ|จับแช
핫바|Fried fish cake bar|練り物の串揚げ|ลูกชิ้นปลาแท่งทอด
사이다|Lemon-lime soda|サイダー|น้ำอัดลมเลมอนไลม์
콜라|Cola|コーラ|โคล่า
달고나|Dalgona sugar candy|カルメ焼き|ทัลโกนา
샌드위치|Sandwich|サンドイッチ|แซนด์วิช
사발면|Cup noodles|カップ麺|บะหมี่ถ้วย
머랭쿠키|Meringue cookies|メレンゲクッキー|คุกกี้เมอแรงก์
비빔국수|Mixed noodles|ビビン麺|บะหมี่คลุกซอส
화채|Fruit punch|フルーツポンチ|ฮวาแช
가래떡|Long rice cakes|棒状の餅|ต็อกแท่งยาว
호두과자|Walnut pastries|クルミまんじゅう|ขนมวอลนัต
산나물|Wild greens|山菜|ผักป่า
표고|Shiitake|椎茸|เห็ดหอม
바닐라|Vanilla|バニラ|วานิลลา
카라멜|Caramel|キャラメル|คาราเมล
밀크티|Milk tea|ミルクティー|ชานม
녹차|Green tea|緑茶|ชาเขียว
말차|Matcha|抹茶|มัทฉะ
유자|Yuzu|ゆず|ยูซุ
카모마일|Chamomile|カモミール|คาโมมายล์
민트|Mint|ミント|มินต์
오미자|Schisandra berry|五味子|โอมิจา
생강|Ginger|生姜|ขิง
포도|Grape|ブドウ|องุ่น
토마토|Tomato|トマト|มะเขือเทศ
스테비아|Stevia|ステビア|หญ้าหวาน
김치말이국수|Cold kimchi broth noodles|キムチ冷製麺|บะหมี่เย็นน้ำกิมจิ
초계국수|Cold chicken noodles|鶏肉の冷製麺|บะหมี่ไก่เย็น
바비큐|Barbecue|バーベキュー|บาร์บีคิว
바베큐|Barbecue|バーベキュー|บาร์บีคิว
통삼겹|Whole pork belly|厚切り豚バラ|หมูสามชั้นชิ้นใหญ่
흑돼지|Black pork|黒豚|หมูดำ
홍게|Red snow crab|紅ズワイガニ|ปูหิมะแดง
찹쌀|Glutinous rice|もち米|ข้าวเหนียว
꽈배기|Twisted doughnut|ねじりドーナツ|โดนัทเกลียว
녹두|Mung bean|緑豆|ถั่วเขียว
수수부꾸미|Sorghum rice cakes|きび餅|ขนมข้าวฟ่าง
도토리묵|Acorn jelly|どんぐりこんにゃく|วุ้นโอ๊ก
도토리|Acorn|どんぐり|โอ๊ก
묵사발|Jelly in cold broth|ムクの冷製スープ|วุ้นเกาหลีในน้ำซุปเย็น
콩국수|Noodles in soy milk broth|豆乳冷麺|บะหมี่น้ำถั่วเหลือง
들깨|Perilla seeds|エゴマ|เมล็ดงาขี้ม้อน
단호박|Sweet pumpkin|かぼちゃ|ฟักทอง
백향과|Passion fruit|パッションフルーツ|เสาวรส
차돌박이|Beef brisket|牛バラ薄切り|เนื้อวัวส่วนอก
차돌|Beef brisket|牛バラ|เนื้อวัวส่วนอก
짬뽕|Spicy seafood noodles|チャンポン|จัมปง
소프트아이스크림|Soft serve|ソフトクリーム|ซอฟต์เสิร์ฟ
도넛|Doughnut|ドーナツ|โดนัท
오렌지|Orange|オレンジ|ส้ม
파인애플|Pineapple|パイナップル|สับปะรด
메론|Melon|メロン|เมลอน
멜론|Melon|メロン|เมลอน
된장국|Soybean paste soup|味噌スープ|ซุปเต้าเจี้ยว
된장찌개|Soybean paste stew|テンジャンチゲ|แกงเต้าเจี้ยว
전골|Hot pot|鍋|หม้อไฟ
반미|Bánh mì|バインミー|บั๋นหมี่
사탕수수|Sugarcane|サトウキビ|อ้อย
후라이드|Fried|フライド|ทอด
로스트|Roast|ロースト|อบ
양념|Seasoned|味付け|ปรุงรส
플레인|Plain|プレーン|รสดั้งเดิม
시즈닝|Seasoning|シーズニング|ผงปรุงรส
어니언|Onion|オニオン|หัวหอม
레인보우|Rainbow|レインボー|สายรุ้ง
칵테일|Cocktail|カクテル|ค็อกเทล
소금|Salt|塩|เกลือ
데리야끼|Teriyaki|照り焼き|เทอริยากิ
칠리|Chili|チリ|พริก
에그마요|Egg mayo|卵マヨ|ไข่มายองเนส
대파|Scallion|長ネギ|ต้นหอม
더블|Double|ダブル|สองเท่า
스틱|Stick|スティック|แท่ง
육회|Raw beef|ユッケ|เนื้อวัวดิบ
연어|Salmon|サーモン|แซลมอน
참치|Tuna|ツナ|ทูน่า
인절미|Soybean powder rice cakes|きな粉餅|อินจอลมี
수정과|Cinnamon punch|スジョングァ|ซูจองกวา
샐러드|Salad|サラダ|สลัด
파스타|Pasta|パスタ|พาสต้า
탕후루|Candied fruit|タンフールー|ถังหูลู่
군만두|Fried dumplings|焼き餃子|เกี๊ยวทอด
라볶이|Ramyeon & spicy rice cakes|ラポッキ|ราบกกี
생맥주|Draft beer|生ビール|เบียร์สด
홍삼|Red ginseng|紅参|โสมแดง
유부|Fried tofu|油揚げ|เต้าหู้ทอด
주먹밥|Rice balls|おにぎり|ข้าวปั้น
새싹|Sprouts|新芽|ต้นอ่อน
번데기|Silkworm pupae|サナギ|ดักแด้ไหม
국화빵|Chrysanthemum-shaped pastry|菊の形の焼き菓子|ขนมรูปดอกเบญจมาศ
부침개|Korean pancake|チヂミ|แพนเค้กเกาหลี
부침|Pan-fried|焼き|ทอดกระทะ
라거|Lager|ラガー|ลาเกอร์
에일|Ale|エール|เอล
대추|Jujube|ナツメ|พุทรา
모찌|Mochi|餅|โมจิ
소떡|Sausage & rice cake|ソーセージと餅|ไส้กรอกกับต็อก
그릴|Grilled|グリル|ย่าง
반반|Half & half|ハーフ＆ハーフ|สองรสอย่างละครึ่ง
조각|Slice|一切れ|ชิ้น
클래식|Classic|クラシック|คลาสสิก
뉴욕|New York|ニューヨーク|นิวยอร์ก
싱글컵|Single cup|シングルカップ|ถ้วยเดี่ยว
더블컵|Double cup|ダブルカップ|ถ้วยคู่
소라|Sea snail|サザエ|หอยทะเล
전복|Abalone|アワビ|หอยเป๋าฮื้อ
터키|Turkish|トルコ|ตุรกี
김말이|Seaweed noodle rolls|春雨の海苔巻き|วุ้นเส้นห่อสาหร่าย
하이볼|Highball|ハイボール|ไฮบอล
미숫가루|Mixed grain drink|ミスッカル|เครื่องดื่มธัญพืช
토스트|Toast|トースト|ขนมปังปิ้ง
직화|Flame-grilled|直火焼き|ย่างไฟ
바삭|Crispy|サクサク|กรอบ
달콤|Sweet|甘口|หวาน
달달|Sweet|甘い|หวาน
전통|Traditional|伝統|ดั้งเดิม
쌀|Rice|米|ข้าว
왕|Jumbo|ジャンボ|จัมโบ้
롱|Long|ロング|ยาว
아이스|Iced|アイス|เย็น
핫|Hot|ホット|ร้อน
컵|Cup|カップ|ถ้วย
캔|Can|缶|กระป๋อง
콘|Cone/corn|コーン|โคนหรือข้าวโพด
단품|À la carte|単品|จานเดี่ยว
(소)|(Small)|(小)|(เล็ก)
(중)|(Medium)|(中)|(กลาง)
(대)|(Large)|(大)|(ใหญ่)
개|pieces|個|ชิ้น
인분|servings|人前|ที่
떡볶이|Spicy rice cakes|トッポッキ|ต็อกบกกี
소떡소떡|Sausage & rice cake skewers|ソーセージと餅の串|ไส้กรอกกับต็อกเสียบไม้
닭꼬치|Chicken skewers|焼き鳥|ไก่เสียบไม้
닭강정|Glazed fried chicken|タッカンジョン|ไก่ทอดเคลือบซอส
해물파전|Seafood & scallion pancake|海鮮チヂミ|แพนเค้กทะเลต้นหอม
잔치국수|Noodles in broth|温かいそうめん|กุกซูน้ำ
제육볶음|Spicy stir-fried pork|豚肉の辛炒め|หมูผัดเผ็ด
제육덮밥|Spicy pork rice bowl|豚肉の辛炒め丼|ข้าวหน้าหมูผัดเผ็ด
소고기국밥|Beef soup with rice|牛肉クッパ|ซุปเนื้อกับข้าว
소고기불초밥|Seared beef sushi|炙り牛肉寿司|ซูชิเนื้อย่างไฟ
소고기육전|Battered beef pancakes|牛肉のジョン|เนื้อชุบไข่ทอด
회오리감자|Spiral potato|トルネードポテト|มันฝรั่งเกลียว
타코야끼|Takoyaki|たこ焼き|ทาโกะยากิ
타코야키|Takoyaki|たこ焼き|ทาโกะยากิ
야끼소바|Yakisoba|焼きそば|ยากิโซบะ
야키소바|Yakisoba|焼きそば|ยากิโซบะ
오꼬노미야끼|Okonomiyaki|お好み焼き|โอโคโนมิยากิ
오코노미야끼|Okonomiyaki|お好み焼き|โอโคโนมิยากิ
오코노미야키|Okonomiyaki|お好み焼き|โอโคโนมิยากิ
도토리묵무침|Seasoned acorn jelly|どんぐりこんにゃくの和え物|วุ้นโอ๊กคลุกเครื่องปรุง
두부김치|Tofu with kimchi|豆腐キムチ|เต้าหู้กับกิมจิ
부추전|Chive pancake|ニラチヂミ|แพนเค้กกุยช่าย
김치전|Kimchi pancake|キムチチヂミ|แพนเค้กกิมจิ
감자전|Potato pancake|じゃがいものチヂミ|แพนเค้กมันฝรั่ง
육개장|Spicy beef soup|ユッケジャン|ซุปเนื้อเผ็ด
닭계장|Spicy chicken soup|鶏肉の辛いスープ|ซุปไก่เผ็ด
추어탕|Loach soup|チュオタン|ซุปปลาโลช
짜장면|Black bean sauce noodles|ジャージャー麺|จาจังมยอน
탕수육|Sweet & sour meat|タンスユク|เนื้อทอดซอสเปรี้ยวหวาน
순대|Korean blood sausage|スンデ|ซุนแด
수육|Boiled meat slices|ゆで肉|เนื้อต้มสไลซ์
보쌈|Boiled pork wraps|ポッサム|โพซัมหมูต้ม
불초밥|Flame-seared sushi|炙り寿司|ซูชิย่างไฟ
꼬마김밥|Mini gimbap|ミニキンパ|คิมบับมินิ
김밥|Gimbap rice rolls|キンパ|คิมบับ
떡갈비|Grilled minced rib patties|トッカルビ|ต็อกคัลบี
불고기|Bulgogi|プルコギ|พุลโกกี
삼겹살|Pork belly|サムギョプサル|หมูสามชั้น
족발|Pork trotters|豚足|ขาหมู
돈까스|Pork cutlet|トンカツ|หมูทอดทงคัตสึ
돈가스|Pork cutlet|トンカツ|หมูทอดทงคัตสึ
닭발|Chicken feet|鶏の足|ตีนไก่
염통꼬치|Heart skewers|ハツ串|หัวใจเสียบไม้
어묵탕|Fish cake soup|おでんスープ|ซุปลูกชิ้นปลา
꼬치어묵|Fish cake skewers|串おでん|ลูกชิ้นปลาเสียบไม้
어묵|Fish cakes|おでん|ลูกชิ้นปลา
오뎅|Fish cakes|おでん|ลูกชิ้นปลา
핫도그|Hot dog|ホットドッグ|ฮอตดอก
소세지|Sausage|ソーセージ|ไส้กรอก
소시지|Sausage|ソーセージ|ไส้กรอก
떡꼬치|Rice cake skewers|餅の串|ต็อกเสียบไม้
김치|Kimchi|キムチ|กิมจิ
만두|Dumplings|餃子|เกี๊ยว
육전|Battered meat pancakes|肉のジョン|เนื้อชุบไข่ทอด
파전|Scallion pancake|ネギチヂミ|แพนเค้กต้นหอม
국밥|Soup with rice|クッパ|ซุปกับข้าว
국수|Noodles|麺|กุกซู
비빔밥|Bibimbap|ビビンバ|บิบิมบับ
볶음밥|Fried rice|チャーハン|ข้าวผัด
공깃밥|Steamed rice|ご飯|ข้าวสวย
공기밥|Steamed rice|ご飯|ข้าวสวย
덮밥|Rice bowl|丼|ข้าวหน้า
냉면|Cold noodles|冷麺|บะหมี่เย็น
쌀국수|Rice noodles|米麺|ก๋วยเตี๋ยวเส้นข้าว
우동|Udon|うどん|อุด้ง
라면|Ramyeon|ラーメン|รามยอน
곰탕|Gomtang soup|コムタン|ซุปคมทัง
해물|Seafood|海鮮|อาหารทะเล
돼지고기|Pork|豚肉|เนื้อหมู
소고기|Beef|牛肉|เนื้อวัว
쇠고기|Beef|牛肉|เนื้อวัว
한우|Korean beef|韓牛|เนื้อวัวฮันอู
닭고기|Chicken|鶏肉|เนื้อไก่
오리고기|Duck|鴨肉|เนื้อเป็ด
갈비|Ribs|カルビ|ซี่โครง
고기|Meat|肉|เนื้อสัตว์
닭|Chicken|鶏|ไก่
문어|Octopus|タコ|หมึกยักษ์
오징어|Squid|イカ|ปลาหมึก
새우|Shrimp|エビ|กุ้ง
홍어|Skate|ガンギエイ|ปลากระเบน
골뱅이|Sea snails|つぶ貝|หอยทะเล
가리비|Scallops|ホタテ|หอยเชลล์
치즈|Cheese|チーズ|ชีส
감자|Potato|じゃがいも|มันฝรั่ง
고구마|Sweet potato|さつまいも|มันเทศ
옥수수|Corn|トウモロコシ|ข้าวโพด
인삼|Ginseng|高麗人参|โสม
두부|Tofu|豆腐|เต้าหู้
계란|Egg|卵|ไข่
달걀|Egg|卵|ไข่
야채|Vegetables|野菜|ผัก
채소|Vegetables|野菜|ผัก
버섯|Mushroom|キノコ|เห็ด
양파|Onion|玉ねぎ|หัวหอม
부추|Chives|ニラ|กุยช่าย
미나리|Water parsley|セリ|ผักชีล้อม
마늘|Garlic|ニンニク|กระเทียม
갈릭|Garlic|ガーリック|กระเทียม
버터|Butter|バター|เนย
간장|Soy sauce|醤油|ซอสถั่วเหลือง
고추장|Chili paste|コチュジャン|โคชูจัง
매운맛|Spicy|辛口|เผ็ด
순한맛|Mild|マイルド|รสอ่อน
매콤|Spicy|ピリ辛|เผ็ด
매운|Spicy|辛い|เผ็ด
불닭|Spicy chicken|激辛チキン|ไก่เผ็ด
떡|Rice cakes|餅|ต็อก
튀김|Fried|揚げ物|ทอด
볶음|Stir-fried|炒め|ผัด
구이|Grilled|焼き|ย่าง
무침|Seasoned|和え物|คลุกเครื่องปรุง
찜|Steamed/braised|蒸し・煮込み|นึ่งหรือตุ๋น
꼬치|Skewers|串|เสียบไม้
초밥|Sushi|寿司|ซูชิ
수제|Handmade|自家製|ทำเอง
옛날|Old-style|昔ながらの|แบบดั้งเดิม
모듬|Assorted|盛り合わせ|รวม
모둠|Assorted|盛り合わせ|รวม
국내산|Korean origin|韓国産|ผลิตในเกาหลี
세트|Set|セット|ชุด
셋트|Set|セット|ชุด
소주|Soju|焼酎|โซจู
맥주|Beer|ビール|เบียร์
막걸리|Makgeolli rice wine|マッコリ|มักกอลลี
음료수|Soft drinks|ソフトドリンク|น้ำอัดลมและเครื่องดื่ม
음료|Drinks|ドリンク|เครื่องดื่ม
생수|Bottled water|ミネラルウォーター|น้ำดื่ม
식혜|Sweet rice drink|シッケ|ชิกฮเย
아메리카노|Americano|アメリカーノ|อเมริกาโน
카페라떼|Caffè latte|カフェラテ|คาเฟ่ลาเต้
카페 라떼|Caffè latte|カフェラテ|คาเฟ่ลาเต้
커피|Coffee|コーヒー|กาแฟ
라떼|Latte|ラテ|ลาเต้
아이스티|Iced tea|アイスティー|ชาเย็น
에이드|Fruit soda|フルーツソーダ|น้ำผลไม้โซดา
스무디|Smoothie|スムージー|สมูทตี้
주스|Juice|ジュース|น้ำผลไม้
쥬스|Juice|ジュース|น้ำผลไม้
아이스크림|Ice cream|アイスクリーム|ไอศกรีม
젤라또|Gelato|ジェラート|เจลาโต
츄러스|Churros|チュロス|ชูโรส
추러스|Churros|チュロス|ชูโรส
호떡|Sweet filled pancakes|ホットク|โฮต็อก
붕어빵|Fish-shaped pastry|たい焼き風菓子|ขนมปังรูปปลา
솜사탕|Cotton candy|綿あめ|สายไหม
슬러시|Slush drink|スラッシュ|สเลอปี้
와플|Waffle|ワッフル|วาฟเฟิล
크레페|Crêpe|クレープ|เครป
빵|Bread|パン|ขนมปัง
딸기|Strawberry|イチゴ|สตรอว์เบอร์รี
사과|Apple|リンゴ|แอปเปิล
복숭아|Peach|桃|พีช
자몽|Grapefruit|グレープフルーツ|เกรปฟรุต
레몬|Lemon|レモン|เลมอน
망고|Mango|マンゴー|มะม่วง
블루베리|Blueberry|ブルーベリー|บลูเบอร์รี
청포도|Green grape|マスカット|องุ่นเขียว
수박|Watermelon|スイカ|แตงโม
과일|Fruit|フルーツ|ผลไม้
초코|Chocolate|チョコ|ช็อกโกแลต
초콜릿|Chocolate|チョコレート|ช็อกโกแลต
크림|Cream|クリーム|ครีม
팥|Red bean|小豆|ถั่วแดง
빙수|Shaved ice|かき氷|บิงซู
땅콩|Peanut|ピーナッツ|ถั่วลิสง
호두|Walnut|クルミ|วอลนัต
꿀|Honey|はちみつ|น้ำผึ้ง
피자|Pizza|ピザ|พิซซ่า
스테이크|Steak|ステーキ|สเต๊ก
햄버거|Hamburger|ハンバーガー|แฮมเบอร์เกอร์
타코|Taco|タコス|ทาโก้
감바스|Shrimp in garlic oil|エビのアヒージョ|กุ้งในน้ำมันกระเทียม
가라아게|Karaage fried chicken|唐揚げ|ไก่ทอดคาราอาเกะ
물|Water|水|น้ำ
`.trim().split('\n').map(line => line.split('|'))
const dictionary = new Map(rows.map(([ko,en,ja,th]) => [ko, { ko,en,ja,th }]))
const terms = [...dictionary.keys()].sort((a,b) => b.length-a.length)
const pattern = new RegExp(terms.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'), 'g')
export function menuLabel(raw: string, lang: Lang): { label: string; partial: boolean } {
  if (lang === 'ko') return { label: raw, partial: false }
  const exact = dictionary.get(raw.trim())
  if (exact) return { label: exact[lang], partial: false }
  const label = raw.replace(pattern, word => ` ${dictionary.get(word)![lang]} `).replace(/\s+/g,' ').trim()
  const partial = /[가-힣]/.test(label)
  return { label: partial ? raw : label, partial }
}
// Positive hints only: no inferred "pork-free" / "not spicy" claims.
export function menuHints(raw: string): ('pork' | 'spicy')[] {
  const hints: ('pork' | 'spicy')[] = []
  if (!/(?:돼지고기|돼지|돈육|포크|제육|삼겹살|족발|보쌈|돈까스|돈가스)\s*(?:없|무첨가|프리|제외)/.test(raw) && /돼지|돈육|포크|제육|삼겹살|족발|보쌈|돈까스|돈가스/.test(raw)) hints.push('pork')
  if (!/안\s*매운|맵지\s*않|매운맛\s*없/.test(raw) && /매운|매콤|매운맛|불닭|고추장|떡볶이|제육|육개장|닭계장/.test(raw)) hints.push('spicy')
  return hints
}

export function menuTranslationUrl(raw: string, lang: Lang): string {
  return `https://translate.google.com/?${new URLSearchParams({ sl: 'ko', tl: lang, text: raw, op: 'translate' })}`
}
