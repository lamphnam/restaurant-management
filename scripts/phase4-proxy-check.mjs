import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createViteServer } from '../frontend/node_modules/vite/dist/node/index.js'
import { configureSseProxy } from '../frontend/dev/sseProxy.ts'

// Real local HTTP upstream + Vite proxy; no database or authentication involved.
const upstream = createHttpServer((request, response) => {
  if (request.url === '/api/events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' })
    response.write(': connected\n\n')
  } else response.end('rest-ok')
})
await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
const vite = await createViteServer({ configFile: false, root: 'frontend', logLevel: 'silent', server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: `http://127.0.0.1:${upstream.address().port}`, configure: configureSseProxy } } } })
let timeout
try {
  await vite.listen()
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal(await (await fetch(`${base}/api/health`)).text(), 'rest-ok')
  const stream = await fetch(`${base}/api/events`)
  const reader = stream.body.getReader()
  assert.match(new TextDecoder().decode((await reader.read()).value), /connected/)
  upstream.closeAllConnections()
  const closed = reader.read().then((value) => value.done, () => true)
  const hung = new Promise((resolve) => { timeout = setTimeout(() => resolve(false), 2000) })
  assert.equal(await Promise.race([closed, hung]), true, 'Interrupted upstream must close downstream promptly')
  const retry = await fetch(`${base}/api/events`)
  const retryReader = retry.body.getReader()
  assert.match(new TextDecoder().decode((await retryReader.read()).value), /connected/)
  await retryReader.cancel()
  assert.equal(await (await fetch(`${base}/api/health`)).text(), 'rest-ok')
  console.log('PASS 5 real proxy assertions: REST, initial SSE, interrupted-stream closure, retry SSE and REST')
} finally {
  clearTimeout(timeout)
  await vite.close()
  upstream.closeAllConnections()
  await new Promise((resolve) => upstream.close(resolve))
}
