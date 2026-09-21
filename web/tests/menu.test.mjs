import test from 'node:test'
import assert from 'node:assert/strict'
import { menuLabel, menuHints } from '../lib/menu.ts'
test('menu names translated in three languages, amounts and unknown originals preserved', () => {
 for (const lang of ['en','ja','th']) {
  assert.notEqual(menuLabel('떡볶이',lang).label,'떡볶이')
  assert.equal(menuLabel('떡볶이',lang).partial,false)
  assert.match(menuLabel('수제 닭꼬치(2개)',lang).label,/2/)
  assert.match(menuLabel('특제비밀메뉴',lang).label,/특제비밀메뉴/)
  assert.equal(menuLabel('특제비밀메뉴',lang).partial,true)
 }
 assert.equal(menuLabel('떡볶이','ko').label,'떡볶이')
})
test('food hints are positive only; ambiguous sausage and meat do not assert pork', () => {
 assert.deepEqual(menuHints('제육볶음'),['pork','spicy'])
 assert.deepEqual(menuHints('매운 돼지고기'),['pork','spicy'])
 assert.deepEqual(menuHints('소시지'),[])
 assert.deepEqual(menuHints('소고기불초밥'),[])
 assert.deepEqual(menuHints('안 매운 떡볶이'),[])
 assert.deepEqual(menuHints('돼지고기 없음'),[])
})
