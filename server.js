const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

// Tạo self-signed certificate nếu chưa có
const certPath = path.join(__dirname, 'localhost-cert.pem')
const keyPath = path.join(__dirname, 'localhost-key.pem')

let httpsOptions = {}

// Kiểm tra xem có certificate chưa
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
    console.log('✅ Using existing SSL certificates')
  } catch (error) {
    console.error('❌ Error reading certificate files:', error.message)
    process.exit(1)
  }
} else {
  console.warn('⚠️  SSL certificates not found.')
  console.warn('')
  console.warn('📝 To generate certificates, you have two options:')
  console.warn('')
  console.warn('   Option 1: Use mkcert (Recommended)')
  console.warn('   1. Install mkcert: https://github.com/FiloSottile/mkcert')
  console.warn('   2. Run: mkcert -install')
  console.warn('   3. Run: mkcert localhost')
  console.warn('   4. Rename files to: localhost-key.pem and localhost-cert.pem')
  console.warn('')
  console.warn('   Option 2: Use OpenSSL')
  console.warn('   1. Run: openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost-cert.pem -days 365 -subj "/CN=localhost"')
  console.warn('')
  console.warn('   After generating certificates, restart the server.')
  console.warn('')
  
  // Thử tạo certificate tự động với openssl
  const { execSync } = require('child_process')
  try {
    console.log('🔄 Attempting to generate self-signed certificate with OpenSSL...')
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost-cert.pem -days 365 -subj "/CN=localhost"`,
      { stdio: 'inherit', cwd: __dirname }
    )
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
    console.log('✅ Self-signed certificate generated successfully!')
  } catch (error) {
    console.error('')
    console.error('❌ Failed to generate certificate automatically.')
    console.error('   Please follow the instructions above to create certificates manually.')
    console.error('   Or run the server without HTTPS: npm run dev')
    process.exit(1)
  }
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on https://${hostname}:${port}`)
    console.log('> ⚠️  Browser will show security warning - click "Advanced" → "Proceed to localhost"')
  })
})
