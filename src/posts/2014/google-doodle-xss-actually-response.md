---
title: "Google Doodle - XSS (actually response splitting)"
date: "2014-07-17"
description: "A story of unexpected response splitting in google.com"
---

In this post, I'll show a HTTP response splitting vulnerability, which I've found in [Google Doodle](http://www.google.com/doodles/) website.

If you don't know what response splitting is, Wikipedia sums it up pretty nicely:

> HTTP response splitting is a form of web application vulnerability, resulting from the failure of the application or its environment to properly sanitize input values. It can be used to perform cross-site scripting attacks, cross-user defacement, web cache poisoning, and similar exploits.  
> The attack consists of making the server print a carriage return (CR, ASCII 0x0D) line feed (LF, ASCII 0x0A) sequence followed by content supplied by the attacker in the header section of its response, typically by including them in input fields sent to the application. Per the HTTP standard (RFC 2616), headers are separated by one CRLF and the response's headers are separated from its body by two. Therefore, the failure to remove CRs and LFs allows the attacker to set arbitrary headers, take control of the body, or break the response into two or more separate responses—hence the name.

So I was able to do the exact thing in Doodles:

[![](http://sekurak.pl/wp-content/uploads/2014/03/split.png)](http://sekurak.pl/wp-content/uploads/2014/03/split.png)

As you can see, I added my own header called `MyHeader` as well as some javascript in response body. Using the issue to achieve XSS was probably the sanest thing to do since it was impossible to add many common http headers, like `Set-Cookie`, as a dash (`-`) was replaced with an underscore (`_`).

However, the dash-underscore substitution could also be used in attacker's favour. Google Chrome has an anti-XSS filter that, basically, prevents javascript from execution when it sees that the same code was also supplied in the request.

For example, let's take a code:

```html
<script>
  -=alert;-(1)
</script>
```

This is definitely not a correct javascript but it suddenly becomes one when the character substitution occurs:

```html
<script>
  _ = alert;
  _(1);
</script>
```

As the code in the response differs from the code in the request, Chrome is not able to filter it.

Check out the video below for a proof that it did work:

<iframe width="320" height="266" src="https://www.youtube.com/embed/_s74VRlalfM" title="Google Doodle XSS; Chrome filter bypass" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Of course, the bug has been submitted to Google within [Vulnerability Reward Program](http://www.google.pl/about/appsecurity/reward-program/) and was fixed pretty quickly - in two working days.
