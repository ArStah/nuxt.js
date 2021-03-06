import test from 'ava'
import { resolve } from 'path'
import rp from 'request-promise-native'
import { Nuxt, Builder } from '..'
import { interceptLog, interceptError, release } from './helpers/console'

const port = 4005
const url = route => 'http://localhost:' + port + route

let nuxt = null

// Init nuxt.js and create server listening on localhost:4000
test.serial('Init Nuxt.js', async t => {
  const options = {
    rootDir: resolve(__dirname, 'fixtures/error'),
    dev: false,
    build: {
      stats: false
    }
  }

  const logSpy = await interceptLog(async () => {
    nuxt = new Nuxt(options)
    await new Builder(nuxt).build()
    await nuxt.listen(port, 'localhost')
  })

  t.true(logSpy.calledWithMatch('DONE'))
  t.true(logSpy.calledWithMatch('OPEN'))
})

test.serial('/ should display an error', async t => {
  const error = await t.throws(nuxt.renderRoute('/'))
  t.true(error.message.includes('not_defined is not defined'))
})

test.serial('/404 should display an error too', async t => {
  let { error } = await nuxt.renderRoute('/404')
  t.true(error.message.includes('This page could not be found'))
})

test.serial('/ with renderAndGetWindow()', async t => {
  const errorSpy = await interceptError()
  const err = await t.throws(nuxt.renderAndGetWindow(url('/')))
  t.is(err.response.statusCode, 500)
  t.is(err.response.statusMessage, 'NuxtServerError')
  release()
  t.true(errorSpy.calledOnce)
  t.true(
    errorSpy
      .getCall(0)
      .args[0].message.includes(
        'render function or template not defined in component: anonymous'
      )
  )
})

test.serial('/ with text/json content', async t => {
  const opts = {
    headers: {
      accept: 'application/json'
    },
    resolveWithFullResponse: true
  }
  const errorSpy = await interceptError()
  const { response: { headers } } = await t.throws(rp(url('/'), opts))
  t.is(headers['content-type'], 'text/json; charset=utf-8')
  release()
  t.true(errorSpy.calledOnce)
  t.true(
    errorSpy
      .getCall(0)
      .args[0].message.includes(
        'render function or template not defined in component: anonymous'
      )
  )
})

// Close server and ask nuxt to stop listening to file changes
test.after.always('Closing server and nuxt.js', async t => {
  await nuxt.close()
})
