import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { MarkdownContent } from '~/components/common/MarkdownContent'
import { NormalContainer } from '~/components/layout/container/Normal'

export const metadata = {
  title: 'Privacy Policy',
  description: 'Afilmory Privacy Policy',
}

export default async function PrivacyPage() {
  const cwd = process.cwd()
  const filePath =
    cwd.endsWith('apps/landing') || cwd.endsWith('apps/landing/')
      ? resolve(cwd, 'src/legal/privacy.md')
      : resolve(cwd, 'apps/landing/src/legal/privacy.md')
  const content = await readFile(filePath, 'utf-8')

  return (
    <div className="relative min-h-screen text-white">
      <NormalContainer>
        <article className="py-16">
          <MarkdownContent content={content} />
        </article>
      </NormalContainer>
    </div>
  )
}
