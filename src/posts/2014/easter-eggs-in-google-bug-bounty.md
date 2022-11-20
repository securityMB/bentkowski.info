---
title: "Easter eggs in Google Bug Bounty"
date: "2014-04-26"
description: "A list of a few easter eggs in the older bug bounty report page"
---

Today I had a closer look on HTML source of Google's Vulnerability Submission Form at http://goo.gl/vulnz and it turned out there are a couple of easter eggs:

- https://www.google.com/appserve/security-bugs/new?rl=z7kuve4n5jf7mpe45mjtcsua&alert(121212)
- https://www.google.com/appserve/security-bugs/new?rl=z7kuve4n5jf7mpe45mjtcsua&alert(document.domain)
- https://www.google.com/appserve/security-bugs/new?rl=z7kuve4n5jf7mpe45mjtcsua#alert('xss')
- https://www.google.com/appserve/security-bugs/new?rl=z7kuve4n5jf7mpe45mjtcsua&alert(document.cookie)

Pretty fun stuff. I wonder if anyone submitted those as actual issues ;)
