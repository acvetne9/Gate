// ScraperBot - Real HTTP Request Testing (Malicious Scraper)
// Only returns REAL data from actual HTTP requests - no fake logs
export class ScraperBot {
  constructor(targetUrl, apiEndpoint, apiKey, skipGateCheck = false) {
    this.targetUrl = targetUrl
    this.apiEndpoint = apiEndpoint
    this.apiKey = apiKey
    this.skipGateCheck = skipGateCheck
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    this.name = 'ScraperBot'
  }

  async attack() {
    const results = []

    if (this.skipGateCheck) {
      // External site: Test the EXACT URL provided (no path manipulation)
      console.log(`🤖 ${this.name} testing exact URL: ${this.targetUrl}`)
      const result = await this.scrapeExactUrl(this.targetUrl)
      if (result.status === 'scraped' || result.status === 'blocked' || result.status === 'allowed') {
        results.push(result)
      }
    } else {
      // Integrated site: Test multiple pages
      console.log(`🤖 ${this.name} starting Gate protection test on ${this.targetUrl}`)
      const pages = ['/', '/pricing', '/blog', '/dashboard']

      for (const page of pages) {
        const result = await this.scrapePage(page)

        if (result.status === 'scraped' || result.status === 'blocked' || result.status === 'allowed') {
          results.push(result)
        } else {
          console.log(`    ⚠️ Skipping ${page} - ${result.status}`)
        }

        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    return results
  }

  async scrapePage(page) {
    const startTime = performance.now()
    const targetPage = `${this.targetUrl}${page}`

    let statusCode = 0
    let responseTime = 0
    let status = 'unknown'
    let decision_reason = 'Test in progress...'
    let errorMessage = null
    let riskScore = 0
    let scrapedContent = null

    try {
      // Skip Gate check for external sites (no Gate installed)
      if (this.skipGateCheck) {
        console.log(`  → Scraping external site (no Gate check)`)

        // Go directly to scraping
        try {
          const proxyResponse = await fetch(`${this.apiEndpoint}/scrape-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: targetPage,
              userAgent: this.userAgent
            }),
            signal: AbortSignal.timeout(15000)
          })

          const proxyData = await proxyResponse.json()
          console.log(`    📦 Proxy response:`, { success: proxyData.success, hasSnippet: !!proxyData.snippet, snippetLength: proxyData.snippet?.length })

          if (proxyData.success && proxyData.snippet) {
            scrapedContent = proxyData.snippet
            if (scrapedContent && scrapedContent.trim().length > 10) {
              status = 'scraped'
              decision_reason = `Successfully scraped external page (${proxyData.statusCode})`
              console.log(`    ✓ Scraped ${scrapedContent.length} chars: "${scrapedContent.substring(0, 80)}..."`)
            } else {
              status = 'empty_page'
              decision_reason = 'Page exists but contains no readable text'
            }
          } else if (proxyData.statusCode === 404) {
            status = 'page_not_found'
            decision_reason = 'Page does not exist (404)'
          } else if (proxyData.statusCode >= 400) {
            status = 'page_error'
            decision_reason = `Page returned error ${proxyData.statusCode}`
          }
        } catch (scrapeError) {
          decision_reason = `Scrape failed: ${scrapeError.message}`
          errorMessage = scrapeError.message
        }
      } else {
        // Test Gate-protected site
        console.log(`  → Testing Gate protection for ${targetPage}`)

        // Call Gate's check-access API
        const checkAccessUrl = `${this.apiEndpoint}/check-access`
        const response = await fetch(checkAccessUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: this.apiKey,
            page: page,
            userAgent: this.userAgent,
            fingerprint: {
              canvas: null,
              webgl: null,
              plugins: []
            }
          }),
          signal: AbortSignal.timeout(10000)
        })

        statusCode = response.status
        responseTime = Math.round(performance.now() - startTime)

        // Check if response is JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
        // Not a JSON response - site doesn't have Gate or API doesn't exist
        console.log(`    ⚠️ No Gate API detected (received HTML instead of JSON)`)
        status = 'no_gate'
        decision_reason = 'Site not protected by Gate - trying direct scraping'

        // Try to scrape the page using server-side proxy (bypasses CORS)
        try {
          const proxyResponse = await fetch(`${this.apiEndpoint}/scrape-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: targetPage,
              userAgent: this.userAgent
            }),
            signal: AbortSignal.timeout(15000)
          })

          const proxyData = await proxyResponse.json()

          if (proxyData.success && proxyData.snippet) {
            scrapedContent = proxyData.snippet
            if (scrapedContent && scrapedContent.trim().length > 10) {
              status = 'scraped'
              decision_reason = `Successfully scraped unprotected page (${proxyData.statusCode})`
              console.log(`    ✓ Scraped via proxy: "${scrapedContent.substring(0, 50)}..."`)
            }
          } else if (proxyData.statusCode === 404) {
            status = 'page_not_found'
            decision_reason = 'Page does not exist (404)'
          } else if (proxyData.statusCode >= 400) {
            status = 'page_error'
            decision_reason = `Page returned error ${proxyData.statusCode}`
          }
        } catch (scrapeError) {
          decision_reason = `Scrape failed: ${scrapeError.message}`
        }
      } else {
        // Parse Gate API JSON response
        const gateResponse = await response.json()

        if (gateResponse.allowed === false && gateResponse.status === 'payment_required') {
          status = 'blocked'
          decision_reason = gateResponse.reason || 'Bot detected - payment required'
          riskScore = 0.95
        } else if (gateResponse.allowed === true) {
          status = 'allowed'
          decision_reason = gateResponse.reason || 'Access granted'
          riskScore = 0.2

        // If allowed, try to fetch the actual page content via proxy
        try {
          const proxyResponse = await fetch(`${this.apiEndpoint}/scrape-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: targetPage,
              userAgent: this.userAgent
            }),
            signal: AbortSignal.timeout(15000)
          })

          const proxyData = await proxyResponse.json()

          if (proxyData.success && proxyData.snippet) {
            scrapedContent = proxyData.snippet
            if (scrapedContent && scrapedContent.trim().length > 10) {
              status = 'scraped'
              decision_reason = `Successfully scraped page content (${proxyData.statusCode})`
              console.log(`    ✓ Successfully scraped content: "${scrapedContent.substring(0, 50)}..."`)
            } else {
              status = 'empty_page'
              decision_reason = 'Page exists but contains no readable text'
              console.log(`    ⚠️ Page has no readable content`)
            }
          } else if (proxyData.statusCode === 404) {
            status = 'page_not_found'
            decision_reason = 'Page does not exist (404)'
            console.log(`    ⚠️ Page not found (404) - skipping`)
          } else if (proxyData.statusCode >= 400) {
            status = 'page_error'
            decision_reason = `Page returned error ${proxyData.statusCode}`
            console.log(`    ⚠️ Page error ${proxyData.statusCode} - skipping`)
          }
        } catch (scrapeError) {
          console.log(`    ⚠️ Could not scrape content: ${scrapeError.message}`)
          decision_reason = `Scrape failed: ${scrapeError.message}`
        }
        } else {
          status = 'unknown'
          decision_reason = 'Unexpected response from Gate'
        }
      }
      }

      console.log(`    ✓ ${statusCode} in ${responseTime}ms - ${status.toUpperCase()} - ${decision_reason}`)

    } catch (error) {
      responseTime = Math.round(performance.now() - startTime)

      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        statusCode = 0
        status = 'cors_error'
        decision_reason = 'CORS blocked - Cannot test cross-origin site from browser'
        errorMessage = 'Browser security prevents testing external sites'
        console.log(`    ✗ CORS blocked`)
      } else if (error.name === 'AbortError') {
        statusCode = 0
        status = 'timeout'
        decision_reason = 'Request timeout (10s)'
        errorMessage = 'Request took too long to respond'
        console.log(`    ✗ Timeout`)
      } else {
        statusCode = 0
        status = 'error'
        decision_reason = `Network error: ${error.message}`
        errorMessage = error.message
        console.log(`    ✗ Error: ${error.message}`)
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      bot: this.name,
      userAgent: this.userAgent,
      page: page,
      targetUrl: targetPage,
      statusCode: statusCode,
      responseTime: responseTime,
      status: status,
      decision_reason: decision_reason,
      riskScore: riskScore,
      error: errorMessage,
      scrapedContent: scrapedContent,
      type: 'bot',
      botType: 'malicious_scraper',
      ip: '192.168.1.100'
    }

    // Debug: Log if we have scraped content
    if (scrapedContent) {
      console.log(`    📝 Returning result WITH scrapedContent (${scrapedContent.length} chars)`)
    } else {
      console.log(`    ⚠️ Returning result WITHOUT scrapedContent`)
    }

    return result
  }

  // New method: Scrape exact URL without path manipulation
  async scrapeExactUrl(exactUrl) {
    const startTime = performance.now()

    let statusCode = 0
    let responseTime = 0
    let status = 'unknown'
    let decision_reason = 'Test in progress...'
    let errorMessage = null
    let riskScore = 0
    let scrapedContent = null
    let actualUrl = exactUrl
    let redirected = false

    console.log(`  → Scraping exact URL: ${exactUrl}`)

    try {
      const proxyResponse = await fetch(`${this.apiEndpoint}/scrape-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: exactUrl,
          userAgent: this.userAgent
        }),
        signal: AbortSignal.timeout(15000)
      })

      const proxyData = await proxyResponse.json()
      responseTime = Math.round(performance.now() - startTime)
      statusCode = proxyData.statusCode || 0

      console.log(`    📦 Proxy response:`, {
        success: proxyData.success,
        statusCode: proxyData.statusCode,
        hasSnippet: !!proxyData.snippet,
        snippetLength: proxyData.snippet?.length,
        actualUrl: proxyData.actualUrl,
        pageIdentifier: proxyData.pageIdentifier,
        pageProof: proxyData.pageProof
      })

      // Check if URL was redirected
      if (proxyData.actualUrl && proxyData.actualUrl !== exactUrl) {
        redirected = true
        actualUrl = proxyData.actualUrl
        console.log(`    🔀 REDIRECT DETECTED: ${exactUrl} → ${actualUrl}`)
      }

      // NEW: Store comprehensive page analysis for SPAs
      const pageProof = proxyData.pageProof || 'No page markers found'
      const pageIdentifier = proxyData.pageIdentifier || 'unknown'
      const metaTags = proxyData.metaTags || {}
      const pageAnalysis = proxyData.pageAnalysis || {}

      if (pageIdentifier !== 'unknown') {
        console.log(`    🎯 SPA PAGE DETECTED: "${pageIdentifier}"`)
        console.log(`    📋 Page proof: ${pageProof}`)
        console.log(`    📊 Page analysis:`, pageAnalysis)
      }

      // HONEST: Check if bot was blocked by Gate (target URL was NOT fetched)
      if (proxyData.blocked === true) {
        status = 'blocked'
        riskScore = proxyData.botDetection?.riskScore || 0.95
        decision_reason = `BLOCKED: ${proxyData.botDetection?.botName || this.name} detected. ` +
          `Target (${exactUrl}) was NOT contacted. Bot intercepted by Gate before reaching destination.`
        console.log(`    ❌ ${this.name} BLOCKED by Gate - target URL was NOT fetched`)

        scrapedContent = `❌ BLOCKED BY GATE\n\n`
        scrapedContent += `${this.name} was detected and blocked.\n`
        scrapedContent += `Target URL was NOT contacted.\n\n`
        scrapedContent += `Detection reasons:\n`
        proxyData.botDetection?.reasons?.forEach(reason => {
          scrapedContent += `   • ${reason}\n`
        })
        scrapedContent += `\nRisk score: ${(riskScore * 100).toFixed(0)}%\n`
      } else if (proxyData.success && proxyData.snippet) {
        scrapedContent = proxyData.snippet

        // Check if gate detected in content (different from being blocked)
        if (proxyData.isGateBlocking) {
          status = 'blocked'
          riskScore = 0.95
          decision_reason = `BLOCKED: Gate detected in page content. Target WAS contacted but content is gateed.`
          console.log(`    🚫 GATE BLOCK detected in content`)
          scrapedContent = proxyData.snippet
        } else {
          // No gate - content was successfully scraped
          // Build comprehensive page report
          let pageReport = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
          pageReport += `✅ CONTENT SUCCESSFULLY SCRAPED\n`
          pageReport += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

          pageReport += `🎯 Page Identity:\n`
          pageReport += `   • Component: "${pageIdentifier}"\n`
          pageReport += `   • Type: ${pageAnalysis.pageType || 'website'}\n`
          pageReport += `   • URL: ${actualUrl}\n\n`

          if (metaTags.og?.title || metaTags.og?.description) {
            pageReport += `📝 Content Description:\n`
            if (metaTags.og?.title) pageReport += `   • Title: ${metaTags.og.title}\n`
            if (metaTags.og?.description) pageReport += `   • Description: ${metaTags.og.description}\n`
            if (metaTags.og?.image) pageReport += `   • Preview Image: ${metaTags.og.image}\n`
            pageReport += `\n`
          }

          if (pageAnalysis.resources) {
            pageReport += `📦 Resources Loaded:\n`
            pageReport += `   • ${pageAnalysis.resources.scripts || 0} JavaScript files\n`
            pageReport += `   • ${pageAnalysis.resources.styles || 0} Stylesheets\n`
            pageReport += `   • ${pageAnalysis.resources.images || 0} Images\n`
            pageReport += `   • ${pageAnalysis.resources.fonts || 0} Font libraries\n\n`
          }

          if (pageAnalysis.services && pageAnalysis.services.length > 0) {
            pageReport += `🔌 Third-Party Services:\n`
            pageAnalysis.services.forEach(service => {
              pageReport += `   • ${service}\n`
            })
            pageReport += `\n`
          }

          if (pageAnalysis.hasNextData) {
            pageReport += `⚡ Next.js Data Found:\n`
            pageReport += `   • __NEXT_DATA__ detected (page props/state available)\n`
            pageReport += `   • Data keys: ${pageAnalysis.nextDataKeys.join(', ')}\n\n`
          }

          pageReport += `📋 Technical Proof:\n`
          pageReport += `   ${pageProof}\n\n`

          pageReport += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
          pageReport += proxyData.snippet

          scrapedContent = pageReport
          if (scrapedContent && scrapedContent.trim().length > 10) {
            status = 'scraped'
            riskScore = 0.7
            decision_reason = `SCRAPED: Evasive bot evaded detection. ` +
              `Target (${exactUrl}) WAS contacted. Retrieved ${proxyData.contentLength || 0} bytes of content.`
            console.log(`    ⚠️ ${this.name} SCRAPED content - target WAS fetched - SITE IS VULNERABLE`)
          } else {
            status = 'empty_page'
            decision_reason = 'Page exists but contains no readable text'
          }
        }
      } else if (proxyData.statusCode === 404) {
        status = 'page_not_found'
        decision_reason = 'Page does not exist (404)'
      } else if (proxyData.statusCode >= 400) {
        status = 'page_error'
        decision_reason = `Page returned error ${proxyData.statusCode}`
      } else {
        status = 'failed'
        decision_reason = proxyData.error || 'Unknown error'
      }

      var targetFetched = proxyData.targetFetched ?? (status === 'scraped')
    } catch (scrapeError) {
      responseTime = Math.round(performance.now() - startTime)
      status = 'error'
      decision_reason = `Scrape failed: ${scrapeError.message}`
      errorMessage = scrapeError.message
      console.log(`    ✗ Error: ${scrapeError.message}`)
      var targetFetched = false
    }

    const result = {
      timestamp: new Date().toISOString(),
      bot: this.name,
      userAgent: this.userAgent,
      page: new URL(exactUrl).pathname,
      targetUrl: exactUrl,
      actualUrl: actualUrl,
      redirected: redirected,
      statusCode: statusCode,
      responseTime: responseTime,
      status: status,
      decision_reason: decision_reason,
      riskScore: riskScore,
      error: errorMessage,
      scrapedContent: scrapedContent,
      targetFetched: targetFetched || false,
      type: 'bot',
      botType: 'malicious_scraper',
      ip: '192.168.1.100'
    }

    if (scrapedContent) {
      console.log(`    📝 Returning result WITH scrapedContent (${scrapedContent.length} chars)`)
    } else {
      console.log(`    ⚠️ Returning result WITHOUT scrapedContent - status: ${status}`)
    }

    return result
  }

  extractTextSnippet(html) {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ')

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim()

    // Return first 200 characters
    return text.substring(0, 200) + (text.length > 200 ? '...' : '')
  }
}
