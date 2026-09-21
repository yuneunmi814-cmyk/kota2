import test from 'node:test'
import assert from 'node:assert/strict'
import { festivalContacts } from '../lib/contact.ts'
test('contact keeps SNS/email first-class and phone descriptions out of tel links', () => {
 const c=festivalContacts({homepage:'https://example.org',instagram:'https://instagram.com/test',tel:'행사장 02-319-1220 운영사 02-737-6444 (점심 12:00~13:00)'} )
 assert.deepEqual(c.phones.map(p=>p.href),['tel:023191220','tel:027376444'])
 assert.equal(c.homepage,'https://example.org/')
 assert.equal(festivalContacts({homepage:'mailto:hello@example.org'}).email,'hello@example.org')
 assert.equal(festivalContacts({tel:'문의 office@example.org'}).email,'office@example.org')
 assert.equal(festivalContacts({homepage:'javascript:alert(1)'}).homepage,null)
 assert.equal(festivalContacts({}).phones.length,0)
})
