---
title: "XSS via Host header - www.google.com/cse"
date: "2015-04-22"
description: "Abusing IE11 behavior to set your own Host header and conduct XSS"
---

A few months ago I found a really fine XSS in Google's Custom Search Engine. The trick I needed to use doesn't seem to be broadly known and that's a pity as it sometimes might allow to make unexploitable exploitable. So here it is: XSS via Host header - Internet Explorer only. The trick was discovered by Sergey Bobrov ([@Black2Fan](https://twitter.com/black2fan)) two years ago and still hasn't been fixed in IE11. Details of the bug were once described on [Sergey's website](http://blackfan.ru/) but they're no longer there ([albeit archive.org saves the day](https://web.archive.org/web/20131107024350/http://blackfan.ru/)) so I'll give you a short overview.

Long story short: in IE there's an interesting bug in handling redirects that makes it possible to insert arbitrary characters to Host header. Suppose you have the following http response:

```http
HTTP/1.1 302 Found
Date: Fri, 06 Mar 2015 08:35:32 GMT
Server: Apache/2.2.22 (Debian)
X-Powered-By: PHP/5.4.36-0+deb7u3
Location: http://example.com%2flogin.php
Vary: Accept-Encoding
Content-Length: 0
Connection: close
Content-Type: text/html
```

Try to guess what request will be then issued? Will it be issued at all? The Location header doesn't really seem right... So here is what IE does:

```http
GET /login.phphp/ HTTP/1.1
Accept: text/html, application/xhtml+xml, \*/\*
Accept-Language: pl-PL
User-Agent: Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko
Accept-Encoding: gzip, deflate
Host: example.com/login.php
DNT: 1
Connection: Keep-Alive
Cache-Control: no-cache
```

You can see it right: there's `example.com/login.php` in `Host` header. Also there's some odd path: why on earth is that `login.phphp` while there was nothing like that in the original URL? Well, it appears that IE does some odd overlaying of the path in its URL-encoded and URL-decoded form. The picture says it all:

[![](http://2.bp.blogspot.com/-yW2M3szUNJo/VUOn54NFM2I/AAAAAAAAADg/FZt5DHuvzdc/s1600/cse1.png)](http://2.bp.blogspot.com/-yW2M3szUNJo/VUOn54NFM2I/AAAAAAAAADg/FZt5DHuvzdc/s1600/cse1.png)

Moving on, you may expect that servers will tend to response with 400 Bad Request for such an odd Host header. And this is usually true...

[![](http://2.bp.blogspot.com/-Njy27MOndXo/VUOoRHaYF9I/AAAAAAAAADo/5Hr1m_83mGQ/s1600/cse2.png)](http://2.bp.blogspot.com/-Njy27MOndXo/VUOoRHaYF9I/AAAAAAAAADo/5Hr1m_83mGQ/s1600/cse2.png)

But fortunately there was some quirk in Google handling of Host header which allowed to bypass it.

The quirk is to add port number in the host header. It was not actually validated and you could put any string you like after a colon. Like this on Gmail:

[![](http://3.bp.blogspot.com/-34vs47w9OpM/VUOo1Ku5k8I/AAAAAAAAADw/ik6z5kg54EQ/s1600/cse3.png)](http://3.bp.blogspot.com/-34vs47w9OpM/VUOo1Ku5k8I/AAAAAAAAADw/ik6z5kg54EQ/s1600/cse3.png)

Gmail was smart enough to properly encode it though.

Before moving on to the proper XSS, I need to mention another Google server's specific behaviour, which will be needed to bypass IE's XSS protection later on. Normally when you try to reach a path will double dot inside (like `/test1/../test2`), Google server will immediately normalize it and issue a redirect.

[![](http://1.bp.blogspot.com/-wmt2SUvNao0/VUOptO4FqSI/AAAAAAAAAD4/bqireeUb73c/s1600/cse4.png)](http://1.bp.blogspot.com/-wmt2SUvNao0/VUOptO4FqSI/AAAAAAAAAD4/bqireeUb73c/s1600/cse4.png)

However, when you add a semicolon in a path, magically this no longer happens.

[![](http://3.bp.blogspot.com/-sdOWcDpEQPc/VUOp-N7OpKI/AAAAAAAAAEA/xDGdggdYjtQ/s1600/cse5.png)](http://3.bp.blogspot.com/-sdOWcDpEQPc/VUOp-N7OpKI/AAAAAAAAAEA/xDGdggdYjtQ/s1600/cse5.png)

Okay, so let's move on to the Google CSE XSS. It looked just like that:

[![](http://4.bp.blogspot.com/-HDaXjphmWLU/VUOqi2D99mI/AAAAAAAAAEI/kwckhnI1Nq8/s1600/cse6.png)](http://4.bp.blogspot.com/-HDaXjphmWLU/VUOqi2D99mI/AAAAAAAAAEI/kwckhnI1Nq8/s1600/cse6.png)

Host header is clearly reflected in the response without any encoding. Please note that Burp's syntax highlighting is misleading in the screenshot: `</textarea>` actually closes the tag and the script will be executed.

So I have prepared a simple webpage returning the following http response:

```http
HTTP/1.1 302 Found
Server: Apache/2.2.22 (Debian)
Location: https://www.google.com%3a443%2fcse%2ftools%2fcreate_onthefly%3b%3c%2ftextarea%3e%3cscript%3ealert(1)%3c%2fscript%3e
```

With an expectation that the next request will contain the following Host header:

```http
Host: www.google.com:443/cse/tools/create_onthefly;</textarea><script>alert(1)</script>
```

That really happened but IE knew something was going on here...

[![](http://4.bp.blogspot.com/-8GuQq3Lizwc/VUOrU8jj_XI/AAAAAAAAAEQ/5GfWDCzVvW4/s1600/cse7.png)](http://4.bp.blogspot.com/-8GuQq3Lizwc/VUOrU8jj_XI/AAAAAAAAAEQ/5GfWDCzVvW4/s1600/cse7.png)

Luckily, IE's XSS filter is dumb and it is pretty easy to circumvent it. Remember that trick with semicolon and `../`? Well, it seems that the filter works by comparing the URL in the address bar with the page's content. So when you issue a request to, say, `/<svg/onload=alert(1)/../../`, IE will automatically normalize it in the address bar to / and will no longer see the XSS. That's just hilarious!

So eventually I had a page with the following header:

```http
Location: https://www.google.com%3a443%2fcse%2ftools%2fcreate\_onthefly%3b%3c%2ftextarea%3e%3csvg%2fonload%3dalert%28document%2edomain%29%3e%3b%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f
```

where the value decodes to:

```http
Location: https://www.google.com:443/cse/tools/create_onthefly;</textarea><svg/onload=alert(document.domain)>;/../../../../../../../../../../../../../../
```

And finally the XSS worked!

<iframe src="https://www.youtube.com/embed/9A44ERoAFkc" title="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Google Security team seemed to be amazed with the bug and now they fixed the server so that it no longer accepts any "strange" characters after a colon in host name.
