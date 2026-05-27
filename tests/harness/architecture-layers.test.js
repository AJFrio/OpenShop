import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const src = path.join(root, 'src')

function fileImportsTarget(filePath, segment) {
  const content = fs.readFileSync(filePath, 'utf8')
  return content.includes(`/${segment}/`) || content.includes(`'../${segment}`)
}

describe('architecture layers', () => {
  it('services do not import routes or UI', () => {
    const servicesDir = path.join(src, 'services')
    const files = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.js'))
    for (const file of files) {
      const full = path.join(servicesDir, file)
      expect(fileImportsTarget(full, 'routes')).toBe(false)
      expect(fileImportsTarget(full, 'components')).toBe(false)
      expect(fileImportsTarget(full, 'pages')).toBe(false)
    }
  })

  it('lib and utils do not import services', () => {
    for (const dir of ['lib', 'utils']) {
      const dirPath = path.join(src, dir)
      if (!fs.existsSync(dirPath)) continue
      for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.js')) continue
        const full = path.join(dirPath, file)
        expect(fileImportsTarget(full, 'services')).toBe(false)
      }
    }
  })
})
