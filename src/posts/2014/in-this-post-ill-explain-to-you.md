---
title: "Facebook and two dots leak"
date: "2014-09-15"
---

In this post, I'll explain to you an interesting bug in Facebook, which made it possible to steal user's name and email as well as an access token that allowed to read person's friend list. This is a bug I personally consider my favourite bug bounty finding, you'll soon find out why :) It was discovered by me and [@evil_xorb](https://twitter.com/evil_xorb).

With the link below, you can register to FriendFeed using your Facebook data:  
[https://www.facebook.com/plugins/registration.php?client_id=2795223269&fields=name,email&redirect_uri=https://friendfeed.com](https://www.facebook.com/plugins/registration.php?client_id=2795223269&fields=name,email&redirect_uri=https://friendfeed.com)

[![](http://sekurak.pl/wp-content/uploads/2014/08/Zrzut-ekranu-2014-08-22-o-18.50.34-600x200.png)](http://sekurak.pl/wp-content/uploads/2014/08/Zrzut-ekranu-2014-08-22-o-18.50.34-600x200.png)

After clicking the "Zarejestruj się" (Register) button, a POST request to `redirect_uri` is issued that contains user's data visible in the view (name and email) and the access token. The form is vulnerable to Clickjacking but this is kinda by definition since, [as Facebook explains](https://developers.facebook.com/blog/post/440/):

_The registration plugin is an iframe that websites can add with just one line of code_

You can have a little bit fun with the Clickjacking here: [http://jsfiddle.net/Lg657ypz/show/](http://jsfiddle.net/Lg657ypz/show/).

What was, however, more interesting to me was the `redirect_uri` parameter. Only URLs within friendfeed.com domain were allowed, so you couldn't just write `redirect_uri=http://evil-domain.com/` to get the userdata and tokens. So, http://any_subdomain.friendfeed.com worked...

[![](http://4.bp.blogspot.com/--lVj1Fio7wE/VBdYgoucxFI/AAAAAAAAABY/ym0mz6NwUXo/s1600/Zrzut%2Bekranu%2B2014-09-15%2Bo%2B23.21.25.png)](http://4.bp.blogspot.com/--lVj1Fio7wE/VBdYgoucxFI/AAAAAAAAABY/ym0mz6NwUXo/s1600/Zrzut%2Bekranu%2B2014-09-15%2Bo%2B23.21.25.png)

While https://other.domain.com did not (empty page):

[![](http://4.bp.blogspot.com/-SQd8sa92_gg/VBdYtnZRW6I/AAAAAAAAABg/rwq8ld8eyqo/s1600/Zrzut%2Bekranu%2B2014-09-15%2Bo%2B23.22.47.png)](http://4.bp.blogspot.com/-SQd8sa92_gg/VBdYtnZRW6I/AAAAAAAAABg/rwq8ld8eyqo/s1600/Zrzut%2Bekranu%2B2014-09-15%2Bo%2B23.22.47.png)

Well, but every filtering function could possibly contain some issues, couldn't it? I've fiddled with `redirect_uri` a little bit and discovered an unusual behaviour. It turned out that when a hostname contains a sequence of two or more dots, the URL is always accepted! For example, https://multiple.dots...com:

[![](http://4.bp.blogspot.com/-TGHy8QUbL18/VBdZPBXu47I/AAAAAAAAABo/0g1sh5RBV48/s1600/Zrzut%2Bekranu%2B2014-09-15%2Bo%2B23.25.02.png)](http://4.bp.blogspot.com/-TGHy8QUbL18/VBdZPBXu47I/AAAAAAAAABo/0g1sh5RBV48/s1600/Zrzut%2Bekranu%2B2014-09-15%2Bo%2B23.25.02.png)

At first I thought it didn't really give me anything as every browser would reject that URL anyway since it is not correct, right? Right?

Well, then another quirk came up. Google Chrome on OSX and Linux **treats multiple dots in hostname as a single dot!** If you don't believe me, try to click [this link](http://blog...bentkowski..info/) if you're on one of these platforms. You'll see an error but the request is issued.

The youtube video below is a PoC that it worked and that I was able to redirect request to my own domain bentkowski.info (or bentkowski..info? ;)).

The bug has already been reported to Facebook and has been fixed pretty quickly. Lessons learnt? When testing some client side issues, check them not only on different browsers but also the same browsers on different OS-es ;)
