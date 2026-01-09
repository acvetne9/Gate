import React, { useRef, useEffect, ReactNode } from 'react'

interface PreserveScrollContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Container that preserves scroll position when content is added
 * Only scrolls to new content if user is already at the bottom
 */
export function PreserveScrollContainer({ children, className = '' }: PreserveScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevHeightRef = useRef(0)
  const isUserAtBottomRef = useRef(true)
  const skipNextScrollRef = useRef(false)

  // Track scroll position as user scrolls
  const handleScroll = () => {
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false
      return
    }

    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // User is at bottom if within 10px of the bottom
    isUserAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 10
  }

  // Use a MutationObserver to detect when content changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Store initial height
    prevHeightRef.current = container.scrollHeight

    // Watch for content changes
    const observer = new MutationObserver(() => {
      if (!container) return

      const newHeight = container.scrollHeight
      const heightChanged = newHeight !== prevHeightRef.current

      if (heightChanged) {
        // Content was added/removed
        prevHeightRef.current = newHeight

        // If user was NOT at bottom, prevent auto-scroll
        if (!isUserAtBottomRef.current) {
          // Disable scroll temporarily
          skipNextScrollRef.current = true
          container.style.overflowY = 'hidden'

          // Re-enable scrolling in next frame
          requestAnimationFrame(() => {
            container.style.overflowY = 'auto'
            skipNextScrollRef.current = false
          })
        }
        // If user WAS at bottom, let browser auto-scroll (natural behavior)
      }
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      style={{ overflowY: 'auto' }}
    >
      {children}
    </div>
  )
}

export default PreserveScrollContainer
