---
title: 'Same Origin Policy bypass within a single site a.k.a. "Google Roulette"'
date: "2022-11-20"
---

Suppose you're visiting a website, which asks you to open a JavaScript console in developer tools, and then call a function called: `magic()`. Would you do it?

The answer may depend on how much you trust the website asking you to do so, and how comfortable you are with typing anything in the console. But let's stop for a while, and think about what possibly _might_ go wrong.
The first and most obvious issue is [self-XSS](https://en.wikipedia.org/wiki/Self-XSS). The code you enter is executed within the context of the origin of the page. This means that the code may exfiltrate your sensitive data, or perform some unwanted actions. However, all of these are limited to the single origin in which the code was called.

Now, is it possible that the code will affect other origins? Not only the one you entered the code on? This is what we're going to focus on in this post.

### A little background

This post is a description of a Chromium bug known as [crbug/1069486](https://crbug.com/1069486) which I reported back in April 2020. As of 13th November 2022, the bug is not fixed, which essentially makes it a 0-day. However, I got explicit permission from the Chromium team to do a full disclosure. Also, because the attack scenario requires the victim to enter some code in the DevTools console, I don't believe it's practically exploitable.

I still think it is quite interesting from a purely technical standpoint; also maybe somebody else will be able to escalate it further ([it happened to me before](/2018/07/vulnerability-in-hangouts-chat-aka-how/)).

### JavaScript console and utilities

In general, entering code in the JavaScript console is equivalent to executing the same code directly by the website. This means, among others, that even in the console you cannot bypass Same-Origin-Policy or other fundamental security rules imposed by browsers.

The truth is, though, that actually, the console _is_ a little bit more powerful than the "normal" JavaScript. The difference is in [console utilities](https://developer.chrome.com/docs/devtools/console/utilities/). There is a bunch of functions that are exposed _only_ to the console and they are not available from "normal" Javascript. Let's see what that means.

As an example, let's take a function called `$$`. This is a shorthand for `document.querySelectorAll`, available only in the console.

If you try to call it from the console, the function works, as shown in the screenshot below.

![Screenshot showing that you can execute $$ from the console](/roulette/screen1.png)

On the other hand, if you try to call it directly from your HTML, such as the following one:

```html
<script>
  $$("body");
</script>
```

Then you'll get a `ReferenceError`, as shown below:

![Screenshot showing that you cannot execute $$ from the HTML](/roulette/screen2.png)

The conclusion from that is that Chromium must be able to differentiate whether any JS code was executed from the console or not. But what if we can trick it?
