import React from 'react'
import { NavigationHeader, Footer } from '.'

interface PageLayoutProps {
  activeRoute?: string
  children: React.ReactNode
}

export function PageLayout({ activeRoute, children }: PageLayoutProps) {
  return (
    <>
      <NavigationHeader activeRoute={activeRoute} />
      {children}
      <Footer />
    </>
  )
}

export default PageLayout
