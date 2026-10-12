import type { Metadata } from 'next'
import ImageToolsPage from '@/components/image-tools/page'
import React from 'react'

const SITE_URL = 'https://idcardtools.com'

export const metadata: Metadata = {
  title: 'Free Online Image Tools — Convert, Resize & Edit Photos',
  description:
    'Convert, resize, compress, crop, and edit images online with free tools. Remove backgrounds, make profile photos, and change formats without signing up.',
  alternates: {
    canonical: `${SITE_URL}/image-tools`,
  },
}

const page = () => {
  return (
    <ImageToolsPage />
  )
}

export default page