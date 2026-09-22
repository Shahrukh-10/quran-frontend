<?xml version="1.0" encoding="UTF-8"?>
<!--
  sitemap.xsl — human-friendly rendering for the sitemap.xml file.
  Google and other crawlers ignore XSL and read the raw XML directly.
  Humans opening /sitemap.xml in a browser get a proper table view.
  Ships in /public/sitemap.xsl and is referenced by an
  <?xml-stylesheet?> processing instruction in app/sitemap.ts.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  exclude-result-prefixes="sm xhtml">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, follow" />
        <title>Sitemap · Quran Daily</title>
        <style>
          :root {
            --bg: #FBFBFD;
            --card: #FFFFFF;
            --ink: #0B0F14;
            --muted: #5C6773;
            --line: #E6E8EC;
            --accent: #0B7A3E;
            --accent-soft: #E7F2EC;
            --gold: #F5C542;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px 24px 96px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--ink);
            line-height: 1.5;
          }
          .wrap { max-width: 1080px; margin: 0 auto; }
          header { margin-bottom: 24px; }
          header .brand {
            display: inline-flex; align-items: center; gap: 12px;
            font-weight: 700; letter-spacing: -0.02em; font-size: 20px;
            color: var(--accent); text-decoration: none;
          }
          header .brand .dot {
            width: 10px; height: 10px; background: var(--gold);
            border-radius: 999px; display: inline-block;
          }
          h1 { font-size: clamp(24px, 3vw, 34px); margin: 12px 0 8px; letter-spacing: -0.02em; }
          .lede { color: var(--muted); font-size: 15px; margin-bottom: 20px; max-width: 720px; }
          .stat {
            display: inline-flex; gap: 8px; padding: 6px 12px;
            background: var(--accent-soft); color: var(--accent);
            border-radius: 999px; font-size: 13px; font-weight: 600;
            margin-right: 6px;
          }
          table {
            width: 100%; border-collapse: collapse;
            background: var(--card); border: 1px solid var(--line);
            border-radius: 12px; overflow: hidden;
            font-size: 14px;
          }
          thead th {
            text-align: left; padding: 12px 16px;
            background: var(--accent-soft); color: var(--accent);
            font-weight: 600; font-size: 12px; letter-spacing: 0.04em;
            text-transform: uppercase;
            border-bottom: 1px solid var(--line);
          }
          tbody td {
            padding: 10px 16px; border-bottom: 1px solid var(--line);
            vertical-align: middle;
          }
          tbody tr:hover td { background: #F6F8FA; }
          tbody tr:last-child td { border-bottom: 0; }
          td a {
            color: var(--accent); text-decoration: none;
            font-weight: 500;
            word-break: break-all;
          }
          td a:hover { text-decoration: underline; }
          td.date, td.priority {
            color: var(--muted); white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          td.priority strong {
            display: inline-block; padding: 2px 8px;
            border-radius: 999px; background: #F0F3F7;
            color: var(--ink); font-weight: 600; font-size: 12px;
          }
          .foot {
            margin-top: 20px; font-size: 13px; color: var(--muted);
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <a class="brand" href="/">
              <span class="dot"></span>
              <span>Quran Daily</span>
            </a>
            <h1>XML Sitemap</h1>
            <p class="lede">This file lists every page on qurandaily.org that is indexable by search engines and AI answer engines. Machines read it as XML; the table below is here to make it readable for humans.</p>
            <div>
              <span class="stat">
                <xsl:value-of select="count(sm:urlset/sm:url)" /> URLs
              </span>
              <span class="stat">application/xml</span>
              <span class="stat">sitemaps.org 0.9</span>
            </div>
          </header>

          <table>
            <thead>
              <tr>
                <th style="width: 60%">URL</th>
                <th style="width: 20%">Last modified</th>
                <th style="width: 20%">Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sm:urlset/sm:url">
                <tr>
                  <td>
                    <a>
                      <xsl:attribute name="href"><xsl:value-of select="sm:loc" /></xsl:attribute>
                      <xsl:value-of select="sm:loc" />
                    </a>
                  </td>
                  <td class="date"><xsl:value-of select="sm:lastmod" /></td>
                  <td class="priority"><strong><xsl:value-of select="sm:priority" /></strong></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <p class="foot">Rendered from raw XML via XSL stylesheet — search engines see the unstyled XML and index directly.</p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
