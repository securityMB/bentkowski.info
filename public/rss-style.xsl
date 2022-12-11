<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <html>
      <body>
        <h1>RSS Feed</h1>
        <xsl:apply-templates select="rss/channel/item" />
      </body>
    </html>
  </xsl:template>

  <xsl:template match="item">
    <h2>
      <xsl:value-of select="title" />
    </h2>
    <p>
      <xsl:value-of select="description" />
    </p>
    <p>
      <a href="{link}">Read more</a>
    </p>
  </xsl:template>

</xsl:stylesheet>